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
| `main` | `aaa8437` — PR #22 **merged and deployed green 2026-08-04**; #24/#25 before it |
| `seo/investment-selection-intent` | **merged as #25** (`24530c1`), branch deleted |
| `seo/auv-cluster` | **merged as #24** (`c4dd163`), branch deleted |
| `seo/structured-data-entity-graph` | **merged as #22** (`aaa8437`). Remote branch `b3ad9b5` still exists on purpose: PR #26 is based on it |
| `claude/beautiful-napier-ede2fc` | `0614c7c` — **PR #26 open**, VideoObject validation. **Needs a rebase, not a retarget — see below** |
| `claude/competent-easley-9eec18` | **PR #23 open**, aeo-audit gate hardening, base `main`, checks green. Merging is a go-live |
| Working tree | clean (the 3 untracked dirs `.n8n-backups/`, `.skill-edits/`, `expo-2nd-act/` are **not ours — never stage them**) |

---

## ✅ The blocking item is closed

**The mandatory adversarial review ran on both branches 2026-08-04.** Full record, including every
finding logged but not fixed, is in `ADVERSARIAL-REVIEW-2026-08-04.md` beside this file. Summary:

- **Codex round 1 on the code branch: 0 high findings** across three runs (branch diff, and both
  whole files). Two Mediums were real and branch-introduced *in effect*, and were fixed in `f52281d`
  before merge: the newly visible FAQ contradicted the page's own liquid-capital figures in three
  places and the Liquid Capital glossary entry, and it shipped undated investment ranges against
  Section 6. Everything else was pre-existing and is logged in the review doc.
- **`seo/auv-cluster` got a Claude pass, labelled self-review.** No changes required.

**Two method notes worth carrying forward:**

1. **Review the diff by writing it to a patch file and `--target`ing that.** `--target` on a source
   file reviews the whole file with no idea what changed, and `--diff` is vacuous on a clean tree.
   The patch-file run is what surfaced both real defects.
2. **`--out` is not optional** when several runs share a round. The wrapper keys the findings path on
   `--round` alone (`scripts/codex-review.mjs:229`), so same-round runs overwrite one another. Do not
   raise `--round` instead: the round selects the reviewer persona, so it changes what gets reviewed.

**The defect class that started all this is still unguarded.** `verify-schema.mjs` never compares
schema against visible copy, and `verify-links.mjs` validates only `relatedSlugs` frontmatter (not
`.tsx` hrefs or inline markdown links). The investment fix is sound for that one page but is not
structurally enforced. See "The gap worth acting on separately" in the review doc.

