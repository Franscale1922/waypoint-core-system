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
| `main` | **Do not trust a SHA written here — run `git fetch && git log --oneline origin/main -5`.** This row has been stale twice in one day: it sat at `ed22c03` for eleven commits, and the correction to `4b4f9ea` was overtaken by three more PRs within the hour. As of this line, `5064f5a` (#45), everything deployed green |
| `claude/competent-easley-9eec18` | **merged as #23** (`40f4087`), aeo-audit gate hardening. The "PR #23 open" line this row used to carry was stale |
| `seo/faq-entry-validation` | **merged as #29** (`ed22c03`), remote branch deleted. Validates every FAQ entry and renders the visible FAQ from the same filter |
| `seo/investment-selection-intent` | **merged as #25** (`24530c1`), branch deleted |
| `seo/auv-cluster` | **merged as #24** (`c4dd163`), branch deleted |
| `seo/structured-data-entity-graph` | **merged as #22** (`aaa8437`), deployed green. Safe to delete the remote branch now that #26 is off it |
| `claude/beautiful-napier-ede2fc` | **merged as #26** (`18bf899`), deployed green, after a rebase onto `main` |
| `fix/content-refresh-ref-idempotency` | **merged as #39** (`2e4513f`), deployed green. **Remote branch still exists** — `--delete-branch` did not take, because `gh` cannot run its post-merge local checkout while `main` is checked out in the primary worktree. Safe to delete |
| `claude/quirky-lumiere-fc6b90` | **abandoned**, PR **#36 closed** in favour of #39. **Remote branch still exists**, safe to delete. Do not reopen #36: it was cut before #34 and #37 landed in the same file |
| Working tree | clean (the 3 untracked dirs `.n8n-backups/`, `.skill-edits/`, `expo-2nd-act/` are **not ours — never stage them**) |

### The AI content-refresh write path was hardened eight times in one day (2026-08-04)

`src/lib/githubArticleCommit.ts` went from having no gate in front of it to a stack of them, across
eight PRs on 2026-08-04, many running concurrently in different sessions. In merge order:

| PR | What it closed |
|---|---|
| **#32** `4d48ff9` | Frontmatter dates. `serializeArticle` stamps both; no model-authored date survives |
| **#34** `4b29f56` | The branch name is encoded per path segment, and `getConfig` rejects one that needs it |
| **#37** `902408e` | The required non-date fields (`title`, `excerpt`, `faqs`), which nothing stamps |
| **#39** `2e4513f` | Idempotency. A lost reply to the ref PATCH no longer produces a second identical commit |
| **#40** `61ed643` | Preserves the frontmatter fields the refresh never owned, which it had been dropping |
| **#42** `4b4f9ea` | The slug, which becomes a repository path, is canonical and bound to the frontmatter |
| **#43** `8aedb55` | Compliance gaps in the refresh gate |
| **#45** `5064f5a` | The filename is the article's identity on the write path |

**Read this before touching that file, and expect it to have moved again.** Eight PRs in a day, and
`main` moved twice underneath #39 alone while it was in review — two of the findings #39 declined as
out of scope were closed by other sessions before it merged. `git fetch` and re-read the file rather
than trusting any local copy, this table, or a PR description written hours ago.

That churn is itself the lesson: **verify a defect still exists at PUSH time, not just when you first
read the code.** Several sessions here have built a fix for something another session had already
landed.

Two findings are still open against it, both in `ADVERSARIAL-REVIEW-write-path-2026-08-04.md` beside
this file: the last-writer-wins overlay (item 2 under "Open work" below), and the fact that every
refresh resets the article's PUBLICATION date, so a January article reports August in
`datePublished` and in the sitemap. The second is a **content decision for Kelsey**, not a code
cleanup, and it also resets the `isStale` clock that decides which articles come due.

On the first of those, a prior attempt already exists as **draft PR #41 — read it before rebuilding,
and do not merge it.** `ADVERSARIAL-REVIEW-write-path-CAS-2026-08-04.md` beside this file records
what survives from it, what was decorative, and why the branch itself is not salvageable by merge.

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

## ✅ The structured-data stack is CLOSED (2026-08-04)

Both branches reached `main` and deployed green. Nothing is left open here.

```
main (18bf899)
 ├─ #22  seo/structured-data-entity-graph   entity graph + date validation   MERGED, deployed
 └─ #26  claude/beautiful-napier-ede2fc     VideoObject validation           MERGED, deployed
```

**One trap worth carrying forward, because it will recur on every stacked branch in this repo.**

The plan here originally said "merge base first, then #26", which assumed the base would merge with
its SHAs intact. It did not: **this repo squash-merges PRs** (see the `(#21)`/`(#24)`/`(#25)`
suffixes in `main`), so #22 collapsed five commits into one NEW SHA. The originals then existed
nowhere in `main`, and retargeting #26 at `main` would have replayed all five against the squashed
copy already there.

A squash-merged base needs a **rebase**, not a retarget:

```bash
git rebase --onto origin/main <old-base-tip> <stacked-branch>
```

Here that dropped the five merged commits and kept only #26's own two. It was clean (the two
branches touched disjoint parts of the file), then force-push with `--force-with-lease`, retarget,
verify, merge. **Stack a branch on another in this repo only if you are ready to do this**, or base
it on `main` from the start and accept the noisier diff.

