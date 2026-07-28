# Matcher emit stage (the block to add to the candidate-matcher skill)

This is the source of truth for the section appended to the **July** matcher skill
(`~/Projects/candidate-matcher/franchise-candidate-matcher.skill`, 2026-07-22) so a completed
match run can be imported into the match workspace.

**It is version-controlled here and NOT in the matcher repo**, because in that repo the `.skill`
and `.zip` files are untracked and sit beside a `Candidates/` folder holding real candidate
material. This file is the reviewable copy; the built artifact is for upload only.

## The frontmatter description must be under 1024 characters

Claude Skills reject an upload whose YAML `description` exceeds **1024 characters**. The July skill
on disk is **1138**, so it cannot be uploaded as-is. This is pre-existing and unrelated to the export
stage (which is appended at the end of the file, nowhere near the frontmatter), but it blocks the
upload either way.

The build script therefore substitutes the compliant description below and **fails the build** if the
result is still over the limit, so this cannot regress silently. Every trigger phrase from the
original is preserved verbatim, because those are what make the skill activate; only descriptive
prose was condensed.

```skill-description
Complete franchise candidate-to-brand matching for Waypoint Franchise Advisors. Takes candidate intelligence, questionnaire, and Candidate Model as inputs. Establishes the candidate's involvement range on a three-rung ownership scale, scores emotional alignment, audits transcript-grounded verbal signals, applies per-brand neutralization and an explicit fit-score engine, filters BrandDB_Matching, ranks brands, validates with FDD analysis, runs MSA market viability, and outputs a final Top 3 recommendation with confirmed modifiers applied. Use when: user says "Match candidate to brands," "Run candidate matching," "Generate brand matches," "Run the matcher," "matching workflow," or provides candidate files for brand matching. Required inputs: Candidate Intelligence Summary, Candidate Questionnaire (CQ), Candidate Model, BrandDB_Matching subset (after Stage 3B). Candidate-facing talking points come downstream from the brand-introduction-scripts skill; this skill ends at the Top 3 recommendation.
```

## How this reaches the live skill (a manual step, by design)

There is **no installed local copy** of this skill. The version Kelsey actually runs is uploaded
to Claude, so editing any file on disk changes nothing by itself. The workflow is:

1. `scripts/build-matcher-emit-skill.mjs` appends the block below to the July `SKILL.md` and
   writes `franchise-candidate-matcher-with-emit.skill` next to the original.
2. Kelsey re-uploads that file to replace the installed skill.
3. Until then, a conforming package can still be produced by hand and imported. **The app never
   depends on this edit having landed** (`MatchPackageSchema` validates whatever arrives).

## Why the config version and weights are declared in the skill

[C-14] requires that a run declare the scoring configuration it used, and that an unknown or
unapproved configuration be refused at import. A bare version string would be an unverifiable
label: someone could change the weights without bumping the version, and the "approved config"
check would pass while the run was scored under different arithmetic.

So the skill carries the weights themselves in a machine-readable block. The seed script derives
`ScoringConfig.contentHash` from that block, and a test recomputes it from the skill file and
fails when the two drift. The version string is then meaningful, because it is bound to content.

---

## The block appended to SKILL.md

````markdown
---

# STAGE 6: Match-Workspace Export (machine-readable)

Runs after the advisor confirms the slate. It adds no analysis and changes no score. It
serializes what Stages 3C through 4M already produced so the run can be stored immutably.

Emit **exactly one** fenced `json` block, and nothing else in this stage. Do not summarize it,
do not add commentary around it, and do not reformat the numbers for display: this block is read
by software, and the human-readable tables above remain the advisor's view.

## Scoring configuration (frozen; the import checks this)

```scoring-config
version: matcher-2026-07-22
weights.COMPREHENSIVE: fit=0.50 i19=0.25 i20=0.25
weights.MODERATE:      fit=0.55 i19=0.15 i20=0.30
weights.MINIMAL:       fit=0.60 i19=0.10 i20=0.30
normalization: i19/i20 divided by 5
pride_gate_caps: no=0.74 unknown=0.82
red_flag_cap: 0.70
fdd_cut: top 10 by fit_score
```

If you change any weight or cap above, change `version` in the same edit. The import refuses a
run whose declared version is not a known, approved configuration, and a stored hash of this
block is compared against it.

