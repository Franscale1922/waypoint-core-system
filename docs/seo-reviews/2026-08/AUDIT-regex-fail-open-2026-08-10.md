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

> **✅ MERGED 2026-08-10 (fourth session) as `faec5e9`, and the paragraph above understates it by a
> lot.** "Bounded at `\n` as well" closed 32 of 128 combinations. Full write-up: §4a below.

### 4a. waypoint-compliance — ✅ MERGED `faec5e9`, and what the small fix missed

**Second repo in a row where "a small bounded fix" was the wrong premise.** Every figure below was
produced by execution on 2026-08-10, not read.

Same 128-combination sweep (16 trigger terms × 8 separators), three states of the same window:

| state | `sentenceAt` boundary | failing open |
|---|---|---|
| `origin/main` | `.!?` | **128 / 128** |
| PR #1 as it stood | `.!?` + LF | **96 / 128** |
| merged | `.!?` + all 7 terminators | **0 / 128** |

The earlier "48 of 80" figure in the third-session handoff was measured over **5** separators, before
VT/FF/NEL were known. It was not wrong, it was under-scoped — quote 96/128 instead.

**Six more instances of the class in the same package**, four of them found only because the review
kept pressing:

1. **BANNED cat 13** — `"A recent client\nmade 200k"` PASSED `no-earnings-claim`. HARD, non-waivable.
2. **BANNED cat 1** — `"Owners here earn\n$5,000 monthly"` PASSED. Also HARD. Initially dismissed as
   "regex-level only, usually masked" off a single fixture that happened to contain the vault
   substring `franchisees earn`; a substring-free fixture shows the gate genuinely passing.
3. **AI_TELLS_SOFT** `not only`/`not just` twins — same miss, advisory.
4. **`emdashHits`** — `/ - /` cannot see a dash whose trailing space *is* the line break.
5. **The `m` flag only reaches column zero** — `"  Indeed,"` and `"- Indeed,"` still walked through
   after the first fix, which are precisely the indented deck-cell and bullet shapes cited as the
   motivation. An anchor is a narrowing too.
6. **VT, FF and NEL were missing** from a set documented as "every character that ends a line".
   Worse than a gap: `\s` does not match NEL at all, and JS multiline `^` honours none of the three,
   so neither the anchor nor the whitespace class could ever have covered them.

Plus a consequence of the fix itself: once a matched span can *contain* a terminator, six code paths
that quote copy back to the caller start emitting raw control characters into gate details that go
to terminals, `qa-report.json` and Slack.

#### The generalisable finding — polarity decides the direction, per check, in the same file

- **Permissive check** ("is a definition nearby?") → window must be **NARROW** → stop at every terminator.
- **Prohibitive check** ("does this say something banned?") → window must be **WIDE** → never stop at one.

Same defect class, opposite repairs, both in one file. **This is why §3's `_norm_ws` approach must
not be copied into this package** — collapsing whitespace would erase the very boundary §4 exists to
create. It also means a diff between `patterns.mjs` and carousel's `lint.py` is not by itself drift:
they reach the same net effect by different mechanisms. That is now recorded in the file header, so
a future session does not "restore parity" by reverting the widenings. **Precondition for the
carousel rework: check which mechanism each copy uses before treating a difference as a defect.**

#### One reviewer finding DECLINED, with the reason in the file

Codex round 1 (High) argued the widened window should exclude `?` and `!`. Done, then reverted:
`[^.!?]` is **not** a superset of the original `[^.\n]`, so it lost detections `origin/main` makes —
`"Can you earn? $5,000 monthly"` and `"A recent client? Made 200k"` both went caught → missed. A
rhetorical question in front of the number is one of the commonest shapes this copy takes, so
excluding `?` opens the hole in the likeliest place, as a regression, on a hard non-waivable gate.
The false positive Codex identified is accepted and pinned by a test.

**The transferable lesson: reproducing a reviewer's finding is not the same as its fix being right.**
This one reproduced perfectly and still pointed the wrong way. Weigh the polarity before acting.

#### The one thing left out — and it was fixed straight after, as PR #2 (`c9464f0`)

The older `/ - /` rule flagged every **indented** markdown bullet as a dash — **330 hits across 47 of
63 files, every one a bullet, not one a real dash**. It was excluded from #1 on purpose: it is a
fail-**closed** defect and repairing it *weakens* a HARD gate, so it is a policy call, not a
fail-open fix. Surfaced rather than smuggled in, and pinned by a test so it could not be mistaken
for #1's doing.