Two safeguards that made it recoverable, worth repeating: the remote base branch was left
**undeleted** until the stacked PR was off it, so #26 was never broken in the interim; and the
rebase waited until the background session owning that branch had **ended**, because force-pushing
a branch another session holds is how work gets silently destroyed.

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

## ✅ FAQ entry validation — PR #29, merged 2026-08-04

Closes the sibling finding Codex raised during #26 and that #26 deliberately declined as out of
scope. All 45 articles carry a `faqs:` block reaching `faqPageSchema` through
`data.faqs as {q,a}[]`, and that cast is not a validation boundary. Both failure modes were
**reproduced against the unguarded code first**: an entry missing `a` shipped `{"@type":"Answer"}`
with no text, and a stray `-` parsed as null threw and took the article render down.

**The part worth carrying forward: validating the schema alone would not have fixed the crash.** The
visible FAQ section renders from the same array and destructures the same entries, so the page still
died one component later. `validFaqEntries` is exported and the article route filters ONCE, feeding
both the markup and the visible section, which also makes the lockstep Google requires structural
rather than a convention. Proven before/after in a browser on identical content: pre-change returned
*"This page couldn't load"*, post-change rendered with 4 valid Q&As in both.

**No article was malformed.** 181 entries across 45 articles pass untouched. This was a latent
hazard, not a live defect, and the commit says so rather than overclaiming.

### Three method notes

1. **Reviewing the diff as a patch file is what found anything.** Two whole-file `--target` runs
   returned eight findings, every one pre-existing. Targeting `git diff > x.patch` returned four, all
   about the actual change, two of which were fixed. This confirms the technique recorded in
   `ADVERSARIAL-REVIEW-2026-08-04.md`; treat whole-file review as near-useless for reviewing a diff.
2. **The regression gate was not running in CI.** `verify-links.yml` selects test files BY NAME and
   `structured-data.test.ts` was not listed, so the new per-article gate ran only in the pre-push
   hook — which `githubArticleCommit.ts` bypasses entirely by writing through the GitHub API. Now
   listed as "Verify Article FAQ blocks", **verified to run and to fail**: a stray `-` injected into
   a real article made the exact CI command exit 1, and exit 0 once restored.
3. **A module-scope `const` regex is a temporal dead zone hazard here.** `scorecardFaqSchema` is a
   module-scope const that calls `faqPageSchema` at import time, so it reaches `isNonEmptyString`
   before any later declaration initializes. Hoisting the invisible-character regex out of the
   function threw "Cannot access before initialization" and would have taken every page down at
   import. The regex lives inside the function on purpose; do not tidy it out.

