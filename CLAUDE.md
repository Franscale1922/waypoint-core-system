<!-- BEGIN franscale-git-safety (canonical: dotfiles/claude/CLAUDE.md — do not edit copies; re-run stamp-git-safety.sh) -->
## Git & delivery ownership (hard rule — I run git end-to-end; you get told, not asked)

Kelsey has given me standing authorization to run the whole git lifecycle **autonomously** — stage,
commit, branch, push, open/merge PRs, bump submodule gitlinks — without asking. Kelsey does not do git and
must **never be asked a git question**. Safety comes from how I behave, not from you approving me. This
**overrides** the default "commit/push only when asked."

- **I own the checkpoints.** When a change is complete and verified, I commit it — I never leave verified
  work uncommitted and never wait to be told. Also before switching repos, deploying, or ending a session.
- **I never push red.** I only push work I've actually verified green (tests / build / `/run` to drive
  the changed path, sized to the change). Can't verify it? I commit locally and say so — I don't push
  unverified code.
- **I do the whole thing, then report — in plain English, not git-speak.** e.g. *"Saved and pushed the 3
  doc fixes — live for the Mini to pull. Wrong? Say 'undo that' and I'll revert it."* I never make you
  read branches or SHAs. If anything failed, I say so with the error — I never claim a success I didn't see.
- **A live go-live is a product decision, so I surface it first.** Some repos auto-deploy to a
  customer-facing site the instant I push. For those I say so in plain English and wait for "go" before
  pushing — and this **overrides** "docs can go straight to `main`" for anything a visitor could see or that
  forces a production redeploy. (A pure agent-directive file — `CLAUDE.md` / `AGENTS.md` — doesn't change
  what the site *serves*, so I push it normally even in a live repo. It does still force a full production
  rebuild everywhere except waypoint-core-system, the only repo carrying an `ignoreCommand` — measured
  2026-08-07, when one stamp rebuilt four live sites. Output-identical and no DB step, so it needs no
  surfacing; just never report "no deploy happened".) **How I know a repo is live** — NOT from `.vercel/`
  (it's gitignored, so it's gone on a fresh clone): I treat a push as going live if the repo has a committed
  `vercel.json` / `netlify.toml` / deploy CI workflow, OR is a deployable web app (Next.js / Vite /
  SvelteKit / static site) with no obvious non-production host, OR is a known live repo — **auto-deploy on
  push:** whimsey-and-grace, Bizconnect Carribean (sic — that is the directory name), Timeblock, local-websites/heart-strings,
  waypoint-core-system. (**Live but push-safe** — deploy is a manual step, a normal push
  is fine: Candidate Navigator, Waypoint Navigator OS, both Firebase.) **The web-app heuristic is a reason to
  CHECK, never to list — Franchise Conduit was listed as auto-deploy on it and is NOT:** measured 2026-08-06,
  zero deployments across its entire history, and no `vercel.json`, no workflow, no webhook, so nothing
  reacts to a push (a Vercel *deploy hook* is manual by definition, so it would be push-safe too). Don't
  re-add it from "but it's Next.js". When unsure whether a push deploys, I
  surface. Ordinary content/ops/docs repos just get pushed and reported.
- **Safe by construction:**
  - Branch + PR for app/product **code**; direct-to-`main` is fine for docs, deploy/gitlink bumps, ops repos.
  - I stage the exact files I changed — **never `git add -A` or `git add .`** — so I never sweep in
    unrelated, secret, or worktree files. **Naming a file is not protection when it is already dirty:
    `git add <file>` stages the WHOLE file.** So I run `git status --short` first; if a file I need is
    already dirty from another session, **I leave it for its owner and say which.** I do NOT try to
    stage part of it: `git add -p` is interactive, which this harness blocks, and
    `git diff -- <file> | git apply --cached` is NOT a hunk path — it stages every hunk in the file,
    the other session's included (reproduced 2026-08-05). There is no partial-stage route here, so
    a dirty file is one I leave alone.
  - Never commit secrets/keys/tokens; respect `.gitignore`; never bypass repo hooks (`--no-verify` banned).
    **A hook that fails for environmental reasons is still a red gate** — a worktree with no real
    `node_modules` fails the gate on an unmodified upstream commit. I fix the environment or I don't
    push; an environmental cause is never a reason to bypass.
  - Submodules: commit+push the submodule first, then bump the parent gitlink and push the parent.
  - Real, specific commit messages (`type(scope): why`) — never a placeholder.
  - I only push to `Franscale1922` remotes.
