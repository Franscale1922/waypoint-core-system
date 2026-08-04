# Session handoff — 2026-08-03 SEO/AEO work

Written to `docs/seo-reviews/` rather than `.claude/` on purpose: **`.claude/*` is gitignored**
(`.gitignore:48`), so anything left there is untracked, invisible on any other machine, and exposed
to the branch-asymmetric deletion trap. This path is tracked AND excluded from `vercel.json`'s
`ignoreCommand`, so it costs no deploy.

---

## State

| | |
|---|---|
| Branch | `seo/title-budget-and-glossary` (merged and deleted) |
| Merged | **yes**, 2026-08-04, squashed as `9f746e9` |
| Deployed | **yes**, production |
| `main` | `9f746e9` |

Everything in this branch is now merged and live. The rows above read "no" until 2026-08-04;
they are updated rather than appended so a later session cannot read the stale state first.

---

## ✅ The blocking item — CLEARED 2026-08-04

**The mandatory adversarial Codex review ran, and PR #21 merged as `9f746e9`.** Two round-1 runs,
riskiest code first, into separate output directories:

```bash
node scripts/codex-review.mjs --target scripts/aeo-audit.mjs --round 1 --out .codex-reviews/aeo-audit
node scripts/codex-review.mjs --target src/app/lib/structured-data.ts --round 1 --out .codex-reviews/structured-data
```

**`--out` is not optional.** Both runs are round 1, and the wrapper writes
`<out>/findings-round-<N>.md`, so without it the second run silently overwrites the first
(`scripts/codex-review.mjs:229`). Anyone repeating this pattern must separate the directories.

Result: `aeo-audit.mjs` 2 high / 4 medium / 2 low, `structured-data.ts` 0 high / 2 medium / 1 low.
**`--target` reviews the whole file, not the branch diff**, so 10 of the 11 findings are
pre-existing on `main` and were deliberately kept out of a reviewed diff. They are logged as two
follow-up tasks (aeo-audit parsing robustness; JSON-LD identity duplication).

One finding was branch-introduced and is fixed: `hardCodesBrand` tested for the exact long brand
plus the exact `" | Waypoint"` string, so `Why Waypoint Works` and `Foo |Waypoint` both passed the
gate while still rendering the brand twice. It now tests the bare word. Verified zero false
positives first (no article title or `metaTitle` contains the word), then confirmed both cases
fail the gate against a throwaway article.

A separate self-review pass — **labelled as such, since Codex cannot read CLAUDE.md, memory, or
this file** — found what Codex structurally could not: CONTENT-STANDARDS §14 and the glossary route
comment still documented the old `"%s | Waypoint Franchise Advisors"` template this branch
replaced, so the rule and its enforcement disagreed. Both corrected.

---

## What this branch contains

Full reasoning in `technical-aeo-audit.md` beside this file. In brief:

1. **Title budget.** `title.template` was `"%s | Waypoint Franchise Advisors"`, spending 30 of
   Google's ~60 rendered characters on the brand. Now `"%s | Waypoint"`. Four core pages shortened.
2. **Glossary.** 8 more terms given three unique FAQs each, chosen from the 90-day query pull.
   18 of 99 done.
3. **Freshness.** `/investment` had a five-month-stale visible date and no `dateModified` at all.

Verified on the dev server: touched titles render inside 60 chars, `dateModified` emits `2026-08-03`,
all 8 new term pages serve 4 FAQ entries. `npm test` 291 unit + 19 auth green, `aeo-audit` exit 0.

---

## Decisions already made — do not silently reverse

- **Do not thin the `/glossary` index.** It duplicates all 99 definitions and cannibalises its own
  term pages, but it draws 311 impressions and is the best-ranked page on the site. The chosen fix
  is differentiating term pages, not gutting what works.
- **Do not bulk-rewrite the 30 over-budget article titles.** Keywords are front-loaded, so
  truncation costs the brand rather than the match, and retitling a ranking page risks traffic for a
  modest gain. `aeo-audit` reports them as an **advisory, not a gate**, deliberately — a gate would
  force exactly that rushed rewrite.
- **Do not mass-produce the remaining 81 glossary FAQs.** 243 generic FAQs would trade a duplication
  problem for a thin-content problem. Batch them on demand evidence.

---

## Open work, ranked

