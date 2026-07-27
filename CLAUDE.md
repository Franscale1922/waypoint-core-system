<!-- BEGIN franscale-git-safety (canonical: dotfiles/claude/CLAUDE.md — do not edit copies; re-run stamp-git-safety.sh) -->
## Git & delivery ownership (hard rule — I run git end-to-end; you get told, not asked)

Kelsey has given me standing authorization to run the whole git lifecycle **autonomously** — stage,
commit, branch, push, open/merge PRs, bump submodule gitlinks — without asking. Kelsey does not do git and
must **never be asked a git question**. Safety comes from how I behave, not from you approving me. This
**overrides** the default "commit/push only when asked."

- **I own the checkpoints.** When a change is complete and verified, I commit it — I never leave verified
  work uncommitted and never wait to be told. Also before switching repos, deploying, or ending a session.
- **I never push red.** I only push work I've actually verified green (tests / build / `/verify`, sized to
  the change). Can't verify it? I commit locally and say so — I don't push unverified code.
- **I do the whole thing, then report — in plain English, not git-speak.** e.g. *"Saved and pushed the 3
  doc fixes — live for the Mini to pull. Wrong? Say 'undo that' and I'll revert it."* I never make you
  read branches or SHAs. If anything failed, I say so with the error — I never claim a success I didn't see.
- **A live go-live is a product decision, so I surface it first.** Some repos auto-deploy to a
  customer-facing site the instant I push. For those I say so in plain English and wait for "go" before
  pushing — and this **overrides** "docs can go straight to `main`" for anything a visitor could see or that
  forces a production redeploy. (A pure agent-directive file — `CLAUDE.md` / `AGENTS.md` — doesn't change
  the site, so I push it normally even in a live repo.) **How I know a repo is live** — NOT from `.vercel/`
  (it's gitignored, so it's gone on a fresh clone): I treat a push as going live if the repo has a committed
  `vercel.json` / `netlify.toml` / deploy CI workflow, OR is a deployable web app (Next.js / Vite /
  SvelteKit / static site) with no obvious non-production host, OR is a known live repo — **auto-deploy on
  push:** whimsey-and-grace, Bizconnect Caribbean, Timeblock, local-websites/heart-strings,
  waypoint-core-system, Franchise Conduit. (**Live but push-safe** — deploy is a manual step, a normal push
  is fine: Candidate Navigator, Waypoint Navigator OS, both Firebase.) When unsure whether a push deploys, I
  surface. Ordinary content/ops/docs repos just get pushed and reported.
- **Safe by construction:**
  - Branch + PR for app/product **code**; direct-to-`main` is fine for docs, deploy/gitlink bumps, ops repos.
  - I stage the exact files I changed — **never `git add -A` or `git add .`** — so I never sweep in
    unrelated, secret, or worktree files.
  - Never commit secrets/keys/tokens; respect `.gitignore`; never bypass repo hooks (`--no-verify` banned).
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
- **Evidence authority:** live system (n8n MCP read-only, file / `git` reads) > mechanically-generated
  canonical docs > hand-written docs > memory snapshot. For "this code change works," `/verify` drives the
  real flow; `/code-review` checks the diff.

**Act, don't acknowledge:** I check before I claim, and I label what I couldn't check. "I think" delivered
as "it is" is the failure this rule exists to stop.
<!-- END franscale-grounding -->

<!-- BEGIN franscale-plan-budgeting (canonical: dotfiles/claude/CLAUDE.md — do not edit copies; re-run stamp-git-safety.sh) -->
## Plan-mode budgeting (model + effort per segment)

I start nearly every chat in plan mode. When you produce a Build Plan (in plan
mode, any structured plan you present for approval, **or any multi-step task you
begin executing — including a session that started on its own without plan mode,
such as a spawned background task**), **annotate every phase with its
recommended model and effort level**, so I know when to switch as I move through
the work. If a session starts executing without a plan, still lay out the
phases with their switch lines before doing the work. Model and effort are session-level in Claude Code — they
can't be switched automatically per task — so the plan is where the budgeting
decision gets made and I flip them by hand at each boundary.

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