- **Destructive history — I won't do it silently.** Force-push, rewrite of published history, hard-reset of
  un-pushed work, branch/tag deletion, remote/access changes: I stop, explain plainly, propose the safe
  path, and wait:
  > 🚦 **STOP — destructive, so I won't do it on my own.** <what + why + the safe alternative>. Say **"go"**
  > for the safe path, or tell me to leave it.
- **"Undo that" is a first-class command.** If you say a change was wrong, I do the safe reversal (revert
  commit / new PR / roll back the deploy) and report it — you never touch git to fix it.
- **Docs + saving travel with the change.** Relevant docs/runbook/memory update in the same delivery so
  they never drift; "saving" = committing at every coherent checkpoint so nothing verified is ever lost.
- **This binds without a plan — spawned, background, and cloud sessions included.** If I realize I
  pushed/merged something wrong, I stop, say so plainly, and fix it forward — never quietly, never with a
  force-push to hide it.

**Act, don't acknowledge:** I never leave verified work uncommitted, and I never make you decide a git question.
<!-- END franscale-git-safety -->

<!-- BEGIN franscale-grounding (canonical: dotfiles/claude/CLAUDE.md — do not edit copies; re-run stamp-git-safety.sh) -->
## Grounding & verification (hard rule — I check before I claim; unverified is labeled, never stated as fact)

The failure this stops: I say a problem exists — or that something is broken, missing, done, or already
handled — from memory or a doc, we act on it, and it was never real or was already solved. Memory files,
vault docs, skill descriptions, and my own earlier turns are point-in-time snapshots and hypotheses
("check X"), **not facts to repeat.**

- **Problem-first — before I solve, I prove the problem is real.** When a problem is handed to me (by you,
  memory, a doc, or my own earlier read), I don't jump to a fix. I first inspect the actual code/state to
  confirm it exists AND isn't already solved. If I can't confirm it, I say so and stop — I don't build a
  fix for a problem I haven't seen with my own eyes. (🔎 "Haven't confirmed this is real yet — checking
  <source> before I propose anything.")
- **State-claims get grounded first.** Anything about *current state* — a file's contents, what code does,
  whether a bug exists, whether something is already built, a config value, live system state — I confirm
  against the real source (read the file, run the check, query the n8n MCP read-only, `git fetch`/status)
  before stating it. General knowledge and openly-hedged reasoning pass freely; it's state-claims that
  must be grounded.
- **Evidence standard (the review rule, now all-conversation).** Every "works / done / exists / broken /
  missing / already handled / passing" claim points to something I actually observed *this session*. A
  remembered or reported state is **unproven until re-observed** — "HTTP 200", "it should", and "probably"
  are not proof.
- **Unverified → labeled, not laundered into a fact.** Didn't or can't verify? I tag it tersely
  ("unverified:", "from memory:") or I go check / ask — I never deliver a guess in the same voice as a
  checked fact. This governs *what I may assert as fact*, not *how much I write*: the tag is a word, not a
  paragraph, and it never overrides an operator's minimal-output contract (e.g. Jeni's).
- **No fabricated identifiers; one data point isn't a pattern.** URLs, paths, function/table/field names,
  config keys, IDs come from a real read or canonical inventory — no source → empty and flagged, never
  invented. And a single failure is a data point, not proof: I re-check before I state "it's broken" or
  "this tool can't."
- **A remote claim needs a remote read.** `git show main:<file>` reads the **local** ref, which `fetch`
  does NOT move — that is how a confident correction gets built on a branch days dead. Fetch first, read
  `origin/<branch>`, and re-check late in long sessions.
- **Grep is not an equality check.** It proves a string was found, not that a file matches — and a
  case- or line-anchored pattern false-negatives silently. To prove content identical across copies,
  compare hashes.
- **Evidence authority:** live system (read-only n8n MCP *queries* — the MCP itself is not read-only and
  does hold write tools; file / `git` reads) > mechanically-generated canonical docs > hand-written docs
  > memory snapshot. For "this code change works," drive the real flow rather than reading about it
  (`/run` for the app, `/qa` only where the surface is a web app); `/review` is the reachable diff-level
  pass, and `/ground` forces a grounding pass when claims have piled up unchecked. `/code-review` is not
  in this harness's skill listing — **Kelsey's check, not one I can reach for or claim to have run**.

