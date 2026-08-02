# Tooling Evaluation Tracker — franscale1922 portfolio

Progressive log of external repos / plugins / skills / MCPs evaluated for fit across the whole
portfolio (not just waypoint-core-system). Purpose: evaluate now, **revisit and install later**
after more evaluation. Append new evaluations; don't rewrite prior verdicts.

**Standing constraints (from Kelsey):**
- Skip ToS/account-safety as a blocker — no throwaway accounts exist to leverage anyway.
- Heavy FTC/FDD compliance context (no earnings/income claims, franchise terms explained inline).
  Any content-generating tool must sit behind a compliance gate.
- Prefer `--project` (sandboxed) installs over global `~/.claude` where a tool supports it.
- Where a tool embeds the author's Higgsfield referral/"earning-series" install link, use OUR
  existing Higgsfield MCP instead.

**Status legend:** ⬜ candidate · 🔬 trial/sandbox · ✅ installed/adopted · 🧠 learn-from (don't adopt) · ❌ rejected

Last updated: 2026-08-01

---

## Portfolio map (targets these tools could serve)
- **Social OS** (`Projects/Social-Media`, `social-media-os`, `*-produce` repos) — 5-platform content engine (n8n + Higgsfield + Slack approval).
- **`waypoint-core-system`** — waypointfranchise.com; AEO/SEO content, RAG parser, candidate-matcher, CRM.
- **`faceless-infotainment`** — IG+FB infotainment engine (compliance-gated).
- **`waypoint-video`** — presenter-anchored Industry Spotlight pipeline; HyperFrames (HTML/CSS/GSAP), Design Radar (Kallaway teardown).
- **`gravity-claw`** — OpenClaw autonomous agent layer (Social Monitor, LinkedIn Signal, Content Intelligence, VaultCurator governance).
- **`waypoint-carousel`** — IG carousel builder.
- **`brand-intelligence-pipeline`** — brand RAG ingestion.
- **AEO/SEO:** `aeo-pilot`, `local-websites`.
- Web frontends: `waypoint-core-system`, `whimsey-and-grace`, `heartstrings-nwa`, `pearce-bespoke-app`, `navigator-os`, `franchise-conduit`.

---

## Evaluations

### 1. Agent-Reach — ❌ (partial 🧠 for gravity-claw)
Repo: https://github.com/Panniantong/Agent-Reach
CLI: unified zero-config read/search across Reddit, X, YouTube, LinkedIn, IG/FB, web, RSS (+ China platforms: Bilibili, Xiaohongshu, V2EX, Snowball). Backends: yt-dlp, Jina Reader, Exa (MCP), OpenCLI cookie scrapers, gh.
- **Best hook:** OpenClaw-native → directly compatible with `gravity-claw`'s runtime. Its jobs (Social Monitor=Reddit, LinkedIn Signal, Portal Watcher=web/RSS, Content Intelligence) map onto Agent-Reach reads.
- **Against:** ~half its surface is China-market (irrelevant); duplicates tools we own (vidiq MCP, youtube-transcript skill, reddit-to-franchise-video-topics, deep-research, claude-video-vision); early/solo repo; auto-configures the agent on install.
- **Verdict:** Skip wholesale. Only possibly-useful slice = Reddit/web/YouTube/RSS ingestion substrate for gravity-claw Social Monitor / Content Intelligence — and only if those are currently stubbed (UNVERIFIED — TODO: check gravity-claw read layer).
- **Revisit trigger:** if gravity-claw needs a read layer and we don't want to hand-roll per-platform.

### 2. free-claude-code — ❌ (all repos)
Repo: https://github.com/Alishahryar1/free-claude-code
Local FastAPI proxy that reroutes Claude Code traffic to ~24 non-Anthropic providers (DeepSeek, Groq, Ollama, etc.) to run CC without an Anthropic sub.
- **Against:** harness-level, not repo-specific; trades away the model quality our reasoning-heavy repos depend on (RAG, matcher, compliance gating); sits in the middle of ALL CC traffic (keys + candidate PII + FDD/brand IP) via `curl|sh` proxy → data-governance/credential risk; "free" endpoints often log/train on data.
- **Only legit slice:** local Ollama for cheap bulk non-sensitive tasks — already handled natively in gravity-claw `docs/LOCAL_MODELS.md`.
- **Verdict:** Skip for all repos. No revisit trigger.

### 3. frontend-design (Anthropic official plugin) — ✅ ENABLED 2026-07-08
Source: `claude-plugins-official` marketplace (`anthropics/claude-plugins-official`). Author: Anthropic.
Design-taste skill; breaks Claude out of templated "AI slop" UI; auto-activates on UI/frontend work.
- **Action taken:** enabled in `~/.claude/settings.json` → `enabledPlugins`. **Requires CC restart to load.** Machine-wide (every repo/folder).
- **Pairing w/ HyperFrames:** HyperFrames IS frontend code → skill engages. Philosophically aligned (restrained single accent, deliberate type). BUT HyperFrames is a LOCKED brand system; skill's push for novelty conflicts. Added guardrail §8 to `waypoint-video/docs/DESIGN_SYSTEM.md` telling it to act as critique-only there, respect locked tokens, ignore interactive (hover/scroll) guidance (renders headless).
- **High value for:** unlocked web frontends (waypoint-core-system, whimsey-and-grace, heartstrings-nwa, pearce-bespoke-app, franchise-conduit).
- **TODO:** consider a one-line pointer in a repo CLAUDE.md for waypoint-video to make the brand-lock unmissable. faceless-infotainment got NO change (no HyperFrames there yet).

### 4. advertising-ops ("CMO in a Box") — 🔬 recommend --project trial
Repo: https://github.com/charlesdove977/advertising-ops · npm `advertising-ops` (v0.2.2, MIT) · author Charles J Dove (Charlie Automates)
Skill (markdown into `~/.claude/skills/`): Scope → Scrape Meta Ad Library proven winners (Apify actor `brilliant_gum/facebook-ads-library-scraper`, 2+ mo running & active) → Teardown video (ffmpeg frames + transcript, hook/structure/CTA) → CMO Brief → Generate 5+ copy/image/video variations via Higgsfield.
- **Fit:** Higgsfield already our backend; teardown = our claude-video-vision + waypoint-video Design Radar; front half feeds faceless-infotainment (Meta engine).
- **Reframe:** we're NOT a Meta paid-ads buyer → use as competitive creative-INTELLIGENCE, not campaign mgr (it does no ad buying anyway). Valuable = scrape+teardown; low-value/high-risk = "ready-to-launch" copy gen (FTC/FDD hot zone).
- **Deps/cost:** Apify token (paid actor per scrape) + Higgsfield (have it) + ffmpeg.
- **Verdict:** sandboxed `npx advertising-ops install --project` inside faceless-infotainment; treat output as draft intel behind compliance gate. NOT global. Could rebuild the teardown natively (own claude-video-vision) + only Apify scrape is net-new.

---

## charlesdove977 catalog sweep (2026-07-08) — high-value only
Author builds on OUR exact stack (Higgsfield MCP, Canva MCP, ffmpeg, Apify, npm→~/.claude/skills, --project, approval gates, "no silent fallbacks"). Low-friction to trial. Watch for embedded Higgsfield referral install links → use our own MCP.

### 5. carousel-builder — ⬜ Tier-1 adopt/trial (strongest catalog fit)
Repo: https://github.com/charlesdove977/carousel-builder · ⭐29
Higgsfield + Canva MCP → brand-locked IG carousels. Cover-anchor theme lock, char budgets pre-validated vs real Canva text boxes, `update_fill` image swap preserving frame glows, approval gate, auto `/short-form-caption`.
- **Fit:** near-drop-in for `waypoint-carousel`; we have Canva MCP + Higgsfield + Slack-approval.
- **Steal regardless:** cover-as-visual-reference theme-lock; char-budget-before-assembly.
- **Setup:** needs Canva template ID, brand-voice file, IG handle, voice fingerprint. Output `content/carousels/{slug}/`.
- **Revisit:** trial in waypoint-carousel.

### 6. search-console-mcp — ⬜ Tier-1 adopt (cleanest utility add)
Repo: https://github.com/charlesdove977/search-console-mcp · ⭐8
Read-only Google Search Console MCP, 8 tools: list_sites, top_queries_by_clicks/impressions, landing_pages, queries_for_page, `page_2_opportunities` (rank 11–20), `ctr_opportunities`, full_seo_report. Auth: gcloud ADC + webmasters scope, `.mcp.json` `SC_SITE`.
- **Fit:** directly actionable for AEO/SEO — waypointfranchise.com content queue, aeo-pilot, local-websites. Surfaces near-page-1 topics to write + low-CTR pages to fix. Low risk (own verified property).
- **Dep:** site must be in our GSC.
- **Revisit:** wire up for AEO content prioritization.

### 7. compliance-ops — 🧠 Tier-1 LEARN-FROM (blueprint for FTC/FDD guardrail)
Repo: https://github.com/charlesdove977/compliance-ops · ⭐37
Interview-driven compliance guardrail. Framework-agnostic core + per-regime triggers/tripwires/vendor-lanes; data-lane separation; generates data-flow map + vendor checklist. Ships HIPAA/SOC2/GDPR/PCI (roadmap CCPA/ISO27001). Slash: `/compliance-ops [audit|document]`.
- **Fit:** NOT off-the-shelf (no FTC/FDD regime). But architecture = exactly the shape of a **Waypoint FTC/FDD compliance skill** we keep hand-rolling across content repos. Highest STRATEGIC value as a pattern.
- **Revisit:** draft an FDD/FTC compliance skill patterned on this (tripwire before publish; no earnings claims; franchise terms inline). Would gate faceless-infotainment / waypoint-video / Social OS.

### 8. procedure-ops — ⬜ Tier-2 worth-a-look
Repo: https://github.com/charlesdove977/procedure-ops · ⭐51
COO-in-a-box SOP builder: `/sop-build interview | scaffold-business | from-recording | audit | delegate-pack`. Optional SEED/PAUL handoffs.
- **Fit:** aligns w/ Gravity Claw governance/VaultCurator + stated video-vision use (screen-recording → SOP). Useful as we scale toward VA delegation.

### 9. UGC-Factory — 🧠 Tier-2 technique-only
Repo: https://github.com/charlesdove977/UGC-Factory · ⭐52
Higgsfield Elements + Seedance 2.0 UGC ad factory; 15 genre skills; ffmpeg stitch. "Elements over chained keyframes" for character/product consistency; "the prompt is the script."
- **Fit:** learn the **Elements-consistency** technique. BUT premise = disposable fresh-creator-per-run, opposite of our presenter-ANCHORED brand (HeyGen/live-Kelsey). Don't adopt the throwaway-creator model.

### Dismissed (not high-value)
- **goviralbro** ⭐252 — social coaching/hook-intel/angles; duplicated better by our vidiq MCP + reddit-to-franchise-video-topics. Only novel: analytics→"agent brain" feedback loop. ❌
- **re-walkthrough-pro** ⭐65 — Zillow real-estate walkthroughs; wrong domain (same Apify→Higgsfield→ffmpeg pattern). ❌
- **linkedin-automator** ⭐28 — real-account LinkedIn automation; no throwaway accounts; have linkedin-produce/gravity-claw. ❌
- **animejs-claude-skill** ⭐10 — Anime.js v4; we use GSAP in HyperFrames. ❌ (revisit only if we want Anime.js)
- **nanobanana-mcp** ⭐38 — nano-banana (Gemini image) MCP; have Higgsfield + gpt-image. Only relevant as a dep if running carousel-builder/UGC `nano_banana` model. ❌
- **logo** ⭐0 — empty. ❌

---

## Batch 2: Remotion/graphics libraries (2026-07-08)
Different class than Batch 1 (mature foundational libraries, not agentic tools) → trust/stars are table stakes; the axes that decide value are **determinism (frame-seek), first-party `@remotion/*` adapter, non-redundancy vs GSAP/Remotion core, real Waypoint need, brand-restraint fit, compliance surface**. Stack confirmed: `waypoint-video` = Remotion 4.x (`useCurrentFrame`) + HyperFrames (`hyperframes@0.7.39`, HTML/CSS/**GSAP** seeked headless). GSAP already present → excluded.
**Verified 2026-07-08 (npm + gh):** all adapters exist @ v4.0.486 — `@remotion/{lottie,three,skia,shapes,paths,rive,svg-3d-engine,noise}`. Stars: d3 113.2k, three.js 113.6k, lottie-web 32.0k, plot 5.3k, rive-wasm 952, svg.js 11.7k, manim 39.4k, react-spring 29.1k.

**⚠️ Cross-cutting compliance flag:** "franchise data storytelling" (the top use-case for D3/Plot) is simultaneously the highest-value AND highest-FTC/FDD-risk output. Any chart touching investment/cost/ROI/earnings must be illustrative/educational only — NO income projections/earnings claims — and pass the compliance gate. This is the Waypoint-specific axis Perplexity can't see.

### B2-1. D3 (d3/d3) + Observable Plot (observablehq/plot) — 🟢 Tier-1 adopt (top pick)
https://github.com/d3/d3 · https://github.com/observablehq/plot · no @remotion adapter but pure/deterministic (compute layout per frame, animate via Remotion `interpolate`).
- **Unique capability:** data scales/axes/geo/charts — absent from Remotion core AND GSAP. The one genuinely new primitive.
- **Serves:** waypoint-video (data scenes), **faceless-infotainment** (AI-money infotainment is data-viz heavy — strong fit), Social OS, AND web frontends (embed charts in waypointfranchise.com AEO articles).
- **Split:** Plot = fast grammar-of-graphics for standard bar/line/scatter; D3 = custom/bespoke. Start with Plot.
- **⚠️ compliance gate on any financial chart.** Brand: on-brand (editorial geometry, not spectacle).

### B2-2. Lottie-web (airbnb/lottie-web) via `@remotion/lottie` — 🟢 Tier-1 adopt
https://github.com/airbnb/lottie-web · ✅ `@remotion/lottie` (deterministic `goToAndStop(frame)`).
- **Capability:** render After Effects JSON deterministically → clean icon/logo reveals + scene transitions from LottieFiles in ~30 min vs hand-animating.
- **Serves:** waypoint-video, waypoint-carousel, Social OS, web frontends.
- **Caveats:** curate restrained assets (NO confetti/burst presets — brand forbids); check LottieFiles licensing per asset.

### B2-3. Three.js (mrdoob/three.js) via `@remotion/three` — 🟡 Tier-2 justify-with-a-shot
https://github.com/mrdoob/three.js · ✅ `@remotion/three` (deterministic via `useCurrentFrame`).
- Premium 3D depth = a *want* not a *need*; headless GPU adds cost/fragility. On-brand ONLY with restraint (flat shading, single accent material, minimal geometry — no particle fields). Trial only for a specific hero moment. Also usable on web frontends (e.g. pearce-bespoke).

### B2-4. Rive (rive-app/rive-wasm) via `@remotion/rive` — 🟡 Tier-2 strategic (if we invest in assets)
https://github.com/rive-app/rive-wasm · ✅ `@remotion/rive` (state-machine `time` seek).
- **Strategic hook:** ONE Rive asset behaves identically in video (Remotion) AND React web (hover/loop states) — a reusable animated-logo/mascot system across the whole ecosystem. But requires building assets in the Rive editor (design investment). Adopt only if we commit to that pipeline.

### B2-5. svg.js — 🟠 down-rank (redundant with GSAP)
https://github.com/svgdotjs/svg.js · deterministic `.at(pos)`. Ergonomic SVG path animation — but GSAP (already in stack via DrawSVG-style capability) covers logo path reveals. Skip unless a non-GSAP surface needs it.

### B2 — rejected
- **react-spring** ❌ non-deterministic by default + duplicates GSAP/Remotion `spring`.
- **Manim** ❌ Python pre-render pipeline (not integrated); niche 3Blue1Brown-style explainers only.
- **Framer Motion, Anime.js, PixiJS, mo.js, Fabric.js** ❌ (per tailored Perplexity pass) — redundant with `interpolate`+GSAP, or brand-off (particle/burst maximalism), or wrong runtime. For canvas 2D drawing needs, prefer first-party `@remotion/skia` over Fabric.js.
- **Lottie-android** ❌ Android runtime.

**Batch-2 net:** adopt **D3/Plot** (behind compliance gate) + **Lottie-web** now; hold **Three.js** (needs a justifying shot) and **Rive** (needs asset-pipeline commitment); reject the rest.

## Discipline / anti-bloat pass (2026-07-08)
**Dependability principle (ranked preference for what enters the stack):** (1) Anthropic first-party → (2) mature high-star libs / first-party `@remotion/*` adapters → (3) our own reimplementation of a good pattern. **AVOID** adopting v0.x single-maintainer skills as *live dependencies* (their `update` overwrites our edits; one maintainer = fragile). Harvest their techniques into our repos instead.

**Grounding scan found we already have more than assumed:**
- `waypoint-video/scripts/lint-compliance.ts` — real FTC/FDD gate: HARD non-waivable `no-earnings-claim` (13 FTC categories), `jargon-defined-inline`, `voice-locks`, em-dash gate; sourced from `governance/*.json` (Gravity Claw vault snapshots); enforced at build + publish.
- `brand-intelligence-pipeline/tests/` incl. `test_compliance.py` — real test suite.
- waypoint-core-system prisma/beehiiv/inngest carry SOME lead-source plumbing.

**KEEP (high-value + dependable):** frontend-design (Anthropic) · D3/Observable Plot (mature, behind compliance) · Lottie via `@remotion/lottie` (first-party) · search-console-mcp (GSC data high-value for AEO — but solo-author ⭐8 wrapper; keep eyes open, fork/self-host if it lags, or build our own thin MCP).
**DOWNGRADE to harvest-not-adopt (bloat + fragility):** advertising-ops, carousel-builder, procedure-ops — all charlesdove977 v0.x single-maintainer. `carousel-builder` is also **redundant** (we already have `waypoint-carousel` repo + `Gravity Claw/skills/waypoint-carousel`). Lift techniques (Apify scrape recipe, cover-anchor theme-lock, char-budget, Elements consistency); don't take the dependency.
**CANCELLED:** external `compliance-ops` — we have a *better* homegrown linter. The need isn't adopting theirs; it's portabilizing ours (see Gap 1).
**FROZEN (fancy, no justifying need yet):** Three.js `@remotion/three`, Rive `@remotion/rive`.

## Gaps to strengthen (grounded, not manufactured) — prioritized
1. **Portable compliance enforcement (HIGHEST).** ✅ BUILT 2026-07-08 → `~/Projects/waypoint-compliance/` (`@waypoint/compliance`, zero-dep ESM). Extracted the proven `waypoint-video/scripts/lint-compliance.ts` gate + the 4 governance rulesets into a shared package: engine `lintText(text,opts)→{gates,hardPass}` (same `qa.ts` Gate shape) + universal CLI (`npx waypoint-compliance <file|->`, exit 1 on hard fail — works for Node import AND Python/n8n subprocess). 4 HARD gates (no-earnings-claim [13 FTC cats, non-waivable], jargon-defined-inline, voice-locks, em-dash) + opt-in disclosure. Fixture smoke test PASSES (each gate fires on violations, clean copy passes). Source chain documented: Vault MD → pkg `rules/*.json` (machine-canonical) → all repos. Added TS types (`src/lint.d.ts`).
**Wiring status:**
- ✅ **waypoint-video (DONE 2026-07-08)** — `file:../waypoint-compliance` dep; `lint-compliance.ts` `checkCompliance` now delegates the 3 rule gates to `lintText` (em-dash gate unchanged = whole-JSON `lint-copy.mjs` scan). Verified: differential parity test (10 dirty/clean cases match original engine on all 3 gates) + `spotlight01` output byte-identical to pre-refactor baseline. Retired `governance/{ftc-claims,jargon-terms,voice-locks}.json` to breadcrumb stubs (nothing else read them — confirmed) → drift risk gone; `disclosure-spec.json` left (publishmeta.ts sync-comment).
- ✅ **faceless-infotainment (DONE 2026-07-08)** — gains BRAND-NEW coverage (previously prose-only). Added minimal `package.json` + `file:../waypoint-compliance` dep (node_modules gitignored); new companion `pipeline/lint-compliance.mjs <spec.json>` lints shipping copy (all `packaging.*.caption` + `slides[].text/sub`) via `lintText`; wired INLINE + fail-closed into `pipeline/enqueue/enqueue-carousel.sh` (right after `$SPEC_FILE` check, before slide-verify) so no package reaches the Slack approve gate with prohibited copy. Disclosure left to existing `check-spec.mjs` `ai_disclosed` gate (didn't impose franchise disclaimer). Verified: all 7 existing packages PASS (no false positives / no latent violations); dirty spec → "REFUSING TO ENQUEUE" exit 1 (flags earnings cat1/5/8 + voice-locks); `bash -n` clean; end-to-end dry-run clean-passes / dirty-refuses. Which gates bite here: no-earnings-claim + voice-locks (money/business content); franchise jargon no-ops until relevant.
  - ⚠️ FOLLOW-UP: `enqueue-reel.sh` / `enqueue-image-post.sh` use `--caption-file` (no `--spec`) → NOT yet gated. Either add a caption-file mode to lint-compliance.mjs or pass `--spec` there too.
- ⛔ **Social OS — NOT a gap (do not wire).** It already has the STRONGEST gate in the portfolio: `Social Media/.claude/skills/waypoint-carousel/lint.py` (234 lines, regex, 13 FTC cats + AI-slop + AI-tells + term-inline) + `social_qa.py` (identity lock, daughters minors-protection, Flesch-Kincaid, staccato, prohibited-CTA, URL-inventory), deployed FAIL-CLOSED as byte-identical n8n Code nodes in all 5 platform publish-receivers (live-verified via `verify_live_gate.py`). Wiring the substring package in would be redundant + a downgrade. Left untouched.
- ✅ **Shared package UPGRADED to lint.py regex rigor (DONE 2026-07-08, v0.2.0).** Added `rules/patterns.mjs` — faithful port of lint.py's 40 BANNED regexes (13 cats) + AI_SLOP + AI_TELLS_HARD + AI_TELLS_SOFT + SOFT_CAUTIONS + Kelsey identity-lock (regex, word-boundary, +mother/mom) + **NEW `minors-protection` HARD gate (Allie/Lindy — was absent on video/faceless)** + soft `ai-tells-soft` advisory tier. Engine now runs vault substrings ∪ regexes (strictly stronger: catches `$5k/month`, bare ROI/EBITDA). One intentional divergence: kept vault verb-only `leverage` (lint.py bans bare). Verified: package smoke (regex/minors/AI-tell cases) + **ZERO regressions** — waypoint-video spotlight01 still PASS, all 7 faceless packages still PASS. Two wired surfaces now enforce Social-OS-grade rules.
  - Drift note: `patterns.mjs` and `lint.py` are twin realizations of the vault — keep in lockstep (README says audit patterns.mjs vs lint.py on change).
- ⬜ TRUE remaining Gap-1 surfaces (neither gate today): **beehiiv newsletter** (`--require-disclosure`) · **candidate-facing copy** (`waypoint-candidate`/`candidate-app`). Also faceless reel/image-post enqueue follow-up.
- No repo committed yet — awaiting review. Package not git-init'd.
2. **Pipeline reliability / observability + alerting (HIGH).** No sentry/healthcheck/alert/dead-letter found across Gravity Claw, Social Media, waypoint-core-system. Inngest retries + n8n logs exist, but no failure-ALERTING layer → silent breaks (lead POST fails, render dies, scheduled draft doesn't fire) = lost leads, invisibly. Dependability mandate.
3. **Matcher evaluation harness (HIGH).** `candidate-matcher` has NO tests/evals (RAG pipeline does). It produces the Top-3 franchise recs put in front of real people making six-figure decisions → needs golden-set/regression eval on recommendation quality/consistency.
4. **Content→lead→client attribution (CONFIRM before pursuing).** Partial lead-source plumbing exists; no unified measure of which content converts to leads/clients. Medium confidence it's a felt pain — confirm with Kelsey.

## Git / shipping status (2026-07-08)
- **`Franscale1922/waypoint-compliance`** — NEW private repo, `main` pushed (v0.2.0, initial commit). The shared package.
- **waypoint-video** — branch `compliance/shared-gate` pushed (2 commits: DESIGN_SYSTEM §8 note + compliance de-dupe). NO PR (stacks on active `phase-a-hyperframes` WIP → merge into that branch). hyperframes WIP left untracked/untouched.
- **faceless-infotainment** — branch `compliance/shared-gate` pushed + **PR #1** opened → main. remotion/reel WIP left untouched.
- **waypoint-core-system** — no commit (tracker lives in gitignored `.claude/`; intentional).
- Skipped per Kelsey: newsletter, candidate-copy, faceless reel/image follow-up.
- ⚠️ **Durable-packaging follow-up:** both consumers use `file:../waypoint-compliance` → `npm install` breaks on any clone without the sibling checked out. Fix later via GitHub Packages publish or git submodule (Social OS already uses submodules for skills).

## ONBOARDING DECISIONS (2026-07-08, Kelsey)
Strict "truly high value only" cut → onboard TWO things; everything else defer/harvest/reject.
1. ✅ **search-console-mcp — INSTALLED (pending Kelsey's Google auth).** Real high-value: feeds the AEO content engine (which topics are near page-1 / which pages leak clicks → what to publish next → organic leads). Installed from GIT via pipx (⚠️ README's `pipx install search-console-mcp` is WRONG — not on PyPI; used `git+https://github.com/charlesdove977/search-console-mcp.git`). Console script at `~/.local/bin/search-console-mcp`. Config written: `waypoint-core-system/.mcp.json` (SC_SITE=`sc-domain:waypointfranchise.com`). **AUTH DONE + VERIFIED 2026-07-08:** API enabled in `gravity-claw` project; ADC active (quota project `gravity-claw-492618`); called sites.list + searchAnalytics directly → returns real data. Properties are URL-prefix (not domain); `SC_SITE` corrected to `https://www.waypointfranchise.com/` (www has traffic: 5 clicks/1338 impr last 28d; apex = 0). **Only remaining: restart Claude Code to load the MCP + approve it.** Dependability caveat: solo-author ⭐8, MIT, thin GSC wrapper — forkable if it rots.
   - **FIRST GSC→CONTENT ACTION (2026-07-08, MERGED PR #5):** verified live — pulled real data; finding = "auv franchise meaning" 81 impr @ position 59 landing on the monolithic `/glossary` (99 terms on one page). Fix = new `/glossary/[slug]` route giving every term its own indexable page (AEO "What is X?" block + per-term DefinedTerm/FAQPage schema), index links to term pages, all 99 in sitemap. `tsc` clean, compliance no-earnings PASS. Merged to `main` → Vercel deploy. **MEASURE LATER:** request-index the AUV page in GSC; re-run `queries_for_page` on `/glossary/average-unit-volume-auv` in ~3-4 wks to confirm the pos-59→page-1 move. (Site is young: ~13 clicks/90d; GSC value grows with history.) Future enhancement: auto-cross-link term mentions inside definitions (would also satisfy the jargon-inline gate).
2. ✅ **Remotion graphic winners (D3/Plot, Lottie, Three.js, Rive) — ADOPTED as RESERVED capabilities, NOT installed.** Per Kelsey: not building now; captured into the **Master Design OS** seed (`waypoint-core-system/.claude/master-design-os.md`) as a shelf to pull from when the master design brain gets built. See that doc.

## Install queue (when we decide to act)
1. 🔬 `advertising-ops` — `npx advertising-ops install --project` in faceless-infotainment (scrape+teardown intel).
2. ⬜ `carousel-builder` — trial in waypoint-carousel (needs Canva template ID + brand-voice/voice files).
3. ⬜ `search-console-mcp` — add to AEO workflow (needs gcloud ADC + GSC property).
4. 🧠 Draft Waypoint FTC/FDD compliance skill patterned on `compliance-ops`.
5. (post-restart) verify `frontend-design` active; optional waypoint-video CLAUDE.md brand-lock pointer.
6. 🟢 `npm i observable-plot d3` + author a Remotion data-chart component (behind compliance gate) — waypoint-video/faceless-infotainment.
7. 🟢 `npm i @remotion/lottie lottie-web` + curate restrained LottieFiles icon/logo set (check licensing).
8. 🟡 (hold) Three.js `@remotion/three` — only when a specific hero shot justifies it.
9. 🟡 (hold) Rive `@remotion/rive` — only if we commit to building assets in the Rive editor.

## Batch 3: agent-skill libraries (2026-08-01)

### 10. mattpocock/skills ("Skills For Real Engineers") — 🧠/⬜ SPLIT: adopt a subset per-repo, reject the plugin
Repo: https://github.com/mattpocock/skills · MIT · plugin v1.2.0 (`package.json` says 1.1.0 — manifests
out of sync, contra their own CLAUDE.md rule) · HEAD `2ab9580`, 2026-07-28 · 166 files, ~479KB, zero runtime deps
(pure markdown + 3 bash files). Author: Matt Pocock (Total TypeScript / AI Hero), ~60k-dev newsletter.
Read in full this session: every SKILL.md (41), all reference/glossary files, both manifests, all shell scripts.

**What it is.** 41 skills in 6 buckets; only `engineering/` + `productivity/` (22 skills) ship in the
Claude Code plugin. Explicitly positions itself AGAINST process frameworks (GSD/BMAD/Spec-Kit) — "small,
easy to adapt, composable." Two install paths: `claude plugins install mattpocock-skills` (managed,
read-only, auto-updates) or `npx skills add mattpocock/skills --skill=<name>` (copies editable files you own).
Of the 22 promoted, 9 are model-invoked (descriptions always in context: code-review, codebase-design,
diagnosing-bugs, domain-modeling, prototype, research, resolving-merge-conflicts, tdd, grilling) and 13 are
user-invoked (zero context cost).

**Quality read.** Genuinely high. This is the most disciplined prompt-engineering writing I've evaluated —
it has an explicit theory of skill design (`writing-great-skills` + its GLOSSARY: predictability, context
load vs cognitive load, information hierarchy, leading words, and named failure modes — sediment,
duplication, no-op, negation, premature completion) and the rest of the repo visibly obeys it. No telemetry,
no network calls, no install-time agent auto-config. Not vendor-locked (works on Codex via `agents/openai.yaml`).

**TAKE (ranked by portfolio value):**
1. 🧠 **`writing-great-skills` + `GLOSSARY.md` — highest-value item in the repo for us, and it isn't a
   workflow at all, it's a lens.** We author skills constantly (video-skills, humanizer-kelsey, the 16
   Social-OS `*-produce` skills, anthropic-skills). Its failure-mode vocabulary is a ready-made audit pass
   over our own skill library AND over our stamped CLAUDE.md governance blocks (which are long enough to
   carry real sediment / no-ops / negation). Value is learn-from; installing it is optional.
2. ⬜ **`diagnosing-bugs`** — best engineering skill here. Refuses to theorise until a **tight feedback
   loop** exists (one command, already run once, that goes red on *this* bug); 10 ranked ways to build one;
   3–5 falsifiable hypotheses before testing; tagged `[DEBUG-xxxx]` logs with grep cleanup. Directly serves
   our grounding rule ("evidence standard"). Fits waypoint-core-system, brand-intelligence-pipeline, Social OS.
3. ⬜ **`grilling`** (11 lines) — one-question-at-a-time relentless interview; splits *facts* (look them up)
   from *decisions* (ask the human). Matches how Kelsey already works in plan mode. Cheapest win here.
4. ⬜ **`code-review`** — two independent axes (repo Standards + always-on 12-smell Fowler baseline; Spec
   fidelity vs the originating issue) run as **parallel sub-agents so neither pollutes the other**, reported
   side-by-side with NO cross-axis reranking. Genuinely complements our mandatory adversarial-review phase.
   ⚠️ name-collides with the built-in `/code-review` we already cite in CLAUDE.md — rename on install.
5. ⬜ **`research`** — background agent, primary sources only, cited markdown file in-repo. Aligns with the
   `franscale-research-directive` + grounding blocks. Would want our compliance/FTC framing added.
6. 🧠 **`codebase-design` + DEEPENING/DESIGN-IT-TWICE** — deep-module vocabulary (module / interface / depth /
   seam / adapter / leverage / locality), the deletion test, "one adapter = hypothetical seam, two = real."
   Good vocabulary; `improve-codebase-architecture` (its consumer) is a periodic HTML-report survey — nice,
   not urgent.
7. 🧠 **`tdd`** — solid (seams pre-agreed with the human, vertical slices, tautological-test ban). TS
   examples only, but the discipline is language-agnostic. Our repos are thin on tests; this is the shape to
   copy if/when we build the matcher eval harness (see Gaps §3).
8. 🧠 **`writing-fragments` / `writing-shape` / `writing-beats`** (in-progress bucket, so NOT in the plugin) —
   explore→exploit article pipeline with a real idea in it: **grounding** (a block may only lean on concepts
   the reader already has). That's a legitimately useful lens for AEO articles and long-form social. Harvest
   the concept; don't adopt drafts.

**SKIP:**
- ❌ **`git-guardrails-claude-code`** — hard no. Installs a PreToolUse hook that blocks `git push`,
  `reset --hard`, `clean -f`, `branch -D`. Directly contradicts the `franscale-git-safety` block (I own the
  full git lifecycle and push verified work). Would break the portfolio's core operating rule. (Not in the
  plugin — it's `misc/` — but do not hand-install it.)
- ❌ `obsidian-vault` — hardcodes `/mnt/d/Obsidian Vault/AI Research/` (Matt's WSL path). Useless as-is;
  mildly useful as a *template* for a Gravity Claw vault skill.
- ❌ `setup-pre-commit` (Husky/lint-staged) — waypoint-core-system already has a pre-push brand-guard hook;
  would duplicate/conflict.
- ❌ `migrate-to-shoehorn`, `scaffold-exercises` — Matt's own libraries/courses.
- ❌ `edit-article` — 2 steps, a 240-char/paragraph rule; we have `humanizer-kelsey` tuned to the real voice guide.
- ❌ all 4 `deprecated/` skills.
- 🟡 **`to-spec` / `to-tickets` / `triage` / `wayfinder`** — the four heaviest, and the least likely to stick:
  every one assumes a live **issue tracker**. We don't run GitHub Issues; work is tracked in memory files +
  branches. A local `.scratch/` markdown mode exists, but adopting it means importing a whole new workflow
  layer. `wayfinder` (fog-of-war map of decision tickets for multi-session efforts) is the most interesting
  of them conceptually — revisit only if we ever adopt a tracker.

**CONFLICTS with our governance (all real, all manageable):**
1. **Subagent spawning vs our session rule.** `code-review` spawns 2, `DESIGN-IT-TWICE` spawns 3–4,
   `improve-codebase-architecture` uses Explore, `research` spawns a background agent, `wayfinder` fires N
   research subagents. Our standing rules say don't call AgentTool unless requested, and cap subagent
   spawning on cost-sensitive runs. Invoking these skills IS the request — but it must stay an explicit,
   per-invocation choice, never model-invoked automatically. → **install any of these user-invoked only.**
2. **No model/effort annotations anywhere.** `diagnosing-bugs` (6 phases), `wayfinder`, `triage` are
   multi-phase and emit no `▶ SWITCH` lines, so they'd run straight through the phase-boundary STOP gate.
   → any adopted copy needs our switch lines added. This is the main reason to take the **editable**
   install path, not the plugin.
3. **`implement`** says "Commit your work to the current branch" — never branches first. Our rule is
   branch + PR for app/product code. Skip it, or rewrite the one line.
4. **`setup-matt-pocock-skills`** appends an `## Agent skills` section to CLAUDE.md. VERIFIED SAFE:
   `stamp-git-safety.sh` only replaces text *between* its markers and appends when absent, so an added
   section survives propagation. Still writes `docs/agents/*.md` into the repo — review before running.

**VERDICT / recommended path:** do **not** install the plugin (all-or-nothing, 22 skills, 9 always-loaded
descriptions, read-only so we can't add switch lines or compliance framing, and it drags in the four
tracker-dependent skills we won't use). Instead: read `writing-great-skills` as an audit lens now, and
`npx skills add mattpocock/skills --skill=<name>` a 3-skill subset into **waypoint-core-system only** as a
trial — `grilling`, `diagnosing-bugs`, `code-review` (renamed) — editable, ours, with switch lines added.
Widen to other repos only if the trial earns it.

**Revisit trigger:** if we ever adopt a real issue tracker, re-evaluate `wayfinder` + `to-tickets` + `triage`
as a set — they're designed as one system and are much weaker à la carte.

---

### 11. openai/codex-plugin-cc + openai/codex — ⬜ NARROW ADOPT (review path only); write-delegation NOT justified
Repos: https://github.com/openai/codex-plugin-cc (Apache-2.0, v1.0.6, HEAD `db52e28` 2026-07-07, zero runtime deps)
· https://github.com/openai/codex (the CLI itself). Evaluated 2026-08-01. **NOT installed** — `~/.claude/plugins/installed_plugins.json`
holds only `frontend-design` + `video-skills`.

**Already-live baseline (verified):** `codex-cli 0.145.0`, `Logged in using ChatGPT`, `~/.codex/config.toml` sets
`model = "gpt-5.6-sol"`, `model_reasoning_effort = "high"`, `service_tier = "priority"`.

**Sandbox probes** (run on the real plugin path, `codex-companion.mjs task --write`, throwaway repo): network BLOCKED,
writes outside workspace BLOCKED, `.git/` writes BLOCKED, `git commit`/`branch`/`config --global` all BLOCKED.
Corroborated by `~/.codex/.codex-global-state.json` (`networkAccess:false` on every persisted thread).

**⚠ Two independent adversarial reviews (fresh Claude reviewer @ opus + Codex itself, read-only) overturned material
parts of the first verdict. Corrections, each re-verified:**
1. **"Network is blocked" is scoped to SHELL commands only.** `~/.codex/config.toml` registers remote MCP servers —
   `openaiDeveloperDocs`, `vidiq` (bearer token), `agentopus`, plus local `node_repl` with
   `BROWSER_USE_AVAILABLE_BACKENDS = "chrome,iab"`. Seatbelt governs shell, NOT the agent's MCP surface. Egress is
   **not** controlled. Also `[projects."/Users/kelseystuart"] trust_level = "trusted"` (home dir trusted) — effect on
   sandbox defaults unverified.
2. **Background jobs die with the session.** `session-lifecycle-hook.mjs:42` `cleanupSessionJobs` terminates the
   process tree of every queued/running job on SessionEnd. "Park long work in the background" is false across
   sessions; it's intra-session parallelism only. Cross-session work needs `codex exec` directly.
3. **`config.toml` is mutated by the Codex app** (observed changing mid-session) → pinning the worker model via that
   file is less stable than assumed.
4. **"Zero Anthropic cost" is false.** `codex-rescue` is itself a Sonnet subagent; and the grounding + never-push-red
   rules require Claude to re-read the diff and re-run checks. Real cost = Codex tokens + Claude dispatch + Claude
   verification. Below some task size, delegating LOSES.
5. **`codex-rescue` returns NOTHING on failure** (`agents/codex-rescue.md`: "If the Bash call fails or Codex cannot be
   invoked, return nothing") — silence is indistinguishable from success. Hostile to the grounding rule.
6. **Its description says "Proactively use… Do not wait for the user to explicitly ask"** and it defaults to `--write`.
   Conflicts with the don't-spawn-agents-unasked rule.
7. **Data governance was absent** — the workspace root is READABLE too. Candidate PII, FDD/brand IP, `.env`, the brand
   RAG store, and `.claude/` (incl. memory) would go to a second vendor under a **consumer ChatGPT plan**. Retention/
   training terms UNVERIFIED. `/codex:transfer` uploads whole Claude transcripts. **This must be decided BEFORE any
   smoke test**, which would itself ship repo contents.
8. Stop-gate default is `stopReviewGate: false` (state.mjs:23) — but it's a mutable flag in a tmp-dir state file, so
   "just don't enable it" needs re-checking, not a one-time instruction. Hook timeout (900 s) exactly equals the
   review's own timeout → race.

**VERDICT: narrow adopt.** What survives review is exactly ONE use case — **`/codex:review` + `/codex:adversarial-review`
as the mandatory-adversarial-review phase**: read-only, structured output, genuinely cross-vendor (a reviewer that
cannot defend Claude's choices). Everything else — write-capable `/codex:rescue`, background delegation, and the
"route Sonnet-tier work to Codex" rule — is **not yet justified** and is deferred.

Gated on first: (a) which repos are data-eligible at all (`waypoint-core-system` + `brand-intelligence-pipeline` are
the most exposed), (b) the ChatGPT plan's actual retention/training terms for Codex CLI.

**Notable meta-result:** Codex's own adversarial review of a plan to adopt Codex was hard on itself and surfaced real
defects (the MCP egress gap, the SessionEnd job kill). That is direct evidence FOR the review use case.

**⚠ UPDATE 2026-08-02 — two findings from a live `codex exec` probe (throwaway dir, no repo content sent):**

A. **MCP egress is CONFIRMED, not inferred — and `--sandbox read-only` does not gate it.** Probe:
   `codex exec --sandbox read-only --skip-git-repo-check` in an untrusted, non-git scratch dir. Before the run
   terminated it emitted `ERROR rmcp::transport::streamable_http_client: fail to get common stream: unexpected
   server response: GET returned HTTP 403` — a remote MCP client making an outbound HTTP request. The 403 is an
   auth failure at the far end (one of the configured remote servers), **not** a blocked connection. So correction
   #1 above is now observed rather than reasoned: read-only governs shell, the MCP surface still dials out.
   Closes the `codex exec` half of the TODO below; the plugin-launched path stays untested (plugin is rejected anyway).
   Scope note: this proves egress *capability*. It is NOT evidence that anything was exfiltrated — nothing was.

   **A-bis (same probe re-run 2026-08-02 after the account was upgraded — now completed instead of erroring):**
   the tool list it returned under `--sandbox read-only` in an untrusted non-git dir includes the **entire
   authenticated `mcp__vidiq__*` suite (~53 tools, bearer-token auth)**, plus **`web__run`** (general web access),
   `read_mcp_resource`, `request_plugin_install`, and `write_stdin`. So this is stronger than "MCP clients try to
   connect": a read-only Codex worker holds a general web tool AND a fully-authenticated third-party MCP surface.
   **`--sandbox read-only` is write-protection only. It is NOT a containment story for sensitive repo content.**
   (Caveat: output was captured with `tail -60`, so tools sorting before `mcp__vidiq__vidiq_balance` were truncated
   from view — the ones listed are confirmed present, the list is not exhaustive.)

B. **The Codex account is itself weekly-limited and is currently exhausted.** Same probe returned:
   `You've hit your usage limit … try again at Aug 8th, 2026 5:57 PM.` This strikes directly at the premise that
   drove the whole workhorse idea (spend Codex capacity to relieve Claude's weekly ceiling): **Codex has the same
   class of ceiling, and it is spent until 2026-08-08.** Any delegation plan is inert until then, and afterward it
   is capacity-sharing between two limited pools, not access to an unlimited one.

C. Partial answer to the `trust_level` TODO: an untrusted non-git dir **refuses to run** without
   `--skip-git-repo-check`, so the trust gate is real and load-bearing. What trust *grants* (vs. the passed
   `--sandbox` flag) is still unverified. Note `[projects."/Users/kelseystuart"] trust_level = "trusted"` means
   every repo in the portfolio already sits inside a trusted scope.

D. Data-exposure specifics for this repo: `.env.local` and `.env.production.local` are present in the
   `waypoint-core-system` working tree. Both are gitignored — **gitignore does not gate reads**, so a `codex exec`
   at repo root can read production credentials.

**E. CONTAINMENT TESTED 2026-08-02 (account upgraded mid-session; all probes in a throwaway dir, no repo content sent).**

⚠ **Method correction first.** A-bis above was built on the model's *self-report* of its own tool list. That does
NOT reproduce — three runs gave three different lists. **Self-report is not a reliable inventory instrument and
should not be cited as evidence.** The findings below instead rest on three ground-truth signals: `codex mcp list`
(pure config resolution, zero model tokens), `rmcp` transport errors on stderr, and before/after flag differentials
where a surface disappears deterministically when a flag flips.

| Override | Result | Evidence |
|---|---|---|
| `-c mcp_servers='{}'` | ❌ **SILENT NO-OP** — all servers still `enabled` | `codex mcp list -c mcp_servers='{}'` |
| `-c mcp_servers.<name>.enabled=false` | ✅ works, per server | `codex mcp list` shows all four `disabled`; probe run had 0 transport errors |
| `--disable apps` | ✅ removes the entire `mcp__codex_apps__*` surface | 0 occurrences vs. present in the otherwise-identical prior run |
| `--disable multi_agent` | ❌ `collaboration.spawn_agent` still offered | hardened2 tool list |
| any flag found | ❌ **cannot remove `web__run`** | see F |

The `mcp_servers={}` no-op is the dangerous one: a plausible-looking override that silently changes nothing and
would have produced false confidence. Always verify a strip with `codex mcp list`, never assume it applied.

**F. The finding that actually matters — the DEFAULT surface includes authenticated third-party WRITE tools, and
the local sandbox does not govern them.** With `--sandbox read-only` and all configured MCP servers disabled, the
hosted `codex_apps` connectors were still present, including:
- **GitHub (write):** `github_create_branch`, `github_create_commit`, `github_create_file`, `github_update_file`,
  `github_delete_file`, `github_update_ref`, `github_create_pull_request`, `github_update_pull_request`,
  `github_enable_auto_merge`, `github_add_review_to_pr`, `github_dismiss_pull_request_review`, `github_create_issue`.
- **Google Drive (write):** `google_drive_create_file`, `google_drive_delete_file`, `google_drive_copy_file`,
  `google_drive_create_folder`, `google_drive_batch_update_{document,spreadsheet,presentation}`,
  `google_drive_import_{document,spreadsheet,presentation}`, `google_drive_bulk_update_file_comments`.

These are **server-side calls on the user's authenticated accounts**. Seatbelt/`--sandbox` governs local shell only,
so "read-only" says nothing about them. Direct collision with two live commitments: the git-ownership rule (no
force-push, branch+PR discipline, Franscale1922-only) and the brand-intelligence pipeline, whose `00_INBOX` and RAG
store live **in Google Drive**. `--disable apps` closes this and MUST be in every delegated invocation.

**G. ⚠ SUPERSEDED — see G-bis. Web egress IS closable; the claim below was wrong.**

**G (original, incorrect): Web egress is irreducible with available flags — verified behaviorally.** `web__run` survives
`--sandbox read-only` + all MCP servers disabled + `--disable apps,browser_use,browser_use_external,`
`browser_use_full_cdp_access,in_app_browser,computer_use,multi_agent,plugins,image_generation`. Asked to fetch
`https://example.com`, it returned `Example Domain` — the page's real `<h1>`. So egress is not merely *listed*, it
**works**. (`features list` shows the web_search flags as deprecated/removed and already `false`; `web__run` is not
governed by them. `network_proxy` is experimental/false — untested as a control.)

**G-bis. CORRECTION 2026-08-02 — web egress IS closable via `-c web_search="disabled"`.** G was wrong because I
searched `codex features list` for a web flag; `web_search` is a **top-level config key**, not a feature, and it only
became visible after the Codex app rewrote `config.toml` (it now sets `web_search = "live"`). Valid values, from the
CLI's own error message: `disabled | cached | indexed | live`. Verified behaviorally: with `web_search="disabled"`
the same fetch prompt returned `NO WEB ACCESS.` and `web__run` was absent from the tool surface (0 occurrences vs.
present in the otherwise-identical run). Note this key **errors loudly** on a bad type/value rather than silently
no-op'ing — the opposite of `mcp_servers={}`.

**Hardened invocation (verified; the floor for any delegation):**
```
codex exec --sandbox read-only \
  -c web_search="disabled" \
  -c model_verbosity="low" -c model_reasoning_summary="none" \
  -c mcp_servers.vidiq.enabled=false -c mcp_servers.agentopus.enabled=false \
  -c mcp_servers.openaiDeveloperDocs.enabled=false -c mcp_servers.node_repl.enabled=false \
  --disable apps --disable browser_use --disable browser_use_external \
  --disable browser_use_full_cdp_access --disable in_app_browser --disable computer_use \
  --disable multi_agent --disable plugins --disable image_generation
```
**Valid enum values** (harvested from the CLI's own error messages — pass a bogus value and it enumerates them;
cheap, zero model tokens, and far better than guessing):
- `sandbox_mode`: `read-only | workspace-write | danger-full-access`
- `approval_policy`: `untrusted | on-failure | on-request | granular | never`
- `web_search`: `disabled | cached | indexed | live`
- `model_verbosity`: `low | medium | high`
- `model_reasoning_summary`: `auto | concise | detailed | none`

**Interactive vs. delegated — deliberately different, do not unify.** Kelsey's *app* defaults (verified from the
Agent-defaults pane 2026-08-02) are Approval `On request`, Sandbox `Read only`, Web search `Live`, Output detail
`High`, Reasoning summary `Detailed` — all correct for a human driving the tool and watching output. The delegated
invocation above overrides three of them per-run: web off (unattended runs are where egress actually matters),
`model_verbosity=low` and `model_reasoning_summary=none` (a delegated worker should return findings, not prose —
its reasoning summary is pure output-token cost that nobody reads). Per-run `-c` beats the app default, so the two
profiles coexist without touching the UI.
Residual after all of that: sandboxed local shell/`apply_patch`, `write_stdin`, `collaboration.spawn_agent`, and
**disk-wide read** (H). Every *side* channel is closable; the *main* channel is not — whatever the worker reads is
sent to OpenAI as model context by construction. That is the irreducible exposure, and it is what the training/
retention terms in I actually govern.

**Sandbox mode — which of the three to use.** The app's dropdown (`Read only` / `Workspace write` / `Full access`)
maps to `--sandbox read-only|workspace-write|danger-full-access`.
- **Read only — correct default.** Least privilege for the review/discovery use case that survived review.
- **Workspace write — deliberate, per-task only**, and paired with a throwaway `git worktree` so the blast radius is
  a disposable checkout (both independent reviewers landed on this).
- **Full access — never.** "Can edit files outside this workspace" defeats every local guardrail.
- ⚠ **The dropdown governs LOCAL FILES ONLY.** It does not constrain reads (H: disk-wide even on Read only), the
  hosted GitHub/Drive **write** connectors (F), or web access (G-bis). "Read only" in that menu does NOT mean the
  worker cannot change anything — `--disable apps` is what makes that true.

**Bottom line for the data call:** hardening removes the *account-write* hazard (GitHub/Drive) but NOT the
*read-and-transmit* hazard. Anything in the read scope must be content you'd accept leaving the machine. For
`waypoint-core-system` that read scope includes `.env.local` and `.env.production.local`.

**H. SCOPED-PATH DELEGATION DOES NOT WORK — tested 2026-08-02, result negative.** The proposed mitigation was
"point Codex at a subpath, not the repo root." It provides no containment. Method: a canary file
(`.claude/codex-scope-canary.txt`, unique token, deleted after) placed *above* the working root; the probe was
instructed to report readability only and explicitly forbidden from printing any `.env` contents.

| Probe | Working root | Canary | `.env.production.local` |
|---|---|---|---|
| `-C src` (scoped inside repo) | `…/waypoint-core-system/src` | **read** — exact token returned | **READABLE** |
| unrelated dir, absolute paths | `/private/tmp/…/egress-probe` | **read** — exact token returned | **READABLE** |

Both runs used the full hardened flag set from E. So `--cd`/`-C` sets where the agent *works*, not what it can
*read*: **read access is disk-wide** (at least across `$HOME`), regardless of working root. Under
`--sandbox read-only` the only thing actually constrained is *writing*.

**Consequence:** combined with G (working `web__run`), any `codex exec` on this machine is a process that can read
any file the user can read **and** has working outbound web access. There is no flag-level path boundary to buy.
Real containment would require OS-level isolation (container/VM with only the intended files mounted) — not a CLI
flag. Absent that, delegating to Codex is a decision to accept that the machine's readable contents are exposable,
not a decision about one repo or one path.

Note this is the same trust shape as any local CLI agent (Claude Code has comparable reach). The delta being decided
here is specifically **adding a second vendor** with that reach, under a consumer ChatGPT plan — see I.

**I. TRAINING/RETENTION TERMS — RESOLVED 2026-08-02 from primary sources** (help.openai.com, both articles stamped
"Updated: 3 days ago"; fetched via browser — `WebFetch` gets 403 on that host).

1. **Individual plans train on Codex content by default.** Verbatim: *"When you use our services for individuals such
   as ChatGPT and Codex, we may use your content to train our models."* Codex is named explicitly, not inferred.
2. **Opt-out exists and is account-wide:** Settings → Data Controls → turn off **"Improve the model for everyone."**
   Syncs across devices, reversible anytime. Also available via the privacy portal ("do not train on my content").
3. **TWO switches — but read the scope precisely.** The Data Controls toggle **does** cover Codex: *"To turn off
   training for your ChatGPT conversations **and Codex tasks**, follow the instructions in our Data Controls FAQ."*
   The second switch is narrower than first recorded here — it governs **full environments** only: *"Codex has
   separate controls for allowing training on full environments, which you can manage in the Codex Settings. Note
   that adjusting your settings in the ChatGPT interface or privacy portal will not affect these full-environment
   Codex settings."* So: main toggle = ChatGPT conversations + Codex tasks; Codex Settings = full environments.
   Both still need checking, but the gap is "full environments," not "all of Codex."
4. **Feedback overrides opt-out:** thumbs up/down submits *the entire associated conversation* for training even
   when opted out.
5. **Business tiers invert the default:** *"By default, we do not train on any inputs or outputs from our products
   for business users, including ChatGPT Business, ChatGPT Enterprise, and the API."*
6. **Still UNVERIFIED:** the actual *retention* period for individual-plan Codex content when training is off.
   Opt-out stops training; it is not documented (on these pages) as deletion. Temporary Chat's 30-day deletion is a
   ChatGPT-UI feature and was not shown to apply to Codex CLI.

**What this does to option 1 ("accept the reach").** It is no longer blocked-on-unknown — it is a live choice with a
known shape: on an individual plan the default is training-on, mitigable to (probably) training-off via two
separate settings, with retention unquantified. For Waypoint the material at stake is franchisor/FDD content and
candidate PII, where the honest comparison is not toggle-off-consumer vs. nothing, but **toggle-off-consumer vs.
ChatGPT Business, which is contractually no-training by default and adds admin/retention controls.** Not a legal
opinion — the decision is Kelsey's; this records the facts it turns on.

**Live control state — confirmed by Kelsey from the account UI 2026-08-02** (screenshots; account state, not
verifiable from any local file):
- ✅ **"Improve the model for everyone" — OFF.** Per the source above this covers ChatGPT conversations **and
  Codex tasks**.
- ✅ Voice: "Include your audio recordings" — OFF; "Include your video recordings" — OFF.
- ✅ **"Full access" — OFF.** (App-level: *"can edit any file on your computer and run commands with network,
  without your approval"* — the UI equivalent of `--dangerously-bypass-approvals-and-sandbox`. Correct state.)
- ✅ **Default permissions — ON** (*"can read and edit files in its workspace… can ask for additional access when
  needed"*). Workspace-scoped with prompts; correct pairing with Full access off.
- ✅ **GitHub + Google Drive connectors UNINSTALLED — independently verified 2026-08-02.** Behavioural probe run
  **without** `--disable apps` (so they would have appeared if present, as they did in the F baseline) returned
  `GITHUB=ABSENT`, `DRIVE=ABSENT`, `APPS=NONE`; the one grep hit on `mcp__codex_apps__` was the probe's own prompt
  text, not a tool. The F write-hazard is closed at source, not just per-run.
  ⚠ Uninstalling does NOT revoke the upstream OAuth grant — revoke separately at GitHub (Authorized OAuth/GitHub
  Apps) and Google (Third-party apps & services), else a reinstall silently re-arms.
- ⬜ **STILL UNCHECKED:** Codex Settings → the separate **full-environment** training control (see I.3). Not present
  in the General pane; likely lives with cloud/environment settings, and may not apply to local CLI use at all.

Residual after all of the above: training off, side channels closable per-run (E/F/G-bis), but content read by a
worker still reaches OpenAI as model context (the irreducible main channel), and **retention duration for
individual-plan Codex content remains UNVERIFIED** (I.6).

**Revisit trigger:** if write-delegation is ever wanted, require an isolated `git worktree` per job (not "clean git
status"), pinned plugin version, and a measured pilot proving break-even after verification cost.

---

## §11-K — POST-REVIEW CORRECTIONS (adversarial review 2026-08-02). These SUPERSEDE the text above where they conflict.

A hostile reviewer was run against E–J. Its material findings were verified before being accepted; two were
overstated and are recorded as such. Ranked by consequence.

**K1. ⚠ `--ignore-user-config` is a FOOTGUN, not a shortcut — reviewer's proposed fix, tested and rejected.**
The reviewer proposed it as a clean replacement for per-server enumeration. Tested (`codex exec --sandbox
read-only --ignore-user-config`, no other flags): the worker **fetched `https://example.com` and returned
`Example Domain`** — web is BACK ON, because ignoring `config.toml` discards `web_search="disabled"` along with
everything else. It drops your hardening, not your exposure. **Do not use it for containment.**

**K2. 🔴 vidiq has TWO independent delivery paths — the strip list was attributing removal to the wrong flag.**
The same run surfaced the entire vidiq suite as **`mcp__codex_apps__vidiq_*`** — i.e. via the *hosted apps*
channel, with `config.toml` not loaded at all. So `-c mcp_servers.vidiq.enabled=false` only removes the
config-declared instance; the apps-delivered instance is removed by **`--disable apps`**. Prior hardened runs
passed both, so they were covered — but the doc credited the wrong control. **`--disable apps` is the single most
load-bearing flag in the invocation.** Assume any connector may have both paths.

**K3. Evidence basis of F, corrected — and its closure re-grounded on a better differential.**
The reviewer is right that F's *specific tool names* came from model self-report, the instrument E disqualified.
Two corrections in opposite directions:
- *Against F:* the exact write-tool names (`github_delete_file` etc.) are self-report and should be read as
  indicative, not inventoried. The `--disable apps` differential proves a hosted connector surface existed and was
  flag-controllable; it does not prove each name.
- *For F:* K2 independently corroborates that `mcp__codex_apps__*` is a **real namespace** (vidiq tools appearing
  there match the known vidiq inventory), so the surface is not confabulated.
- *Closure re-grounded:* the K1 run is a **better** connector check than the one at "Live control state" — it had
  the apps channel demonstrably LIVE (vidiq present) while **GitHub and Drive were absent from it**. That is a
  within-channel differential, not a bare absence claim. Combined with Kelsey's own UI action (he uninstalled them
  and showed the pane), the uninstall is adequately evidenced. The earlier `GITHUB=ABSENT` probe was self-report
  and should not have been called "verified" on its own.

**K4. The `--disable` syntax recorded in G was wrong as prose — but the runs were correct.** G's summary line
comma-joins the flags (`--disable apps,browser_use,…`), which **errors** (`Unknown feature flag`). Anyone copying
that line gets an abort. However the reviewer's escalation — that G's evidence is therefore uninterpretable — is
**incorrect**: every actual probe used the repeatable form (`--disable apps --disable browser_use …`) and exited 0.
Documentation defect, not an evidence defect. The code block at "Hardened invocation" was always correct.

**K5. "Verified" overstated the hardened block.** Of its ~13 controls, direct evidence exists for **three**
(`web_search="disabled"`, per-server `mcp_servers.*.enabled=false`, `--disable apps` — now four with K2's
re-attribution), one is recorded as NOT working (`multi_agent`), and the remainder (`browser_use*`,
`in_app_browser`, `computer_use`, `plugins`, `image_generation`) have **no probe at all**. Read the block as
*assembled, partially verified* — the three proven flags carry the containment; the rest are unproven belt-and-braces.

**K6. The MCP strip list is off by one and is inherently fragile.** `codex mcp list` returns **five** servers
(`computer-use` [disabled], `node_repl`, `agentopus`, `openaiDeveloperDocs`, `vidiq`); the invocation names four,
omitting `computer-use`. Not a live hole today (it is `enabled = false`), but correction #3 above records that the
Codex app rewrites `config.toml`, so a hard-coded list silently re-arms when a sixth appears. **Derive the list
from `codex mcp list` at invocation time.**

**K7. 🔴 NEW HAZARD — local persistence was never examined, and it is armed.** `~/.codex/config.toml` has
`[memories] generate_memories = true` / `use_memories = true`, and `~/.codex/memories/` is a **git-backed store**
(`.git/`, `raw_memories.md`, `rollout_summaries/`, created 2026-08-02 04:46). Currently empty
("No raw memories yet"), so armed-but-unpopulated. **`use_memories = true` means content read during a delegated
run can be re-injected into a later, unrelated interactive session's context** — a cross-contamination path that
section I (OpenAI-side training/retention) does not cover at all. Local retention is checkable and currently
unbounded. **Add `-c memories.generate_memories=false` to delegated runs (UNTESTED), or use `--ephemeral`
("run without persisting session files to disk" — also untested).**

**K8. `--disable multi_agent` — reviewer's suggested retry target is itself invalid.** It proposed
`--disable collaboration_modes`; `codex features list` shows that flag's status as **`removed`**, so it is not a
live control. The observation that `collaboration.spawn_agent` survives `--disable multi_agent` stands unexplained.

**K9. Stale text corrected elsewhere in this section:** `service_tier` is now `default` (was recorded `priority`);
Kelsey has since set `model_verbosity=low` / `model_reasoning_summary=none` **globally**, so the
"interactive vs. delegated" contrast described above no longer holds for those two keys (the per-run `-c` overrides
are retained deliberately, so the delegated profile stays pinned if the UI is changed back). Any config claim in
this section without a read-time stamp should be re-read before it is cited.

**K10. Overstatements to read down:**
- *"Residual: training off"* — qualify. The full-environment control is **still unchecked**, and I.4 records that
  thumbs up/down submits the whole conversation for training regardless.
- *H's `ENV=READABLE` cell is self-report* — the canary column is genuine ground truth (a token the model could not
  guess); the `.env` column is the model *asserting* readability, since the probe forbade printing contents. Fix:
  have it return byte count + SHA-256 prefix, comparable locally, exposing nothing.
- *"read access is disk-wide (at least across `$HOME`)"* — generalized from two files both under `~/Projects`.
  `~/.ssh`, `~/.aws`, Keychain, other volumes were never tested.
- *Section I citations* lack URLs. They are:
  https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance and
  https://help.openai.com/en/articles/7730893-data-controls-faq (both "Updated: 3 days ago" as of 2026-08-02).
- **`unverified:`** I.3's quote governs *"Codex tasks."* This section treats that as covering local `codex exec`
  CLI runs — the whole data call rests on it — but "Codex tasks" may denote the hosted Codex task product instead.
  **That inference is not established.**

**K11. Unrecorded side effect of probing:** `~/.codex/config.toml` contains
`[projects."/private/tmp/…/sandbox-probe"] trust_level = "trusted"` — added by the **2026-08-01** session's probe
(not today's, which used `--skip-git-repo-check`). Probing mutates global config; clean up stale trust entries.

**K12. Scope — the reviewer's biggest hit, partially answered by J.** The review ran concurrently with the pilot
and did not see finding J, which supplies the A/B and quality comparison it called missing. What it flags that
**J does not answer, and which stands:**
- **No figure for the upgraded plan's actual limits.** The only throughput datum (B) was invalidated by the upgrade
  and never replaced. The question was "can this relieve my weekly ceiling" — that needs the new ceiling.
- **No comparison against the lever already in hand.** §13 of this same tracker argues the model/effort matrix
  (Sonnet ~⅖×, Haiku ~⅕×) is *strictly better* than bolt-on savings. J shows Codex spent **82k** doing what Claude
  did in **77k** — running that same Explore task on **Sonnet** would have cut Claude spend materially with no
  second vendor, no 2.4× latency, and no data question. **"Delegate to Codex" was never put next to "run it on
  Sonnet," and that is the comparison most likely to change the answer.**
- **No estimate of what fraction of weekly Claude spend is delegatable at all** — which decides whether any of this
  matters.

**K13. Delivery — needs a decision.** This tracker is gitignored (`.gitignore:48:.claude/`) and untracked, yet
MEMORY.md calls it the portfolio-wide living record. A session of security findings exists on one machine,
uncommitted — colliding with this repo's own "never leave verified work uncommitted" rule. Either add a
`!.claude/tool-evaluations.md` negation or relocate to a tracked path. **Kelsey's call.**

---

## §11-L — THE COMPARISON K12 DEMANDED: same task on Sonnet (2026-08-02)

Identical prompt and output contract as J, run a third time via `Explore` on Sonnet 5.

| | Codex (hardened) | Claude Opus (Explore) | Claude Sonnet (Explore) |
|---|---|---|---|
| Wall clock | 249 s | 105 s | **79 s** |
| Tokens (own pool) | 81,691 | 76,868 | **82,427** |
| Tool calls | ~8 shell | 22 | 19 |

**Token count does NOT settle it — Sonnet was not cheaper here, and cost-per-token is not the same as $-cost.**
Sonnet's *raw* token count (82,427) was the highest of the three, slightly above Codex. What makes Sonnet the
cheap option is $/token (per this repo's own CLAUDE.md: Sonnet ≈⅖× Opus, and Codex tokens are a wholly separate
paid pool) — not token volume, which this run does not support as a blanket claim. Record the distinction; don't
let "Sonnet is cheap" get cited as "Sonnet uses fewer tokens," which this data contradicts.

**Quality — checked the same way as J, by verifying falsifiable claims, not by impression.**
- **Sonnet made a confident, checkable, FALSE claim** — the kind of error that is worse than an omission. It
  stated: *"`EscapeKitDownload` model exists in the schema but has zero references anywhere in `src/`… Likely
  dead/unused schema."* Verified false: `src/app/api/escape-kit/route.ts:35`,
  `src/app/api/escape-kit-unsubscribe/route.ts:24,33`, and `src/inngest/functions.ts:2542,2559` all call
  `(prisma as any).escapeKitDownload`. It is a live model with its own capture route, its own unsubscribe flow,
  and its own nurture-drip handler — Sonnet's own entry-point list (its §1) omitted that route entirely, which is
  very likely how it reached the wrong conclusion, then stated the conclusion as fact rather than flagging the gap.
  Codex found this exact route in the pilot (J): *"parallel magnet forms... `EscapeKitCaptureForm.tsx` →
  `/api/escape-kit`."* Claude-Opus also missed the dedicated route, but did not affirmatively claim it doesn't
  exist — it just didn't mention it. Confidently-wrong beats silently-incomplete as a failure mode: a false
  "unused, safe to ignore" is more dangerous than a gap, because it invites acting on it.
- Sonnet's other claims verified true: Slack threshold `HIGH_SCORE_THRESHOLD = 70` (route.ts:15, matches),
  `archetypeNurtureProcess` at functions.ts:2997 (exact match).
- Shape: Sonnet's output was the most complete in breadth (four distinct flows including archetype, which neither
  Codex nor Opus fully separated out) but carried the one hard error above.

**What this settles for K12.** Sonnet is not a free upgrade over either alternative — it is fastest, roughly
tied on raw tokens, and produced the most consequential single error of the three (a false "dead code" claim on a
model actually wired into three live files). The real lever documented elsewhere in this tracker (§13,
Sonnet ≈⅖× Opus **cost per token**) still applies and is real money saved on a task like this — but "cheaper and
just as good" is not supported by this run; it was cheaper and had a worse worst-case error. Any of the three
alone would have shipped a wrong or incomplete map of this flow; the earlier finding stands — **verification
against source remains mandatory regardless of which engine produced the draft**, Sonnet included.

---

## §11-M — Kelsey's plan and its published limits (2026-08-02, primary source)

Kelsey confirmed he is on **ChatGPT Pro, $100/mo tier ("5x")** — not the $200/mo ("20x") tier.

Source: https://learn.chatgpt.com/docs/pricing (fetched live; the page's usage-limit table is tabbed by plan —
Plus / Pro 5x / Pro 20x / Business / API Key — and flattens to one column under plain-text extraction, which
would silently mix tiers. Read via the DOM directly to attribute columns correctly).

**Pro 5x ($100/mo) — Local Messages per 5-hour window:**

| Model | Range |
|---|---|
| GPT-5.6 Sol | **50–500** |
| GPT-5.6 Terra | 125–1,000 |
| GPT-5.6 Luna | 1,250–10,000 |
| GPT-5.5 | 75–400 |
| GPT-5.4 | 100–500 |
| GPT-5.4 mini | 300–1,750 |

Kelsey's `~/.codex/config.toml` pins `model = "gpt-5.6-sol"` — so **50–500 local messages per 5-hour window is
the relevant figure** for every delegated `codex exec` call made in this session. Exact multiplier confirmed:
every Pro-5x cell is precisely 5× the Plus-tier cell (e.g. Sol 10-100 → 50-500); Pro 20x is precisely 20×.
"Messages" is OpenAI's unit, not tasks or tokens — a single delegated discovery task like J/L may consume more
than one "message" depending on tool-call count and context size; the page states explicitly that usage varies
with task size/complexity/model/context and "prompt length alone isn't a reliable estimate."

**⚠ Still not published, and this is the gap that actually matters:** *"Additional weekly limits may apply"*
— stated but never quantified anywhere on this page or in the Codex usage-limits help article. So the *weekly*
ceiling that hit Kelsey on 2026-08-01 (§11-B) has no public number attached to it even now. What's known: the
account was upgraded and the same probe that errored then completed after upgrade (§11-A-bis), which is behavioral
confirmation the 5x multiplier lifted the ceiling that was hit — but "by how much, expressed weekly" remains
unknown. If a precise weekly figure is needed, the only source is Settings → Usage inside the ChatGPT/Codex app
itself, which was not checked this session.

**What this settles for K12's throughput question:** the pool is 5× what it was on whatever tier hit the ceiling,
denominated in "messages" against `gpt-5.6-sol` specifically. That is a real, large increase — but it is still a
capped, shared pool (per K12's original point), and "5×" is a multiplier on an unknown base, not an absolute
number Kelsey can budget against.

---

## §11-N — K7 closed: `codex exec` does not use local memories/session persistence (2026-08-02)

Baseline: `~/.codex/memories/raw_memories.md` unchanged since creation (04:46:45, 37 bytes, "No raw memories
yet"), `rollout_summaries/` empty, session-file count fixed at 1, `history.jsonl` fixed at 160 lines — this despite
roughly 20 `codex exec` invocations already run in this session before the check. Ran one more marked probe with
no memory-disabling flag; `find ~/.codex -newermt "-5 minutes"` afterward returned **nothing** — not those files,
not any other path under `~/.codex`. `codex exec` wrote to disk nowhere.

**Conclusion: the K7 hazard does not apply to the invocation pattern used throughout this section.** `use_memories`
/ `generate_memories` and the git-backed memory store are very likely populated only by the interactive
app/TUI — the same shape as worktrees (§ "Worktrees," confirmed desktop-app-only). No flag is needed for `codex
exec`; nothing to add to the hardened invocation. If Codex is ever driven interactively rather than via `exec`,
re-test before assuming this holds — this result is scoped to headless `exec` only.

**K14. Header staleness:** §11's title line and VERDICT still read as the 2026-08-01 verdict and cite the
retention/training terms as an open gate — resolved by I. Also, the `networkAccess:false` corroboration cited near
the top was only ever evidence about the **shell** sandbox and needs that scoping clause, since egress is confirmed.

**J. MEASURED PILOT 2026-08-02 — first real numbers, replacing every prior estimate.** Identical discovery task
("trace the lead-capture flow end to end", 4-part output contract, no `.env` access) run through hardened
`codex exec` and through a Claude `Explore` subagent.

| | Codex (hardened) | Claude subagent |
|---|---|---|
| Wall clock | **249 s** | **105 s** |
| Tokens | **81,691** (Codex pool) | **76,868** (Claude pool) |
| Tool calls | ~8 shell | 22 |

**Quality — judged by spot-verifying falsifiable claims from both, not by impression. Both were accurate; neither
was complete; the misses did not overlap.**
- *Codex caught and Claude missed:* Slack high-score alerts in `src/app/api/scorecard-complete/route.ts:133-172`;
  the `ScorecardSubmission` (schema.prisma:117) and `ArchetypeSubmission` (:137) models; that
  `InlineCapture.tsx` promotes the Corporate Escape Kit (:9, :77) but posts to `/api/capture-email` with
  `source: "escape_kit_inline"` (:23-27) — a genuine naming/routing mismatch worth a look.
- *Claude caught and Codex missed:* exact line anchors that all verified (`schema.prisma:157`,
  `capture-email/route.ts:69` create, `:117`/`:150` the two Resend sends); that `/api/leads` is **not** public
  (auth-gated in `middleware.ts`) — Codex omitted it entirely; and that `inngest.send` is **awaited** inside a
  block commented "fire-and-forget" (`capture-email/route.ts:98-114`), so a slow Inngest call does delay
  checklist delivery.
- Shape difference: Claude gave precise call-order with line numbers on one path; Codex gave broader coverage
  across all magnet paths in denser prose with no line numbers.

**Interpretation — the honest read.**
1. **Token counts are near-identical (82k vs 77k).** Codex is not *cheaper*; it is a *different pool*. The benefit
   is pool-shifting, not efficiency — which is exactly what the original goal (relieve Claude weekly limits) asked
   for, but it kills any "delegation is cheaper" framing.
2. **Latency cost is real: 2.4× slower.**
3. **The saving is NOT the full 77k.** Claude still paid for brief construction, reading Codex's output, and
   verifying its claims (one grep pass here). Unmeasured but small — low thousands for a task this size. Net
   saving ≈ 70k Claude tokens per task of this size.
4. **Break-even confirmed to depend on task size**, as predicted: fixed overhead (brief + read + verify) is roughly
   constant, so small tasks lose. This task (~77k) clears it comfortably.
5. **On "is combined output as good or better?" — for THIS task, the union beat either alone**, and the same
   non-overlapping-blind-spots pattern showed up here as in the earlier review comparison. That is evidence for
   using both on high-value work, not for replacing one with the other. But it is **n=1** on a read-only
   discovery task; do not generalise to write-delegation or to correctness-critical review.

---

## Open TODOs / to verify
- Codex: verify ChatGPT-plan retention/training terms before ANY repo content is delegated.
- ~~Codex: test whether the MCP surface is reachable~~ — **ANSWERED 2026-08-02: yes, egress confirmed under
  `--sandbox read-only`.** See update (A) in §11. Plugin-launched path still untested (plugin rejected).
- Codex: check what `trust_level = "trusted"` does to sandbox/approval defaults. **Partial** — the gate is real
  (untrusted dir refuses to run); what trust grants is still unknown. See update (C).
- ~~Codex: prove the per-run MCP-strip override removes the servers~~ — **DONE** (§11-E; zero-token instrument, no
  usage limit involved). The "blocked until 2026-08-08" note here was stale the moment the account was upgraded.
- ~~Codex: re-measure the delegation break-even~~ — **DONE**, see §11-J (Codex 82k/249s vs Claude 77k/105s).
- ~~Codex: record the upgraded plan's actual weekly limits~~ — **PARTIALLY DONE**, see §11-M. Kelsey confirmed he
  is on the $100/mo Pro (5x) tier; the 5-hour-window figures are published, the weekly figure is not.
- ~~Codex: A/B "delegate to Codex" against "run it on Sonnet"~~ — **DONE**, see §11-L.
- ~~Codex: test the memories mitigation~~ — **DONE, negative result (good news)**, see §11-N.
- Codex: settle whether OpenAI's "Codex tasks" wording covers the local CLI (§11-K10). The data call rests on it.
- gravity-claw read layer: stubbed or built? (decides Agent-Reach relevance)
- More repos still to evaluate (batch ongoing).
- mattpocock/skills: run the `writing-great-skills` failure-mode lens over our own skill library + the
  stamped CLAUDE.md blocks (sediment / duplication / no-op / negation pass). Not yet done.

### 12. garrytan/gstack — 🧠/⬜ SPLIT: adopt ~4 skills PREFIXED; reject the wholesale install + reject the ETHOS
Repo: https://github.com/garrytan/gstack · MIT (© 2026 Garry Tan) · v1.60.1.0 · runtime **Bun** ≥1.0
_Evaluated 2026-08-01 by source read of a fresh clone (depth-50). NOT run — `setup` was never executed,
no skill was trialled. Everything below is read-from-source, not observed-in-use._

**What it actually is:** 55 Claude-Code skill dirs (each a `SKILL.md`) + a headless-browser CLI (`browse`,
Playwright/puppeteer-core) + `make-pdf`/`diagram`. Marketed as "a virtual engineering team" for solo
builders: product interrogation (`/office-hours`, `/plan-ceo-review`), review (`/review`, `/cso`,
`/devex-review`), QA (`/qa`, `/design-review`), release (`/ship`, `/land-and-deploy`, `/canary`), plus
iOS, gbrain, codex/gemini hosts. Installs to `~/.claude/skills/gstack` + `~/.gstack`; also targets 10
other agent hosts. Actively maintained, NOT solo: 50 commits 2026-06-07→2026-07-14 across 5 authors
(Garry Tan 19). Repo is high-churn and heavily agent-authored (912KB CHANGELOG, 144KB TODOS.md,
`time-attack/*` bot branches).

**Hygiene — better than most things in this tracker:**
- `telemetry` default **off** (endpoint IS live: a configured Supabase project + publishable anon key).
- `auto_upgrade` default **false**; `update_check` true = notify-only (no `git pull` found in the checker).
- Hook install into `~/.claude/settings.json` is consent-gated, default **N**, writes `.bak` + has `rollback`.
- `setup` itself does **not** mutate CLAUDE.md — the README asks *Claude* to do that (see collision 1).

**Three real collisions with our environment — these are the finding, not the feature list:**
1. **It tells you to disable our browser stack.** The README's install prompt says to write into CLAUDE.md:
   *"use the /browse skill from gstack for all web browsing, never use mcp__claude-in-chrome__* tools."*
   Our harness has a documented Claude_Browser/claude-in-chrome preview+verification workflow. Pasting the
   install prompt verbatim would tell every future session to abandon it. **Never paste that prompt as-is.**
2. **The ETHOS is the opposite of our cost governance — and it's baked into the skills, not just a doc.**
   VERIFIED: **49 of 55** `SKILL.md` files literally carry a "Boil the Ocean" section ("do the complete
   thing", "recommend full coverage", "completeness is cheap", "2 weeks human / ~1 hour AI-assisted").
   Our global CLAUDE.md runs the reverse: start at the model floor, down-tier for cost, state scope and
   **don't widen it**, and never tell Opus 5 to self-verify because it already over-verifies. Adopting a
   gstack skill imports an instruction to expand scope into the exact model that most needs the opposite.
   Any adopted skill must have that section **stripped** before use.
3. **Unprefixed slash commands.** `skill_prefix` defaults to **false** → it installs `/review`, `/qa`,
   `/ship`, `/investigate`, `/learn`, `/spec`, `/health`, `/diagram` at top level, colliding with our
   existing `/review`, `/security-review`, `/verify`, `/ground`, `/simplify`. Mitigation is one command:
   `bin/gstack-config set skill_prefix true` → `/gstack-qa` etc. **Non-negotiable if we install anything.**
   Secondary: gstack "team mode" writes repo `CLAUDE.md` + `.claude/`, the same files `stamp-git-safety.sh`
   owns — two systems writing one file.

**Worth taking (as *learn-from* or narrow prefixed installs):**
- `/cso` — OWASP + STRIDE security audit. Highest-value item: waypoint-core-system holds candidate PII + CRM
  and auto-deploys on push. Complements, doesn't duplicate, our `/security-review`.
- `/qa` + `browse` — headless-browser QA against a deployed URL. Real fit for waypointfranchise.com,
  navigator-os, whimsey-and-grace, heartstrings-nwa. Overlaps our Claude_Browser tooling — trial before adopting.
- `/office-hours`, `/plan-ceo-review` — product interrogation / scope challenge. The least-redundant pieces
  we own nothing equivalent to, and they're pure methodology (Markdown), so they can be read and adapted
  with zero install. Note they're also the 4 skills published standalone via ClawHub for OpenClaw →
  possible direct fit for **gravity-claw** without touching Claude Code at all.
- `careful` / `guard` / `freeze` / `unfreeze` — destructive-action safety primitives. Worth reading against
  our franscale git-safety block; possible ideas, not a replacement.

**Irrelevant to the portfolio:** all 5 iOS skills, gbrain sync, codex/gemini host adapters, benchmark-models.

**Verdict:** Do **not** run the advertised one-paste install — it is machine-wide, unprefixed, and carries
an anti-scope-discipline ethos into 49 skills. Best value is **learn-from** for the 4 methodology skills
(read the Markdown, port the good questions into our own voice) plus a possible **narrow, prefixed,
ethos-stripped** trial of `/cso` and `/qa` on ONE repo. Bun is a new runtime dependency for us — check it's
present before any trial.
**Revisit trigger:** (a) before the next security pass on waypoint-core-system → trial `/cso` first;
(b) if we want browser QA against deployed sites and our Claude_Browser workflow proves insufficient;
(c) gravity-claw's OpenClaw layer → the 4 ClawHub methodology skills install there natively.

### 13. JuliusBrussee/caveman — ❌ REJECT the skill portfolio-wide · ⬜ NARROW ADOPT `caveman-shrink` only · 🧠 learn-from its honesty
Repo: https://github.com/JuliusBrussee/caveman · MIT (© 2026 Julius Brussee) · Node ≥18 · installer pkg `caveman-installer` v0.1.0
_Evaluated 2026-08-01 by source read of a fresh clone (depth-50). NOT installed, NOT benchmarked — the
65% figure is the author's, not reproduced here (`benchmarks/run.py` needs an Anthropic key)._

**What it is:** a system-prompt skill that makes the agent reply in terse "caveman-speak" — drops articles,
filler, pleasantries, **hedging** — while keeping code/commands/errors byte-exact. Targets 30+ agents.
On Claude Code a hook makes it active **from message one, no command needed**. Maintained, multi-contributor
(50 commits 2026-06-14→2026-07-03, Julius Brussee 34 + 7 others).

**Privacy — verified, and it holds up.** SECURITY.md claims zero telemetry; I grepped `src/`, `skills/`,
`commands/` myself and found **no runtime network calls** — every URL is an install/uninstall path or a doc
comment. `caveman.so` is a waitlist link printed in the install summary, not a data bridge; "Atlas Cloud" is
a sponsor banner. No backend, works offline. Install is `curl | bash` → `npx github:…` (normal supply-chain
caveat; a local clone install avoids the pipe).

**Why it fails for THIS portfolio — three reasons, in order:**
1. **The economics don't beat the lever we already run.** Its own `docs/HONEST-NUMBERS.md` states: output-only
   savings, **0%** input reduction, and the skill *adds* **~1–1.5k input tokens per turn**. Real session-level
   savings land at **14–21%** on output-heavy work and **below zero** on terse work. It also explicitly does
   **not** compress *thinking tokens* — and we run `high`/`xhigh` effort, where thinking dominates output. So it
   attacks the smallest slice of our bill. Our existing model/effort matrix (Sonnet ~⅖×, Haiku ~⅕×, or just
   dropping effort a notch) cuts **input, output, and thinking** together. Strictly better lever, already in place.
2. **It has no boundary for prose — and prose is the product.** Its entire `## Boundaries` section is one line:
   *"Code/commits/PRs: write normal."* Code is protected; **AEO articles, social posts, brand-introduction
   scripts, video scripts, newsletters, and client-facing copy are not.** Waypoint's actual deliverable is
   polished prose. The skill is also deliberately sticky: *"ACTIVE EVERY RESPONSE. No revert after many turns.
   Still active if unsure."*
3. **It collides head-on with three things we already enforce.**
   - `humanizer-kelsey` — calm authority, 5th–7th grade, no em dashes, PASO/AIDA. Caveman mandates fragments
     and dropped articles. Two style systems fighting over the same output.
   - **The grounding block** requires hedge labels (`unverified:`, `from memory:`). Caveman's rules say **drop
     hedging**. Direct contradiction of a hard rule.
   - **The git block** requires plain-English reports ("never make you read branches or SHAs") and STOP gates
     with specific wording. Caveman compresses exactly that communication layer.
   - **FTC/FDD:** franchise content needs complete, careful, qualified language. "Drop hedging" is the wrong
     instruction inside a compliance-gated content operation (see this tracker's standing constraints).

**The one piece genuinely worth taking — `caveman-shrink` (⬜ trial):** a **separately published npm package**
(`npm i -g caveman-shrink`, MIT) that is a **stdio MCP proxy**: it wraps an upstream MCP server and compresses
the prose in its tool catalog (`description` fields), preserving code/URLs/paths/identifiers. This is the
inverse of the skill — it saves **input** tokens and **never touches the agent's voice**. Relevant because our
MCP surface is enormous (n8n, vidiq, Blotato, Higgsfield, Descript, Beehiiv, Clay, Canva, search-console,
Slack…) and every tool schema is input context on every turn. Installable and testable **without** the caveman
skill. UNVERIFIED: not trialled; unknown whether shrinking descriptions degrades tool-routing accuracy — that
is the thing to A/B, and it's a real risk (a mis-shrunk description makes the model pick the wrong tool).

**🧠 Learn-from (the best thing in the repo):** `docs/HONEST-NUMBERS.md` is a model of honest tooling docs — it
names the workloads where the tool **loses money**, links the issues where users proved it, and says "turn it
off." Commit history shows the claim corrected *downward* repeatedly (75% → 50–65%), and a stats bug fixed
where "budget saved %" was mislabeled. Worth copying that posture into our own internal tooling docs.

**Verdict:** Do **not** install the skill anywhere in the portfolio — the savings are smaller than our existing
model/effort lever, and the style directive fights our voice, grounding, and compliance rules. Trial
`caveman-shrink` alone as a possible input-token saving on the MCP catalog.
**Revisit trigger:** (a) if MCP tool-catalog bloat becomes a measured context problem → A/B `caveman-shrink`
on ONE noisy server (n8n or vidiq) and check tool-routing accuracy, not just token count; (b) never revisit the
skill itself unless it grows a real prose/artifact boundary.

### 14. thedotmack/claude-mem — ⬜ CONDITIONAL single-repo trial ONLY (hard preconditions) · 🧠 learn-from progressive disclosure · ❌ not portfolio-wide
Repo: https://github.com/thedotmack/claude-mem · **Apache-2.0** (© 2026 Alex Newman) · v13.12.4 · Node ≥20 + Bun + `uv`
_Evaluated 2026-08-01 by source read of a fresh clone (depth-50). NOT installed, NOT run. Injection token
cost and `<private>`-tag reliability are UNVERIFIED._

**What it is:** an automatic persistent-memory system for Claude Code. 5–6 lifecycle hooks capture tool-use
observations → an LLM writes semantic summaries → stored in local SQLite (FTS5) + a **Chroma** vector store →
relevant context is auto-injected into future sessions. Ships a persistent **Bun worker + HTTP server on
:37777** with a web viewer, 3 MCP search tools, and an OpenClaw gateway path. Very active but effectively
solo: **49 of 50** commits by one author, 50 commits in 9 days, 343KB changelog at v13 — high churn.

**The need is real for us.** Our own memory index admits the failure it targets: the core-system scope is "a
catch-all — most memories below are actually social-OS or matcher topics recorded here incidentally." Cross-
session, cross-repo recall across a 10+ repo portfolio is a genuine gap. So this is not a solution in search
of a problem. The objections below are about *this design*, not the goal.

**Blocking issue — it writes CLAUDE.md, and `stamp-git-safety.sh` already owns that file.**
VERIFIED in source: it injects a `<claude-mem-context>` block into auto-loaded CLAUDE.md and generates
per-folder CLAUDE.md files (`src/utils/claude-md-utils.ts`, `src/cli/claude-md-commands.ts`). Default
`CLAUDE_MEM_FOLDER_USE_LOCAL_MD: 'false'` → it writes **real `CLAUDE.md`, not `CLAUDE.local.md`**. Our
CLAUDE.md files are **committed** and stamped verbatim by `stamp-git-safety.sh` with the franscale governance
blocks. Two writers on one committed governance file = stamper/tool conflicts **and generated session-derived
content landing in git**. Mitigable — set `CLAUDE_MEM_FOLDER_USE_LOCAL_MD=true` **before** install, and confirm
`CLAUDE.local.md` is gitignored — but this must be done first, not discovered later.

**Design conflict with the grounding block.** Our hard rule: memory files are "point-in-time snapshots and
hypotheses, NOT facts to repeat," and state-claims must be re-verified against the real source. claude-mem
auto-injects **LLM-generated summaries of past sessions** into new sessions — a high-volume, automatic feed of
exactly the unverified state-claims that rule exists to suppress. Our memory is deliberately *curated* (one
fact per file, explicit rules on what NOT to save); claude-mem is *automatic and exhaustive*. Opposite designs
competing for the same slot. If trialled, the grounding rule must win: treat injected context as unverified.

**Security-doc drift — the finding that matters most for a PII-handling business.** SECURITY.md states flatly:
*"Claude-mem does not collect telemetry."* **That is wrong.** `src/services/telemetry/` POSTs to
**PostHog** (`https://us.i.posthog.com`) and consent defaults to **on (opt-out)** — `consent.ts` literally
comments *"Default: on (opt-out)"*. In fairness the implementation is well built: a strict **whitelist**
scrubber (`scrub.ts`) permits only bounded keys (version, os, arch, duration_ms, outcome, error_category,
locale…) and silently drops paths, project names, prompts, queries, emails, IPs; it honors `DO_NOT_TRACK`.
Whitelist-not-blacklist is the correct design. But **the security doc cannot be trusted as authoritative for
this repo** — verify claims in code. Disable with `CLAUDE_MEM_TELEMETRY=0`.

**Data egress is by design (documented honestly in SECURITY.md, unlike the telemetry line):** transcript/prompt
content goes to **Anthropic's API by default** via the Agent SDK — the *same trust boundary we already accept*,
so not a new exposure — but it is configurable to **gemini/openrouter** (new third parties), the OpenClaw path
advertises "real-time observation feeds to Telegram, Discord, Slack," and **Cloud Sync to cmem.ai** exists. It
also reads the **Claude Code OAuth token from the platform keychain** to inject into workers. All opt-in, but
the surface is wide for a business holding candidate PII + FDD/brand IP.

**Genuine positives:** Apache-2.0; `<private>…</private>` tags stripped at the hook layer *before* storage;
per-prompt semantic injection **off by default** (`CLAUDE_MEM_SEMANTIC_INJECT: 'false'`) — a responsible
default; worker binds `127.0.0.1`.

**🧠 Worth stealing regardless — the 3-layer progressive-disclosure search:** `search` (compact index,
~50–100 tok/result) → `timeline` (chronology around a hit) → `get_observations` (full detail, ~500–1k tok,
only for filtered IDs). Claimed ~10x token saving by filtering before fetching. That pattern is directly
applicable to our **brand-intelligence RAG** (`bip layer2-query`) and the candidate-matcher — retrieve an
index first, hydrate only what survives filtering. Copy the pattern, no install required.

**Verdict:** Do **not** install portfolio-wide. It is a heavy always-on daemon (Bun worker + Chroma + auto-
installs `uv`), near-solo at v13 with high churn, it writes a file our stamper owns, and its automatic-recall
philosophy fights our curated-memory + grounding design. If we want cross-session recall, trial it on **one
low-sensitivity repo** with these preconditions set first: `CLAUDE_MEM_FOLDER_USE_LOCAL_MD=true`,
`CLAUDE_MEM_TELEMETRY=0`, default Anthropic provider only (no gemini/openrouter/cloud-sync/chat feeds), and
`CLAUDE.local.md` gitignored.
**Revisit trigger:** (a) if cross-repo recall becomes a measured, recurring pain → trial per above on
`local-websites` or another low-sensitivity repo, never on waypoint-core-system or brand-intelligence-pipeline
first; (b) independently, port the progressive-disclosure retrieval pattern into the brand RAG — that is the
highest-value takeaway and carries none of the risk.

### 15. Graphify-Labs/graphify — ⬜ **Tier-1 ADOPT CANDIDATE — strongest of the four evaluated 2026-08-01**
Repo: https://github.com/Graphify-Labs/graphify · **Apache-2.0** (© 2026 Safi Shamsi + contributors; relicensed
from MIT, `LICENSE-MIT` retained) · PyPI `graphifyy` v0.9.32 · Python + `uv`/`pipx` · **YC S26**
_Evaluated 2026-08-01 by source read of a fresh clone (depth-50). NOT installed, NOT run — no graph was built,
so extraction QUALITY on our repos is UNVERIFIED. Everything below is read-from-source._

**What it is:** `/graphify .` maps a project into a **traversable knowledge graph** (not a vector index) you
query instead of grepping. Code is parsed with **tree-sitter AST — deterministic, no LLM, fully local**. Docs/
PDFs/images/video get an optional semantic pass via a configured model. Outputs `graph.html` (clickable),
`GRAPH_REPORT.md`, `graph.json`; also exports **Obsidian vault**, GraphML, and Neo4j Cypher. Ships an **MCP
stdio server** so an agent can query the graph directly. Healthiest project of the four: **15 contributors**,
last commit the day of evaluation, 50 commits in 4 days.

**Language coverage — VERIFIED against `pyproject.toml` + `extract.py`, not the README:** 24+ tree-sitter
grammars including `.ts/.tsx/.mts/.cts/.js/.jsx/.mjs/.cjs`, `.vue`, `.astro`, `.py`, `.go`, `.rs`, `.rb`,
`.cs`, `.kt`, `.php`, `.swift`, `.scala`, SQL. **Covers our actual stack** — Next.js/TS (waypoint-core-system,
navigator-os, whimsey-and-grace, franchise-conduit) and Python (brand-intelligence-pipeline).

**Security posture — the best in this tracker, by a distance.** `SECURITY.md` is a real threat table with
specific named mitigations, not a marketing paragraph: SSRF (`validate_url()` blocks private/loopback/link-local
+ cloud metadata endpoints, re-validates redirects), 50MB/10MB download caps, path-traversal confinement to
`graphify-out/`, XSS label sanitization, no `shell=True`, no `eval/exec` (tree-sitter parses ASTs only), stdio
transport by default. Most notably it takes **prompt injection via source files** seriously: `llm.py` wraps
every file in a hash-stamped `<untrusted_source path=… sha256=…>` block, instructs the model to treat it as
inert data, and defangs jailbreak sentinels (`<|im_start|>`, `[INST]`, `<<SYS>>`, forged closing tags) — and is
honest that this "does not make injection impossible, but changes it from 'works on first try' to 'requires
evasion.'" **VERIFIED: zero telemetry** — grepped the whole package for posthog/amplitude/mixpanel/analytics,
clean. Compare entry #14, where the security doc's no-telemetry claim was false.

**Why it fits us better than the other three — it is philosophically compatible, not just useful:**
- **Every edge is tagged `EXTRACTED` (explicit in source) vs `INFERRED` (resolved by graphify).** That is our
  grounding rule expressed as a data model: what was read directly is distinguishable from what was inferred.
  gstack and caveman fight our governance; this one encodes it.
- Code pass is deterministic and local → **no data egress, no model cost** for the highest-value use.
- The semantic pass is provider-pluggable (`claude`/`gemini`/`openai`/`azure`/**`ollama`**), so doc/PDF work can
  run **fully local via Ollama** — matches the local-models posture already documented in gravity-claw.

**Three concrete applications, most valuable first:**
1. **brand-intelligence-pipeline — the novel one.** Graphify is explicitly *not* a vector store, so it does not
   compete with our RAG (`bip layer2-query`, ~2,766 chunks / 236 brands) — it is **complementary**. Brand ↔
   segment ↔ industry ↔ franchisor relationships are graph-shaped and are exactly what vector similarity is
   worst at. A relationship graph beside the vector store could answer "which brands share this ownership
   model / segment adjacency" that embeddings answer poorly. **Highest upside, needs a real trial to confirm.**
2. **waypoint-core-system** — a large Next.js/TS app; agent navigation via the MCP graph server instead of
   grep-and-read. Free and local for code.
3. **Gravity Claw Obsidian Vault** — exports one `.md` per node with `[[wikilinks]]`, and **#1506 tracks its own
   files in a manifest so it does NOT clobber existing notes or `.obsidian/` config**. That safety property is
   what makes pointing it at the governance vault viable rather than reckless.

**Cautions:**
- **Pre-1.0 (v0.9.32) at very high velocity** — 355KB changelog, 50 commits in 4 days. Expect output-format and
  CLI churn; pin the version if anything downstream depends on `graph.json` shape.
- **Open-core, YC-backed.** The OSS CLI is the *on-demand* tool; "always-on, background, across code + docs +
  meetings" is the paid platform (`app.graphify.com`). Standard risk that the OSS/paid line moves. Adopt for
  what it does today, don't architect around it.
- **`graphify claude install` writes a graphify section into CLAUDE.md + a PreToolUse hook** — same file our
  `stamp-git-safety.sh` owns. Unlike entry #14 this is an explicit **opt-in subcommand with a matching
  `claude uninstall`**, not a default. **Use the plain skill install; skip `claude install`.**
- Minor doc drift: `SECURITY.md` still lists "Supported Versions: 0.3.x" while shipping 0.9.32.
- Adds a Python/`uv` toolchain dependency (already present for brand-intelligence-pipeline).

**Verdict:** The only Tier-1 adopt candidate of the 2026-08-01 batch. Trial in this order: (1) `graphify .` on
**brand-intelligence-pipeline** — cheapest, Python, and tests the complementary-to-RAG thesis; (2) on
**waypoint-core-system** for TS/agent-navigation value; (3) only then consider the Obsidian export against a
**copy** of the Gravity Claw vault, never the live one on first run. Skip `claude install`. Pin the version.
**Revisit trigger:** immediately — this is the one worth actually running, unlike #12–#14.

### 16. palmier-io/palmier-pro — ❌ **BLOCKED — cannot run on this Mac today** · ⬜ revisit after macOS upgrade (editor+MCP only, never the paid tier)
Repo: https://github.com/palmier-io/palmier-pro · **GPL-3.0** (editor, MCP server, agent chat) · Swift/macOS app · **YC S24**
_Evaluated 2026-08-01 by source read of a fresh clone (depth-50). NOT installed — see the hard blocker._

**What it is:** a Swift-native, open-source **NLE video editor for macOS** ("north star is Premiere Pro") with
an agent in the timeline. Exposes an **MCP server at `http://127.0.0.1:19789/mcp`** so Claude Code / Codex /
Cursor / Claude Desktop can drive the timeline directly. Also bundles an `mcpb` one-click Claude Desktop
extension. Active, multi-contributor, agent-heavy commit flow.

**🚫 HARD BLOCKER — VERIFIED against this machine, not assumed.** Requires **macOS 26 (Tahoe) on Apple
Silicon**. This Mac: `sw_vers` → **macOS 15.7.8** (build 24G817), `uname -m` → arm64, Apple **M3 Pro**. Apple
Silicon is satisfied; **the OS is two majors short.** It cannot be installed today without a Tahoe upgrade.
UNVERIFIED: the **Mac Mini's** OS version — if the Mini is already on Tahoe it could host this, but that has
not been checked (see `~/Projects/MINI-TODO.md` workflow).

**License shape — read it correctly before worrying:** GPL-3.0 covers the editor, the MCP server, and the agent
chat. **Only the generative-AI processing is closed source**, and it needs login + subscription. GPL-3 here is
*use*, not *link* — running a GPL app does not affect our work product (rendered videos are not derivative
works). It would only bite if we forked or embedded its code, which we would not.

**The paid tier is redundant for us — do not buy it.** Palmier's in-timeline generation advertises **Seedance,
Kling, Nano Banana Pro**. We already have **Seedance 2.0 and Nano Banana 2/Lite/Pro through our own Higgsfield
MCP**, which this tracker's standing constraints already say to prefer. Paying Palmier's subscription would be
paying twice for the same models. If it is ever adopted: **free editor + free MCP server only, no login.**

**The genuinely novel part — a real gap in our video stack.** Our current video tooling has **no timeline NLE
under agent control**: Descript MCP is text-based/cloud, `video-skills:long-form-episode-assembly` is
code-based (Remotion), `video-skills:stills-motion-assembly` is HTML/CSS/GSAP (HeyGen HyperFrames), Higgsfield
and AgentOpus are generators. A Premiere-style timeline an agent can manipulate over MCP — free and
local — is a category we do not currently own. That is the reason to keep this on the list at all.

**Privacy:** ships `Telemetry` + `Analytics` with a dedicated **Settings → Privacy pane** exposing user
toggles (`Sources/PalmierPro/Settings/PrivacyPane.swift`). Defaults UNVERIFIED (not run). Reasonable UX; check
the toggles on first launch if ever installed.

**Verdict:** ❌ for now — **it physically cannot run on this machine.** No trial is possible, so no adoption
decision is warranted. Not a quality judgement: on the merits it is the most interesting *video* tool
evaluated, because it fills a real hole (agent-driven timeline NLE) rather than duplicating our stack.
**Revisit trigger:** (a) after this Mac (or the Mini) moves to **macOS 26 Tahoe** — re-check the requirement,
it may relax as the app matures; (b) when revisited, evaluate it through the **VideoSkills catalog**
(`video-skills:video-skills-index` is the front door for video tooling decisions, and
`video-skills:video-skills-new-entry` is the documented way to record the outcome) rather than only here;
(c) adopt the **free editor + MCP server only** — route all generation through our existing Higgsfield.

#### 15a. graphify — TRIAL RESULTS (2026-08-01, run this session)
Installed `pipx install 'graphifyy==0.9.32'` (no `uv` on this Mac; pipx is a supported path) → `graphify` +
`graphify-mcp` in an isolated venv. **`graphify claude install` deliberately NOT run** (writes into CLAUDE.md,
which `stamp-git-safety.sh` owns). Both runs used `extract --code-only --out <scratchpad>` → fully local AST,
**no API keys are set on this machine**, so zero egress and zero model cost. **Both repos verified untouched
afterwards** (`git status` unchanged) — `--out` keeps `graphify-out/` outside the repo, so no `.gitignore`
edit was needed.

**⚠ The thesis in #15 was mis-specified — correcting it.** I proposed trialling on brand-intelligence-pipeline
to test "graphify complements the brand RAG because brand ↔ segment ↔ franchisor relationships are
graph-shaped." **That cannot be tested this way.** Graphify indexes *source files*; the brand relationships
live in `var/brand_rag.sqlite` (~37MB, gitignored, a vector store — not parseable source). The run mapped the
*pipeline's Python code*, not the brand data. **The complementary-to-RAG idea remains untested and open**; it
would require exporting brand relationships to files first — real work, not a trial. Nothing below should be
read as evidence for or against it.

**Measured (this session):**

| Repo | Files | Nodes | Edges | `calls` share | EXTRACTED | Time |
|---|---|---|---|---|---|---|
| brand-intelligence-pipeline (Python) | 112 | 1,802 | 4,063 | **38%** (1,558) | 3,905 (96%) | ~4s |
| waypoint-core-system (TypeScript) | 216 | 1,068 | 1,912 | **16%** (304) | 1,861 (97%) | ~3.4s |

- **TypeScript extraction is materially thinner than Python.** More files produced fewer edges, and the TS
  graph is 66% structural (`contains`/`imports`) with a weak call graph — expected given JSX + Next.js
  framework indirection. Python got a rich call graph. **Implication: the value is higher on the Python
  pipeline than on the Next.js app**, which inverts the priority assumed in #15.
- **Provenance is real and per-edge** — field is `confidence` (`EXTRACTED`/`INFERRED`) with a numeric
  `confidence_score` (1.0 / 0.8 / 0.5). ~97% EXTRACTED on both. This is the feature that made it worth
  trialling and it holds up.
- **`explain <node>` is the standout**: provenance-tagged neighborhood with file:line and relation type. On
  `StagedResolution` it correctly surfaced the whole gated identity-change approval path
  (`stage_identity_change()` → `StagedResolution` → `commit_if_approved()` / `apply_approved_identity_change()`,
  with Slack approval + audit log) — a real, governance-critical subsystem, mapped in one command.
- **`god-nodes` was accurate and insightful on the TS app**: top hubs were `jsonLdGraph()`,
  `breadcrumbSchema()`, `webPageSchema()`, `JsonLd()`, `faqPageSchema()` — i.e. the **JSON-LD/AEO structured-
  data layer is the architectural hub of waypointfranchise.com**, which is exactly right for an AEO site and
  is a genuinely useful thing to have surfaced. Also correctly picked out `inngest`, `notifyCrm()`,
  `subscribeToBeehiiv()` as the integration points.
- **`query` is the weakest command** — on a broad question it returned 536 matching nodes truncated to 33 and
  emitted a flat node list, not a synthesized answer. It is a retrieval index; use it narrow, or use `explain`.
- **Its own `benchmark` claims 5.6x token reduction — treat as inflated.** It baselines against reading the
  *entire corpus* (~120k tokens), which nobody does; the real baseline is targeted grep+read. The genuine win
  is architectural "what connects to what", where grep is legitimately bad — not lookup.
- Minor: 5 `.sql` files contributed nothing — needs `pip install "graphifyy[sql]"`. It **warns** about files
  that produced zero nodes rather than silently dropping them (good).

**Revised verdict:** it works, it is fast, free and local, and `explain` + `god-nodes` deliver real value
today. **Adopt-worthy for code comprehension**, strongest on Python. Not yet wired into anything — no MCP
server registered, no skill installed. Remaining open items: (a) the brand-relationship graph idea needs a
different approach entirely; (b) Obsidian export against a **copy** of the Gravity Claw vault; (c) decide
whether to register `graphify-mcp` with Claude Code for day-to-day navigation.

#### 15b. graphify — ADVERSARIAL REVIEW CORRECTIONS (2026-08-01, fresh reviewer)
A fresh reviewer re-derived every number in 15a from the graph.json artifacts and read graphify's source.
**All headline measurements verified exact** (1,802/4,063/112 and 1,068/1,912/216; `calls` shares 38.3% /
15.9% computed consistently; `confidence` split 96.1% / 97.3%; "66% structural" literally correct). **Both
repos confirmed genuinely untouched** — git status matched the pre-existing baseline exactly, no
`graphify-out/` or `.graphify*` anywhere, nothing committed, no CLAUDE.md touched anywhere. Install verified
pinned. The defects were all in the **reasoning layer**. Corrections, most severe first:

1. **✗ The "thesis was mis-specified" correction in 15a was ITSELF WRONG — retracted.** graphify ingests
   docs, PDFs, transcripts and Google Workspace into the same graph, and **`--code-only` is precisely the
   flag that disables that pass** (`cli.py` → `semantic_files = []`). `var/brand_rag.sqlite` is a *derived*
   store; the upstream corpus is the Drive `00_INBOX` documents — **already files**, and exactly graphify's
   doc-pass input. No "export work" is required. The honest statement is *"untestable in the code-only
   configuration I chose."* I picked a config that foreclosed the thesis, then declared the thesis dead —
   retiring the very reason the trial was commissioned. **The brand-relationship-graph experiment is live
   and is the highest-value open item.** Cost of the mistake: it was written into memory as settled.
2. **✗ The zero-egress rationale was a false rule.** 15a justified safety with "no API keys are set."
   graphify's **`claude-cli` backend needs no key** (routes through the Claude Code subscription; `llm.py`
   exempts `claude-cli`/`bedrock` from the key check), and `ANTHROPIC_BASE_URL` *is* set here. **The real
   guarantee is the flags: `--code-only` + `--no-label`.** The run was genuinely zero-LLM — independently
   confirmed: 100% of nodes and edges carry `_origin: "ast"`, all 2,870 community names are generic
   placeholders, only `cache/ast/` exists on disk. Right answer, wrong reason; the wrong reason was the
   dangerous part, since anyone dropping `--code-only` while trusting it would ship brand docs to a model.
3. **⚠ The god-nodes insight was over-read.** Output reproduces exactly, but `jsonLdGraph()` (57) is fan-in
   on a **stateless helper** imported once per page across 29 page files and **double-counted** as both an
   `import` and a `calls` edge — the same shape a `cn()` classnames util produces. The genuine
   highest-degree node is **`archetype-sequence-dispatcher.ts` (79)**, unmentioned, and 15a said "top hubs"
   without disclosing that file nodes were filtered out. "The AEO layer is the architectural hub" is not
   supported; "the AEO helper has the widest fan-in among symbols" is.
4. **⚠ Conclusion (b) holds but the stated reasoning was invalid — now normalized.** "More files produced
   fewer edges" is not evidence without size. Reviewer normalized: corpora are near-identical
   (**38,559 vs 35,882 LOC**); edges/kLOC = `.py` **201.8**, `.ts` **45.5**, `.tsx` **59.8** → **~3.7x**,
   i.e. the gap is *worse* than 15a implied. Two confounds 15a missed: Python gains ~698 docstring-derived
   `rationale_for` edges TS has no analogue for, and **`.mjs` in the same repo scores 105.3 — 2x `.ts/.tsx`**,
   which indicts **tree-sitter TS/TSX grammar gaps**, not the "Next.js/JSX indirection" I asserted.
5. **⚠ Hazard: the WCS scan swept 5 files from `.n8n-backups/`** — untracked but **NOT gitignored**
   (`git check-ignore` exits 1), including a Slack Q&A backup and n8n node/connection dumps. Harmless under
   local AST; they become **model input** the moment a semantic pass runs. **Add a `.graphifyignore` before
   any non-code-only run.** (`.env` was correctly excluded.)
6. **⚠ Tool defect worth reporting upstream:** `built_at_commit` is stamped from the **CWD's** repo, not the
   analyzed repo — both graphs recorded waypoint-core-system's HEAD, so BIP's is wrong. Silently breaks any
   staleness/incremental check built on it.
7. **⚠ Minor overstatements:** "correctly surfaced the whole approval path" — true and verified against
   `audit.py`/`approval.py`/`identity_resolution.py`, but **~29% (11 of 38) of that neighborhood is INFERRED
   false positives**, correctly scored 0.5. Always filter on `confidence`. Also file counts were loose:
   "112 Python files" = 95 `.py` + 14 `.json` + 2 `.sh` + 1 `.toml`; "216 TS files" = 98 `.ts` + 83 `.tsx` +
   17 `.mjs` + json/sql/py. And the `benchmark` critique was stated too confidently — `BENCHMARKS.md`
   *does* cite a grep-and-read baseline (70.8% → 82.0%), so "it only baselines against the whole corpus" is
   not established for the tool as a whole.
8. **Scope (disclosed, not misrepresented):** 2 of the 3 agreed trial steps ran. **Step 3 (Obsidian export
   against a COPY of the Gravity Claw vault) was not attempted**, and **`graphify-mcp` was installed but
   never exercised** — so "leave it usable" is unmet. Uninstall path is documented.

**Net:** measurements trustworthy, artifacts clean, repos untouched — but 15a's *conclusions* needed the two
retractions above. Memory (`graphify-adopt-candidate`) has been rewritten to match.

#### 15c. graphify — BRAND-GRAPH PILOT, in progress (2026-08-02) — BLOCKED on semantic backend
Kelsey authorized brand data through Anthropic ("it's public data") and required the RAG store not be put at risk.

**RAG store safety — verified, three times.** Fingerprinted `var/brand_rag.sqlite` (sha256 `d6b2e9e1…`,
37,027,840 bytes) BEFORE anything; copied it; worked **only** from the copy, opened read-only
(`file:…?mode=ro`). Original re-verified byte-identical after the copy and again after corpus extraction.
Store is not in WAL mode and no `-wal`/`-shm`/`-journal` siblings were created. **The original was never
opened by any sqlite connection.**

**Corpus built (local, no Drive, no credentials):** 14 brands / 1,272 passages / 1.4MB, reconstructed from
`chunks` (`ORDER BY source_id, ordinal`). Chosen to make the test **falsifiable**: 10 home/property-service
brands that *should* cluster (Puddle-Pools, Liqua-Roof, Waterloo-Turf, Techtron, Roof-Scientist,
Joshua-Tree-Experts, Renew-Medic, Property-Sellwise, Voda-Cleaning-Restoration, Service-Experts) + 4
contrast brands that should *not* (Marigold-Academy, Skin-Experts-by-Brentwood-Spa, The-Fashion-Class,
Building-Kidz-School). Corpus is now **7,232 chunks / 263 brands / 581 sources** — the memory's
"~2,766 chunks / 236 brands" (June) is stale; it has ~2.6x'd.

**⚠ PIPELINE FINDING, independent of graphify — the `financial` column is not a reliable compliance filter.**
It is per-passage (48% of sources contain both values), but noisy in **both** directions: **21.7%** of
`financial=1` passages (803) contain no money/fee/revenue language at all — verified samples include
ideal-candidate traits, training descriptions and a discovery-day agenda — while **25.3%** of `financial=0`
passages (894) *do* contain money language. **I therefore did NOT use it as the pilot filter**: it would
have deleted 51% of the corpus without achieving compliance. If anything downstream treats `financial` as
an FTC/FDD gate, that gate is leaky. Worth its own look.

**🚫 BLOCKED — semantic backend unavailable.** Two paths tried, both measured, neither usable:
- `--backend claude-cli` (needs no API key; routes through the local Claude Code CLI) → fails. Root cause
  diagnosed: **the `claude` CLI's OAuth session is expired** — `echo "say OK" | claude -p` returns
  *"Failed to authenticate: OAuth session expired and could not be refreshed."* **Kelsey must re-authenticate
  the CLI**; this is unrelated to graphify and would bite him in any terminal.
- `--backend ollama --model qwen2.5:7b` (local, free) → needed `pipx inject graphifyy openai` (done), then
  **timed out at 10 minutes on 2 files**. Extrapolates to hours for 1.4MB. Not viable at this scale, and a 7B
  extractor would make a negative result inconclusive anyway.

**Thesis probe run WITHOUT an LLM (grep), and the result matters more than the tool.** Hypothesis: cluster
brands share a **parent franchisor platform** — a true relationship that is *not* a BrandDB column and *not*
retrievable by RAG similarity. Grep found apparent hits (Neighborly→Roof-Scientist+Service-Experts,
Authority Brands→Voda, Horsepower→Waterloo-Turf). **On verification all four were FALSE:**
- Roof-Scientist/Neighborly = *positioning against* ("PE is buying these businesses **from** neighborly").
- Service-Experts/Neighborly = **executive provenance** ("brought on a VP of operations **from** Neighborly").
- Voda/Authority Brands = **candidate competition** ("people from authority brands looking at us instead").
- Waterloo-Turf/Horsepower = pure incidental chatter on a multi-brand call ("anybody go into the horsepower
  brands discovery day?").

**The sharpest result of the pilot so far: I made precisely the error an automatic extractor makes** —
inferring a relation from co-occurrence. That reframes the real question. The corpus *does* contain valuable
non-obvious relations (executive/talent flow between franchise systems, competitive candidate sets, PE-rollup
market narrative) — none of which are BrandDB columns. But the test is no longer "can graphify find edges";
it is **"can graphify tell `hired FROM Neighborly` apart from `is part of Neighborly`"** — i.e. is its
`confidence` EXTRACTED/INFERRED scoring good enough to stop a false ownership edge reaching the matcher. A
wrong edge here would be worse than no graph, because it would look authoritative.

Also confirmed: the corpus is heavily **transcript**-derived (speaker labels, timestamps), consistent with
[[parser-data-priority-over-brand-pdfs]].

**Next:** re-auth the `claude` CLI, then re-run `graphify extract <corpus> --backend claude-cli`. Judge
against the sharpened criterion above, not the original one.

#### 15d. Brand-graph pilot — RESULT: thesis CONFIRMED, but it points AWAY from graphify (2026-08-02)

**`--backend claude-cli` is architecturally unusable from inside a Claude Code session** — not an auth
problem, and not fixable by re-authenticating. `/usr/local/bin/claude` states it plainly: *"Claude Code
cannot be launched inside another Claude Code session. Nested sessions share runtime resources and will
crash all active sessions."* graphify's claude-cli backend spawns exactly that. The Desktop-bundled binary
also fails standalone (its auth is refreshed by the *host*, per `CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH=1`).
Ollama/qwen2.5:7b was measured non-viable (10-min timeout on 2 files). **So the pilot was completed by doing
the extraction analytically instead — which answered the more important question anyway.**

**THESIS: CONFIRMED.** The corpus contains high-value relations that are **neither a BrandDB column nor
retrievable by RAG similarity** — verified against source text, not inferred from co-occurrence:
- **Portfolio membership:** Roof-Scientist ∈ **HomeFront Brands** — *"launching my first brand here at
  Homefront"*, *"Roof Scientist... and all the other Homefront Brands."*
- **Sibling-brand / spin-out lineage with shared IP:** **Liqua-Roof ⟵ SprayNet**, under a purpose-built
  parent **Ovation Brands** — *"some of you know me from SprayNet… we started a new parent company just so
  we can host [Liqua-Roof]… called Ovation Brands"*, *"both of our brands have proprietary chemistry"*,
  *"140 units at SprayNet… we've actually been building [Liqua-Roof] since 2016."* For a candidate, "this is
  a spin-out of an established 140-unit system sharing proprietary IP" is materially decision-relevant and
  appears in **no structured field**.
- **Executive provenance:** Service-Experts hired a VP of Ops *from* Neighborly; Liqua-Roof's CEO came *from*
  SprayNet. **Competitive sets:** Voda vs Authority Brands *for the same candidates*. **Founder history:**
  Voda's founder's prior company was PE-acquired 2016–2022.

**PRECISION PROBLEM: CONFIRMED AND SEVERE — this is the real finding.** The same trigger phrase yields a
true edge and a nonsense one:
- *"backed by"* → **real parent** (Roof-Scientist / HomeFront Brands) vs **a warranty**
  (Service-Experts: *"jobs are backed by a first year satisfaction guarantee"*). Naive extraction emits
  `Service-Experts —backed_by→ satisfaction guarantee`.
- *"Homefront"* → the **parent company** and **Operation Homefront, a veterans charity**, in the *same
  document*.
- *"from Neighborly"* → **hired-from**, not **owned-by** (the error I made myself before verifying).
- **ASR noise:** transcripts render Liqua-Roof as *"liquor roof"* — an extractor would create two entities.
- **Multi-brand call chatter** manufactures co-occurrence (Waterloo-Turf ↔ Horsepower Brands was a
  participant asking about someone else's discovery day).
~40% of relation-bearing hits were traps of this kind.

**Verdict — the payload is real, but graphify is likely the wrong vehicle for it.** These traps are
*franchise-domain-specific*, and the cost of a false edge is high: a wrong `part_of` reaching the matcher
would look authoritative and mislead a candidate. That argues for a **typed, domain-specific extraction pass
with an explicit relation vocabulary** (`parent_platform`, `sibling_brand`, `spun_out_of`,
`exec_hired_from`, `competes_with`, `founder_prior_company`) — which belongs in
**brand-intelligence-pipeline**, next to the existing transcript-extractor skills, **not** in a generic
code/doc graph tool. graphify's contribution here was diagnostic: it forced the question and its
EXTRACTED/INFERRED model is the right idea, but generic extraction is not precise enough for this domain.

**graphify's standing is unchanged from 15a/15b:** genuinely good for **code** comprehension (strong on
Python, ~3.7x weaker on TS). It is the brand-relationship *application* that is now redirected.

#### 15e. CORRECTIONS to 15c/15d after adversarial review (2026-08-02) — two of my claims were FALSE
A fresh reviewer re-derived everything from source. **RAG-store safety re-verified independently and holds
with no caveats** (sha256 matches, mtime unchanged and predating the session, copy byte-identical, no
WAL/journal anywhere). **Corpus counts exact** (7,232/263/581; the 14 brands sum to 1,272 precisely).
**The headline relationships hold verbatim** — and the reviewer explicitly confirms I did *not* repeat the
earlier co-occurrence error. Three claims must be corrected:

1. **✗ RETRACTED — "claude-cli is architecturally unusable inside a Claude Code session."** FALSE, and it
   overturned a diagnosis that was right. I quoted the nested-session refusal from **`/usr/local/bin/claude`
   (v2.1.74)** — but that is **not the binary graphify invokes**. `llm.py:1443` sets `claude_cmd = "claude"`
   bare, which PATH-resolves to **`~/.npm-global/bin/claude` (v2.1.220)** — first on PATH. **Verified: the
   guard string does not exist in that binary** (`grep -ac "cannot be launched inside another"` → **0**), and
   running graphify's exact invocation against it returns the **OAuth expiry**, not a nesting refusal. (Even
   in 2.1.74 the guard is a single `CLAUDECODE` env check with two exemptions.) **The original 15c ask was
   correct: the standalone npm CLI needs authenticating.** Kelsey's "completed auth" evidently applied to
   Claude Desktop, which holds separate credentials and refreshes via its host
   (`CLAUDE_CODE_SDK_HAS_HOST_AUTH_REFRESH=1`). **The pilot's central test is NOT blocked.** Fix: run
   `claude` in a real Terminal (outside any Claude Code session) and complete `/login`. Kelsey's own
   [[npm-global-prefix-trap]] memory documents exactly this two-install hazard — I walked into it.
2. **✗ RETRACTED — the `financial` "leaky compliance gate" finding. There is no leak; I flagged a working
   FTC control as broken.** `src/bip/compliance.py:130` states the intent: *"True if the text contains
   **earnings/FTC-sensitive** content. **AGGRESSIVE by design** (this gates the default store exclusion —
   over-tagging is safe, a missed tag is an FTC leak)."* It targets **Item-19 earnings claims, not "money
   language."** `tests/test_compliance.py:45` asserts the opposite of my premise:
   `assert not has_financial("Total investment is $150,000 to open a unit.")` — investment/fee figures are
   `financial=0` **deliberately**, and that accounts for most of my "25.3% false negatives." Over-tagging
   (my 21.7%) is the **documented safe direction**. Reviewer ran the rigorous test — stored tag vs the gate's
   own `has_financial()` across all 7,232 chunks: **0.00% disagreement in both directions.** My regex was a
   bad operationalization, and its exact numbers aren't even reproducible (three reasonable regexes give
   38.0% / 18.7% / 11.8%). **Excluding `financial` from the pilot corpus remains the right call, but for the
   opposite reason: those passages are deliberately excluded from the store by an FTC firewall that works.**
3. **⚠ RE-GROUNDED — the "graphify is the wrong vehicle" verdict was argued from the wrong evidence, but is
   correct on better evidence.** My "~40% of hits were traps" measured **my own grep's** precision, not
   graphify's — the semantic pass never produced a single edge (`smoke-out/.../cache/semantic/` is empty), so
   I had no graphify output to judge. **The 40% figure has no denominator and is withdrawn.** The sound
   argument, verified at `llm.py:478`, is that graphify's relation vocabulary is **hard-coded and
   code-oriented**: `calls|implements|references|cites|conceptually_related_to|shares_data_with|
   semantically_similar_to`. There is **no `parent_of`, `spun_out_of`, `hired_from`, `competes_with`.** The
   best it could ever emit for Roof-Scientist→HomeFront Brands is `references` / `conceptually_related_to` —
   which *is* the pilot's KILL criterion ("relations mostly generic"). That is structural and needs no LLM
   run. **In fairness I was also unfair on precision:** `llm.py:455-457` defines a third confidence tier —
   *"AMBIGUOUS: uncertain — flag for review, do not omit"* — aimed at exactly the trap problem I described.
   It was never exercised, so "not precise enough for this domain" is **untested**, not established.
4. **⚠ Downgraded — Voda ↔ Authority Brands is AMBIGUOUS, not confirmed.** Sole support is lowercase
   *"people from authority brands"* in an ASR transcript that elsewhere garbles Liqua-Roof→"liquor roof",
   Voda→"Vota", FranChoice→"Franchois". Whether it names the platform **Authority Brands** or means "brands
   with authority" is unresolvable from the text — my own trap category.
5. **⚠ Detail fix:** Voda's founder *built* the prior company 2016→2022; it was **acquired May 2022**.
   "PE-acquired 2016–2022" conflated the build window with the acquisition.

**Net:** the thesis result stands (Roof-Scientist ∈ HomeFront Brands; Liqua-Roof ⟵ SprayNet under Ovation
Brands, shared chemistry, incubated since 2016 — verified, corroborated by the brands' own one-sheets), and
the recommendation of a **typed domain-specific extraction pass** in brand-intelligence-pipeline survives and
is *strengthened* by the closed-vocabulary finding. But it should be adopted on that evidence — and ideally
after the claude-cli run I wrongly declared impossible either confirms or refutes it.

#### 15f. THE FIX WORKS — one-line vocabulary patch converts graphify into a usable franchise-relationship extractor (2026-08-02)
CLI authenticated (Kelsey ran `/login` on the standalone npm CLI — confirming 15e: it was auth, never
architecture). Semantic pass then ran successfully via `--backend claude-cli`.

**Controlled experiment — same 2 files (Puddle-Pools, Roof-Scientist), same model, ONE variable changed.**
Patched `llm.py` in the pipx venv: (1) extended the hard-coded relation vocabulary with 8 domain relations,
(2) added a `RELATION SPECIFICITY` rule instructing "most specific relation the source supports; use
`references` only when none applies", with explicit anti-trap guidance ("hired a VP from Neighborly is
exec_hired_from, NOT parent_platform"; "backed by a satisfaction guarantee is a warranty — emit no edge").
Backup at `llm.py.orig-backup`; revert = `cp llm.py.orig-backup llm.py` or `pipx uninstall graphifyy`.
`validate.py` has **no relation whitelist** (only requires the field), so new types pass unmodified.

| | BASELINE (stock) | PATCHED |
|---|---|---|
| edges | 93 | 57 |
| `references` (generic) | **63 (68%)** | **25 (44%)** |
| domain-typed edges | **0** | **27 (47%)** |
| tokens in/out | 210k / 38.7k | 95k / 17.3k |

Emitted: `sibling_brand` 8, `exec_hired_from` 8, `integrates_with` 5, `parent_platform` 2,
`founder_prior_company` 2, `competes_with` 1, `acquired_by` 1.

**Quality — spot-verified against corpus source, NOT taken on trust:**
- `Roof Scientist —parent_platform→ HomeFront Brands` ✓ (already verified in 15d)
- `Puddle Pool Services —parent_platform→ Feels Like Friday Service Brands` ✓ **NEW** —
  *"Majority of Funds in Canadian Parent Company (Feels Like Friday Service Brands)."*
- `Puddle Pool Services —sibling_brand→` All-Pro Pest Control / Vancouver Bed Bug Control / Gorilla Property
  Services / Toodaloo Pest Control ✓ **NEW** — *"Founded and grown 5 Home Service based brands: …"* (all 4
  correct, Puddle is the 5th). Plus the 4 HFB siblings (TWS, The Designery, Top Rail Fence, Window Hero).
- `Michael Wagner (President, Roof Scientist) —exec_hired_from→ Buzz Franchise Brands / Pool Scouts` ✓ —
  *"cut his teeth at Buzz Brands, building out Pool Scouts."*

**It passed the trap test that motivated this whole pilot.** The same entity, **Pool Scouts**, is typed two
different ways in the same graph: `Puddle Pool Services —competes_with→ Pool Scouts` and
`Michael Wagner —exec_hired_from→ Pool Scouts`. It did **not** collapse talent flow into ownership — the
exact error I made by hand in 15c. Confidence tiers are also used discriminatingly: `Jeff Dudan
—founder_prior_company→ AdvantaClean` is marked **AMBIGUOUS**, the two pool-supply distributors AMBIGUOUS,
`O'Driscoll → Citibank` INFERRED.

**Verdict change — 15d's "wrong vehicle" is SUPERSEDED.** The defect was never the extraction model; it was
one hard-coded string. graphify's entity extraction on franchise transcripts is strong (it typed roles
inline — "(Platform Franchisor)", "(Sister HFB Brand)", "(HFB CFO)" — and, notably, did *not* fall for the
Operation Homefront charity trap my grep did). **Recommended path is now: fork/patch graphify's relation
vocabulary rather than build a typed extractor from scratch.** That inherits its entity typing, three-tier
confidence, provenance and chunking for a ~15-line diff.

**Caveats:** patched output had ~39% fewer edges (57 vs 93) — partly the specificity rule suppressing
low-value generic edges, partly LLM run-to-run variance; single trial, not measured. Cross-brand edges can
only form **within an extraction chunk** (default token budget 60k), so brands in different chunks cannot
link — a structural limit for portfolio-wide graphs. Full 14-brand run in progress to test this at scale.

#### 15g. FULL 14-BRAND RUN with patched vocabulary — scale result + the one real limitation (2026-08-02)
`graphify extract corpus/ --backend claude-cli --force` → **367 nodes / 365 edges / 42 communities**,
22m36s, **1,334,150 in / 160,617 out** tokens (subscription-routed via claude-cli, so no API charge).

**Typing holds at scale — better than the 2-file smoke test.**

| | smoke (2 brands) | FULL (14 brands) |
|---|---|---|
| domain-typed edges | 27/57 = 47% | **188/365 = 52%** |
| confidence | — | EXTRACTED 316 (87%) · INFERRED 26 · AMBIGUOUS 23 |

All 8 patched relations fired: `integrates_with` 38, `competes_with` 37, `exec_hired_from` 37,
`founder_prior_company` 29, `parent_platform` 21, `sibling_brand` 16, `spun_out_of` 7, `acquired_by` 3.
Generic `references` fell to 155/365 (42%). Within-file entity dedup works well and merges label variants
sensibly (e.g. "Tim Lovett (Co-Founder & CEO)" ← "Tim Lovett (CEO, Waterloo Turf)").

**⚠ THE REAL LIMITATION — cross-brand linking fails out of the box.** Only **11 of 365 edges (3%)** cross a
brand boundary, and most are artifacts rather than genuine brand↔brand relations. **Root cause verified: node
IDs are namespaced by source file**, so a shared entity becomes N disconnected nodes:
```
building_kidz_school_franchoice · joshua_tree_experts_franchoice · property_sellwise_franchoice
renew_medic_franchoice · roof_scientist_franchoice · service_experts_franchoice
techtron_franchoice · waterloo_turf_franchoice        ← ONE entity, EIGHT nodes
```
12 labels are fragmented this way (FranChoice ×8, Franchise Fastlane ×3, ServiceMaster ×3, ServPro ×3,
PuroClean, Paul Davis, Pool Scouts, QuickBooks, REPM Group ×2 each). One even produced
`Franchise Fastlane —semantically_similar_to→ Franchise Fastlane` — the graph linking an entity to itself
across files. **Consequence: the graph cannot answer "which brands compete with ServPro?" or "which brands
are on Franchise Fastlane?"** — precisely the portfolio-level questions that motivated the thesis.
This is a deliberate design (namespacing prevents false merges across unrelated repos), not a bug — but it
means a **post-processing entity-resolution pass (merge on normalised label, ~20 lines) is required** for a
portfolio graph. It is graph surgery, no LLM, cheap.

**Net recommendation — supersedes 15d entirely.** graphify + **~15-line vocabulary patch** + **~20-line
cross-file entity merge** = a working franchise relationship graph. That is a far smaller build than the
from-scratch typed extractor 15d proposed, and it inherits entity typing, three-tier confidence, provenance,
chunking and dedup. **Per-brand extraction quality is excellent and verified; only the cross-brand join is
missing.**

**RAG store: verified byte-identical one final time** after all runs (`shasum -c` → OK). It was never opened
by any sqlite connection; every operation used the checksummed copy.

#### 15h. ARTIFACTS + STATE (close-out 2026-08-02)
- **Vocabulary patch saved:** `.claude/graphify-franchise-vocab.patch` (31 lines, verified to apply cleanly
  against pristine `llm.py`). Regenerate the patched state with
  `patch -p0 <venv>/graphify/llm.py < .claude/graphify-franchise-vocab.patch`.
- **Live install is PATCHED:** `~/.local/pipx/venvs/graphifyy/.../graphify/llm.py`, with
  `llm.py.orig-backup` beside it. ⚠ `pipx upgrade` silently discards the patch — re-apply from the file.
- **Graph artifacts are in the session scratchpad and are EPHEMERAL** (`brandgraph/full-typed/graphify-out/`
  — graph.json, graph.html, GRAPH_REPORT.md; plus `brandgraph/corpus/` 14 brand .md files and the
  `rag-copy.sqlite`). Regenerable in ~23 min from the RAG store; not preserved.
- **Nothing was committed or pushed this session, correctly:** both `waypoint-core-system` and
  `brand-intelligence-pipeline` working trees contain only changes that pre-date this session
  (`.n8n-backups/`, `.skill-edits/`; `M config/_aliases.json`, an untracked doc). All of this session's
  output landed in `.claude/` (**gitignored**, `.gitignore:48`) and in the memory dir (outside any repo).
- ⚠ **Consequence: this evaluation record and the patch are LOCAL TO THIS MAC ONLY** — they will not reach
  the Mac Mini or a fresh clone. If cross-machine durability is wanted, they need a home in a tracked repo.
- **ADVERSARIAL REVIEW OF 15f/15g WAS NOT RUN** (session redirected to close-out). The 52% typed figure, the
  "quality is excellent" judgement, the 93→57 edge drop (patch effect vs run-to-run variance — single trial,
  unmeasured), and the "~20-line merge" estimate are all **unreviewed**.
- **Corpus is now reproducible:** `.claude/rebuild-brand-corpus.py` (tested — regenerates all 14 brand files,
  1,272 passages, **byte-identical** to the originals; embeds the mandatory fingerprint→copy→read-only→
  re-verify safety pattern). This closes the gap where the pilot corpus existed only in ephemeral scratchpad.
