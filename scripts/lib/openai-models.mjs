// scripts/lib/openai-models.mjs
//
// Choosing which OpenAI chat model to use, without letting a retired model name
// silently blank the AI-citation report and without letting a discovery step
// silently pick something expensive.
//
// WHY THIS IS NOT THE GEMINI APPROACH
// -----------------------------------
// For Gemini the rule is "ask the API and take the newest", which is safe because
// that account is on a free tier: the worst case is a fast model. OpenAI bills per
// token and its newest tier is usually its priciest, so newest-first would let a
// routine monthly job quietly move from a mini model to a reasoning model at
// several times the cost, with nothing in the report to say so.
//
// So the pinned list is the normal path and discovery is the fallback. Cost stays
// predictable in the ordinary case, and the job still heals itself if every pinned
// name is retired at once.
//
// The other shape difference: Gemini's endpoint reports which models support
// generateContent. OpenAI's returns `id`, `created` and `owned_by` with no
// capability field, so chat-capable has to be inferred from the id. `created` is a
// real unix timestamp, which at least makes "newest" sortable rather than guessed
// at from version strings.

/**
 * Tried in order before any discovery happens. Cheapest first, and every entry is
 * a small/cheap tier on purpose. Editing this is the intended way to change which
 * model the report uses.
 */
export const PINNED_CHAT_MODELS = ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"];

// Ids that are chat-shaped but are not general chat completions endpoints.
const NOT_CHAT = /audio|realtime|transcribe|tts|image|embedding|moderation|instruct|search|dall-e|whisper|codex/i;

// Cheap tiers, in the order we would rather pay for them.
const CHEAP_TIERS = [/nano/i, /mini/i];

/**
 * Orders discovered models into a cost-safe fallback list.
 *
 * @param {Array<{id:string, created?:number}>} models  raw `data` from GET /v1/models
 * @param {{exclude?: string[]}} [options]  ids already tried, so they are not repeated
 * @returns {string[]} ordered ids, cheapest tier first and newest within a tier
 */
export function orderChatModels(models, options = {}) {
  const exclude = new Set(options.exclude ?? []);

  const usable = (models ?? [])
    .filter((m) => typeof m?.id === "string")
    .filter((m) => /^gpt-/i.test(m.id))
    .filter((m) => !NOT_CHAT.test(m.id))
    // Dated snapshots like gpt-4o-2024-08-06 pin behaviour to a date and are
    // retired sooner than the floating alias, so prefer the alias.
    .filter((m) => !/-\d{4}-\d{2}-\d{2}$/.test(m.id))
    .filter((m) => !exclude.has(m.id));

  const tierOf = (id) => {
    const i = CHEAP_TIERS.findIndex((re) => re.test(id));
    return i === -1 ? CHEAP_TIERS.length : i;
  };

  return usable
    .sort((a, b) => tierOf(a.id) - tierOf(b.id) || (b.created ?? 0) - (a.created ?? 0))
    .map((m) => m.id);
}

/**
 * True when a response means "that model name is not valid", as opposed to a real
 * failure like a bad key or exhausted quota. Only the former is worth retrying
 * with a different name.
 */
export function isModelNotFound(status, body) {
  if (status !== 404 && status !== 400) return false;
  return /model_not_found|does not exist|invalid model|unknown model/i.test(String(body ?? ""));
}