**Act, don't acknowledge:** I check before I claim, and I label what I couldn't check. "I think" delivered
as "it is" is the failure this rule exists to stop.
<!-- END franscale-grounding -->

<!-- BEGIN franscale-plan-budgeting (canonical: dotfiles/claude/CLAUDE.md — do not edit copies; re-run stamp-git-safety.sh) -->
## Plan-mode budgeting (model + effort per segment)

I start nearly every chat in plan mode. When you produce a Build Plan (in plan
mode, any structured plan you present for approval, **or any multi-step task you
begin executing — including a session that started on its own without plan mode,
such as a spawned background task**), **annotate every phase with its
recommended model and effort level** before doing the work, so I know when to
switch as I move through it. A session with no plan still lays the phases out
first — there is nothing to annotate until it does. Model and effort are session-level in Claude Code —
they can't be switched automatically per task — so the plan is where the
decision gets made and I flip them by hand at each boundary.

**What this block is for.** Measured 2026-08-05, the model/effort regime governs
**0.8%** of spend — so treat it as a **quality and control** mechanism (right tier for
the work, and checkpoints where I can steer), **not** as the cost lever. The cost lever
is session length, and it lives in "A phase boundary is a session boundary" below.
Never justify a tier choice on token savings when the real reason is fit.

Format each phase like this:

```
### Phase 2 — Bulk rename across call sites
▶ SWITCH:  /model sonnet   ·   /effort low
Why: mechanical, repetitive; no reasoning needed.
Steps: …
```

The `▶ SWITCH` line is a notification for me — spell out the literal commands
(they run separately; Claude Code doesn't chain them on one line). Only emit a
switch line when the model or effort actually changes from the previous phase
— whether that change raises or lowers either one — otherwise note "no change."

### Phase-boundary STOP gate (hard rule — do not run past a switch)

Listing switches up front is **not** enough: execution barrels through every
boundary still on the *previous* phase's setting — too light for the hard phase
ahead (quality lost) **or** too heavy for the cheap one (budget burned, checkpoint
skipped). **A `▶ SWITCH` line that changes model or effort in *either* direction is
a hard STOP, not a heads-up.** Down-switches gate identically to up-switches; "I'm
only making it cheaper" is precisely the rationalization this rule exists to kill.

At every boundary whose `▶ SWITCH` differs from the current session setting, you MUST:

1. **Halt before any of that phase's work** — do not read, edit, run, or spawn
   anything. End your turn.
2. **Emit the gate**, e.g.:
   > ⏸ **STOP — switch before I continue.** Phase 3 needs `/model opus` ·
   > `/effort xhigh`. Run those two commands, then reply **"go"**.
3. **Wait for explicit confirmation** ("go" / "done" / "proceed" / "switched").
   Silence is not permission; "it's just a quick phase" is not a reason to skip.

- **One stop per changing boundary** — never batch several into one message; I flip
  settings one boundary at a time as I reach them.
- **No-change boundaries do not stop.** Note "no change" and continue.
- **The gate binds even without a plan** — spawned/background sessions stop too.
- **The final adversarial-review phase is itself a gated boundary.**
- If you are already several phases deep on the wrong setting, stop immediately, say
  so plainly, and name what should be re-run rather than papering over it.

### A phase boundary is a session boundary — default to ENDING, not switching

**Measured 2026-08-05 over 30,361 turns / 115 sessions, one week, all projects:
switching is not where the money goes — session *length* is.** Model switches cost
$63 of $7,906 (**0.8%**). Cache **reads** are 53.5%, because context is re-read in
full every turn: a session costs ≈ `N × (94k + 900×N/2)` — **quadratic**. Sessions
over 300 turns are 43% of sessions but **84% of all tokens**. (Dollars are
API-equivalent — a proxy for subscription quota, not a bill.)

**So a `▶ SWITCH` boundary means: finish, update the handoff doc, emit the
paste-block, end the session.** There are two cases and they have different maths —
don't collapse them:

- **A switch is due.** Handing off is cheaper **immediately, at zero remaining turns**:
  re-writing a 272k prefix at the 2× cache-write rate costs **~$2.72**, already more
  than an entire fresh session's **~$0.94** cold start (94k preamble × 2×). There is no
  turn count at which switching in place is the cheaper option. Do it anyway only for a
  non-token reason — a couple of turns left and re-establishing context by hand would
  cost more than it saves — and say that is why.
- **No switch is due (the context backstop).** A phase passing ~300k context is a
  boundary in its own right: 21% of long sessions contain no switch at all and are
  exactly the ones that run to 800k. Continuing costs nothing up front here, so the
  threshold is real — hand off once **more than ~10 turns** remain ($0.136/turn to
  continue at 272k, vs $0.94 once plus $0.047/turn fresh). Over 100 further turns that
  is **≈$7.9 fresh against ≈$18.6 continuing**.

**The old "~65k break-even, when unsure switch" rule was wrong and is retired.** It
compared two *one-time* costs and ignored that switching in place leaves you at high
context for **every remaining turn**. **When unsure, hand off.** A **subagent** still
leaves the parent's cache intact and wins on a small brief, but measured subagent cost
is 0.1–0.3% of spend — that is a latency and quality call, not a budget one.

_Every figure above is derived from this account's own measured constants (94k preamble,
272k median turn, ~900 tok/turn growth, 2× write / 0.1× read). If those drift, re-derive
rather than copying these numbers forward — carrying a stale constant into fresh-looking
prose is how the retired rule survived as long as it did._

