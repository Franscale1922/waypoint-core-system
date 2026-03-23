---
description: Publishing articles from the Waypoint content queue — use this workflow whenever the intent is to write, draft, or publish new articles. Triggered by natural language like "I want to publish more articles", "let's write some articles", "work through the content queue", "draft the next batch of articles", "add more content to the site", or any similar phrasing that indicates article output is the goal.
---

# Publish Articles Workflow

Use this workflow when Kelsey wants to write and publish new articles from the content queue. She will rarely use the exact slash command — match this workflow from natural language signals like:

- "I want to publish more articles"
- "Let's work through the queue"
- "Write some articles"
- "Add more content to the site"
- "We need more resources"
- "Keep building out the content"
- Any phrasing where the output is new articles on the site

---

## Step 1 — Orient Before Acting

Read the following files in order. Do not skip any.

```
content/CONTENT-CALENDAR.md
content/ARTICLE-QUEUE.md
content/new-article-checklist.md
```

From these, determine:

1. **Current phase** — Which phase are we in? Count the slugs in `content/articles/` and cross-reference the Phase Tracker and Phase 1/2/3 tables in `CONTENT-CALENDAR.md`. If Phase 1 articles are not all published yet, stay in Phase 1.

2. **What's been published** — List the files currently in `content/articles/`. These are live. Do not re-draft articles that already have a file.

3. **What's next** — Identify the next 3 agent-ready (`[ ]`) articles in the current phase, in priority order. Skip any `[~]` articles (those need Kelsey input first — flag them, don't draft them).

4. **Agent gate check** — Before proceeding, confirm:
   - Are all Phase 1 articles published before drafting Phase 2? If not, stay in Phase 1.
   - Are there more than 4 articles committed but not yet indexed in Search Console? If Kelsey hasn't confirmed indexing status, note this but proceed — she will manage Search Console submission.

---

## Step 2 — Confirm the Plan With Kelsey

Before drafting anything, surface a brief confirmation:

> "Here's what I'm planning to draft next based on the current phase and queue:
>
> 1. [Article title] — [Category] — [one-sentence rationale for why it's next]
> 2. [Article title] — [Category] — [rationale]
> 3. [Article title] — [Category] — [rationale]
>
> Any changes before I start? Also flagging: [list any `[~]` items that are next in queue and need your input before they can be drafted]"

If Kelsey has a specific article in mind that differs from the queue, follow her direction — she may have context the queue doesn't reflect. Add her requested article to the queue with appropriate phase assignment before drafting.

---

## Step 3 — Draft Each Article Using the Full Workflow

For each of the 3 confirmed articles, run the complete `/new-article` workflow end-to-end:

```
.agents/workflows/new-article.md
```

Complete **one article fully** (all 9 steps including social drafts and keyword map update) before starting the next. Do not batch-draft without completing the back-linking and pool update steps — it breaks the internal link graph.

**Article drafting order matters.** Draft the highest-priority article first so that if the session ends early, the most important article is already committed.

---

## Step 4 — Note Any `[~]` Blockers

After completing the 3 drafts, report any `[~]` articles that are next in the phase queue and are blocking forward progress. For each:

- State the article title
- State what Kelsey needs to provide before it can be drafted (e.g., "Needs your observations on partner dynamics in the decision process" or "Needs the candidate avatar source documents")

This gives Kelsey a clear action item if she wants to unblock the queue between sessions.

---

## Step 5 — Phase Transition Alert

If the 3 articles just drafted complete Phase 1, note it explicitly:

> "Phase 1 is now complete. All foundation articles are published. Phase 2 can begin in the next session. Recommend checking Search Console to confirm Phase 1 articles are indexed before starting Phase 2."

If transitioning to Phase 3, same alert pattern. Do not start the next phase in the same session — wait for Kelsey's confirmation.

---

## Adding New Ideas to the Queue

If Kelsey mentions a new article idea during or before this workflow:

1. Add it to `ARTICLE-QUEUE.md` with status `[ ]`, category, and a notes field
2. Assign it to a phase in `CONTENT-CALENDAR.md` using this logic:
   - **Getting Started / foundational concept** → Phase 1 (add to bottom of Phase 1 table)
   - **Industry Spotlight for a common/broad category** → Phase 2
   - **Industry Spotlight for a niche or regulated category** → Phase 3
   - **Going Deeper / tactical** → Phase 2 or 3 depending on how specialized
   - Add a one-sentence rationale in the phase table (e.g., "Supports back-linking from existing home services articles")
3. Assign the correct `checklistSlug` using the decision tree in `.agents/workflows/new-article.md` Step 4b
4. Confirm the addition with Kelsey before drafting it in this session (unless she said "add it and write it now")

---

## Notes for This Workflow

- **Don't ask Kelsey how many articles she wants** unless she specifies. Default is 3. If she says "just one" or "do as many as you can," adjust accordingly.
- **Context awareness matters.** If Kelsey mentions something in her message that suggests a specific article ("I was just talking to a candidate about med spas"), treat that as a soft signal to prioritize that article if it's in the queue — even if it's in a later phase. Note the deviation and explain it.
- **The queue is not locked.** Kelsey's real-world knowledge overrides the phase order when she has good reason. Capture the override in the queue notes so future agents understand why the order changed.
