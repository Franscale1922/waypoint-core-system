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
recommended model and effort level** before doing the work, so I know when to
switch as I move through it. A session with no plan still lays the phases out
first — there is nothing to annotate until it does. Model and effort are session-level in Claude Code —
they can't be switched automatically per task — so the plan is where the
budgeting decision gets made and I flip them by hand at each boundary.

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
the rationalization this rule exists to kill. At every phase boundary whose
`▶ SWITCH` line differs from the current session setting, you MUST:

1. **Halt before doing any of that phase's work** — do not read, edit, run, or
   spawn anything for the new phase. End your turn.
2. **Emit the switch as an explicit gate**, e.g.:
   > ⏸ **STOP — switch before I continue.** Phase 3 needs `/model opus` ·
   > `/effort xhigh`. Run those two commands, then reply **"go"** (or "done" /
   > "proceed"). I will not start Phase 3 until you confirm.

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
  whether you stop — only *no change at all* skips the stop. Returning to a
  mechanical phase after a hard one *feels* safe to coast through; it is not.
- **The gate binds even without a plan.** A spawned/background session that never
  entered plan mode still stops at each boundary and waits — it does not get to
  run through on one setting because "there was no approval step."
- **The final adversarial-review phase is itself a gated boundary** (it steps the
  model/effort up) — stop and wait for the switch before running the review, same
  as any other phase.
- If you catch yourself already several phases deep on the wrong setting, stop
  immediately, say so plainly, and tell me what should be re-run on the correct
  model/effort rather than papering over it.

### A phase boundary is a session boundary

**Switching isn't free — it dumps the prompt cache.** Changing model *or* effort
mid-conversation invalidates the cached prefix; the next turn re-writes it at the
1-hour cache-write rate — **2× base input**, twice uncached and ~20× a cache hit.
Measured 2026-08-03 on a real session: three switches at 140–280k context cost
**~$5.10** of re-caching, the *effort-only* switch the priciest at $2.68.

**At a boundary, pick the cheapest of three.** If the work is delegatable and
briefable, spawn a **subagent** at the target model/effort — the parent's cache is
untouched, so this beats both alternatives. Otherwise weigh the switch against a
cold start, which is **~63k tokens / ~$0.63 on Opus** (measured across 7 sessions):
above **~60k** of accumulated context, end the session and hand off; below it, just
switch in place. Close every session with a fenced block I can paste into a new chat —
the one-line task, the literal `/model` and `/effort` commands on separate lines,
a pointer to the handoff doc, and any constraint that would do real damage if
missed; it **points, never restates**. Where a switch must happen in place, group
work so each boundary is a real change of task, don't bounce between tiers inside
one phase, and on a long cached session weigh the re-read against the gain before
stepping up for a short detour.

### Model roster — capability, cost, and fit

**Relative cost** (vs Opus = 1×) is the durable signal; absolute prices are a
dated snapshot — refresh from the `/model` picker + the Models API
(https://platform.claude.com/docs/en/api/models). All 1M context except Haiku
(200K). _Prices $/1M in·out, verified 2026-07-26._

| Model | Rel. cost | $/1M in·out |
|---|---|---|
| Haiku 4.5 | ~⅕× | $1 / $5 |
| Sonnet 5 | **~⅖× now** (⅗× after 2026-08-31) | $3 / $15 — **intro $2/$10 thru 2026-08-31** |
| Opus 5 | 1× | $5 / $25 |
| Opus 4.8 | 1× (same) — Anthropic-"legacy", will retire | $5 / $25 |
| Fable 5 | 2× | $10 / $50 |

Quirks the prices don't show. **Haiku** is not for real reasoning or coding.
**Sonnet is literal** — state the scope you want. **Opus 4.8** is an escape hatch,
not a home. **Fable** costs beyond its price: minutes-long turns, always-on
thinking, 30-day retention, classifiers that can refuse.

### Choosing at every pass — start at the floor, justify every move

**Opus 5 @ high is the floor** — `/model opus` · `/effort high` (needs Claude Code
≥ v2.1.219; see the alias-drift note). Down is the main cost lever and the
disciplined default when the task doesn't need Opus-grade reasoning — take the
tier from the matrix below, and never under-power genuinely hard or
correctness-critical work to save tokens. **Up is an EFFORT move, not a model
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
  more tokens per task. Three mitigations, applied by default: never instruct it
  to double-check or self-verify (it already does, and the instruction compounds
  it); state scope explicitly and don't widen the task; cap subagent spawning on
  cost-sensitive runs.
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

## Codex delegation — I call it, Kelsey never does

Kelsey does not run commands. If Codex should be involved, **I invoke it**; he asks for a
review or a second opinion in plain English and I run the tool. Never hand him a command to
type, and never tell him to trigger a Codex run himself.

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

**When to reach for it:**
- The mandatory adversarial-review phase — as an *additional* reviewer alongside the Claude
  one, not a replacement. They have non-overlapping blind spots; that is measured, not assumed
  (§11-J, §11-L). Codex answers *"is this correct?"*; it cannot see CLAUDE.md, memory, or this
  conversation, so anything **governance-bearing** still requires the Claude reviewer.
- Discovery/legwork on public source when it is worth spending Codex's pool instead of Claude's.

**Rounds rotate the persona**: 1 = senior engineer, 2 = security/data-integrity, 3 = ops/SRE,
4+ deepens. Run round 1 first; escalate only if it finds something worth pressing on.

**Read the findings file it writes, not the transcript** — that is the whole point of the
contract, and reading the transcript spends the Claude tokens the delegation was meant to save.

**Hard scope limit:** public, non-sensitive material only. No candidate PII, no franchisor/FDD
confidential documents, no `.env` files. Reads are disk-wide regardless of flags (§11-H), so
this is a discipline, not a technical guarantee.

**Verify what it returns.** Codex findings are claims, not facts — the grounding rule applies
unchanged. Its first live run produced an accurate High and, in a separate pilot, Sonnet
produced a confident false claim. Check against source before acting.

## Deploys — pushing to `main` does NOT always redeploy

`vercel.json` carries an `ignoreCommand` (added 2026-08-02, `3c05c22`). Strict JSON allows no
comments, so the rule is documented here.

**A push to `main` skips the production build when the commit touches ONLY** `.claude/`,
`.codex-reviews/`, `CLAUDE.md`, `AGENTS.md`, or `.gitignore` — files no part of the build reads.
Anything else deploys as before, **including `content/`**, which holds the 45 site-facing articles.

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
