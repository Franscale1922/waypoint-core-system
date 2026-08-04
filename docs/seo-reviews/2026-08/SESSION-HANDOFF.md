# Session handoff — 2026-08 SEO/AEO work

Written to `docs/seo-reviews/` rather than `.claude/` on purpose: **`.claude/*` is gitignored**
(`.gitignore:48`), so anything left there is untracked, invisible on any other machine, and exposed
to the branch-asymmetric deletion trap. This path is tracked AND excluded from `vercel.json`'s
`ignoreCommand`, so it costs no deploy.

Rewritten 2026-08-04 rather than appended, so a later session cannot read a stale blocking item
first. The PR #21 section that used to head this file is now history and is summarised below.

---

## State

| | |
|---|---|
| `main` | `96e1145` — PR #21 merged and **deployed** 2026-08-04 |
| `seo/investment-selection-intent` | `6ea160d` — pushed, **no PR**, **not reviewed**, not merged |
| `seo/auv-cluster` | `41e4bdd` — pushed, **no PR**, **not reviewed**, not merged |
| Working tree | clean (the 3 untracked dirs `.n8n-backups/`, `.skill-edits/`, `expo-2nd-act/` are **not ours — never stage them**) |

Both branches are cut from `96e1145` and are **independent of each other**. Either can merge first.

---

## 🔴 The one blocking item

**The mandatory adversarial review has not run on either branch.** That is the only reason neither
is a PR. Everything else is finished and verified green (`npm test`, `aeo-audit` exit 0, no new type
errors, both verified rendering in a real browser).

**Codex reviews the code branch only.** `seo/investment-selection-intent` touches
`src/app/(marketing)/investment/page.tsx` and `src/app/components/InvestmentTierToggle.tsx`.
`seo/auv-cluster` is glossary data and article prose, which CLAUDE.md explicitly exempts from
external review; it gets a Claude pass, labelled as self-review.

```bash
git checkout seo/investment-selection-intent
node scripts/codex-review.mjs --target "src/app/(marketing)/investment/page.tsx" --round 1 --out .codex-reviews/investment-page
node scripts/codex-review.mjs --target src/app/components/InvestmentTierToggle.tsx --round 1 --out .codex-reviews/tier-toggle
```

**`--out` is not optional.** Both runs are round 1 and the wrapper keys the findings path on
`--round` alone (`scripts/codex-review.mjs:229`), so without separate directories the second run
silently overwrites the first. Do not raise `--round` instead: the round number selects the reviewer
persona, so that changes what gets reviewed, not just where it lands. Do **not** use `--diff` — the
tree is clean, so it reviews nothing and returns a false all-clear. See the
`codex-review-round-collision` memory.

`--target` reviews the WHOLE file, so expect most findings to be pre-existing rather than from these
branches. Triage before acting: branch-introduced gets fixed, pre-existing gets logged.

After the review passes: open both PRs and merge. **Merging deploys waypointfranchise.com**, and the
production build runs `prisma db push` against the live database. Neither branch touches `prisma/`,
so that is a schema no-op.

---

## What the two branches contain

Full reasoning is in the commit messages, which are deliberately long. In brief:

**`seo/investment-selection-intent`** — Search Console (90d to 2026-08-04) shows `/investment` ranks
**4.1 for "best franchises to own"** (21 impressions) and ~90 for every cost query it was written
for, earning no clicks on either. It now answers that query, brand-free. Two defects found while in
there, both pre-existing and both on the site's highest-impression page:

- **The FAQ schema was invisible.** The schema array and the on-page FAQ array had **zero overlap**:
  four Q&As were declared as structured data that appeared nowhere on the page. Google requires
  FAQPage markup to be visible. Both now derive from one array, so the drift cannot recur.
- **Six rendered Section 10 violations**, including a stat tile that just read "Item 7" and copy
  inside `InvestmentTierToggle.tsx` that a file-level grep of the page missed. Only the rendered-DOM
  check caught the component one.