**Kelsey took the call the same day and it merged as #2.** `atLineStart()` exempts the bullet
marker, consuming the exported `LINE_TERMINATORS` rather than re-deriving a set, and testing it
*before* `\s` — because `\s` does not match NEL. Re-measured against the same 63 files on
`c9464f0`: **11 failing, down from 47, and all 11 are genuine em/en dash characters** with zero
hyphen-rule involvement. None is in the published 45 (`content/articles/`) — they are ops docs,
drafts, the newsletter and social drafts. The gate now reports true positives only.

**The harness that proves all of this is now in the repo** — `test/mutants.sh` / `npm run
test:mutants`, added as #3 (`3f93142`). #1 and #2 both claimed "verified by mutation" while the
instrument sat in a session scratchpad. 17 rows, and it pins **both** directions of the polarity
trade-off so neither the original fail-open nor the reviewed-out over-correction can return quietly.
Copy this shape into the four remaining repos rather than re-deriving a throwaway each time.

**Worth noting how the two PRs interact**, because it is the polarity lesson again: #1 *widened*
prohibitive windows, #2 *narrowed* one. Both are correct, because #1's targets were failing open and
#2's was failing closed on a rule nobody would keep switched on. Verified on `c9464f0` that #2 cost
#1 nothing: jargon sweep still 0/128, all 7 starters still fire their own rule, both HARD claim
fail-opens still caught, the end-of-line dash and real mid-line dashes still caught. 96 assertions.

#### Verification

19 → **61 assertions**, green. **15 mutants, every one killed**, control green — each fix reverted
individually, in both the fail-open and false-fail directions. Claim fixtures verified free of all
**164** vault substrings so only the regex can satisfy them; every leak probe asserted to actually
trip its gate. Separator fixtures built from codepoints, and all four touched files verified free of
literal LS/PS/CR/VT/FF/NEL — the first draft of the constant shipped pasted literals and had to be
caught with `hexdump`. Differential vs `origin/main` over 63 articles × 5 gates: **0 of 315 verdicts
changed** — a fact about that data, not proof about the logic. Real consumer driven end-to-end
(`lint-compliance.ts spotlight01`, exit 0), re-run against merged `main` after `git fetch`.

Review: **Codex round 1** (senior engineer) 4 findings, **round 2** (security/data-integrity) 1 —
both unwrappered `--sandbox read-only`, this repo has no wrapper. **Claude stage 2 ran in-session
and is self-review**, the biased last resort; it is what caught the over-correction above. Round 2's
finding also exposed that the sanitisation test written to prove the fix inspected only ONE gate and
went green over two that were still leaking — the masking trap, inside the test meant to catch it.

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

> **Superseded in part — read "Review before merge" below before trusting this section.** The
> pre-merge review found that all six PRs fix the *instances* this audit found, not the *class*, and
> that the re-paste plan described here rests on a false premise. Still accurate: nothing is merged,
> the live receivers still run the old patterns, and Tier 2/3 is untouched.

- **The five live n8n publish receivers still run the old FTC patterns.** Source, shared gate and all
  deploy artifacts are corrected; the live Code nodes must be re-pasted
  (`wscc/{pinterest,linkedin,x,instagram,facebook}-publish-receiver`). Until then the newline evasion
  is live in production. Deliberately not automated — it is a production publishing change.
- **All six PRs are open, not merged**, pending review.
- **Tier 2/3 below is not fixed.**

---

## Review before merge — the six PRs are PARTIAL (2026-08-10, second session)

Method: every suite re-run fresh; the evasion reproduced pre/post fix by driving the real gates; six
independent Claude subagent reviewers (one per PR, no memory of the authoring session); five
unwrappered `codex exec --sandbox read-only` runs (skipped on x-produce #5 — a 30-line regenerated
artifact whose correctness is mechanically established by `test_gate_parity`).

**The headline: two independent reviewers converged on the same residuals in every repo.** Each PR
closes the specific shapes the audit probed and leaves the class alive in the same file. That
convergence is the finding — not six unrelated nitpicks.

### Suites re-run (all green, observed this session)

