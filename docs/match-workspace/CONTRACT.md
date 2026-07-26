# Match Workspace & Outcome Loop — Domain & Privacy Contract (Phase 0)

Status: draft (Phase 0 of the `match-workspace-outcomes` roadmap).
Scope of this document: the bounded rules the Phase-1 schema implements and tests. It fixes vocabularies,
identity, privacy, immutability, the candidate-safe boundary, and the non-CRM boundary. It is authoritative
for Phase 1; Phases 2–4 extend it, they do not relax it.

Every numbered **[C-n]** below is a testable assertion — Phase 1 turns each into a schema constraint and/or
a Vitest test.

---

## 1. Purpose and the hard boundary

The candidate matcher produces a detailed, ranked slate, but today that result is an ephemeral
conversation artifact. This domain gives it a durable home: an **immutable record** of each completed match
run — its inputs, per-brand scores, corrections, slate decisions, and later real-world outcomes — so a past
score is explainable and outcomes can eventually be measured against the rubric.

**This is NOT a placement CRM.** Out of scope, permanently, in the first releases:

- **[C-1]** No pipeline/Kanban, journey stages, required actions, validation-call tracking, due diligence,
  tasks, reminders, commission accounting, or franchisor relationship management. The schema adds none of
  these; a reviewer confirms no such fields/tables exist.

Cold-lead outreach (the existing `Lead` model and its `sentAt/repliedAt/bookedAt` attribution) is a
**separate** concern:

- **[C-2]** Match-outcome events never write to, read decision state from, or overload the `Lead` model.
  Candidate-brand placement outcomes and cold-lead conversion outcomes stay in separate tables.

## 2. Safety model — correct by construction (not human review)

The operator cannot meaningfully review machine output (raw scores/JSON), and injecting that review as a
safety control is worthless. Therefore correctness is **structural**, never dependent on human scrutiny:

- **[C-3]** Every write is gated by strict schema validation (Zod at the boundary, DB constraints),
  fail-closed brand-identity resolution (unresolved brands are rejected, never guessed — enforced in
  Phase 2), idempotency, and immutability. If any of these cannot be satisfied, the write is refused.
- The only genuine human inputs are advisor **decisions** the advisor already makes in-session — confirm or
  reject a final slate, and record a real-world outcome. These are recorded, not second-guessed by a
  review step.
- The authenticated commit means "the advisor initiated this," not "the advisor verified the data." Safety
  does not rest on that verification.

## 3. Core vocabularies (frozen sets)