## Emit

```json
{
  "packageVersion": "1.0",
  "scoringConfigVersion": "matcher-2026-07-22",
  "brandDbVersionRef": "<the BrandDB subset/snapshot identifier the advisor uploaded>",
  "candidate": {
    "externalRef": "<stable advisor-provided key, e.g. CRM id or initials+date>",
    "displayName": "<candidate name>",
    "email": "<email or null>"
  },
  "inputVersions": [
    { "sourceType": "intelligence_summary", "sourceRef": "<file name or id>", "capturedAt": "<ISO 8601>" },
    { "sourceType": "questionnaire",        "sourceRef": "<file name or id>", "capturedAt": "<ISO 8601>" }
  ],
  "brands": [
    {
      "brandName": "<EXACTLY as it appeared in the uploaded BrandDB subset>",
      "rank": 1,
      "maturity": "EST",
      "scoringStage": "stage_4c",
      "fitRaw": 0.8600,
      "fitScore": 0.8600,
      "i19Score": 4,
      "i20Score": 4,
      "i19DisclosureLevel": "COMPREHENSIVE",
      "preMsaScore": 0.8300,
      "msaModifier": 0.0500,
      "finalScore": 0.8800,
      "scoreCapApplied": null,
      "confidence": "HIGH",
      "flags": [],
      "exclusions": [],
      "detail": {
        "alignments": ["..."],
        "friction": ["..."],
        "verbalSignal": "... or NONE",
        "structuralCorrections": ["... or NONE"],
        "i19Block": { "disclosure": "COMPREHENSIVE", "dataYear": 2025, "sample": "X of Y", "positives": ["..."], "concerns": ["..."] },
        "i20Block": { "systemSize": 0, "trend": "EXPANDING", "transferHealth": "...", "positives": ["..."], "concerns": ["..."] },
        "msaFindings": { "pricePointFit": "...", "demandEnvironment": "...", "saturation": "...", "trajectory": "..." },
        "correctionSummary": "... or none",
        "evidenceRefs": ["..."]
      }
    }
  ],
  "confirmedSlate": ["<brand names the advisor confirmed>"]
}
```

## Rules for the emitted block

1. **Every ranked brand appears**, not just the slate. Ranks must run 1..n with no gaps: a gap
   means a brand was dropped, and the import refuses the package.
2. **`scoringStage`** is `"stage_4c"` for brands that reached FDD/MSA scoring, `"stage_3c"` for
   brands below the top-10 cut. A `stage_3c` brand carries `fitRaw`/`fitScore` and sets
   `i19Score`, `i20Score`, `i19DisclosureLevel`, `preMsaScore`, `msaModifier`, `finalScore` to
   `null`. Do not invent values for them.
3. **Full precision, 4 decimal places.** Emit `0.8300`, not `.83`. The printed tables round to 2
   places for reading; this block must not.
4. **`finalScore` must reconcile:** `finalScore = preMsaScore + msaModifier`, and when the
   red-flag override applies, `finalScore = min(preMsaScore + msaModifier, 0.70)` with
   `scoreCapApplied: 0.70` **and** `"red_flag"` present in `flags`. The import recomputes this
   and refuses a package that does not reconcile.
5. **When neither Item is scorable** (`i19Score` and `i20Score` both `null` at `stage_4c`),
   `preMsaScore` equals `fitScore`, per the worked example "R2 (neither scorable): pre-MSA = fit".
6. **`i19DisclosureLevel` is required whenever I19 and I20 are present.** It selects the weight
   row, so without it the score cannot be reconstructed later.
7. **`fitScore` may be `null`** only in the Foundation-B support-floor case (no active soft
   variables). Include `"thin_fit"` in `flags`. Never emit `0` or `1` to stand in for it.
8. **`flags`** may contain only: `data_gap`, `red_flag`, `msa_flag`, `thin_fit`.
9. **No candidate-facing language anywhere in this block.** Talking points come from the
   `brand-introduction-scripts` skill downstream and are captured separately.
10. **Brand names are copied exactly** from the uploaded subset. The import resolves them to
    stable identifiers and **refuses the whole package if any name cannot be resolved**, rather
    than guessing.

**After output:** "Match-workspace export emitted. Paste this JSON block into the import screen."
````
