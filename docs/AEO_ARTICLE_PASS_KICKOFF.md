# Kickoff: Article AEO Pass, Template Build-Out, and Queue

> **For the AI agent starting the fresh chat:** read this entire document first, then read the files it points to (especially `content/CONTENT-STANDARDS.md`). It contains everything you need to do this work well without prior conversation context. Start by re-running `npm run aeo-audit` to get the current state, then work Phase A → B → C in order. Confirm the question-H2 style with Kelsey on one article before doing a mass pass.

---

## 1. Project context (what this is)

- **Business:** Waypoint Franchise Advisors — a free, no-pitch franchise consulting/matching service. Founder: **Kelsey Stuart** (former Bloomin' Blinds franchisor who grew it to $40M / 200+ locations, and a former franchisee who lost money). Conversion goal: book a free 30-minute discovery call. Brands pay a referral fee; candidates pay nothing.
- **The website IS this repo.** `waypoint-core-system` is a single Next.js 16 monolith deployed to Vercel. The public site lives in `src/app/(marketing)`, and the 41 published articles are MDX files in `content/articles/`. There is no separate website repo.
- **Deploy model:** pushing to `main` auto-deploys to Vercel production, and `notify-google-on-deploy.yml` pings Google's Indexing API. So **commit + push to main = deploy.** Only commit/push when Kelsey asks.
- **Why this work:** Google's post-I/O-2026 shift to AI answers (AI Overviews, AI Mode, Information Agents). The goal is for Waypoint to be the **cited, trusted entity** AI engines surface, not just a ranked page.

---

## 2. What is already DONE and LIVE (do not redo)

An AEO/GEO modernization shipped in three commits (`85c38bd`, `f0f5a7a`, `d5eecc4`). The site was already strong on AEO fundamentals before that. **Already in place — build on it, don't rebuild:**

- Per-article `Article` + `FAQPage` (from `faqs:` frontmatter) + `BreadcrumbList` schema; site-wide `LocalBusiness`/`Service`/`Person` schema with `image[]` and a `ReserveAction` (book-a-call). All in `src/app/lib/structured-data.ts` and `src/app/(marketing)/resources/[slug]/page.tsx`.
- `/about` video has `VideoObject` schema (real Vimeo metadata, timezone-qualified `uploadDate`) + a crawlable transcript via `VimeoFacade`.
- Agent-friendly forms (labels/ARIA) and a crawlable `/book` fallback link.
- `scripts/ai-citation-check.mjs` upgraded to tracked-set **AI Share-of-Voice**; runs monthly via `.github/workflows/monthly-seo-review.yml`.
- **Citation Magnet report** at `/reports/franchise-matching-2026` (linked from `/resources`).
- `content/CONTENT-STANDARDS.md` **Section 13** (non-commodity content) and `docs/OFFSITE_DISTRIBUTION.md` (off-site SOP) are new. `docs/SEO_GEO_PLAYBOOK.md` has the full phase status.

---

## 3. Hard constraints — every edit must comply (`content/CONTENT-STANDARDS.md`)

These are non-negotiable. Read the full standards doc, but the hard rules are:

1. **No franchise brand names** anywhere in body, headings, excerpt, FAQs, or metadata (Kelsey's own former company "Bloomin' Blinds" is the only allowed proper-noun, as his credential).
2. **No profitability / earnings claims** of any kind (break-even, ROI, net/gross profit, income, "lucrative," etc.). Investment and revenue **ranges** are allowed.
3. **No FDD item numbers** in articles (use plain-language equivalents). Exception: `fdd-decoded-what-actually-matters.md`.
4. **No em dashes (—)** anywhere in public copy. Use colons/periods/commas. Verify with `grep -c "—" file.md` = 0.
5. **Date-qualify** time-sensitive facts inline ("as of 2026"): investment ranges, financing terms, counts, third-party stats.
6. **Non-commodity (Section 13):** every article's core must pass the commodity test — could a competitor write it by reading other sites? If yes, replace with Kelsey's first-hand judgment, an aggregate pattern, or a named framework.
7. Preserve Kelsey's direct, honest, no-pitch voice (`docs/VOICE_GUIDE.md`, `docs/BRAND_VOICE.md`).

---

## 4. Current audit snapshot (re-run `npm run aeo-audit` for live state)

As of this writing, across 41 articles:

- **Strong / no action:** FAQ blocks present on **41/41** (all 4+ Q) → all emit `FAQPage` schema. `relatedSlugs` = 3 on **41/41**.
- **Defect (fix):** **Em dashes in 6 articles** (violates rule #4): `how-franchise-funding-actually-works` (12), `sba-loan-vs-robs-franchise-funding-comparison` (14), `should-you-buy-a-car-wash-franchise` (2), `understanding-franchise-royalties-what-youre-paying-for` (1), `weight-loss-franchises` (2), `what-to-expect-at-discovery-day` (2).
- **Biggest opportunity:** **37/41 articles have zero question-format H2s.** Standard allows "questions or clear descriptors," and FAQ blocks already cover question-extraction, so this is an enhancement, not a violation. Converting 2–3 key body H2s per article into the buyer's actual search question is the highest-leverage content change.
- **Date qualifiers:** present in only 18/41 — add to the money/financing articles missing them.
- **Long lead (>320 chars), answer may be buried:** 8 articles — `b2b-franchise-opportunities-lower-risk-steadier-cash`, `maid-and-residential-cleaning-franchises`, `mosquito-control-franchises`, `pet-care-franchise-built-on-unconditional-demand`, `pilates-franchises`, `property-management-franchises`, `senior-care-franchise-is-it-right-for-you`, `weight-loss-franchises`.
- **Thin (<900 words):** 18 articles, mostly industry spotlights. **Do not pad for volume** (Google penalizes this). Only deepen with genuine non-commodity depth.

---

## 5. The work, in order

### Phase A — Article AEO pass (do first)

- **A1. Em dashes (quick, unambiguous):** fix the 6 files above. Replace each `—` per Section 11 guidance (colon / period / comma + conjunction). Verify `grep -c "—"` = 0 each. Re-run `npm run aeo-audit`.
- **A2. Question-format H2s (highest leverage; CONFIRM STYLE FIRST):** Before a mass pass, do ONE article (suggest `how-franchise-funding-actually-works`) and show Kelsey a before/after so he approves the voice. Then apply to the ~10 highest-intent articles first: funding, true cost, ROI-math, consultant, semi-absentee, FDD-decoded, the comparison pieces (sba-vs-robs, big-name-vs-emerging, fitness, asset-light-vs-capital-heavy). Convert/duplicate 2–3 body H2s into the actual question a buyer searches.
  - Example: `"The Full Funding Picture"` → `"How much cash do you actually need to fund a franchise?"`
  - Keep the answer in the first 1–2 sentences under each question heading (Island Test, Section 7). Do not turn every H2 into a question — only where a real query exists.
- **A3. Date qualifiers:** add "as of 2026" inline to dollar figures, SBA terms, and counts in the funding/cost/investment articles missing them.
- **A4. Front-loaded answers:** tighten the 8 long-lead articles so the direct answer lands in the first 1–2 sentences (consider a short bolded lead answer, like the Citation Magnet's "atomic summary").
- **A5. Thin spotlights (optional, selective):** only expand a spotlight if it is genuinely incomplete, and only with non-commodity depth (aggregate patterns, the owner's real week, characteristic-based framing). Never pad.

### Phase B — Build out the article template (after Phase A)

Goal: make every FUTURE article AEO-optimal by default so this pass never has to repeat.

- Audit and update the scaffolding: `content/new-article-checklist.md`, `.agents/workflows/new-article.md` (referenced by the queue), and the frontmatter template. Note the checklist's shown frontmatter template currently omits `faqs:` even though the standard requires a 4-question block — reconcile that.
- Bake in by default: required `faqs:` (4 Q, standalone answers), question-format H2 guidance, a front-loaded "atomic summary" lead, date-qualifier reminders, and an **optional** `video:` frontmatter field (the deferred per-article `VideoObject` capability — opt-in, never required).
- Consider a tiny "article skeleton" file or generator so a new article starts compliant.

### Phase C — Work the article queue (after Phase B)

- `content/ARTICLE-QUEUE.md` lists unwritten articles. Many are flagged `[~]` = **needs Kelsey interview / source docs** (his pattern observations, candidate-avatar docs). Those cannot be drafted cold without his input — schedule that input; do not fabricate his observations.
- Industry-spotlight items flagged `[ ]` can be drafted using the improved template + standards once a category is greenlit. **No brand names, no earnings**, characteristic-based framing, date-qualified.

---

## 6. Key files

| Purpose | Path |
|---|---|
| Content rules (read fully) | `content/CONTENT-STANDARDS.md` |
| Voice | `docs/VOICE_GUIDE.md`, `docs/BRAND_VOICE.md` |
| Articles | `content/articles/*.md` |
| Article render + per-article schema | `src/app/(marketing)/resources/[slug]/page.tsx` |
| All JSON-LD schema | `src/app/lib/structured-data.ts` |
| Audit script | `scripts/aeo-audit.mjs` (`npm run aeo-audit`) |
| New-article scaffolding | `content/new-article-checklist.md`, `.agents/workflows/new-article.md` |
| Article queue | `content/ARTICLE-QUEUE.md` |
| Strategy / phase status | `docs/SEO_GEO_PLAYBOOK.md` |
| Off-site distribution | `docs/OFFSITE_DISTRIBUTION.md` |

---

## 7. Workflow & verification

- **Preview locally:** `npm run dev` → http://localhost:3000. (Dev CSP already allows `unsafe-eval` in dev only; production CSP unchanged.) Do NOT run `npm run build` locally — it runs `prisma db push --accept-data-loss` against the database.
- **After edits, verify:** `npm run aeo-audit` (structure), `grep -c "—" <file>` = 0 (em dashes), `npm run test` (link check), and spot-check the rendered article at `localhost:3000/resources/<slug>` (FAQ schema, Keep Reading section, no broken MDX).
- **Schema:** after deploy, validate with Google's Rich Results Test on a sample article URL.
- **Commit only when Kelsey asks.** Commit messages end with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Deploy = push to `main`** (Vercel auto-deploys). Confirm the build in the Vercel dashboard.

---

## 8. Deferred / lower-priority (not part of this pass unless asked)

- Wiring the optional `video:` frontmatter through `resources/[slug]/page.tsx` to emit `VideoObject` (Phase B sets up the field; wiring can follow).
- Off-site repurpose automation (Inngest), GSC click-divergence flagging in `scripts/gsc-report.mjs`, an admin Share-of-Voice view.
- "As Heard On" press section — on hold until Waypoint has its own (non-Bloomin'-Blinds) coverage.
