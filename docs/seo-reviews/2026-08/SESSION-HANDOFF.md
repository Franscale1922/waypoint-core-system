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
| `main` | **Do not trust a SHA written here — run `git fetch && git log --oneline origin/main -5`.** This row has been stale twice in one day: it sat at `ed22c03` for eleven commits, and the correction to `4b4f9ea` was overtaken by three more PRs within the hour. As of this line, `f4af4f7`, everything deployed green. It moved TWICE during the #47 session alone: #44 landed while the plan was being written and #46 while the code was, and #46 edited both files being worked on. It moved again during the #51 session, from `f84055c` to `f4af4f7` between the branch being cut and the first commit landing |
| `gate/claude-md-directive-lint` | **merged as #52** (`a63401f`) on 2026-08-09, deployed green. **Remote branch deliberately NOT deleted** — the `CLAUDE.md` paragraph it adds names the clean tips as "`main` and the branch that added this gate", so deleting it would falsify a sentence in its own commit. Adds a pre-push lint of `CLAUDE.md`'s slash commands, main tips only. ⚠ Its production deploy re-synced the production DB — see the section below the State block |
| `fix/webhook-allowlist-accuracy` | **merged as #51** (`b9920bf`), deployed green, remote branch deleted. Corrected a security-allowlist entry that claimed a signature check the route has never had, and fixed the same falsehood in six other places. See the section below the State block |
| `fix/unsubscribe-recoverability-and-residuals` | **merged as #48** (`767bd78`), deployed green, remote branch deleted. Closed the residual PR #44 findings and made a wrong opt-out reversible. See the opt-out section below |
| `claude/beehiiv-optout-sync` | **merged as #49** (`d416a1f`), deployed green. Carries beehiiv opt-outs into `SuppressionList`; webhook registered and proven in production with a real delete event. See the opt-out section below |
| `claude/competent-easley-9eec18` | **merged as #23** (`40f4087`), aeo-audit gate hardening. The "PR #23 open" line this row used to carry was stale |
| `seo/faq-entry-validation` | **merged as #29** (`ed22c03`), remote branch deleted. Validates every FAQ entry and renders the visible FAQ from the same filter |
| `seo/investment-selection-intent` | **merged as #25** (`24530c1`), branch deleted |
| `seo/auv-cluster` | **merged as #24** (`c4dd163`), branch deleted |
| `seo/structured-data-entity-graph` | **merged as #22** (`aaa8437`), deployed green. Safe to delete the remote branch now that #26 is off it |
| `claude/beautiful-napier-ede2fc` | **merged as #26** (`18bf899`), deployed green, after a rebase onto `main` |
| `fix/content-refresh-ref-idempotency` | **merged as #39** (`2e4513f`), deployed green. **Remote branch still exists** — `--delete-branch` did not take, because `gh` cannot run its post-merge local checkout while `main` is checked out in the primary worktree. Safe to delete |
| `claude/quirky-lumiere-fc6b90` | **abandoned**, PR **#36 closed** in favour of #39. **Remote branch still exists**, safe to delete. Do not reopen #36: it was cut before #34 and #37 landed in the same file |
| Working tree | clean (the 3 untracked dirs `.n8n-backups/`, `.skill-edits/`, `expo-2nd-act/` are **not ours — never stage them**) |

### PR #52 merged, and its deploy re-synced the production DB (2026-08-09)

`gate/claude-md-directive-lint` merged as `a63401f`. It lints `CLAUDE.md`'s slash commands on pushes
landing on `main`, tip only, so a dead command name cannot rot in the file the way the retired
`verify` command did through three review passes. Adversarially reviewed (Codex round 1, then a fresh
Claude reviewer). 1336 tests pass locally; **28 of them are this gate's and CI does not run any of
them** — `.github/workflows/verify-links.yml` runs a hand-enumerated list of test files and
`tests/unit/pre-push-gate.test.ts` is not on it. Do not read a green `verify` check as coverage of
this work.

It **requires `~/dotfiles` at `fac61de` or later**. On a machine without it, `CLAUDE.md`'s
"no waiver covers two" sentence is false. The Mini needs `cd ~/dotfiles && git pull && ./install.sh`.

**⚠ The production `prisma db push` was NOT a no-op, and that was not predicted.** Read from the
build logs, all three on the same `prisma/schema.prisma`:

| Build | Endpoint | What `db push` said |
|---|---|---|
| `b9920bf` prod, 2026-08-05 | `ep-silent-sky-ad6xraj0…` | *"The database is already in sync"* |
| `99d4367` preview, 2026-08-09 | `ep-blue-heart-adqokukr…` | *"The database is already in sync"* |
| **`a63401f` prod, 2026-08-09** | `ep-silent-sky-ad6xraj0…` | **"🚀 Your database is now in sync … Done in 461ms"** |

