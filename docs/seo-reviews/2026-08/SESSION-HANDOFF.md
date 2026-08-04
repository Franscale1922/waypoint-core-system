# Session handoff — 2026-08-03 SEO/AEO work

Written to `docs/seo-reviews/` rather than `.claude/` on purpose: **`.claude/*` is gitignored**
(`.gitignore:48`), so anything left there is untracked, invisible on any other machine, and exposed
to the branch-asymmetric deletion trap. This path is tracked AND excluded from `vercel.json`'s
`ignoreCommand`, so it costs no deploy.

---

## State

| | |
|---|---|
| Branch | `seo/title-budget-and-glossary` |
| HEAD | `e8b0f3b` |
| Pushed | yes, upstream set |
| Merged | **no** |
| Deployed | **no** |
| `main` | `1199a52` |

Everything before this branch is already merged and live on `main`.

---

## 🔴 The one blocking item

**The mandatory adversarial Codex review has not run on `e8b0f3b`.** Everything else is finished and
verified. This is a hard gate under CLAUDE.md and the reason the branch is unmerged.

```bash
node scripts/codex-review.mjs --target src/data/glossary.ts --round 1
```

Then read `.codex-reviews/findings-round-1.md` — **the findings file, never the transcript**.
Reproduce every finding against the real code before acting; act or decline with a stated reason.
`--diff` is useless here: the tree is clean, so it would review nothing and report a false all-clear.

After the review passes, open the PR and merge. **Merging deploys** (`src/` is outside the ignore
list) and the production build runs `prisma db push` against the live database. The visitor-visible
change is shorter `<title>` tags sitewide, FAQs on 8 more glossary pages, and a corrected date on
`/investment`.

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

1. **Codex review** (above). Blocking.
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
