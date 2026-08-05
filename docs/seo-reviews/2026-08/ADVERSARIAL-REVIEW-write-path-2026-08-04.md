# Adversarial review — the AI content-refresh write path (PR #39)

Companion to `ADVERSARIAL-REVIEW-2026-08-04.md`, which covers the SEO branches. This one covers
`src/lib/githubArticleCommit.ts`, the module that commits AI-refreshed articles to `main` through
the GitHub API.

Written here because the tool's own output goes to `.codex-reviews/`, which is **gitignored**
(`.gitignore:60`). That directory lives inside a throwaway worktree, so the findings would have
disappeared with it. `docs/seo-reviews/` is tracked AND excluded from `vercel.json`'s
`ignoreCommand`, so recording them here costs no deploy.

---

## How it was run

`node scripts/codex-review.mjs --target src/lib/githubArticleCommit.ts --round 2` — round 2 is the
security / data-integrity persona, which is the right lens for a write path to `main`.

`--target`, not `--diff`: the tree was already committed, and `--diff` reviews the UNCOMMITTED diff,
so on a clean tree it reviews nothing and returns a confident "no findings". The cost of `--target`
is that it reviews the WHOLE file, so most of what comes back is pre-existing rather than
branch-introduced — which is exactly what happened here, and is why the dispositions below matter
more than the raw count.

Payload checked before sending: env var NAMES only (`GITHUB_TOKEN`, `GITHUB_REPO_OWNER`,
`GITHUB_REPO_NAME`, `GITHUB_BRANCH`), no values, no `.env`, no candidate PII.

Result: 1 high, 4 medium, 0 low. **Every finding was verified against the source before acting**;
none was taken on the tool's word.

---

## Still open — two findings nothing has closed

**A retry can overwrite a newer edit to the same article.** `commitRefreshedArticles` lays its blobs
over whatever HEAD currently holds: it reads the ref, takes that commit's tree as `base_tree`, and
overlays `content/articles/<slug>.md`. Nothing carries the source blob SHA the payload was generated
from, so it cannot notice that the file changed underneath it.

The concrete sequence: attempt 1 builds against `H0`; a human edits `alpha.md`, making `H1`; the
first PATCH fails; the retry rebases the same `H0` payload onto `H1` and replaces the human's
change. Every response looks healthy.

**Verified pre-existing.** The overlay is byte-identical at `4d48ff9`, before any of the write-path
work — `base_tree: baseTreeSha` plus `path: content/articles/${slug}.md`. PR #39 did not introduce
it and did not make it more likely: the pre-#39 retry did the same thing.

Deliberately not folded into #39, which was scoped to ref-update recoverability. The fix is a real
decision, not a bolt-on: either carry each target's expected source blob SHA and abort on mismatch,
or publish through a branch and a PR instead of straight to `main`. **The second option would change
what the monthly refresh is**, so it is a product call, not a code cleanup.

The window is narrow (the refresh runs monthly and takes minutes) and overwriting articles is the
job the refresh exists to do, so this is genuinely lower severity than "High" suggests in isolation.
It is real all the same.

---

**Every refresh resets the article's PUBLICATION date.** `serializeArticle` stamps
`{ ...frontmatter, date: today, updatedAt: today }`, so an article first published in January and
refreshed in August reports `datePublished: 2026-08-04`. The original publication date is not
recovered from anywhere: it is overwritten in the committed file, so each refresh destroys it
permanently.

Both consumers follow it. `resources/[slug]/page.tsx` feeds `date` to the Article node's
`datePublished`, and `sitemap.ts` reads `updatedAt ?? date` into `lastModified`. The article
therefore presents to Google as newly published rather than as long-standing and revised, which
inverts the signal a content refresh is supposed to send, and it does so to the pages the refresh
touches most often.

