# Portfolio audit — the regex fail-open pattern PR #53 fixed

**Date:** 2026-08-10 · **Scope:** 25 distinct Franscale1922 remotes (26 checkouts under `~/Projects`),
plus `~/dotfiles` (`claude-dotfiles`), plus the 7 submodule repos under `Social Media/.claude/skills/`.

> Filed under `docs/seo-reviews/` deliberately: it is **tracked** and it is on `vercel.json`'s
> `ignoreCommand` exclusion list, so this document costs no production build and no prod
> `prisma db push`. Both properties were checked — the first draft went to `.claude/`, which is
> deploy-excluded but **gitignored** (`.gitignore:48`, zero files tracked), so it would never have
> been committed and the Mini would never have seen it. Verifying one property and assuming the
> other is the same shape of error this audit is about. That exclusion list is mutable — re-read
> `vercel.json` before trusting this sentence.

---

## The defect

`scripts/guard-immutable-tables.mjs` decided what a SQL "statement" was with regex: strip `--` per
line, split on a bare `;`, split clauses on a bare `,`. All three are blind to string literals, so:

```sql
ALTER TABLE "MatchScore" ALTER COLUMN "note" SET DEFAULT 'https://x--y', DROP COLUMN "rank";
```

truncated at the `--` **inside the literal**, the `DROP COLUMN` vanished, and the guard returned zero
findings for a destructive change to a protected decision-record table. Fixed by `sqlSplit()` in
PR #53 (`8c43502`).

**Generalized:** a check that **shortens or mis-scopes its input** returns **fewer findings**. The
failure mode is a **false PASS** — the dangerous direction. The tell when auditing is that the check
narrows its input before scanning.

**One refinement this audit forced.** Shortening is only half of it. The direction that is unsafe
depends on the check's **polarity**:

| polarity | a match means | unsafe direction |
|---|---|---|
| **prohibitive** (FTC bans, COPPA scan, destructive-SQL guard) | a violation | **narrowing** the input or the pattern's reach |
| **permissive** (`jargon-defined-inline`, `DEFINITION_CUES`) | "this is fine" | **widening** the window |

Both appear below. Mechanically widening every gap matcher would have opened a new hole in the
permissive ones — see §2 and the `DEFINITION_CUES` note.

---

## Tier 1 — reproduced, fixed, shipped

Every row was reproduced against the **real gate** before any code changed, and re-run after.