Those are Prisma's two *different* messages: the first means no diff, the second means it applied
one. So **production had drifted from the committed schema between 2026-08-05 and 2026-08-09, and
this deploy silently repaired it.** Git shows **zero** changes under `prisma/` between those two
commits, so the drift did not come from our code.

What is bounded, and what is not:

- **Nothing was lost.** Plain `prisma db push` with no `--accept-data-loss` aborts rather than drop
  data; it exited 0. `guard-immutable-tables` also passed on the 10 protected match-workspace tables.
- **The site is healthy** — `/`, `/glossary` and the DB-backed `/api/stats` all 200 after the deploy.
- **The cause is unknown and the evidence is gone**, because the push itself consumed it. The obvious
  suspect — someone running `npm run build` locally, which writes to production — was **checked and
  refuted**: no `.next` in the primary checkout or any worktree is newer than 2026-08-03. No preview
  build in the window used the production endpoint, and the two branch pushes on 08-07/08-08
  produced no deployment at all.

**The durable fix is to make drift visible instead of self-healing**: have the build print
`prisma migrate diff` between the live DB and the schema *before* `db push` runs.

**Done on `fix/report-schema-drift` (2026-08-09).** The key finding was that the diff was
**already being computed and thrown away**: `scripts/guard-immutable-tables.mjs` runs exactly
`prisma migrate diff --from-url … --to-schema-datamodel prisma/schema.prisma --script` before
`db push`, and on `a63401f` it held the drift SQL in hand, found nothing destructive among the 10
protected tables, printed its one ✅ line and discarded it. So the fix prints what that call
already returns rather than adding a second `migrate diff`; **`vercel.json` is unchanged**, and
production gains no extra round-trip.

- **Report-only, by contract.** It never changes the exit code. Failing the build on drift would
  deadlock every deploy behind an out-of-band change (a Neon-side index, an extension) including
  the deploy that would repair it, with `--no-verify` banned and no valve. The destructive case
  stays fail-closed in `findDestructiveOps`, untouched.
- **Grep a build log for `SCHEMA_DRIFT_DETECTED`** (or `SCHEMA_DRIFT_NONE` on a clean build).
- Two traps were measured, not assumed, against the installed Prisma 6.19.2: a clean diff prints
  `-- This is an empty migration.`, **not** an empty string, so `sql.trim() === ""` would report
  drift on every build; and the update-notifier banner carries no `;`, so if it ever preceded the
  SQL it would merge with the first real statement and **hide** genuine drift. The banner is
  suppressed via `PRISMA_HIDE_UPDATE_MESSAGE` and stripped line-wise before splitting.
- Verified end-to-end against a throwaway **local** Postgres (never production): in-sync reports
  `SCHEMA_DRIFT_NONE` exit 0; a drifted DB lists the statements exit 0; a dropped protected column
  prints the drift **first** and then `GUARD_BLOCKED` exit 1.

**The adversarial review found a pre-existing fail-open in the guard, unrelated to drift reporting.**
Codex round 1 flagged it and it **reproduced exactly**: `splitStatements`/`splitTopLevel` stripped
`--` comments by regex and split on a bare `;`, both blind to string literals, so

```
ALTER TABLE "MatchScore" ALTER COLUMN "note" SET DEFAULT 'https://x--y', DROP COLUMN "rank";
```

truncated at the `--` inside the literal, the `DROP COLUMN` clause vanished, and
`findDestructiveOps` returned an **empty array** for a destructive change to a protected
decision-record table. A guard whose whole job is preventing silent loss of immutable records was
defeatable by a default value containing two hyphens. Replaced with a quote-aware scanner
(`sqlSplit`) handling `--` and nested block comments, `'…'` with `''` escapes, `"…"` identifiers and
`$tag$…$tag$` bodies. This is a **security-relevant fix that predates this PR** and is the most
important thing in it.

Two further review outcomes, recorded so they are not re-litigated:

- **Declined (Codex medium):** the report and `db push` are separate observations, so a change
  landing in the seconds between them is applied without appearing in the report. Closing it means
  applying the captured SQL ourselves instead of calling `db push`, which is a far larger and
  riskier change. Knowingly accepted and now documented in the script header: the report narrows
  the blind spot from "always" to "a few seconds", it does not eliminate it.
- **Applied but NOT reproduced (Codex medium):** `process.exit()` can discard queued stdout on a
  pipe. All four exit paths now set `process.exitCode` and return. **The predicted truncation did
  not reproduce here** — 1.3 MB through a pipe lost nothing on macOS — so this is defensive
  hardening, not an observed bug fixed. The real mitigation is the 200-statement cap.
- Self-found: the report used to print `SCHEMA_DRIFT_NONE` even when output was unclassifiable,
  a false all-clear. It now prints `SCHEMA_DRIFT_UNKNOWN` in that case and never asserts sync it
  cannot prove.

