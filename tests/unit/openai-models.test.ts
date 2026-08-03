import { describe, it, expect } from "vitest";
import {
  orderChatModels,
  isModelNotFound,
  PINNED_CHAT_MODELS,
} from "../../scripts/lib/openai-models.mjs";

/**
 * Fallback model selection for the AI-citation check.
 *
 * Two failures are being guarded against, and they pull in opposite directions.
 *
 * Going dark: a hardcoded model name gets retired and the provider silently
 * disappears from the report. That already happened twice here — Google retired
 * `gemini-1.5-flash` and Perplexity retired its whole `llama-3.1-sonar-*` naming
 * scheme, and both were invisible for months because the report called them
 * "missing API keys".
 *
 * Spending more than intended: the obvious fix for the above is "ask the API and
 * take the newest", which is what Gemini does. On OpenAI that is a cost bug —
 * newest is usually priciest, and a monthly job could move from a mini model to a
 * reasoning model with nothing in the report to say so. Hence cheapest tier first,
 * and discovery only after every pinned name is rejected.
 */

const model = (id: string, created = 0) => ({ id, created });

describe("orderChatModels", () => {
  it("puts cheaper tiers first, not newer models first", () => {
    // The expensive one is newest. It must still lose to the mini tier.
    const ordered = orderChatModels([
      model("gpt-5", 3000),
      model("gpt-4o-mini", 1000),
      model("gpt-4o", 2000),
    ]);
    expect(ordered[0]).toBe("gpt-4o-mini");
  });

  it("prefers nano over mini, and newest within a tier", () => {
    const ordered = orderChatModels([
      model("gpt-4o-mini", 1000),
      model("gpt-5-nano", 500),
      model("gpt-5-mini", 2000),
    ]);
    expect(ordered[0]).toBe("gpt-5-nano");
    expect(ordered[1]).toBe("gpt-5-mini"); // newer than gpt-4o-mini
  });

  it("drops models that are not chat completions endpoints", () => {
    const ordered = orderChatModels([
      model("gpt-4o-audio-preview"),
      model("gpt-4o-realtime-preview"),
      model("gpt-4o-transcribe"),
      model("gpt-image-1"),
      model("gpt-3.5-turbo-instruct"),
      model("text-embedding-3-small"),
      model("dall-e-3"),
      model("whisper-1"),
      model("gpt-4o-mini"),
    ]);
    expect(ordered).toEqual(["gpt-4o-mini"]);
  });

  it("prefers the floating alias over a dated snapshot", () => {
    // Snapshots pin behaviour to a date and are retired before the alias.
    const ordered = orderChatModels([
      model("gpt-4o-mini-2024-07-18", 9999),
      model("gpt-4o-mini", 1),
    ]);
    expect(ordered).toEqual(["gpt-4o-mini"]);
  });

  it("excludes names already tried", () => {
    const ordered = orderChatModels([model("gpt-4o-mini"), model("gpt-4o")], {
      exclude: ["gpt-4o-mini"],
    });
    expect(ordered).toEqual(["gpt-4o"]);
  });

  it("returns empty rather than throwing on junk input", () => {
    expect(orderChatModels([])).toEqual([]);
    expect(orderChatModels(undefined as never)).toEqual([]);
    expect(orderChatModels([{ id: null } as never, { nope: 1 } as never])).toEqual([]);
  });

  it("ships a pinned list that is all cheap tiers", () => {
    // If someone adds a flagship here, the cost protection above is moot.
    expect(PINNED_CHAT_MODELS.length).toBeGreaterThan(0);
    expect(PINNED_CHAT_MODELS.every((m) => /^gpt-/.test(m))).toBe(true);
  });
});

describe("isModelNotFound", () => {
  it("recognises an unknown model so the next candidate is tried", () => {
    expect(isModelNotFound(404, '{"error":{"code":"model_not_found"}}')).toBe(true);
    expect(isModelNotFound(400, "The model `gpt-9` does not exist")).toBe(true);
    expect(isModelNotFound(400, "Invalid model 'sonar-old'")).toBe(true);
  });

  it("does NOT swallow a bad key or exhausted quota", () => {
    // These must fail the provider immediately. Walking the candidate list on a
    // 401 would burn every model in the list against a dead key and then report
    // "no usable chat model", which is the wrong diagnosis entirely.
    expect(isModelNotFound(401, "Incorrect API key provided")).toBe(false);
    expect(isModelNotFound(429, "Rate limit reached")).toBe(false);
    expect(isModelNotFound(500, "server error")).toBe(false);
    expect(isModelNotFound(400, "messages must not be empty")).toBe(false);
  });
});