### Declined, with the measurement behind each

- **"Enforce exactly 4 FAQs"** per `content/new-article-checklist.md`. Counted: 44 articles have
  exactly 4, and `should-you-buy-a-car-wash-franchise.md` has **5**. Asserting it would fail the
  build on existing content. Whether the standard or that article is wrong is a **content decision**,
  still open.
- **Codex round 2's High, "stored XSS via MDX".** Both preconditions are real (production CSP carries
  `'unsafe-inline'`; the GPT-4o refresh commits with only an FTC-language check). The conclusion is
  not: five vectors were tested against a real article and **none executed**. React strips `onerror`,
  blocks `javascript:` URLs, renders script children inert, and the MDX expression never evaluated.
  Recorded as an architectural concern about MDX being executable, **not** as a vulnerability. Do not
  re-raise it as one without a working proof of concept.
- **`contentUrl` pointing at a Vimeo watch page** (`about/page.tsx`, live on `main`) and **slug
  containment on the article route** are both real and both spun into their own tasks rather than
  folded into this diff.

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
2. **The content refresh can overwrite a newer human edit to the same article.** The commit path
   lays its blobs over whatever HEAD currently holds and carries no record of the revision the
   payload was generated from, so it cannot tell that the file moved underneath it. Verified
   pre-existing, byte-identical at `4d48ff9`, and the last finding still open against that file
   after #32/#34/#37/#39/#42 — full write-up in `ADVERSARIAL-REVIEW-write-path-2026-08-04.md`.
   Scoped work to agree, not a bolt-on: carrying each target's expected source blob SHA and
   aborting on mismatch is the contained fix, but publishing through a branch and a PR instead of
   straight to `main` is the better one and **changes what the monthly refresh is**, so it is a
   product decision. Ranked here rather than first because the window is narrow (monthly, minutes
   long) and overwriting articles is the job the refresh exists to do.

   **⚠ A first attempt exists: PR #41, left as a DRAFT on purpose. Read it before rebuilding this.**
   It carries a working `gitBlobSha` (cross-checked against real `git hash-object`, and against
   `git ls-tree` for all 45 articles) and a CAS that both an external Codex review and a Claude
   review agreed was the right shape. **Do not merge it**: it was cut before #42 and has no slug
   validation, so merging it in its own favour would revert `SLUG_PATTERN`, and it re-solves #39's
   idempotency worse than #39 already does. `merge-tree` exits 1 with four conflicts.
   `ADVERSARIAL-REVIEW-write-path-CAS-2026-08-04.md` beside this file records what survives, two
   guards that were decorative (removing `?recursive=1` left every test green while silently
   disabling the whole refresh), and the one change a second attempt most needs: compare against the
   intended OUTPUT blob SHA as well as the base one, and classify an output match as #39's
   `already-applied` rather than as a conflict. Both reviewers found that independently.
   Also still undelivered from the original brief: retry/backoff on 403/429, and a note in the
   function's docs about the ruleset failure mode.

3. **50 remaining Section 10 violations in `src/data/glossary.ts`.** Real, documented as a hard rule,
   and unenforced by any check — `aeo-audit` does not test for item numbers at all. Was 52; the AUV
   entry fixed 2. This is a contained cleanup in one file, plus a candidate gate to add to the audit
   so it cannot regress. Not SEO work, so it was deliberately not folded into these branches.
4. **`freight franchise cost`** — 16 impressions at position 89.4, no coverage. Needs a sourced
   investment range first; invent no figures.
5. **Territory cluster (~19 impressions, pages at 75–86) and `b2b franchises` (16 at 80.8).** Pages
   exist and are not competitive. Deliberately ranked below the above: moving a position-80 page to
   page 1 is a long haul for low volume.
6. **Three Phase-2 article drafts** still held on `aeo/phase2-drafts-reinvention-spouse`. Publishing
   is its own go-live decision.
7. **September re-measure.** Two experiments now run together: the 18 differentiated glossary terms
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