**Verified pre-existing and still live.** `date: today` predates all of the write-path work: PR #32
added the `updatedAt` stamp beside an overwrite that was already there, and none of #32, #34, #37,
#39, #42 or #45 changed it. Re-read on `main` at `db78a63` before this was written, not assumed.

Deliberately not folded into #32, which was scoped to making dates VALID rather than to deciding
what they should mean. The correct semantics are almost certainly to preserve `date` as the true
publication date and let `updatedAt` carry the revision, which is exactly what the two fields are
for. That is a content decision rather than a code cleanup, and it is **Kelsey's call**: it changes
what the site claims about every refreshed article, and it interacts with `isStale` in
`src/lib/contentRefresh.ts`, which measures staleness from `date` and so currently has its clock
reset by the very refresh it schedules.

Note the second-order effect before fixing it: because `date` is reset on every run, an article's
cadence timer restarts each time, so preserving `date` will also change WHICH articles come due.

---

## Closed — and only two of them by #39

| Finding | Disposition |
|---|---|
| The batch trailer was matched as a SUBSTRING, so prose quoting one answered for it | **Fixed in #39.** A whole line must match. This module's own "could not find out either way" error quotes the trailer by design, so a message pasting that error in would have been read as proof the batch landed |
| `commitMessage` is caller-supplied and was interpolated ahead of the trailer, so a caller could forge a `Refresh-Batch:` line and have one batch answer for another | **Fixed in #39.** A message carrying that key is refused before any request |
| The branch name was interpolated into request URLs unencoded | **Closed by #34** (`4b29f56`), per-segment encoding plus a `getConfig` rejection |
| Runtime validation covered only dates, so a missing `excerpt`, non-string `title` or malformed `faqs` could be committed | **Closed by #37** (`902408e`), `src/lib/frontmatterFields.mjs` |
| Article slugs became repository paths with no validation or duplicate detection | **Closed by #42** (`4b4f9ea`), `SLUG_PATTERN` bound to the frontmatter slug |

The last three were declined in #39 as pre-existing and out of scope, and closed independently by
other sessions working the same file — #34 and #37 while #39 was open, #42 after it merged. Whether
those sessions saw this review is unknown; do not read the table as cause and effect.

The shared failure mode in the two that #39 fixed is worth naming, because it is not the obvious
one: a false positive on "already applied" is **silent**. The run decides the work is published,
returns success, and the articles never land. That is worse than a crash, and it is why the trailer
check is deliberately strict.

---

## Method notes worth carrying forward

**A stateful fake beats a flat stub for idempotency work.** The property under test is "the retry
does not commit again", and that is only meaningful against a server that REMEMBERS the first
attempt. The fake added in #39 addresses trees by content the way Git does, so laying a blob that is
already present over a base tree returns the base tree's own SHA — which is what makes the
"would this commit change anything" check testable rather than assumed. #42 has since extracted it
to `tests/unit/helpers/fake-github.ts`; use that rather than writing another stub.

**Mutation-check every guard, and say the number.** Each of the six guards in #39 was removed in turn
to confirm the covering tests went red. Two mutations that "passed" were rejected as untrustworthy
because their `perl` replacement contained backticks the shell would have expanded — a green result
from a corrupted mutation proves nothing. If a mutation cannot be shown to have applied cleanly, do
not count it.

**A guard the public API cannot reach still needs a test.** `getConfig` rejects every branch name
that needs encoding, so driving `commitRefreshedArticles` cannot distinguish an encoded path from a
raw one, and deleting the encoding would leave every end-to-end test green. #34 handled this by
asserting on `branchRefPaths` directly. The same reasoning applies to the date backstop, which
cannot fire through the public API because `serializeArticle` stamps both dates first.

---

## Evidence

- PR #39, merged `2e4513f`, deployed green. CI `verify` green on `main`; site returns 200.
- Raw tool output: `.codex-reviews/refresh-idempotency/findings-round-2.md` in the worktree that
  produced it. **Not recoverable** once that worktree is removed — this file is the durable copy.