**Decision states** (a `MatchDecision` records a score's advisor decision):
`shortlist`, `final_slate`, `rejected`.

**Outcome types** (a `MatchOutcomeEvent`): `introduced`, `advanced`, `placed`, `lost`, `withdrawn`.

Decision (open item #3): **Postgres enums** for `MatchDecisionState` and `MatchOutcomeType` — they gate
historical truth and the labels that drive calibration, so DB-level integrity is worth the known
`db push` enum-evolution caution (adding a value later is a deliberate, reviewed change). Matcher-derived
descriptive fields whose vocabulary may evolve with the skill — `confidence` (HIGH/MED/LOW), `maturity`
(EST/GROW/EMRG), `flags` (data_gap/red_flag/msa_flag) — are **`String`/`String[]` validated by Zod at
import**, not DB enums, to avoid coupling the DB to a skill vocabulary that may change and to dodge the
enum-under-`db-push` pain the repo has already hit.

- **[C-4]** A `MatchDecision.state` outside the three decision states, or a `MatchOutcomeEvent.type` outside
  the five outcome types, is rejected at write time.

## 4. Candidate identity, privacy, and lifecycle

Decision (open item #1): a **`Candidate`** is the stable person; its inputs are versioned separately.

- **`Candidate`** = generated stable `id` (uuid); an optional advisor-provided **`externalRef`** (a
  human-friendly link key, e.g. a CRM id or initials+date) that is **unique** when present, so re-runs link
  to the same candidate; a **minimal** contact (`displayName`, optional `email`); retention/lifecycle fields.
  No full intelligence profile is copied here.
- **`CandidateInputVersion`** = the versioned snapshot reference of a candidate's matcher inputs (source
  type, source identity/**hash**, captured-at, approved-at, `supersededById`). The intelligence summary/
  questionnaire bodies are **referenced by hash/id, not copied** into this store.

Rules:

- **[C-5]** Re-running a candidate creates a **new** `MatchRun` linked to the same `Candidate`; it never
  overwrites a prior run. (Identity = `Candidate.id`; the import references an existing candidate or creates
  one; a provided `externalRef` cannot map to two candidates.)
- **[C-6]** PII is minimized: only `displayName` + optional `email` are stored on `Candidate`; matcher input
  bodies are referenced, not stored.
- **[C-7] Deletion / right-to-be-forgotten = anonymize, not destroy the record.** Deleting a candidate
  redacts the `Candidate` PII (name/email nulled/redacted) but preserves the immutable runs/scores/outcomes
  (which key on the opaque `Candidate.id`, carrying no PII), so historical truth and future calibration
  survive a deletion request.
- **[C-8]** Candidate-input corrections are a **new** `CandidateInputVersion` (supersession), never an
  in-place edit.
- Access: the entire surface is behind the authenticated admin boundary (single operator). Phase-2
  endpoints must sit under a genuinely gated path (the repo's `/api/admin/*` is NOT auto-gated).

## 5. Immutability and idempotency

Scores and decisions are **append-only snapshots**. A current-state view may be derived for the UI, but the
historical record is never updated in place.

- **[C-9]** `MatchRun`, `MatchScore` rows are never `update`d after creation (application discipline; a
  reviewer checks there is no update path).
- **[C-10]** Exactly one `MatchScore` per `(runId, waypointBrandId)` — DB `@@unique`.
- **[C-11] Idempotent import:** a `MatchRun` carries an `idempotencyKey` = the content hash of the frozen
  package. Re-importing the same package (same key) creates **no** duplicate run, scores, decisions, or
  outcome events — DB `@@unique` on `idempotencyKey`.
- **[C-12]** Corrections, decisions, and outcome events are append-only with an effective timestamp and a
  `supersededById` link; a "change" is a new superseding row, never a mutation of the prior row.
- **[C-13] Reconstructable:** any historical final score can be recomputed from its own frozen inputs
  (`fit`, `i19Score`, `i20Score`, `msaModifier`, and the referenced `ScoringConfig` version) — every
  intermediate (`preMsaScore`, `msaModifier`, `finalScore`) is stored, and confidence is stored **separately**
  and never multiplied into the score.

## 6. ScoringConfig governance

Decision (open item #2): the scoring weights/caps/confidence-bands live in the matcher skill, not this DB.
`ScoringConfig` is a **versioned, approval-gated record** of a configuration; each run references the active
version it was scored under.

- **`ScoringConfig`** = `version`, the frozen `weights`/`thresholds`/`caps` (as `Json`), `effectiveFrom`,
  `approvalState`, a `contentHash`, `createdAt`.
- **[C-14]** Every `MatchRun` references exactly one `ScoringConfig` version. The matcher **declares** the
  config version it used in the emitted package; if that version is not a known, approved `ScoringConfig`,
  the import is **rejected** (fail-closed — an unknown config never auto-creates an approved one).
- A config change (new weights) is a deliberate new `ScoringConfig` row (approval-gated), not an edit. The
  initial row is seeded from the current matcher configuration (a one-time recorded snapshot).

## 7. Candidate-safe projection boundary

The matcher's Stage 5 is the only candidate-facing surface and already strips all scoring. The projection
stored here is **that text only**.

- **[C-15]** The candidate-safe projection contains **no** internal score, confidence, red-flag/flags, raw
  quote/evidence body, I19/I20 number, or BrandDB field name. Forbidden leak classes are enumerated and
  tested.
- **[C-16] Enforced by construction:** the projection is stored in a dedicated text field generated ONLY
  from the confirmed slate's Stage-5 text; the candidate-facing view reads ONLY that field and never joins
  to `MatchScore`. (Generation + the leak test land in Phase 2; the boundary is fixed here.)

## 8. Calibration gates (spec only — Phase 4 is parked)

No calibration/analysis ships until real outcome data accumulates. When it does:

- **[C-17]** Reporting is **descriptive only** until an approved minimum sample size (e.g. a floor on
  distinct `placed`/`lost` labels) and label-quality thresholds are met.
- **[C-18]** Analysis uses only **frozen decision-time features and labels**; it never rewrites historical
  scores and never introduces future-state fields (no leakage). Any proposed weight change is a versioned
  review diff that does not activate a config.

## 9. Record model overview (bridge to Phase 1)

Eight records (details, columns, and constraints are Phase 1): `Candidate`, `CandidateInputVersion`,
`MatchRun` (candidate, input version, BrandDB snapshot/version, `ScoringConfig`, status, actor,
`idempotencyKey`), `MatchScore` (run, `waypointBrandId` opaque string — no FK, no Brand table here; rank,
scalar score fields, `flags String[]`, `detail Json` for the frozen per-brand object), `MatchCorrection`,
`MatchDecision`, `MatchOutcomeEvent`, `ScoringConfig`. Brands are referenced by the stable `wpb_` identity
string from the registry (authority lives in the brand-intelligence pipeline / BrandDB), resolved
fail-closed at import (Phase 2).

## 10. Deploy-safety note (informs Phase 1)

Production reconciles the schema via `prisma db push --accept-data-loss` on every deploy. An immutable-record
domain cannot sit unguarded on that path. Phase 1 adds a **fail-closed build guard** that refuses to `db
push` a destructive change (DROP TABLE/COLUMN, lossy ALTER TYPE) to any table in this domain.

> **Correction (2026-07-26, Phase 1 grounding).** The premise above was verified against the live Vercel
> project rather than trusted, and is partly inaccurate as stated — the guard requirement stands regardless,
> for still-valid (in fact broader) reasons:
> - What production actually runs is **`vercel.json`'s `buildCommand`**: `prisma generate && prisma db push
>   && next build` — **without** `--accept-data-loss` (confirmed in the latest production deployment's build
>   log). Only `package.json`'s local `build` script carries that flag, and Vercel ignores a project's
>   `package.json` build script when `vercel.json` sets an explicit `buildCommand`. So today a destructive
>   change makes `prisma db push` *refuse and fail the build* — blunt, but not a silent data drop.
> - Because of that, the guard is wired into **`vercel.json`'s `buildCommand`** (the command that actually
>   runs), before `db push` — wiring it only into `package.json` would never execute on a real deploy. It is
>   also added to `package.json`'s `build` for local parity.
> - Independently verified: this repo has **no separate preview/staging database** — both DB URLs point at
>   the same Neon instance production uses — and Vercel's deployment history shows non-`main` branches do
>   produce live deployments that run the same `buildCommand`. So the guard protects against an *accidental
>   branch push*, not only the eventual approved go-live. The guard is `scripts/guard-immutable-tables.mjs`
>   (fail-closed; distinguishes a detected destructive change from an infra failure, and refuses the build
>   either way).
