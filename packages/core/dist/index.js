export class AgentGuardError extends Error {
    status;
    constructor(message, status, options) {
        super(message, options);
        this.status = status;
        this.name = "AgentGuardError";
    }
}
export class AgentGuardBlockedError extends AgentGuardError {
    stage;
    risk;
    decision;
    constructor(message, stage, risk, decision) {
        super(message, 403);
        this.stage = stage;
        this.risk = risk;
        this.decision = decision;
        this.name = "AgentGuardBlockedError";
    }
}
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
export class AgentGuard {
    options;
    fetchImplementation;
    constructor(options = {}) {
        this.options = options;
        const fetchImplementation = options.fetch ?? globalThis.fetch;
        if (!fetchImplementation) {
            throw new AgentGuardError("A Fetch API implementation is required.", 500);
        }
        this.fetchImplementation = fetchImplementation;
    }
    async request(path, init) {
        const retries = this.options.retries ?? 2;
        let lastError;
        for (let attempt = 0; attempt <= retries; attempt += 1) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 15_000);
            try {
                const headers = new Headers(init.headers);
                headers.set("content-type", "application/json");
                if (this.options.apiKey)
                    headers.set("authorization", `Bearer ${this.options.apiKey}`);
                const response = await this.fetchImplementation(`${this.options.baseUrl ?? "http://localhost:3000"}${path}`, { ...init, headers, signal: controller.signal });
                if (response.ok)
                    return (await response.json());
                const payload = (await response.json().catch(() => null));
                const error = new AgentGuardError(payload?.error ?? `AgentGuard request failed with status ${response.status}.`, response.status);
                if (response.status < 500 || attempt === retries)
                    throw error;
                lastError = error;
            }
            catch (error) {
                if (error instanceof AgentGuardError && error.status < 500)
                    throw error;
                lastError = error;
                if (attempt === retries)
                    break;
            }
            finally {
                clearTimeout(timer);
            }
            await wait(250 * 2 ** attempt);
        }
        throw new AgentGuardError("AgentGuard unavailable; fail closed.", 503, {
            cause: lastError,
        });
    }
    requireApiKey() {
        if (!this.options.apiKey) {
            throw new AgentGuardError("This endpoint requires an API key.", 401);
        }
    }
    scan(text, source = "UNKNOWN") {
        return this.request("/api/v1/scan", {
            method: "POST",
            body: JSON.stringify({ text, source }),
        });
    }
    checkAction(input) {
        return this.request("/api/v1/check-action", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }
    submitBatch(input) {
        this.requireApiKey();
        return this.request("/api/v1/scan-batch", {
            method: "POST",
            body: JSON.stringify(input),
        });
    }
    job(id) {
        this.requireApiKey();
        return this.request(`/api/v1/jobs/${encodeURIComponent(id)}`, { method: "GET" });
    }
}
export function serializeForScan(value) {
    if (typeof value === "string")
        return value;
    const serialized = JSON.stringify(value);
    return serialized ?? String(value);
}
export class AgentGuardMiddleware {
    client;
    options;
    constructor(client = new AgentGuard(), options = {}) {
        this.client = client;
        this.options = options;
    }
    async beforeModel(content, source = "USER_PROMPT") {
        const decision = await this.client.scan(content, source);
        if (decision.blocked) {
            throw new AgentGuardBlockedError(decision.policy?.reason ?? "AgentGuard blocked model input.", "model-input", decision.risk, decision);
        }
        return decision;
    }
    async guardModelInput(input, source = "USER_PROMPT") {
        const serialized = serializeForScan(input);
        const decision = await this.beforeModel(serialized, source);
        if (typeof input === "string")
            return decision.sanitized_text;
        if (decision.sanitized_text !== serialized) {
            try {
                return JSON.parse(decision.sanitized_text);
            }
            catch {
                throw new AgentGuardBlockedError("Sanitized structured input could not be reconstructed safely.", "model-input", decision.risk, decision);
            }
        }
        return input;
    }
    async beforeTool(name, arguments_, trustedContext) {
        const configuredContext = typeof this.options.trustedContext === "function"
            ? await this.options.trustedContext()
            : (this.options.trustedContext ?? []);
        const decision = await this.client.checkAction({
            tool_call: { name, arguments: arguments_ },
            reasoning_trace: [],
            trusted_context: trustedContext ?? configuredContext,
        });
        if (!decision.allowed) {
            throw new AgentGuardBlockedError(decision.reason || `AgentGuard blocked ${name}.`, "tool-call", decision.risk, decision);
        }
        return decision;
    }
    async afterTool(output, source = "TOOL_OUTPUT") {
        const serialized = serializeForScan(output);
        const decision = await this.client.scan(serialized, source);
        if (decision.blocked) {
            throw new AgentGuardBlockedError(decision.policy?.reason ?? "AgentGuard blocked tool output.", "tool-output", decision.risk, decision);
        }
        if (typeof output === "string")
            return decision.sanitized_text;
        if (decision.sanitized_text !== serialized) {
            try {
                return JSON.parse(decision.sanitized_text);
            }
            catch (cause) {
                throw new AgentGuardBlockedError("Sanitized structured output could not be reconstructed safely.", "tool-output", decision.risk, { decision, cause });
            }
        }
        return output;
    }
    wrapTool(name, execute, trustedContext) {
        return async (...arguments_) => {
            await this.beforeTool(name, { args: arguments_ }, trustedContext);
            return this.afterTool(await execute(...arguments_));
        };
    }
}
//# sourceMappingURL=index.js.map