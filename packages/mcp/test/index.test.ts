import { describe, expect, it, vi } from "vitest";
import { registerGuardedMcpTool, wrapMcpToolHandler } from "../src/index.js";

describe("MCP adapters", () => {
  it("checks arguments and sanitizes MCP text content", async () => {
    const middleware = {
      beforeTool: vi.fn().mockResolvedValue({ allowed: true }),
      afterTool: vi.fn(async (value: unknown) =>
        typeof value === "string" ? value.replace("secret", "[redacted]") : value,
      ),
    };
    const handler = wrapMcpToolHandler(
      "lookup",
      async () => ({
        content: [
          { type: "text" as const, text: "secret" },
          { type: "image", data: "abc" },
        ],
      }),
      { middleware: middleware as never },
    );

    await expect(handler({ id: "1" }, {})).resolves.toEqual({
      content: [
        { type: "text", text: "[redacted]" },
        { type: "image", data: "abc" },
      ],
    });
    expect(middleware.beforeTool).toHaveBeenCalledWith("lookup", { id: "1" }, undefined);
  });

  it("registers the wrapped handler on an MCP server", () => {
    const server = { registerTool: vi.fn() };
    const handler = vi.fn();

    registerGuardedMcpTool(server, "lookup", { description: "Lookup" }, handler);

    expect(server.registerTool).toHaveBeenCalledWith(
      "lookup",
      { description: "Lookup" },
      expect.any(Function),
    );
  });
});