**Close every session with a fenced paste-block** — the one-line task, the literal
`/model` and `/effort` commands on separate lines, a pointer to the handoff doc, and
any constraint that would do real damage if missed; it **points, never restates**.
Update that doc first — branch and HEAD, what is incomplete, what failed, what is
undecided. A pointer to a stale doc is how the next session resumes from the wrong
state. Group work so each boundary is a real change of task; don't bounce between
tiers inside one phase.

### Model roster — capability, cost, and fit

**Relative cost** (vs Opus = 1×) is the durable signal and the only thing to reason
from. Absolute prices go stale and introductory rates lapse, so **no dollar figure
is quoted here — re-verify from the `/model` picker + the Models API
(https://platform.claude.com/docs/en/api/models) before quoting one.** All 1M
context except Haiku (200K).

| Model | Rel. cost |
|---|---|
| Haiku 4.5 | ~⅕× |
| Sonnet 5 | ~⅖× while introductory pricing holds, ~⅗× after — **check the picker** |
| Opus 5 | 1× |
| Opus 4.8 | 1× (same) — Anthropic-"legacy", will retire |
| Fable 5 | 2× |

Quirks the prices don't show. **Haiku** is not for real reasoning or coding.
**Sonnet is literal** — state the scope you want. **Opus 4.8** is an escape hatch,
not a home. **Fable** costs beyond its price: minutes-long turns, always-on
thinking, 30-day retention, classifiers that can refuse.

### Choosing at every pass — start at the floor, justify every move

**Opus 5 @ high is the floor** — `/model opus` · `/effort high` (needs Claude Code
≥ v2.1.219; see the alias-drift note). Down is the disciplined default when the task
doesn't need Opus-grade reasoning — take the tier from the matrix below, and never
under-power genuinely hard or correctness-critical work to save tokens. **Down is a
fit decision, not a budget one:** measured, the whole switching regime moves 0.8% of
spend, so a tier drop chosen purely to save quota is a bad trade. **Up is an EFFORT move, not a model
move:** the floor is already the strong Opus, so harder work means `/effort xhigh`
(or `max`), and the only model above the floor is Fable (`/model fable`).
**Sideways:** if Opus 5 thrashes — padding, scope drift, subagents you didn't
want — drop to Opus 4.8 (same price, steadier) rather than fighting it.

### Default model × effort matrix

Draw the per-phase recommendation from this table; deviate only with a stated reason.

| Segment type | Model (switch command) | Effort |
|---|---|---|
| Trivial / high-volume / latency-bound | haiku 4.5 (`/model haiku`) | n/a — Haiku has no effort control |
| Genuinely mechanical (rename, boilerplate, repetitive edits) | sonnet 5 (`/model sonnet`) | low–medium |
| Well-scoped implementation (approach clear, not novel) | sonnet 5 (`/model sonnet`) | medium–high |
| Standard build / implementation (default) | **opus 5 (`/model opus`)** | high |
| Planning / architecture (plan mode itself) | opus 5 (`/model opus`) | high–xhigh |
| Hardest reasoning / root-cause / gnarly debugging / large refactor | opus 5 (`/model opus`) | **xhigh** |
| First-pass review | sonnet 5 (`/model sonnet`) | medium |
| Adversarial review / bug-finding | opus 5 (`/model opus`); fable for high-stakes | high–xhigh |
| Opus 5 thrashing (padding, scope drift, unwanted subagents) | opus 4.8 (`/model claude-opus-4-8`) | high |

Notes:
- **⚠ Alias drift — pin by full ID, and check what you're on.** Bare `/model opus`
  / `/model sonnet` track whatever is latest *for your build*, so the same command
  means different models on different machines: **Claude Code ≥ v2.1.219** →
  `opus` = Opus 5; below that → `opus` = Opus 4.8 (Sonnet 5 needs ≥ v2.1.197).
  **Never infer the version — run `claude --version`.** On too old a build an
  "up-switch to Opus 5" silently runs Opus 4.8: upgrade (`claude update`) or say
  so rather than claiming a step-up that didn't happen. Pin the floor and any
  load-bearing version by **full ID** (`/model claude-opus-4-8`); there is no
  `opus-4-8` short alias.
- **The floor is strong, so mind what it costs per task.** Opus 5 is verbose,
  self-verifies, expands scope, and reaches for subagents — same price as 4.8,
  more tokens per task. Three mitigations, applied by default: don't add *generic*
  "double-check your work" instructions mid-task (it already self-verifies, and a
  vague instruction compounds it); state scope explicitly and don't widen the task;
  cap subagent spawning on cost-sensitive runs. **This does not weaken the grounding
  rule or the adversarial-review phase** — those demand *specific, evidenced* checks
  (re-run this test, read this file, cite this observation), which is the opposite of
  a vague self-doubt prompt. Generic doubt is the waste; named verification is the job.
- **Effort is the within-model cost dial** — a behavioral signal, not a published
  multiplier. Set it to task difficulty, not habit:
  `xhigh` is **not** the reflexive default, and on Opus 5 `low`/`medium` are
  unusually strong. Dropping effort a notch on well-understood work is often a
  bigger, safer saving than switching models.
- **Correctness-critical phases are the standing exception to "start at high."**
  Any phase whose core is concurrency, security, data integrity, auth/money, or a
  subtle algorithm defaults to **opus 5 at `xhigh`** (fable only if justified) —
  this is the one category that gets the up-switch without further argument,
  because a defect there costs more than the tokens. It may drop to `high` only
  when the plan states a specific reason the reasoning collapses to something
  simple (e.g. an atomic-by-construction invariant) — never silently. Judge the
  phase's *core*, not its blast radius: touching an app that happens to have auth
  doesn't make a copy tweak correctness-critical.
- **Fable is the flagged budget exception.** Route to it only when the plan names
  the reason ("needs fable because X") — the most demanding long-horizon
  autonomous work; default to opus otherwise.
- Do **not** use the `opusplan` model setting alongside these annotations — it
  auto-forces sonnet on execution (and now Opus 5 on planning) and would override
  any phase the plan marks as needing a specific model.

## Mandatory final phase: adversarial review

**Every Build Plan ends with an adversarial review phase.** Bake it in at
approval time. This applies to **any substantive work, whether or not it began
with an approved plan** — including a spawned background session — before
declaring the work done.

```
### Phase N — Adversarial review (mandatory)
▶ SWITCH:  /model opus   ·   /effort xhigh    (opus = Opus 5 on Claude Code ≥2.1.219; fable for high-stakes work)
```

Never at less than the effort the work itself got.

### Two reviewers, in order: Codex first, then Claude — neither replaces the other

**For any change to CODE the adversarial review has two stages, and BOTH run.**
Stage 1 is the OpenAI Codex CLI; stage 2 is a Claude reviewer. Not belt-and-braces:
on PR #44 the session declared the review done on Codex alone, and the Claude pass
afterwards still found two Highs — including a coverage claim already given to
Kelsey that was **false** (11 of 18 send sites unguarded, the test's regex anchored
to one spelling so it reported green over the gap).

**Stage 1 — Codex: "is this correct?"** Different vendor, different model, no
memory of my reasoning — that is the independence it buys. It runs first because
it is cheaper and catches correctness bugs before stage 2 has to.

- **I invoke Codex; Kelsey never runs it himself.** He asks for a review in plain
  English and I run the tool. Never hand him a command to type.
- **Where the repo has a wrapper, that wrapper is the only sanctioned call** —
  `node scripts/codex-review.mjs --diff --round <N>` — never a hand-written
  `codex exec`. The wrapper encodes ~12 individually-verified containment flags;
  retyping them by hand is how the containment silently breaks. If it lacks a
  capability, extend the wrapper. **Where the repo has no wrapper** (today only
  waypoint-core-system has one), fall back to
  `codex exec --sandbox read-only - < /path/to/review-prompt.txt` and say in chat
  that the run is unwrappered. If Codex is unavailable entirely, say so and go to
  stage 2 — never drop the external pass silently.
- **Scope — skip stage 1** for docs, gitlink/deploy bumps, ops and content files,
  and one-line mechanical edits: an external review there is latency and noise,
  and needlessly ships my code to OpenAI. **Skipping Codex never skips stage 2** —
  a governance-bearing change gets the Claude reviewer even when it is pure prose.
- **Feed it the original request verbatim + the diff**, and prompt it to find
  fault, not to bless. Tell it not to summarize the code.
- **Check the payload before sending.** It leaves the machine: grep the diff for
  tokens/keys and never include `.env`. Say in chat what is being sent.
- `read-only` cannot run a test harness (`tempfile.mkdtemp()` has nowhere to
  write), so it reviews statically. That is usually enough — it still finds real
  bugs. Use `--sandbox workspace-write` only when the review genuinely needs to
  execute tests, and say so.
- **Verify every finding against the real code before acting on it.** Codex is
  another agent, not an oracle; the grounding rule applies to its claims too.
  Reproduce it, fix it, or decline it with a stated reason.

**Stage 2 — Claude: "is this what was asked, and are the calls defensible?"**
Runs after Codex, on the post-fix state. Use a fresh subagent where the session
allows one; where agents are forbidden, run it in-session and **label it plainly as
self-review**, the biased last resort — but never skip stage 2 on that basis. For
non-code work needing an adversarial pass (a plan, a governance edit, research),
stage 2 alone is the review.

**Between them the two stages must deliver all five.** Stage 1 can only do 3–5;
**1 and 2 are stage 2's alone**, because Codex never sees the original request,
CLAUDE.md, memory, or this conversation:

1. **Audit claims against evidence.** Every "passing / works / done / verified"
   points to an actual tool result from this session. Re-run the tests fresh; treat
   a reported pass as unproven until re-observed.
2. **Scope completeness.** The original request goes into the reviewer's input
   **verbatim** — that is the input Codex lacks. List what a careful reading
   requires that wasn't delivered.
3. **Correctness bugs** — unhandled edge cases, error paths, race conditions.
4. **Test quality** — do the tests exercise real behavior, or pass by construction?
5. **Concrete improvements** — simplification, reuse, missed opportunities, ranked
   most-severe first.

Also stage 2's alone: **governance-bearing decisions** — anything a CLAUDE.md rule or
memory file speaks to (a security allowlist entry, a git or deploy call, a research
gate). Codex cannot see those rules, so it cannot judge these.

Compose with existing skills: **`/run`** to drive the real flow end-to-end instead of trusting
the test log (`/qa` instead where the surface is a web app — `/qa` is web-only, so it is not the
general instrument). **`/review`** is the reachable diff-level pass. `/code-review` is NOT in this
harness's skill listing, so I do not claim to run it — and `/code-review ultra` is explicitly
user-triggered and billed. Ask Kelsey for those; never report them as run.

**Act, don't acknowledge.** After the review, fix each finding or state
explicitly why it's declined. "Noted" does not close a finding.
<!-- END franscale-plan-budgeting -->

<!-- BEGIN franscale-research-directive (canonical: dotfiles/claude/CLAUDE.md — do not edit copies; re-run stamp-git-safety.sh) -->
## Research before generation (hard rule — applies when this repo produces content)

**Applies only where this repo is the place a channel's per-item content decisions are recorded**
(the repo that owns the video/post record and its research). Inert everywhere else: apps, sites, ops
and CRM repos, and any sub-component of a pipeline whose research lives in its parent — one channel
needs ONE gate, not one per skill, submodule, or worktree. If you are unsure whether this block binds
here, it does not; say so and move on rather than standing up a second gate.

The failure this stops: a video or post gets generated on research that was never finished, so
unsourced claims and repeat topics reach an audience. **This is about accuracy and originality, not
about money.** Generation credits refresh monthly and are not the binding constraint; do not
rationalize a heavier process than the work needs, and never present cost as the reason for this rule.

- **Research finishes BEFORE generation, not before publish.** The research phase is completed and
  recorded on the item's own record first. A pre-publish check is the last word before shipping, but
  by then the piece is already built around whatever the research did or did not establish.
- **Prefer a machine check over a promise, where the repo already has somewhere to put one.** If the
  repo has a gate harness, add the research checks to it: novelty decided, every factual claim
  carrying a resolvable source, originality attested, the value/payload planned. If it does not, a
  recorded checklist is acceptable. Do not stand up gate infrastructure a channel's volume does not
  justify.
- **A new channel inherits this rule, not another repo's snapshot.** Copying or forking an existing
  channel repo carries that repo's state and nothing newer — it does NOT bring the research gate with
  it. Stand one up in the new repo, expressed in that repo's own conventions and medium. "The repo we
  forked already had gates" is exactly the assumption this rule exists to kill.
- **The gate proves research is complete, never that it is right.** Presence, shape, and resolvable
  sources are machine-checkable; novelty, truth, and whether the value is real stay with the human.
- Working implementations to copy the shape of, not the substance. All verified on `main`:
  `channel-2-intelligence/docs/RESEARCH-DIRECTIVE.md` (+ `scripts/validate-research-directive.mjs`),
  `faceless-infotainment/docs/RESEARCH-DIRECTIVE.md` (+ `pipeline/check-research-ready.mjs`),
  `video-skills/recipes/competitor-research-ideation.md` (the competitor pacing/runtime method), and
  Sleepy Nimbus (`YouTube-Video`) `pipeline/remotion/scripts/preflight-episode.ts` +
  `channel-safety-check.ts` (fail-closed COPPA).

**Act, don't acknowledge:** I confirm the research is complete and recorded before I generate. If it is
not, I say so plainly rather than generating anyway. If the repo has no check for it, surfacing that is
mandatory; building one is a scoped piece of work to agree first, not a licence to start unrequested.
<!-- END franscale-research-directive -->

<!-- Repo-specific. Outside every stamped marker on purpose: stamp-git-safety.sh
     splices only between BEGIN/END markers, so this survives a re-stamp. -->

## `franscale-research-directive` is INERT in this repo (ruled 2026-08-05)

The block above stamps into every Franscale1922 repo — there is no per-repo opt-out — so it is
present here but **does not bind**. Kelsey ruled it inert for waypoint-core-system on 2026-08-05:
this is a site/app repo, and the 45 articles under `content/` are **not** a channel's per-item
content records with their own research decisions. Content quality here is already gated by
`CONTENT-STANDARDS.md` plus the aeo-audit pre-push gate, which is the ONE gate this channel needs.

Do not stand up a second research gate here, and do not re-litigate the ambiguity each session —
that question is closed. It reopens only if this repo starts owning per-item content research
(a video/post record with its own sources), which publishing articles alone does not make it.

## Codex delegation — repo mechanics only

The **rule** for Codex — two reviewers in order, what each stage owns, when to skip stage 1,
payload safety, and that I invoke it while Kelsey never runs it himself — lives in the
`franscale-plan-budgeting` block above. **That is its single home; do not restate it here.**
Two copies of one rule is the documented failure mode that already let a false coverage claim
reach Kelsey. This section carries only what is specific to *this* repo.

**The only sanctioned way to call Codex from this repo is `scripts/codex-review.mjs`.**

```bash
node scripts/codex-review.mjs --target <path> --round <N>
node scripts/codex-review.mjs --diff --round <N>
```

Do **not** hand-write a `codex exec` command. The wrapper encodes ~12 containment flags that
were each verified individually (`.claude/tool-evaluations.md` §11 E–O). Retyping them by hand
is how the containment silently breaks — one missing flag reopens web egress or the hosted
GitHub/Google-Drive **write** connectors. If the wrapper needs a capability it lacks, extend the
wrapper; do not bypass it.

**Beyond the review phase**, reach for it for discovery/legwork on public source when it is
worth spending Codex's pool instead of Claude's. Blind-spot non-overlap between the two
reviewers is **measured, not assumed** (§11-J, §11-L).

**Rounds rotate the persona**: 1 = senior engineer, 2 = security/data-integrity, 3 = ops/SRE,
4+ deepens. Run round 1 first; escalate only if it finds something worth pressing on.

**Read the findings file it writes, not the transcript** — that is the whole point of the
contract, and reading the transcript spends the Claude tokens the delegation was meant to save.

**Hard scope limit:** public, non-sensitive material only. No candidate PII, no franchisor/FDD
confidential documents, no `.env` files. Reads are disk-wide regardless of flags (§11-H), so
this is a discipline, not a technical guarantee.

**Verify what it returns** (the grounding rule, applied to Codex): its first live run produced
an accurate High while a separate Sonnet pilot produced a confident false claim.

## Deploys — pushing to `main` does NOT always redeploy

`vercel.json` carries an `ignoreCommand` (added 2026-08-02, `3c05c22`). Strict JSON allows no
comments, so the rule is documented here.

**A push to `main` skips the production build when the commit touches ONLY** `.claude/`,
`.codex-reviews/`, `CLAUDE.md`, `AGENTS.md`, `.gitignore`, or `docs/seo-reviews/` — files no part of
the build reads. Anything else deploys as before, **including `content/`**, which holds the 45
site-facing articles, and the rest of `docs/`.

Read the exclusion list off `vercel.json` rather than trusting this paragraph: it was already stale
once (it omitted `docs/seo-reviews/`, added later so session handoffs cost no deploy).

Why it exists: every deploy runs `prisma db push` against the **production** database, so a no-op
rebuild is not free.

Consequences worth knowing:
- **Do not wait for, or claim, a deployment after an agent-only push** — none will appear, and that
  is correct, not a failure. Editing this very file is such a push.
- `[skip ci]` does **not** skip Vercel. Verified 2026-08-02: it suppressed the
  `notify-google-on-deploy` GitHub Action while Vercel built anyway — the inverse of the intent.
  `ignoreCommand` is the mechanism that works; do not reach for `[skip ci]` expecting this effect.
- Semantics are exit-code based: **exit 0 skips, non-zero builds.** `git diff --quiet` returns 0 only
  when nothing outside the excluded paths changed, so the command *is* the rule — there is no
  inversion to get wrong. On a shallow clone with no parent commit git exits 128, so it builds; the
  failure mode is a needless deploy, never a silently skipped one.
- If you add an exclusion, first confirm nothing in `src/`, `scripts/`, `prisma/`, `next.config.ts`
  or `package.json` reads that path, and re-check against real history before pushing.

## This file is linted on pushes to `main` (added 2026-08-07)

The pre-push gate runs `~/dotfiles/projects/check-claude-md-commands.sh` against **this file as it
exists in the pushed commit**, and refuses the push if it names a slash command that does not
resolve. It is the mechanism behind the grounding rule's "no fabricated identifiers" — a dead
command name in prose rots forever otherwise, which is exactly how the retired `verify` command
(written with a leading slash) survived three review passes.

> The sentence above deliberately does **not** write that name with its slash, and neither does the
> one below. Both would trip this gate — as the first draft of this section did, caught by the very
> check it documents. The validator matches bare occurrences, and its `allow-missing` waiver is
> valid for a single mention only, so there is no waiver that covers two. Naming a dead command in
> prose about dead commands is the one case where the gate and the documentation collide; write the
> name without the slash.

**It runs only when the push lands on `main`, and only on the tip.** That is not timidity, it is
measurement: of 19 remote branch tips carrying this file, **only `main` passes** — every branch cut
before 2026-08-05 still names that retired command, as do 17 of the last 21 commits touching it. A per-commit
or all-branches gate would block most pushes in this repo, and `--no-verify` is banned, so there
would be no way past. Landing-on-`main` is read from the **remote** ref, since
`git push origin HEAD:refs/heads/main` has a local ref of `HEAD`.

- **Skipped, loudly, when the validator is absent** (`CLAUDE_MD_LINT_SKIPPED`). It is a dotfiles
  tool and this repo does not ship it, so a fresh clone or CI will not have it. Install with
  `cd ~/dotfiles && git pull && ./install.sh`, or point `CLAUDE_MD_VALIDATOR` at a copy.
- **Valve:** `SKIP_CLAUDE_MD_LINT=1 git push`. Tested for exactly `"1"` — `=0` does **not** disable
  it, the bug this repo already shipped twice with `SKIP_BIP_DRIFT` and `SKIP_UNIT_TESTS`.
- **Exit 2 is not exit 1.** A usage or input error is reported as a tooling failure, never as a dead
  command; and exit 0 with a zero command count is refused as a vacuous pass, because any file
  carrying the `franscale-` blocks contains `/model` and `/effort` by construction.
- **⚠ A machine divergence is not an `allow-missing` case.** 3 of the 8 commands this file names are
  per-machine installs, so a byte-identical file can pass here and block on the Mini. Install the
  missing skill, or use the valve. Writing `<!-- claude-md-lint: allow-missing … -->` for it records
  a false "deliberately absent" claim that the stamp then copies into all 39 governed files.
- **Not covered:** a change arriving through a PR squash-merge, which GitHub creates server-side and
  which passes through no local hook — the same limit every other check in this gate has.