⚠ **Known limitation:** this makes drift visible in the build log, but nothing alerts on it. Someone
still has to read the log or grep it. Alerting was not built and was not in scope.

### The opt-out path became reversible, and grew a second channel (2026-08-05)

Three PRs on one path, in merge order. Read all three before touching suppression: each one's fix
depends on the previous one's shape.

| PR | What it closed |
|---|---|
| **#44** `45ae80c` | Lead-capture hardening. `suppressEmailEverywhere` made an opt-out cover the ADDRESS, not one row |
| **#48** `767bd78` | Made a wrong opt-out reversible (`unsuppressEmail` + `/api/admin/resubscribe` + an admin UI), and stopped `reactivate_existing` resurrecting people |
| **#49** `d416a1f` | Carried beehiiv's own opt-outs into `SuppressionList`, so a channel we could not see stopped being invisible |

**Invariants that are easy to break without noticing:**

- **`unsuppressEmail` clears ONLY the exact reason `"unsubscribed"`.** That is the string
  `suppressEmailEverywhere` writes and nothing else. Any new suppression source must use its own
  reason, or it silently becomes reversible from the admin screen. #49's `beehiiv-unsubscribe` /
  `beehiiv-deleted` are correct by construction for this reason.
- **Writing the canonical `SuppressionList` row is sufficient.** Every nurture `shouldSuppress`
  calls `isEmailSuppressedFailClosed`, and `senderProcess` queries `SuppressionList` with no
  `reason` filter. You do not also need to touch the six per-list flags to stop mail.
- **`reactivate_existing: false` does NOT protect a DELETED beehiiv subscriber.** It refuses to
  revive an *inactive* record; a deleted one is gone, so a plain subscribe mints a new active one.
- **Never treat a vendor's current state as independent confirmation** when our own code can write
  to it. #49's webhook compares beehiiv's subscription `created` against the event timestamp for
  exactly this reason: an address we resurrected ourselves would otherwise look like proof the
  opt-out was stale, and the "safe" verification would drop real opt-outs.
- **`/api/webhooks/resend` is the INSTANTLY inbound webhook**, named for Resend by history only.
  #48 wrote three comments calling it "the Resend webhook"; **PR #51 corrects them**. The write
  ORDER those comments describe (lead row before `SuppressionList`) is still accurate.

**Still open on this path:**

- **No reconciliation sweep.** A beehiiv webhook that fails to deliver is a permanent silent miss.
  Codex flagged it in both #49 rounds; deliberately deferred at zero subscribers. Revisit before
  the list is real.
- **The "Reverse an opt-out" admin screen has never been exercised on real data.** There is no
  non-production database, so nobody has clicked it. An address with no opt-out on record is the
  safe dry run: it writes nothing and reports "No opt-out found".
- **beehiiv's status code for a previously-departed address is unverified.** `subscribeToBeehiiv`
  therefore treats only 5xx and network errors as retryable; a 4xx is logged and reported as
  skipped. If signups ever look like they are vanishing, read the `[beehiiv] Subscribe failed` logs
  before assuming the endpoint is healthy.

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

**Both findings that were open against it are now CLOSED**, on 2026-08-05, within about an hour of
each other and by different sessions:

- The publication-date reset landed as **#46** (`a5ef595`). `serializeArticle` now stamps only
  `updatedAt` and preserves `date`, and `isStale` schedules from `updatedAt ?? date`. The two had to
  move together: the overwrite was a bug, but it was load-bearing for scheduling, and fixing the date
  alone would have made every article permanently stale one cadence after publication.
- The last-writer-wins overlay landed as **#47** (`c8546b8`), deployed green. Each payload carries
  the git blob SHA of the file it was generated from, checked against the branch's tree before any
  blob is created; an article whose file moved stands down and is reported rather than overwritten.

Nothing is open against this file today. What is left is the residual noted at the bottom of #47's
module header: a force-reset of the branch is invisible to a check that compares FILE CONTENTS, and
closing it needs GraphQL `createCommitOnBranch(expectedHeadOid:)`, which is a rewrite of the module
rather than an addition.

**PR #41 is CLOSED** (2026-08-05), superseded by #47. It was never merged, for the reasons below.
Its review doc is still worth reading as a record of how a green test suite hid two decorative
guards: `ADVERSARIAL-REVIEW-write-path-CAS-2026-08-04.md` beside this file records
what survives from it, what was decorative, and why the branch itself is not salvageable by merge.

---

## ✅ MERGED and deployed — PR #51, webhook allowlist accuracy (2026-08-05)