**`seo/auv-cluster`** — the AUV cluster is the largest coherent, servable demand on the site
(~70 impressions across nine queries; term page at position 37). Adds the restaurant framing and a
"what is a good AUV" answer, clears three Section 10 violations, drops an invented "15% vs 8%
operating margins" illustration that broke Section 1, and doubles inbound links from 2 to 4.

---

## Decisions already made — do not silently reverse

- **No "best franchises" listicle, ever.** CONTENT-STANDARDS Section 2 bans named brands outright,
  "hard rule with no exceptions". This is a repo rule, not just FTC caution. The compliant answer to
  that query is that its premise is wrong, which is what shipped.
- **`/investment`'s title stays cost-first.** Only the description spans both intents. Re-cutting a
  title shipped the same day is churn.
- **Do not thin the `/glossary` index** (carried over, and now better supported — see below).
- **Do not bulk-rewrite the 30 over-budget article titles.** See the measurement below; the reason
  recorded in the previous handoff was wrong even though the conclusion was right.
- **Do not mass-produce the remaining 81 glossary FAQs.** Differentiate on demand evidence.

---

## Beliefs corrected this session — do not re-adopt the old ones

These were each stated confidently somewhere upstream and are wrong. Re-deriving them would waste a
session or cause harm.

1. **The glossary cannibalisation thesis HOLDS. An earlier draft of this file said it did not; that
   was wrong and was corrected the same session.** The full 205-row query pull confirms the
   `glossary-index-cannibalisation` memory: roughly 26 definitional queries rank **position 1 to 3
   on the index**, including `what does auv mean` at **2** while the AUV term page sits at 37, plus
   `what is a fdd document`, `how to become a franchisee`, `turn key business`,
   `what is franchise churning` and `piggyback franchise definition` all at **1**. Many are terms
   that have their own glossary page.

   **How the wrong version happened, because it will happen again:** a 40-row `queries_for_page`
   pull returns queries a–c (see the alphabetical-truncation note below). That slice held two
   unfavourable data points (`auv meaning franchise` at 83, `common franchise terms` at 97) and
   little else definitional, so it read like a refutation. It was a sampling artifact. Never draw a
   conclusion about "what this page ranks for" from a truncated pull.

   Still true from that analysis, and worth keeping: the index's 792 impressions are mostly
   worthless. The overwhelming majority of the 205 queries are brand-cost lookups skewed to India
   and Pakistan (`haldiram`, `kidzee`, `monginis`, `khaadi franchise cost in pakistan`), plus junk
   (`chris brown net worth`, `bojangles pronunciation`) and AI-assistant prompt leakage. At 0.13%
   CTR the ranking converts nothing. So: cannibalisation is real AND the traffic being cannibalised
   is low value. The standing decision (differentiate term pages, do not thin the index) is
   unchanged and is now better supported, not weaker.