1. ~~**Codex review.** Blocking.~~ Done 2026-08-04, merged. Two follow-ups came out of it:
   - ~~`aeo-audit.mjs` parsing robustness (it can pass while skipping checks it claims to run)~~
     **DONE 2026-08-04 — see "The aeo-audit follow-up" below. Awaiting merge as PR #23.**
   - JSON-LD identity duplication in `structured-data.ts` — **still open**, blocks nothing.
2. **Differentiate more glossary terms**, evidence-first. Use the MCP:
   `queries_for_page` on `https://www.waypointfranchise.com/glossary` with `days: 90` names exactly
   which terms the index is absorbing.
3. **Add a Piggyback entry.** `piggyback franchise definition` ranks **position 1** with no page
   behind it.
4. **Payroll and freight category articles.** 27 and 10 impressions, landing on `/investment` at
   position 92, no coverage anywhere. Both need sourced investment ranges first; no figures invented.
5. **Three Phase-2 article drafts** still held on `aeo/phase2-drafts-reinvention-spouse`. Publishing
   is its own go-live decision.
6. **September re-measure.** The 18 differentiated terms are the experiment: do they take
   definitional queries off the index?

---

## The aeo-audit follow-up — done 2026-08-04, PR #23

Branch `claude/competent-easley-9eec18`, HEAD `fa7524b`, two commits. **Open, mergeable, all checks
green. Merging is a go-live**: it changes visitor-facing copy (contact hero, site-wide description,
five industry/financing descriptions, the cost pages, two email footers).

The deferred round-1 findings are all closed. Two were **live defects**, not theory:

- **Section 11 counted only the literal em dash**, so copy that *renders* one was invisible.
  `&mdash;` twice in the public contact hero, `&mdash;` in both email footers, and `—` in the
  outreach prompt were all shipping while the gate printed `PASS Section 11: 0 em dashes`.
- **The description gate reported `31/31` and `PASS`** while seven descriptions were over 160:
  `layout.tsx` (168, the site-wide default), five `src/data` values (166-183), and the cost-page
  template (196-206 rendered). It only ever opened `page.tsx`.

Codex's stated symptom for the second was **wrong** (it claimed the gate could report `0/0`; it
reported `31/31`). The hole underneath was real and larger than described. Reproduce before fixing.

**Metadata is now read from the TypeScript AST.** The hand-rolled scanner leaked nine fail-open
paths — spreads, quoted keys, shorthand, computed keys, arrow-exported `generateMetadata`,
re-exports, `page.jsx`, string concatenation — each of which read as "absent" and exempted the
route. Front matter is parsed with `gray-matter`. Both mean the script now needs `node_modules`; it
no longer runs on a fresh clone before `npm install`. CI installs first, the hook is always local.

Round 2 on the result returned **0 high** (from 3). Four new mediums it found are fixed too.

### Do not reverse these

- **The over-60-char title report stays an advisory.** Unchanged from the decision above, but now
  `tests/unit/aeo-audit.test.ts` asserts an over-budget title still exits 0. If that test goes red,
  someone has turned it into a gate.
- **`aeo-desc-dynamic:` needs a reason, in a comment.** A bare token, or the token inside a string,
  deliberately does not silence the gate. Five dynamic routes carry real reasons.
- **Declined, and tracked separately:** the pre-push hook audits the *working tree*, not the commits
  being pushed, so an uncommitted fix can let a bad commit through. True of all three checks in that
  hook. The safe fix reads the pushed tree; a stash-based one risks losing uncommitted work.

91 tests, each paired with the mutation that must break it. One of them originally passed by
construction and was rewritten — worth remembering that a green test proves nothing until you have
watched it go red.

---

## Things that will mislead you if you do not know them

- **Search Console withholds ~65% of a page's impressions** under its anonymised-query threshold.
  For `/glossary`, 93 named queries account for ~97 of 279. Every query-level claim describes about
  a third of reality. This is permanent.
- **The Search Console MCP works, on this laptop only.** ADC is per-machine. See the
  `search-console-mcp-adc-scope` memory for the three gates and their misleading errors.
- **`franchise-investment-by-category`'s position 3.3 is not evidence of anything.** Every visible
  query serving it is a brand lookup (`bonkers corner franchise cost` at position 1.0). This session
  cited it twice as proof reference-table content works, then withdrew it.
- **August's figures were restated** after the generator was fixed: 985 → 938 impressions,
  22.8 → 26.5 average position. Same month, re-derived correctly. Older numbers in merged PR bodies
  are pre-restatement.
- **`agentopus` MCP** is authenticated but its tools need a fresh session to appear.
