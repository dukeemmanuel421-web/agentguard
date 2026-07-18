import { describe, expect, it, vi } from "vitest";
import {
  guardOpenAIAgentsResult,
  wrapOpenAIAgentsTool,
} from "../src/index.js";

describe("OpenAI Agents adapters", () => {
  it("guards parsed function arguments and tool output", async () => {
    const middleware = {
      beforeTool: vi.fn().mockResolvedValue({ allowed: true }),
      afterTool: vi.fn(async (value: unknown) => value),
    };
    const tool = {
      name: "weather",
      description: "Weather lookup",
      invoke: vi.fn(async (_context: unknown, input: string) => `weather:${input}`),
    };
    const wrapped = wrapOpenAIAgentsTool(tool, { middleware: middleware as never });

    await wrapped.invoke({}, '{"city":"Paris"}');

    expect(middleware.beforeTool).toHaveBeenCalledWith(
      "weather",
      { city: "Paris" },
      undefined,
    );
    expect(wrapped.description).toBe("Weather lookup");
  });

  it("returns a copy with sanitized final output", async () => {
    const middleware = { afterTool: vi.fn().mockResolvedValue("safe") };
    const result = { finalOutput: "unsafe", state: "complete" };

    const guarded = await guardOpenAIAgentsResult(result, middleware as never);

    expect(guarded).toEqual({ finalOutput: "safe", state: "complete" });
    expect(result.finalOutput).toBe("unsafe");
  });
});