| repo | observed | vs claimed |
|---|---|---|
| YouTube-Video #21 | 231 tests / 230 pass / 1 skip / **0 fail**; channel-check 33/33; CI green | matches |
| everyx-engine #1 | 54 pass, typecheck clean, 20/20 | **the audit body's "50 tests" is wrong; 54 is right** |
| waypoint-carousel #3 | 31/31 | matches |
| x-produce #5 | parity 7/7, compliance 37/37 | **"23/23" matches nothing that runs** |
| waypoint-compliance #1 | all smoke assertions | matches |
| claude-dotfiles #1 | 115/115 | matches |

The evasion was reproduced per-pattern, with the changed patterns **located by diffing the two BANNED
tables** rather than hand-picked: exactly 3 of 42 changed, all strictly widening, no detection lost.
A first harness reported a false FAIL by testing at *category* granularity — cat 1 holds a second
pattern (`$…a year`) that caught the probe through the newline and masked which pattern fired. Testing
a category cannot tell you which of its patterns responded: the same narrowing error this audit is about.

### Residuals — confirmed by direct execution unless marked

**waypoint-carousel #3** — the three claimed defects are real and correctly fixed; 71→63 is exact and
drops **no legitimate destination**. But:
- **23 of 42 patterns contain a literal space, so one newline defeats them** — 8/8 probes evaded,
  including cats 2 and 13, *the categories this PR edited*.
- **CRLF defeats even the three fixed patterns** — `\r\n` costs an extra position and overruns the
  `{0,N}` bound. Astral characters do the same in JS (2 UTF-16 units each, no `u` flag), so the live
  JS gate and the Python gate disagree on emoji-bearing copy.
- **Section scoping is substring-based** (`social_qa.py:207`, `k in heading`), so
  `### Banned copy of Foundational marketing pages` is treated as approved. The claim that a new
  section "is not linkable until named, which fails closed" is false as written. Latent — today's
  vault has no such heading.
- *Codex, not independently reproduced:* prose inside an allowed section is scraped as a declaration;
  `###` inside fenced blocks is honoured; the path charset truncates `/docs/v1.2` into `/docs/v1`.

  **One line closes most of it:** `re.sub(r"\s+", " ", text)` before matching handles all 23 patterns
  *and* CRLF, and makes the three regex widenings unnecessary.

**YouTube-Video #21 / everyx-engine #1** (one shared library, two copies) — 7 of 8 fixtures go
MISSED→caught, and the tests are genuinely mutation-resistant. But the *fixed* scanner still fails
open on at least eight shapes: `/[//]/` and `/[/*]/` character classes (the latter blanking to **EOF**,
losing 5 declarations where the old line-based code lost none), nested template literals, unterminated
`/*`, `//` not terminating at CR / U+2028 / U+2029, JSX text, computed keys written with a backtick
or with a JS unicode escape standing in for one letter of the key name, CRLF string continuations —
plus `.jsx` unscanned and
`readdirSync` failing open.
- **The load-bearing comment is backwards.** `mfkscan.ts:75` says an unmodelled regex `//` "would
  OVER-report". It **under**-reports — a false PASS. The same sentence ships in both repos.
- **A hand-rolled lexer is the wrong instrument.** `typescript` is already a dependency (Codex used
  `ts.transpileModule` during its own review); a real token stream removes the class rather than the
  eight known instances.
- **everyx's fix is invisible in its own diff.** `origin/main`'s copy holds **one NUL byte at offset
  2642 (line 47)** — the `scheme://` mask was written as a literal U+0000 — so git calls the file
  binary: `Bin 5355 -> 8938 bytes, 0 insertions(+), 0 deletions(-)`. All 94 reported additions are
  test code. The PR incidentally removes the NUL. Review it by reading the file, never the diff.

**waypoint-compliance #1** — correct, the new tests are real regression guards (they fail on the
pre-fix engine), and the live corpus is unaffected. Residuals: the sibling at `lint.mjs:134` has the
identical `.!?`-only mis-scoping and leaves four voice-lock starters unguarded on fragmentary copy;
only LF is treated as a break, so CR / U+2028 / U+2029 still fail open; and the parenthetical is never
associated with the term, so `Ask about royalty, then call us (weekdays only).` passes.

