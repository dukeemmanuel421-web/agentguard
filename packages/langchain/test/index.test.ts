import { describe, expect, it, vi } from "vitest";
import { wrapLangChainRetriever, wrapLangChainTool } from "../src/index.js";

const middleware = {
  beforeTool: vi.fn().mockResolvedValue({ allowed: true }),
  beforeModel: vi.fn().mockResolvedValue({ blocked: false }),
  afterTool: vi.fn(async (value: unknown, source?: string) =>
    source === "DOCUMENT" ? String(value).replace("unsafe", "safe") : value,
  ),
};

describe("LangChain adapters", () => {
  it("guards tool invocation and preserves tool properties", async () => {
    const tool = { name: "search", description: "Search", invoke: vi.fn(async () => "result") };
    const wrapped = wrapLangChainTool(tool, { middleware: middleware as never });

    await expect(wrapped.invoke({ query: "weather" })).resolves.toBe("result");
    expect(wrapped.description).toBe("Search");
    expect(middleware.beforeTool).toHaveBeenCalledWith(
      "search",
      { query: "weather" },
      undefined,
    );
  });

  it("sanitizes retrieved document content", async () => {
    const retriever = {
      getRelevantDocuments: vi.fn(async () => [{ pageContent: "unsafe text", metadata: { id: 1 } }]),
    };
    const wrapped = wrapLangChainRetriever(retriever, { middleware: middleware as never });

    await expect(wrapped.getRelevantDocuments("query")).resolves.toEqual([
      { pageContent: "safe text", metadata: { id: 1 } },
    ]);
  });
});