> **Correction (2026-08-04, PR #23):** this paragraph originally opened "`aeo-audit.mjs` never reads
> `src/`". That was wrong even when written — `CODE_DIRS = ["src"]` has driven the Section 11 em-dash
> walk for as long as that gate has existed. It now also reads route metadata and `src/data`
> descriptions and titles. The true statement is the narrower one left above: nothing compares
> **schema against rendered copy**. Do not plan around the deleted sentence.

---

## 🟡 The open structured-data stack (added 2026-08-04, separate from everything above)

Two branches sit in a stack that has **not** reached `main`. They are independent of the #24/#25
work and were developed in parallel worktrees.

```
main (aaa8437)  <- base branch MERGED here as #22, deployed green 2026-08-04
 └─ seo/structured-data-entity-graph  b3ad9b5   merged as #22; branch kept alive for #26
     └─ claude/beautiful-napier-ede2fc 0614c7c  PR #26, base = the branch above
```

**The base merged as #22 on 2026-08-04. PR #26 now needs a REBASE, not a retarget.**

The original plan here said "merge base first, then #26", which assumed the base would merge with
its SHAs intact. It did not: this repo squash-merges PRs (see the `(#21)`/`(#24)`/`(#25)` suffixes
in `main`), so #22 collapsed the five base commits into one NEW commit `aaa8437`. Those five SHAs
now exist nowhere in `main`'s history, so simply retargeting #26 at `main` would replay all five as
if they were unmerged, conflicting against the squashed copy already there.

The fix is one command, run by whoever owns that branch:

```bash
git rebase --onto origin/main aad80e6 claude/beautiful-napier-ede2fc
```

That drops the five already-merged commits and keeps only #26's own two (`cad09e6`, `0614c7c`).
Then retarget the PR to `main` and force-push the branch.

**It was deliberately NOT done in the #22 session**, because it rewrites published history on a
branch a background session may still hold, and force-pushing another session's branch silently is
exactly the destructive move that needs a human decision first. The remote base branch
`seo/structured-data-entity-graph` was therefore left undeleted, so #26 is not broken in the
meantime: it still shows a clean 2-commit diff against its existing base.

**Do not merge #26 into its current base.** That base is already in `main`; merging there would
park the VideoObject work on a dead branch instead of shipping it.

**`seo/structured-data-entity-graph` (shipped as #22)** — makes `/about#kelsey` the one
authoritative Person node, stops `toWww` rewriting lookalike hosts, and validates every date bound
for JSON-LD (`schemaDate`, rejecting unquoted YAML dates rather than laundering an already-rolled-over
value). Codex rounds 1 to 3 ran on it; round 3's findings were acted on in `aad80e6`.

Verified against the **live site** after deploy, not just in CI: the homepage graph emits
`founder -> {"@id": ".../about#kelsey"}`, business `sameAs` 7 and Person `sameAs` 4 with **0
overlap**, and `/about` now serves exactly **one** Person node with one description (it served two,
under the same `@id`, with conflicting descriptions). All 45 articles keep both dates under the
stricter validator, so nothing regressed.

Two corrections to the review that raised this, worth keeping because the numbers were quoted
around: the two `sameAs` lists shared **8** URLs, not seven, and `toWww` had a **third** unbounded
class the review missed (`waypointfranchise.competitor.com`, a plain prefix match, alongside the
`.evil.example` and `@evil.example` forms).

**PR #26** — `videoObjectSchema` validated nothing, and the article path reaches it through an
`as ArticleVideo` cast over frontmatter, so its `string` types were unenforced. Now: required field
invalid drops the whole node with one warning, optional field invalid drops only that property,
never throws. Codex round 1 returned 0 high / 3 medium / 2 low; three accepted, two declined with
reasons in the commit. 98 tests in the file (was 40), 9 mutations each confirmed to turn the suite
red. Findings are in `.codex-reviews/video-object/` (gitignored, so local to that machine only).

Three things worth carrying forward regardless of what happens to these branches:

1. **`schemaDate` is the wrong validator for `VideoObject.uploadDate`.** It accepts a bare
   `YYYY-MM-DD`, which is a valid schema.org Date but is flagged on a video, because Google reads
   `uploadDate` as an instant. The video path needs a mandatory timezone; both patterns are built
   from one `isoDateTimePattern()` source so they cannot drift.
2. **Validate URLs by parsing, never by regex.** The live Vimeo thumbnail carries a `?region=us`
   query string, so a pattern tight enough to be useful removes the only VideoObject on the site.
   And emit the parsed `href`, not the caller's string: `new URL` silently strips whitespace and
   percent-encodes spaces, so a predicate approves a value the caller then ships raw. Codex found
   that one.
3. **`jsonLdGraph` now accepts and filters nullish nodes.** Any factory that validates its input can
   return `undefined`, and the old version destructured unconditionally, so one bad optional field
   became a build failure. Do not reintroduce per-call-site guards.

### Known live defect, not fixed here

**Article FAQ frontmatter is unvalidated**, exactly as the video block was, and unlike the video
case it is **live**: all 45 articles carry `faqs:`, `faqPageSchema` destructures each entry blind,
and a null entry throws during render. Found by the same Codex round and deliberately declined to
keep PR #26 to one concern. A background session was started on it 2026-08-04; if that work did not
land, this is the highest-value item left in this area. It depends on the stack above, so check what
has merged before branching.

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

> Two items that headed this list are now closed and are **not** repeated below: the PR #21 Codex
> review (done, merged), and the `aeo-audit.mjs` parsing-robustness follow-up it produced (done,
> **PR #23**, see "The aeo-audit follow-up" further down). The glossary-differentiation, Piggyback
> and payroll/freight items from the earlier revision of this list were dropped in the 2026-08-04
> rewrite, not completed; re-derive them from Search Console rather than trusting either list.

1. **A schema-vs-visible parity gate**, plus the pre-existing defects the review logged and did not
   fix (nested `<main>` landmarks, which likely affect every marketing page; the `InvestmentTierToggle`
   accessibility set; overlapping tier intervals). All verified real and enumerated in
   `ADVERSARIAL-REVIEW-2026-08-04.md`. The parity gate belongs in `verify-schema.mjs` and is scoped
   work to agree, not a bolt-on.
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