**claude-dotfiles #1** — all five original defects and both self-inflicted regressions genuinely
closed, 115/115, with real ALLOW controls. Both reviewers independently found the same three
survivors: `#` after a metacharacter (`true;# <<EOF`), arithmetic `(( 1 << EOF ))`, and the `$VAR`
runner branch failing open in every spelling but the one the test uses (`"$SHELL" <<EOF`,
`$SHELL<<EOF`, `env $SHELL <<EOF`). The docstring at `:330` promises fail-closed behaviour the code
does not provide. Also `git-guard.test.sh:4` pins `G="$HOME/dotfiles/…"`, so the suite tests the
*installed* copy — here that is the PR branch, so the 115/115 is valid, but from a worktree or CI it
would silently test the wrong file.

**x-produce #5** — correct; merge after carousel #3. `test_gate_parity.py` reads the sibling's
**working tree** via a plain `open()` with no rev or hash, so a green there describes one machine's
checkout, never the merged state. Scope gap: `FDD_ITEM_TEACHING` (line 118, both artifact and shared
source) is still newline-blind, and it has drifted from its Python twin — `social_gate.py:141` is a
**universal, verb-agnostic, ungated** bar on retired Items, while the JS requires a teaching verb
within 40 chars and is gated per-platform. `"Item 19 is where the real story is"` is refused
client-side and passes the server gate.

### The n8n re-paste premise is false

The plan of record was "byte-diff each live node against its artifact, then whole-body replace".
There is **no correct whole-body source**:

- The shared source `social_qa_gate.n8n.js` is **333 lines and carries the S0a block** with
  `{ linkedin: true, facebook: true, instagram: true, x: true }`.
- All five `deploy/AS-DEPLOYED-2026-06-24/*.js` are **302 lines with no S0a at all** — a 33-line gap.
- The live nodes are in **three different states**: X matches the source (verified directly, in
  `active` mode = the published graph); LinkedIn has S0a with only `linkedin: true`; Pinterest has
  none *(the last two are reviewer-reported, not independently re-read).*

So pasting the source flips undeployed S2/S3/S4 policy live on Facebook/Instagram/X — dropping a
Decision-39 hard fail and adding an FDD refuse — riding inside an FTC fix. Pasting AS-DEPLOYED deletes
LinkedIn's live S0a. **The correct action is a targeted per-node patch of the changed lines**, leaving
each node's own S0a state alone. The header comment claiming all five run one byte-verified body is
now false.

Related: merging #3 rewrites the `AS-DEPLOYED-2026-06-24/` files, which claim to be the exact
live-verified bodies. That directory is a **record of what is deployed**, and editing it to match the
desired state before the deployment decision destroys the last snapshot of what is actually live.

### ✅ Decided and part-executed 2026-08-10 (third session) — read SESSION-HANDOFF.md first

**Decision: both paths, split by evidence.** dotfiles + waypoint-compliance are the two cases where
the small fix IS the class fix, so they merge after it; carousel and both mfkscan copies get reworked;
x-produce #5 holds behind carousel; the five live n8n receivers are a named deliverable, not a
deferral. Full plan: `~/.claude/plans/decide-the-six-regex-jiggly-lollipop.md`.

**`claude-dotfiles` #1 is MERGED** (`3506261`). Its "three small residuals" characterisation was
wrong — four review rounds found 28 defects that did not converge, and it became a 627-line redesign.
Two corrections this audit should carry forward:

- **The class is one level up from where this audit put it.** Patching spellings kept generating new
  ones. What worked was changing the instrument: invert the polarity so unknowns fail CLOSED, and use
  a real tokenizer instead of regex. Apply that lens to carousel (whitespace normalisation is the
  right shape) and to mfkscan (an AST, not a hand-rolled lexer).
- **Verify tests by mutation, and test the noise direction.** Five cases here passed with their own
  fix reverted, and the harness read a crash as a pass. Over-blocking is safe but not free: a check
  people switch off protects nothing.

Also corrected by direct execution this session: **everyx is 54 tests, not 50**; x-produce's "23/23"
matches nothing that runs; `assert_gate_live.py`'s truncation is `[:500]` on **both** return paths;
`verify_live_gate.py` lives in **`pinterest-produce`**, not carousel, and is a **whole-body equality**
checker — so it will report DRIFT on all five nodes if they are patched per-node, which is exactly
what the plan intends. Resolve that contradiction before writing anything to n8n.

### Standing recommendation

Fix the class, not the instances: whitespace normalisation + exact section matching in carousel; a
real lexer in mfkscan; H1–H3 plus runner-word normalisation in dotfiles; line-terminator normalisation
in compliance. `claude-dotfiles` and `waypoint-compliance` are closest to mergeable.

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