| # | Repo | Check | PR |
|---|---|---|---|
| 1 | YouTube-Video (= `Kids Videos`) | COPPA Made-for-Kids source scan | [#21](https://github.com/Franscale1922/YouTube-Video/pull/21) |
| 2 | everyx-engine | COPPA Made-for-Kids source scan | [#1](https://github.com/Franscale1922/everyx-engine/pull/1) |
| 3 | waypoint-carousel | FTC earnings gates, HR15 allowlist, URL normalisation | [#3](https://github.com/Franscale1922/waypoint-carousel/pull/3) |
| 4 | x-produce | deployed gate artifact regenerated | [#5](https://github.com/Franscale1922/x-produce/pull/5) |
| 5 | waypoint-compliance | `jargon-defined-inline` sentence window | [#1](https://github.com/Franscale1922/waypoint-compliance/pull/1) |
| 6 | claude-dotfiles | `git-guard` heredoc stripping | [#1](https://github.com/Franscale1922/claude-dotfiles/pull/1) |

### 1–2. COPPA — the Made-for-Kids scanners

`selfDeclaredMadeForKids` is a legal declaration to the FTC. Both repos guard it at source level so
no write site can hard-code a literal; the Kids Videos file says outright that a regression is "a
compliance incident, not a bug".

**Reproduced (Kids Videos):** four fixtures dropped into the scanned tree, `npm run channel-check`
reported **one**.

| fixture | before | cause |
|---|---|---|
| bare literal | CAUGHT | — |
| `//` inside a string literal, same line | **MISSED** | `line.split("//")[0]` |
| block-comment opener sharing the line | **MISSED** | `t.startsWith("/*")` skips the whole line |
| wrapped across lines | **MISSED** | single-line regex |

**Reproduced (everyx-engine):** its `stripLineComment` already masked `scheme://` — an earlier round
of this same fix — but a **bare** `//` inside a literal still truncated. A protocol-relative CDN path
(`"//cdn.example.com/x.png"`) is ordinary content, so no adversary was required.

**Fix:** `blankComments`, a quote-aware pass that recognises comments only *outside* string and
template literals, preserving byte offsets and newlines so match indices still map to lines; whole-file
rather than line-at-a-time. Extracted into `lib/mfkscan.ts` in both repos so it is unit-tested and so
the exploit fixtures live as in-memory strings rather than as files in the tree the guard walks.

**Deliberate trade-off:** literal *contents* are left intact rather than blanked. Blanking them would
hide a declaration inside a template literal's `${...}`, which is real code — re-introducing the very
class of hole. The cost is over-reporting, the safe direction for a prohibitive check.

everyx-engine was **ahead** of Kids Videos here, not behind. The port also carried three of its
upgrades into Kids Videos: quoted/computed-key forms (Prettier's `quoteProps` can produce the quoted
shape from correct code), seven scanned extensions instead of `.ts` alone, and exact-path fixture
skips instead of exempting any file named `_tmp_*`.

**After:** all four fixtures caught at correct line numbers; 227 tests pass; channel-check 33/33
(Kids Videos) and 50 tests / 20 checks (everyx).

### 3. FTC — waypoint-carousel, the gate on all five publish receivers

Three independent defects.

**(a) The earnings/ROI patterns could not cross a newline.** `[^.\n]{0,18}` excludes newline
explicitly; `.` excludes it in both Python and JS. Social copy is routinely line-broken exactly at
that gap. Reproduced against the real `lint_copy`:

| category | one line | line-broken |
|---|---|---|
| 1 — `earn … $250,000` | BLOCKED | **PASSED** |
| 2 — `recoup … investment` | BLOCKED | **PASSED** |
| 13 — `one of my clients … made` | BLOCKED | **PASSED** |

Widened to `[^.]{0,N}` / `[\s\S]{0,20}` — every edit **strictly widens**, so no existing detection
can be lost. Ported byte-identically to `social_qa_gate.n8n.js`, the five AS-DEPLOYED receiver
bodies, and x-produce's own deploy copy.

`DEFINITION_CUES` was deliberately **not** widened: it is permissive, so widening it would admit
more rather than catch more. Its newline-blindness over-reports, which is safe.

**(b) The HR15 allowlist absorbed the inventory's own banned-URL table.** `load_url_inventory`
regex-scraped the whole markdown file, so `### Banned for pin links (don't use)` went into the
allowlist that exists to reject it. Reproduced against the live vault file — `/book` (the Decision-38
booking page), `/privacy` and `/terms` all returned `True`. **Reading more of the file made the
allowlist more permissive:** a regex cannot tell a declaration from a counter-example.

Now section-scoped, reusing the parser `destination_registry` already used to exclude that table
correctly. `_sections` moved into `social_qa` (the module `destination_registry` imports) so there is
one implementation and no cycle. The section lists are **allow-lists**: a new section is not linkable
until named, which fails closed. A deny-list would silently admit the next "Banned for X".

Allowlist **71 → 63**: the 4 banned URLs plus 4 *fabricated* `/resources/lm-*` entries the old slug
scrape invented from lead-magnet IDs — pages that do not exist at that path. All five real
lead-magnet destinations and every article slug retained.

**(c) `_norm_url` dropped `?query`/`#fragment` before the membership test**, so an approved slug
carrying `?next=/blog/nope` passed HR15 while the published link kept it. A query is not banned
outright — `destination_select` attaches UTM attribution to every platform's destination — so only
the keys the system emits are allowed (`utm_source`/`utm_medium`/`utm_campaign`).

> **This one is worth remembering.** The first version of (c) rejected *any* query, and broke 9
> producer tests across pinterest, facebook and instagram. The test suites caught an over-correction
> that would have blocked every properly-attributed post on all five platforms.

### 4. waypoint-compliance — the jargon sentence window

`sentenceAt()` bounded only on `.!?`. Copy in this domain is frequently fragmentary — headlines,
bullets, deck cells — with no terminal punctuation, so `start` stayed 0 and `end` stayed
`text.length`: the "sentence" became the whole document and any parenthetical anywhere satisfied a
HARD gate. Reproduced:

```
"What does royalty actually mean\nAsk your rep (bring a notebook)"   -> PASSED
"Royalty rates matter. Ask about it."                                -> FAILED (correct)
```

Bounded at `\n` as well. This package is a `file:` dependency of `waypoint-video`, so one fix covers
both surfaces. **Opposite remedy to §3** — narrowing, because this gate is permissive.

### 5. claude-dotfiles — `git-guard`, the highest blast radius

`strip_heredocs` deletes heredoc bodies **before every rule runs**, so anything it deletes is
invisible to the guard that enforces the CLAUDE.md git bans in every repo on this machine. Five ways
to make it delete a real command, all reproduced by driving the hook — in each the banned command was
**ALLOWED** while the same command alone is denied:

1. a `#` comment naming a tag was read as an operator
2. the quote-parity check was **per line**, blind to a quote opened earlier
3. an arithmetic left shift `$((1 << shift))` matched
4. `<<<WORD` (a herestring) matched from its second `<`
5. and the clause all four ended in — an **unterminated heredoc consumed to EOF**

Replaced with `scan_heredoc_openers`, which carries quote state **across lines**, skips `#` comments,
tracks `$(( ))`, and rejects `<<<`. The load-bearing change is the last: an unterminated heredoc is
now **fail-closed** — the text is put back and analysed, because "I could not parse this" must never
resolve to "there is nothing here to check". 104/104 tests, up from 98.

---

## ⚠️ What is NOT fixed

- **The five live n8n publish receivers still run the old FTC patterns.** Source, shared gate and all
  deploy artifacts are corrected; the live Code nodes must be re-pasted
  (`wscc/{pinterest,linkedin,x,instagram,facebook}-publish-receiver`). Until then the newline evasion
  is live in production. Deliberately not automated — it is a production publishing change.
- **All six PRs are open, not merged**, pending review.
- **Tier 2/3 below is not fixed.**

---

## Tier 2/3 — leads, NOT independently verified

Surfaced by exploration agents. **I have not read these lines myself**; they are leads, not findings,
and each needs re-grounding (repo-wide, not file-scoped) before anyone acts.

- `little-lovey-zoo` `pipeline/youtube/scripts/lib/representation.ts:54` — an allowlist strip deletes
  text before the cure-arc gate scans it
- `waypoint-youtube` `scripts/check-research-ready.mjs:91` — clause-split defeats the email-gate patterns
- `channel-2-intelligence` `scripts/validate-script.mjs:27` — `\n## ` ledger scoping blind to `###`;
  `:104` — body filter drops blockquoted narration
- `waypoint-video` `scripts/lint-compliance.ts:42` — decodes one HTML entity where the renderer decodes all
- `brand-intelligence-pipeline` `src/bip/rag/chunking.py:129` — FTC earnings tag decided per 200-word
  window, not per document; `src/bip/brandid/classifier.py:260` — head+tail truncation drives the PII
  quarantine verdict
- `dotfiles` `projects/check-claude-md-commands.sh:178` — dotted name truncated to its stem;
  `:221` — `allow-missing` waiver truncated at `:`; `projects/stamp-git-safety.sh:241` — counts marker
  *lines*, not occurrences
- `Social Media` `linkedin-signal/linkedin_search.py:333` — suppression scans only `parts[1]`;
  `linkedin-produce/li_pdf_gates.py:255` — 4-word opener window; `waypoint-carousel/assert_gate_live.py:149`
  — 500-char truncation can certify a broken gate as working; `pinterest-produce/pin_preflight.py:76`
  — props whitespace split
- `waypoint-cold-email-dashboard` — HTML-only replies stored as `"(No text content)"`, and exact-string
  matching decides suppression

**Excluded on inspection:** `local-websites/heart-strings/` is **gitignored and untracked**
(`.gitignore:79`, `git ls-files` → 0). Not repo code.

---

## Adjacent findings, not of this class

- **YouTube-Video CI had been red on `main` for two weeks** — **30 consecutive failures from
  2026-07-28 to 2026-08-10; the last successful run was 2026-07-27.** Cause: `pace-calibration.test.ts`
  calls `git ls-tree` against a recorded measurement SHA that is absent from `actions/checkout`'s
  default depth-1 shallow clone (`fatal: not a tree object`). Fixed here with `fetch-depth: 0`,
  because the COPPA channel-check runs in that same `npm test`: while the job was permanently red, a
  real compliance failure was indistinguishable from the standing one. The PR's run is the first
  green one on that repo since 2026-07-27.

  > Correction: the commit message for that fix says "from 2026-08-05 … (12 consecutive runs
  > checked)", which is what I had actually looked at when writing it. Checking further back showed
  > the streak is 30 runs and began 2026-07-28. The commit's figure is true as scoped but understates
  > it; this is the accurate one. I confirmed the identical `pace-calibration` failure on the two most
  > recent runs specifically, and did not open all 30.
- **`ruleset_version.POLICY_TABLES_HASH` covers the image/hashtag policy tables, not `lint.BANNED`.**
  The BANNED table is protected instead by `gate_parity`'s structural JS↔Python diff.
- **`gate_parity` proves synchrony, not correctness.** It compares the two halves to each other, so
  the same wrong edit in both is green. Correctness here rests on the behavioural reproductions.

---

## Counter-examples worth copying

Checks that already defend against this class, and how:

- `waypoint-carousel/consult-lane/consult_gate.py` — blanks allowlisted phrases **longest-first**,
  with explicit reasoning about the ordering hazard, and compares folded token to folded token rather
  than regexing over a mutated string
- `dotfiles/projects/check-skill-frontmatter.py` — explicitly rejected regex frontmatter parsing in
  favour of `yaml.compose`, decodes strictly, and floors on `checked == 0`
- `channel-2-intelligence/scripts/validate-deterministic-proof.mjs:113` — a correctly string-aware
  `stripComments`; the right implementation of the thing this audit hunts
- `local-websites/tools/check-determinism.mjs` — exits **2** on no data, specifically so "compared
  nothing" cannot read as a pass
- `waypoint-youtube/scripts/check-ledger-rows.mjs` — unescaped-pipe lookbehind, whole-section
  collection, orphan-row sweep, strict `/^\d+$/` instead of `parseInt`

---

## Adversarial review — what it changed

Both stages ran. **Stage 1 was Codex, unwrappered** (`codex exec --sandbox read-only`): this repo's
`scripts/codex-review.mjs` wrapper covers *this* repo, and none of the six changed repos has one.
Payload was grepped for keys/tokens and contained no `.env`. **Stage 2 was a self-review run
in-session** — agents are disabled here, so it is the biased last resort, labelled as such.

It found four things, three of them defects in the fixes themselves:

1. **Four live bypasses remained in the git-guard fix** (Codex flagged it; I reproduced them
   myself rather than taking the claim). `strip_heredocs` decides whether a body executes from the
   line's tokens, and an **attached redirection** keeps the runner buried inside one:
   `bash<<EOF`, `sh<<EOF`, `/bin/bash<<EOF`, and `$SHELL <<EOF` all hid a real `git push --force`.
   Fixed by `line_feeds_a_shell()`, which strips an attached `<`/`>` before matching and fails
   closed on an unresolvable command word.
2. **My fix for (1) then introduced six bypasses the ORIGINAL code did not have.** It stopped at
   the first non-assignment word, so a wrapper in front of the runner — `env bash`, `env FOO=1
   bash`, `command bash`, `nice bash`, `timeout 5 bash`, `xargs sh` — ended the scan early. The
   original scanned every token and caught them. Found in self-review by probing the hook; every
   word is scanned again.
3. **An allow-listed UTM key was a licence for arbitrary value content.** `?utm_source=x;next=/blog/nope`
   parses as ONE pair whose key is approved and whose value smuggles the rest, because Python's
   `parse_qsl` splits on `&` only while some servers treat `;` as a separator. Values are now held
   to the charset the system actually emits.
4. **The report itself was filed somewhere it could never be committed** — see the note at the top.

Two Codex claims were checked and **declined**, with reasons: a reported over-block on
`echo "$(cat <<EOF ... EOF)"` is not one (it is correctly allowed), and a fifth "bypass" was my own
probe's expectation being wrong — for a plain `<<`, bash does not end a heredoc on an indented
terminator, so that command never executes and ALLOW is correct. The probe was corrected, not the
code.

**The pattern worth keeping:** three of the four were found by *driving the real thing with concrete
inputs*, not by reading the diff. Reading the diff is what produced defect 2 in the first place.

---

## Coverage — what this audit does and does not establish

- **Personally verified:** the six repos in Tier 1, at the lines cited, before and after.
- **Agent-reported only:** every "clean" verdict on the other ~19 repos, and all of Tier 2/3. A
  clean verdict here means "an exploration pass found nothing", not "this repo is clear".
- **Not attempted:** repos with no checks at all (`hermes`, `franchise-library`,
  `Bizconnect Carribean`, `waypoint-ops`, `waypoint-ops-history`) — nothing to audit is itself a
  finding, but it was not independently confirmed.

## Method note

Two false negatives were produced *during this audit* by narrowing a search — the same defect being
hunted:

1. grepping `mfkscan.ts` alone for `countScannableFiles` returned nothing and nearly produced a false
   "the agent is wrong"; it is real, called from `channel-safety-check.ts:227`.
2. grepping only `waypoint-carousel` for `POLICY_TABLES_HASH` produced "no implementation exists"; it
   lives in `pinterest-produce`.

Neither reached a deliverable, but both are the reason every Tier-2 promotion should be re-grounded
repo-wide rather than file-scoped.