Listing the switches up front is **not** enough. The failure mode is real and
cuts **both ways**: the plan names the model/effort per phase, then execution
barrels through every boundary still on the *previous* phase's setting — too
light for the hard phase ahead (quality lost) **or** too heavy for the cheap
phase ahead (budget burned, and the checkpoint skipped) — never giving me time
to flip it. **A `▶ SWITCH` line that changes the model or effort in *either*
direction is a hard STOP, not a heads-up.** Stepping **down** — opus→sonnet,
xhigh→low, leaving a hard phase for a mechanical one — gates exactly like
stepping up; "I'm only making it cheaper/faster, no need to stop" is precisely
the rationalization this rule exists to kill. Never wave a down-switch through
as harmless. At every phase boundary whose `▶ SWITCH` line differs
from the current session setting, you MUST:

1. **Halt before doing any of that phase's work** — do not read, edit, run, or
   spawn anything for the new phase. End your turn.
2. **Emit the switch as an explicit gate**, e.g.:
   > ⏸ **STOP — switch before I continue.** Phase 3 needs `/model opus` ·
   > `/effort xhigh`. Run those two commands, then reply **"go"** (or "done" /
   > "proceed"). I will not start Phase 3 until you confirm.

   Or the same stop when the switch steps **down**:
   > ⏸ **STOP — switch before I continue.** Phase 4 steps DOWN to `/model sonnet`
   > · `/effort low` (mechanical rename — no reasoning needed). Run those two
   > commands, then reply **"go"** (or "done" / "proceed"). I will not start
   > Phase 4 until you confirm.
3. **Wait for my explicit confirmation** ("go" / "done" / "proceed" / "switched")
   before starting the phase. My confirmation is the only thing that releases the
   gate — a lack of response is not permission, and "it's just a quick phase" is
   not a reason to skip the stop.

Rules for the gate:
- **One stop per changing boundary.** If three consecutive phases each change the
  setting, that is three separate stops — never batch them into one "switch all
  of these now" message, because I flip settings one boundary at a time as I
  reach them.
- **No-change boundaries do not stop.** If the next phase's model AND effort match
  the current session, note "no change" and continue without halting.
- **Down-switches gate identically to up-switches.** Direction never decides
  whether you stop — only *no change at all* skips the stop. Do not silently
  carry a heavy setting into a cheaper phase, nor a cheap setting into a harder
  one. Returning to a mechanical phase after a hard one *feels* safe to coast
  through; it is not — it is a hard STOP.
- **The gate binds even without a plan.** A spawned/background session that never
  entered plan mode still stops at each boundary and waits — it does not get to
  run through on one setting because "there was no approval step."
- **The final adversarial-review phase is itself a gated boundary** (it steps the
  model/effort up) — stop and wait for the switch before running the review, same
  as any other phase.
- If you catch yourself already several phases deep on the wrong setting, stop
  immediately, say so plainly, and tell me what should be re-run on the correct
  model/effort rather than papering over it.

### Model roster — capability, cost, and fit

