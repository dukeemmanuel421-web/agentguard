import { describe, expect, it, vi } from "vitest";
import {
  AgentGuard,
  AgentGuardBlockedError,
  AgentGuardMiddleware,
  type ScanResponse,
} from "../src/index.js";

const scan = (overrides: Partial<ScanResponse> = {}): ScanResponse => ({
  blocked: false,
  risk: 0.05,
  sanitized_text: "safe",
  findings: [],
  ...overrides,
});

describe("AgentGuard", () => {
  it("sends authenticated scan requests", async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(scan()), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const client = new AgentGuard({
      apiKey: "secret",
      baseUrl: "https://guard.example",
      fetch,
    });

    await client.scan("hello", "USER_PROMPT");

    expect(fetch).toHaveBeenCalledWith(
      "https://guard.example/api/v1/scan",
      expect.objectContaining({ method: "POST" }),
    );
    const request = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(request.headers).get("authorization")).toBe("Bearer secret");
  });
});

describe("AgentGuardMiddleware", () => {
  it("fails closed when an action is denied", async () => {
    const client = {
      scan: vi.fn(),
      checkAction: vi.fn().mockResolvedValue({ allowed: false, risk: 0.9, reason: "Denied" }),
    };
    const middleware = new AgentGuardMiddleware(client);

    await expect(middleware.beforeTool("shell", { command: "rm" })).rejects.toBeInstanceOf(
      AgentGuardBlockedError,
    );
  });

  it("sanitizes structured tool output", async () => {
    const client = {
      checkAction: vi.fn(),
      scan: vi.fn().mockResolvedValue(scan({ sanitized_text: '{"value":"clean"}' })),
    };
    const middleware = new AgentGuardMiddleware(client);

    await expect(middleware.afterTool({ value: "unsafe" })).resolves.toEqual({ value: "clean" });
  });
});