2. **Retitling the 30 over-budget articles addresses ~34 impressions.** Title length is a CTR lever;
   CTR only operates on page 1. Only 6 of the 30 are on page 1 and they draw ~34 impressions
   between them in 90 days. 11 of the 30 have **zero** impressions, so the recorded reason ("risks
   traffic on a ranking page") was wrong — there is almost no traffic to risk. Right conclusion,
   wrong reason. Retitle a page when it reaches page 1, as a follow-on to whatever got it there.
3. **"franchise opportunities at position 2.9" is not a real page-1 ranking.** 18 impressions is far
   too few for that head term; a genuine position-3 would produce thousands. Same trap already
   flagged for `franchise-investment-by-category`. Only `best franchises to own` looks durable.
4. **Piggyback should drop, not rise.** The impression-sorted query list includes every query with
   ≥2 impressions and Piggyback is not in it, so it has **≤1 impression in 90 days**. Position 1 for
   something nobody searches is worth ~nothing. The previous handoff ranked it #3.
5. **"Payroll and freight" is half right.** `freight franchise cost` is real (16 impressions at
   89.4). Payroll does not appear at all, so ≤1 impression. Do freight, drop payroll.
6. **Section 10 in articles was a false alarm.** An initial count of 74 violations was wrong: all 22
   article hits are inside `fdd-decoded-what-actually-matters.md`, the one explicitly exempt
   article. **The articles are clean.** The real violations are in `src/data/glossary.ts`.

---

## Open work, ranked

1. **The adversarial review** (above). Blocking, and the only thing between here and merge.
2. **50 remaining Section 10 violations in `src/data/glossary.ts`.** Real, documented as a hard rule,
   and unenforced by any check — `aeo-audit` does not test for item numbers at all. Was 52; the AUV
   entry fixed 2. This is a contained cleanup in one file, plus a candidate gate to add to the audit
   so it cannot regress. Not SEO work, so it was deliberately not folded into these branches.
3. **`freight franchise cost`** — 16 impressions at position 89.4, no coverage. Needs a sourced
   investment range first; invent no figures.
4. **Territory cluster (~19 impressions, pages at 75–86) and `b2b franchises` (16 at 80.8).** Pages
   exist and are not competitive. Deliberately ranked below the above: moving a position-80 page to
   page 1 is a long haul for low volume.
5. **Three Phase-2 article drafts** still held on `aeo/phase2-drafts-reinvention-spouse`. Publishing
   is its own go-live decision.
6. **September re-measure.** Two experiments now run together: the 18 differentiated glossary terms
   from PR #21, and whether the built-out AUV page moves off position 37. AUV is the cleaner test,
   because it is the only term page with demand behind it.

---

## In flight elsewhere — check before editing these files

Two background sessions were started 2026-08-04 from task chips and may have landed work:

- **`scripts/aeo-audit.mjs`** — hardening its parsing against the Codex round-1 findings (the
  description gate silently skipping unparseable metadata, the em-dash gate missing frontmatter and
  HTML escapes, CRLF, YAML excerpts, FAQ counting). **Confirmed live this session:** the audit
  reported an over-length description at the wrong line number, which is that exact defect.
- **`src/app/lib/structured-data.ts`** — JSON-LD identity duplication (`founder` creating an
  anonymous Person instead of referencing `/about#kelsey`, identical `sameAs` on Person and
  LocalBusiness, unbounded `toWww` hostname match).

Neither branch here touches those files, so there should be no conflict, but `git fetch` and check
before assuming.

---

## Things that will mislead you if you do not know them

- **Search Console withholds ~65% of impressions.** Every query-level claim above describes about a
  third of reality. Permanent, not a gap to close.
- **`queries_for_page` truncates ALPHABETICALLY, not by volume.** Rows tie at 0 clicks and then sort
  by key, so a 40-row pull returns queries starting a–c and looks like a top-40. This bit twice this
  session. `top_queries_by_impressions` sorts correctly; use it for anything ranked.
- **The Search Console MCP works on this laptop only** (ADC is per-machine). See the
  `search-console-mcp-adc-scope` memory.
- **A skipped deploy presents as a CANCELED deployment**, not a failure. Agent-only and
  `docs/seo-reviews/` pushes are skipped by design.
- **The Vercel project is `waypoint-core-system`** (`prj_txOXYLrWsCZoRW202OcbO7gBrvaM`), team
  `team_FyOCvs8tn3Upspe88X6QOk42`. The `velvet-armstrong` name in an older memory does not resolve.
- **`npx tsc --noEmit` is red on `main`** in three `tests/unit/` files. Pre-existing, unrelated to
  any of this work, and **not build-blocking** — proven by these commits building READY on Vercel.
  Do not try to "fix" it as part of this work, and do not treat it as a regression.
- **The site draws 17 clicks per 90 days.** Everything above competes for tens of impressions. The
  binding constraint is not page quality; it is that most current demand is brand-cost lookups from
  markets Waypoint cannot serve. No amount of on-page work fixes that.