Not SEO work; recorded here because this is the repo's one handoff doc and a second one is how
state gets lost. **Merged as `b9920bf`, deployed green**: Vercel reported "Deployment has
completed" (a real build, not the ignore-step skip), the live site returns 200, and both
"Verify Internal Links" and "Notify Search Engines on Deploy" passed on that SHA. Remote branch
deleted. Gates at merge: `npm test` 1304 + 20 passed, `aeo-audit` PASS, `tsc` 51 errors
byte-identical to the `main` baseline and none in any touched file.

**The deploy was safe for a reason worth reusing, not because it was small.** The PR touches
`src/`, so it is outside `vercel.json`'s `ignoreCommand` and a merge does run `prisma db push`
against the production database. That push was a no-op because the diff contains no `prisma/`
files at all, so the schema already matched. Check that before treating any `src/` merge as
routine; the `db push` is the part with teeth, not the rebuild.

**What it fixes.** `PUBLIC_BY_DESIGN` described `webhooks/resend/route.ts` as "guarded by its own
signature check". There is no signature check and never was: the route calls `verifyBearer` against
`INBOUND_WEBHOOK_SECRET`, a plain string comparison against a static token, and Instantly signs
nothing. The route is also Instantly's, not Resend's; the path name is historical and the directory
is **deliberately not renamed** because that URL is registered in the Instantly dashboard.

**Two things a later session will otherwise rediscover the hard way:**

- **Correcting a name inside a claim does not make the claim true.** `LAUNCH.md` said "Resend
  webhook handles suppression" for `List-Unsubscribe`. Changing it to "Instantly inbound webhook"
  fixed the misnomer and preserved the actual error: those headers point at our own HMAC opt-out
  routes and no webhook is involved. The Claude reviewer missed it because it was checking whether
  the misnomer was fixed; Codex caught it. Re-verify the whole sentence, not the noun you changed.
- **An env-var rename lands in code and not in the provisioning docs.**
  `RESEND_WEBHOOK_SECRET` → `INBOUND_WEBHOOK_SECRET` happened in March 2026. In August,
  `LAUNCH.md`, `hosting-requirements.md` and `ROADMAP.md` still all named the old var (read by no
  code) and none named the new one, which both webhook routes fail closed on. **Following
  `LAUNCH.md` would have deployed `/api/webhooks/resend` and `/api/webhooks/inbound` both dead.**
  All three tables are fixed on this branch. Grep every doc when renaming an env var.

**Known debt this PR records but does NOT fix:** `INBOUND_WEBHOOK_SECRET` is one token shared
across two different trust domains (Instantly-held vs our own scorecard submissions), so a
compromise on either authorizes forged suppression events **and** forged lead records, and neither
integration can be rotated without breaking the other. Splitting it needs a new production env var
plus an Instantly dashboard re-registration, so it is a coordinated change, not a doc edit.

**On the new test.** The descriptions in `PUBLIC_BY_DESIGN` were free prose no assertion read —
every one could have been `""` and the suite stayed green, which is why the false claim survived.
An entry may now claim a signature check only if the route verifies one (proven by mutation:
restoring the original description fails it). It is a narrow lexical backstop and its three known
bypasses are written into the test. Two hardenings were tried and dropped because each would have
failed *accurate* descriptions — do not re-add them without reading that comment first.

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
2. ~~**The content refresh can overwrite a newer human edit to the same article.**~~ **CLOSED
   2026-08-05 as #47 (`c8546b8`), deployed green.** Kept here rather than deleted because two
   sessions in a row started by re-reading this list.

   Each payload now carries the git blob SHA of the file it was generated from, checked against the
   branch's tree before any blob is created. A file that moved makes that article stand down; the
   rest of the batch still commits, and the stand-down is reported in its own section of the summary
   email and in the run's return value. Draft **#41 is closed**, superseded.

   Four things worth carrying forward, because each cost a review round to find:

   - **The bytes on the branch decide whether to write, never a trailer in history.** A trailer
     proves a commit carrying those bytes existed, not that they are still there. Codex round 2
     found this; it was reproduced before fixing. The trailer is now consulted only once the
     compare-and-swap has established there is nothing to write, where its job is naming WHICH
     commit carries them.
   - **The base SHA is compared before the intended output SHA, and the order is load-bearing.**
     A refresh producing bytes identical to its input makes both match; output-first would report a
     batch of pure no-ops as `already-applied` instead of `no-changes`.
   - **`?recursive=1` was confirmed catastrophic against the REAL API, not just in theory.** A
     read-only check of this repo's own tree returns 858 entries and 45 article paths with the flag,
     and 30 entries with **zero** article paths without it (`content` arrives as one
     `type=tree mode=040000` entry). Without the flag every article stands down forever while the
     run reports success. The previous attempt shipped that green.
   - **Publishing through a branch and a PR is still the stricter design**, and is still a product
     decision that changes what the monthly refresh IS. The compare-and-swap is the contained fix,
     not a replacement for that choice.

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
