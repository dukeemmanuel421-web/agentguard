export type TrustLevel =
  | "USER_PROMPT"
  | "TRUSTED_TOOL"
  | "TOOL_OUTPUT"
  | "WEB_PAGE"
  | "DOCUMENT"
  | "MCP_OUTPUT"
  | "UNKNOWN";

export interface Finding {
  detector: string;
  severity: string;
  snippet: string;
  reason: string;
}

export interface ScanResponse {
  blocked: boolean;
  risk: number;
  sanitized_text: string;
  findings: Finding[];
  policy?: { reason: string };
}

export interface ActionDecision {
  allowed: boolean;
  risk: number;
  reason: string;
}

export interface CheckActionInput {
  tool_call: Record<string, unknown>;
  reasoning_trace: string[];
  trusted_context: string[];
}

export type BatchInput =
  | { s3Key: string }
  | { items: Array<{ text: string; source: TrustLevel }> };

export interface AgentGuardClient {
  scan(text: string, source?: TrustLevel): Promise<ScanResponse>;
  checkAction(input: CheckActionInput): Promise<ActionDecision>;
}

export interface AgentGuardOptions {
  apiKey?: string;
  baseUrl?: string;
  timeoutMs?: number;
  retries?: number;
  fetch?: typeof globalThis.fetch;
}

export class AgentGuardError extends Error {
  constructor(message: string, public readonly status: number, options?: ErrorOptions) {
    super(message, options);
    this.name = "AgentGuardError";
  }
}

export type GuardStage = "model-input" | "tool-call" | "tool-output";

export class AgentGuardBlockedError extends AgentGuardError {
  constructor(
    message: string,
    public readonly stage: GuardStage,
    public readonly risk: number,
    public readonly decision: unknown,
  ) {
    super(message, 403);
    this.name = "AgentGuardBlockedError";
  }
}

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export class AgentGuard implements AgentGuardClient {
  private readonly fetchImplementation: typeof globalThis.fetch;

  constructor(private readonly options: AgentGuardOptions = {}) {
    const fetchImplementation = options.fetch ?? globalThis.fetch;
    if (!fetchImplementation) {
      throw new AgentGuardError("A Fetch API implementation is required.", 500);
    }
    this.fetchImplementation = fetchImplementation;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const retries = this.options.retries ?? 2;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 15_000);
      try {
        const headers = new Headers(init.headers);
        headers.set("content-type", "application/json");
        if (this.options.apiKey) headers.set("authorization", `Bearer ${this.options.apiKey}`);

        const response = await this.fetchImplementation(
          `${this.options.baseUrl ?? "http://localhost:3000"}${path}`,
          { ...init, headers, signal: controller.signal },
        );
        if (response.ok) return (await response.json()) as T;

        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        const error = new AgentGuardError(
          payload?.error ?? `AgentGuard request failed with status ${response.status}.`,
          response.status,
        );
        if (response.status < 500 || attempt === retries) throw error;
        lastError = error;
      } catch (error) {
        if (error instanceof AgentGuardError && error.status < 500) throw error;
        lastError = error;
        if (attempt === retries) break;
      } finally {
        clearTimeout(timer);
      }
      await wait(250 * 2 ** attempt);
    }

    throw new AgentGuardError("AgentGuard unavailable; fail closed.", 503, {
      cause: lastError,
    });
  }

  private requireApiKey(): void {
    if (!this.options.apiKey) {
      throw new AgentGuardError("This endpoint requires an API key.", 401);
    }
  }

  scan(text: string, source: TrustLevel = "UNKNOWN"): Promise<ScanResponse> {
    return this.request("/api/v1/scan", {
      method: "POST",
      body: JSON.stringify({ text, source }),
    });
  }

  checkAction(input: CheckActionInput): Promise<ActionDecision> {
    return this.request("/api/v1/check-action", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  submitBatch(input: BatchInput): Promise<{ jobId: string }> {
    this.requireApiKey();
    return this.request("/api/v1/scan-batch", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  job(id: string): Promise<{ status: string; result?: unknown }> {
    this.requireApiKey();
    return this.request(`/api/v1/jobs/${encodeURIComponent(id)}`, { method: "GET" });
  }
}

export interface MiddlewareOptions {
  trustedContext?: string[] | (() => string[] | Promise<string[]>);
}

export function serializeForScan(value: unknown): string {
  if (typeof value === "string") return value;
  const serialized = JSON.stringify(value);
  return serialized ?? String(value);
}

export class AgentGuardMiddleware {
  constructor(
    private readonly client: AgentGuardClient = new AgentGuard(),
    private readonly options: MiddlewareOptions = {},
  ) {}

  async beforeModel(content: string, source: TrustLevel = "USER_PROMPT"): Promise<ScanResponse> {
    const decision = await this.client.scan(content, source);
    if (decision.blocked) {
      throw new AgentGuardBlockedError(
        decision.policy?.reason ?? "AgentGuard blocked model input.",
        "model-input",
        decision.risk,
        decision,
      );
    }
    return decision;
  }

  async guardModelInput<T>(input: T, source: TrustLevel = "USER_PROMPT"): Promise<T> {
    const serialized = serializeForScan(input);
    const decision = await this.beforeModel(serialized, source);
    if (typeof input === "string") return decision.sanitized_text as T;
    if (decision.sanitized_text !== serialized) {
      try {
        return JSON.parse(decision.sanitized_text) as T;
      } catch {
        throw new AgentGuardBlockedError(
          "Sanitized structured input could not be reconstructed safely.",
          "model-input",
          decision.risk,
          decision,
        );
      }
    }
    return input;
  }

  async beforeTool(
    name: string,
    arguments_: Record<string, unknown>,
    trustedContext?: string[],
  ): Promise<ActionDecision> {
    const configuredContext =
      typeof this.options.trustedContext === "function"
        ? await this.options.trustedContext()
        : (this.options.trustedContext ?? []);
    const decision = await this.client.checkAction({
      tool_call: { name, arguments: arguments_ },
      reasoning_trace: [],
      trusted_context: trustedContext ?? configuredContext,
    });
    if (!decision.allowed) {
      throw new AgentGuardBlockedError(
        decision.reason || `AgentGuard blocked ${name}.`,
        "tool-call",
        decision.risk,
        decision,
      );
    }
    return decision;
  }

  async afterTool<T>(output: T, source: TrustLevel = "TOOL_OUTPUT"): Promise<T> {
    const serialized = serializeForScan(output);
    const decision = await this.client.scan(serialized, source);
    if (decision.blocked) {
      throw new AgentGuardBlockedError(
        decision.policy?.reason ?? "AgentGuard blocked tool output.",
        "tool-output",
        decision.risk,
        decision,
      );
    }
    if (typeof output === "string") return decision.sanitized_text as T;
    if (decision.sanitized_text !== serialized) {
      try {
        return JSON.parse(decision.sanitized_text) as T;
      } catch (cause) {
        throw new AgentGuardBlockedError(
          "Sanitized structured output could not be reconstructed safely.",
          "tool-output",
          decision.risk,
          { decision, cause },
        );
      }
    }
    return output;
  }

  wrapTool<TArguments extends unknown[], TResult>(
    name: string,
    execute: (...arguments_: TArguments) => TResult | Promise<TResult>,
    trustedContext?: string[],
  ): (...arguments_: TArguments) => Promise<TResult> {
    return async (...arguments_: TArguments) => {
      await this.beforeTool(name, { args: arguments_ }, trustedContext);
      return this.afterTool(await execute(...arguments_));
    };
  }
}