Token cost is a real selection input (we program heavily). **Relative cost**
(vs Opus = 1×) is the durable signal; absolute prices are a dated snapshot —
refresh from the `/model` picker + the Models API
(https://platform.claude.com/docs/en/api/models). All 1M context except Haiku
(200K). _Prices $/1M in·out, verified 2026-07-26._

| Model | Rel. cost | $/1M in·out | Best fit | Watch-outs |
|---|---|---|---|---|
| Haiku 4.5 | ~⅕× | $1 / $5 | Trivial, high-volume, latency-bound, non-reasoning. | Not for real reasoning or coding. |
| Sonnet 5 | **~⅖× now** (⅗× after 2026-08-31) | $3 / $15 — **intro $2/$10 thru 2026-08-31** | **The cost lever.** Near-Opus coding/agentic; well-scoped implementation, mechanical work, first-pass review. | Step below Opus on hardest reasoning / largest refactors. Literal — state scope. |
| Opus 5 | 1× | $5 / $25 | **THE DEFAULT** (the floor for Opus-grade build work). Deep reasoning, hard multi-file coding, large refactors, bug-finding (precision + recall). | Verbose; over-verifies; expands scope; over-delegates to subagents — see the mitigations note. `low`/`medium` unusually strong. |
| Opus 4.8 | 1× (same) | $5 / $25 | **Fallback** when Opus 5 misbehaves on a task — steadier, less verbose, less prone to scope drift. Pin it: `/model claude-opus-4-8`. | Anthropic-"legacy" — will retire eventually, so treat it as an escape hatch, not a home. |
| Fable 5 | 2× | $10 / $50 | Highest ceiling — most demanding long-horizon autonomous work only. | **Budget strainer / flagged exception.** Minutes-long turns; always-on thinking; 30-day retention; classifiers can refuse. |

### Choosing at every pass — start at the floor, justify every move

1. **Default: Opus 5 @ high** — `/model opus` · `/effort high`. (Requires Claude
   Code ≥ v2.1.219; on an older build `opus` silently means Opus 4.8 — see the
   version-gate note.)
2. **Down for cost** — the main lever, and the disciplined default when the task
   doesn't need Opus-grade reasoning: well-scoped / mechanical → **Sonnet 5**
   (`/model sonnet`, ~⅖× during intro pricing); trivial / high-volume → **Haiku**
   (`/model haiku`, ~⅕×).
3. **Up is an EFFORT move, not a model move.** The floor is already the strong
   Opus, so harder work means `/effort xhigh` (or `max`), *not* a model switch.
   The only model above the floor is **Fable 5** (`/model fable`, 2×) — reserved
   for the most demanding long-horizon autonomous work, and only when the plan
   names the reason.
4. **Sideways: Opus 4.8 is the escape hatch.** If Opus 5 is thrashing on a task —
   padding output, expanding scope, spawning subagents you didn't want — drop to
   `/model claude-opus-4-8` (same price, steadier) rather than fighting it.

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
| Adversarial review / bug-finding | opus 5 (`/model opus`); fable for high-stakes | high–xhigh |
| Opus 5 thrashing (padding, scope drift, unwanted subagents) | opus 4.8 (`/model claude-opus-4-8`) | high |

Notes:
- **⚠ Alias drift + version gate — pin by full ID, and check what you're on.**
  Bare `/model opus` / `/model sonnet` track whatever is *latest for your build*,
  so the same command means different models on different machines:
  **Claude Code ≥ v2.1.219** → `opus` = Opus 5; **below that** → `opus` = Opus 4.8
  (Sonnet 5 needs ≥ v2.1.197). Claude Desktop versions separately and may already
  be on Opus 5 while a CLI on the same machine is not. **Never infer the version —
  run `claude --version` or open the `/model` picker.** If the build is too old,
  an "up-switch to Opus 5" silently runs Opus 4.8; upgrade (`claude update`) or
  say so in the plan rather than claiming a step-up that didn't happen. Pin the
  floor and any load-bearing version by **full ID** (`/model claude-opus-4-8`);
  there is no `opus-4-8` short alias.
- **Opus 5 @ high is the floor.** Same price as Opus 4.8 ($5/$25), so there was
  never a cost argument for staying on 4.8 — and 4.8 is now Anthropic-"legacy"
  and will eventually retire, so pinning to it was borrowing time. Opus 5 is also
  the vendor-recommended default for exactly our workload (agentic coding).
- **The floor is strong, so mind what it costs per task.** Opus 5 is verbose,
  self-verifies, expands scope, and reaches for subagents — at the *same*
  per-token price that means more tokens per task than 4.8. Three mitigations,
  applied by default: **(1)** never instruct it to double-check or self-verify —
  it already does, and the instruction compounds it; **(2)** state scope
  explicitly and tell it not to widen the task; **(3)** cap subagent spawning on
  cost-sensitive runs. With those in place the floor is the right default; without
  them it quietly costs more than 4.8 did.
- **Cost is two-axis: tier × effort.** Effort is the within-model cost dial —
  higher effort means materially more thinking/tool tokens (it's a behavioral
  signal, not a published multiplier). Set it to task difficulty, not habit:
  `xhigh` is **not** the reflexive default — start at `high` and step up with a
  stated reason, or down for routine work (on Opus 5, `low`/`medium` are
  unusually strong). Dropping effort a notch on well-understood work is often a
  bigger, safer saving than switching models.
- **Switching isn't free — it dumps the prompt cache.** Changing model *or*
  effort mid-conversation invalidates cached prefixes, so the next turn re-reads
  the whole history at full input price. Budget switches like they cost
  something: group work so each phase boundary is a real change of task, don't
  bounce between tiers inside one phase, and on a long cached session weigh the
  re-read against the gain before stepping up for a short detour.
- **Cost is a real input at the low end — but capability wins on hard work.** For
  mechanical / well-scoped work, down-tier to Sonnet 5 (~⅖× during intro pricing)
  or Haiku (~⅕×) — that's the disciplined default, not a compromise. Never
  under-power genuinely hard or correctness-critical work to save tokens.
- **Correctness-critical phases are the standing exception to "start at high."**
  Any phase whose core is concurrency, security, data integrity, auth/money, or a
  subtle algorithm defaults to **opus 5 at `xhigh`** (fable only if justified) —
  this is the one category that gets the up-switch without further argument,
  because a defect there costs more than the tokens. It may drop to `high` only
  when the plan states a specific reason the reasoning collapses to something
  simple (e.g. an atomic-by-construction invariant) — never silently. Judge the
  phase's *core*, not its blast radius: touching an app that happens to have auth
  doesn't make a copy tweak correctness-critical.
- **Fable is the flagged budget exception.** At 2× Opus ($10/$50) it's the one
  move that strains the usage budget. Route to fable only when the plan names a
  specific reason it needs fable ("needs fable because X"); default to opus
  otherwise.
- **The review steps up, not down.** Run the adversarial review on **opus 5**
  (`/model opus`) at **`xhigh`** — the floor model, but never at less than the
  effort the work itself got — or fable for high-stakes. Catching subtle gaps is
  the most capability-sensitive task in the workflow, and Opus 5's bug-finding
  (high precision *and* recall) is what makes it worth the effort spend.
- Do **not** use the `opusplan` model setting alongside these annotations — it
  auto-forces sonnet on execution (and now Opus 5 on planning) and would override
  any phase the plan marks as needing a specific model.

## Mandatory final phase: adversarial review

**Every Build Plan ends with an adversarial review phase.** Bake it into the
plan at approval time — it is not optional and not something I have to remember
to ask for. This applies to **any substantive work, whether or not it began
with an approved plan** — if a session started executing on its own (e.g. a
spawned background task that never entered plan mode), still run the review
before declaring the work done.

```
### Phase N — Adversarial review (mandatory)
▶ SWITCH:  /model opus   ·   /effort xhigh    (opus = Opus 5 on Claude Code ≥2.1.219; fable for high-stakes work)
```

Run the review with a **fresh reviewer subagent** — not self-review. The agent
that did the work is biased toward "it works" and will defend its own choices.
Give the reviewer only the original request plus the diff/artifacts, and prompt
it to find fault, not to bless. The reviewer must:

1. **Audit claims against evidence.** Every "passing / works / done / verified"
   statement must point to an actual tool result from this session. Re-run the
   tests fresh. Flag any green that wasn't actually observed — treat a reported
   pass as unproven until re-run.
2. **Check scope completeness.** Re-read the original request and list what a
   careful reading requires that wasn't delivered.
3. **Hunt correctness bugs** — unhandled edge cases, error paths, race conditions.
4. **Judge test quality** — do the tests exercise real behavior, or pass by
   construction?
5. **Name concrete improvements** — simplification, reuse, missed opportunities —
   ranked most-severe first.

Compose with the existing skills where they fit: `/verify` to drive the real
flow end-to-end instead of trusting the test log, and `/code-review high` for a
diff-level correctness pass.

**Act, don't acknowledge.** After the review, fix each finding or state
explicitly why it's declined. "Noted" does not close a finding.
<!-- END franscale-plan-budgeting -->
