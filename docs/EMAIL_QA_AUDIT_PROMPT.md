# Cold Email QA Audit — Session Prompt
**Project:** Waypoint Franchise Advisors — Cold Email Pipeline  
**Repo:** https://github.com/Franscale1922/waypoint-core-system  
**Admin dashboard:** https://waypointfranchise.com/admin/leads *(requires Google login — Kelsey's account)*  
**Local path:** `/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system`

> [!IMPORTANT]
> **Standing rule: push to GitHub after every code change.**  
> Any time you modify a file in the repo during this session, immediately run:  
> `cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system" && git add <file> && git commit -m "<description>" && git push origin main`  
> Do not batch multiple changes into one commit — push after each individual fix.

---

## STEP 1 — Load these resources BEFORE doing any review

Read all of the following files in full before evaluating a single email. They contain the exact rules you will score against.

```
/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/docs/VOICE_GUIDE.md
/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/src/lib/templates.ts
/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/src/inngest/functions.ts  (lines 229–360 — the personalizerProcess function)
/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system/docs/COLD_EMAIL_STACK.md  (§5 Personalization section)
```

Key items to internalize from those files before you start:
- The full `VOICE_RULES` constant (templates.ts lines 27–83)
- The full `PROHIBITED_PHRASES` list (templates.ts lines 85–138)
- The 7 email templates A–G (templates.ts lines 154–197)
- The signal quality gate keyword list (functions.ts — `NON_CAREER_SIGNAL_KEYWORDS`)
- The Priority A/B/C signal hierarchy and fallback logic
- The FINAL CHECK self-scan logic the AI is supposed to run

---

## STEP 2 — Understand the signal hierarchy

Emails are generated using a 3-tier signal cascade:

| Priority | Source | When used |
|---|---|---|
| **A** | Company news event (WARN Act, SEC 8-K, reorg, layoffs) | Always preferred if populated |
| **B** | LinkedIn post paraphrase (topic only — never verbatim) | Only if post passes the career signal gate |
| **C** | ICP role-level golden handcuffs narrative | Fallback — no fabricated hooks allowed |

**Signal quality gate (Priority B)** — a LinkedIn post is REJECTED and falls to Priority C if it contains any of these topic types:
- Political/government content: elections, White House, congress, administration, tariffs, policy, trump, biden, harris, sanctions, geopolitics
- Charity/CSR: volunteer, nonprofit, donate, fundraiser, haven house, women in construction/stem/tech
- Purely operational/technical: video issues, bug fixes, server issues, merged PRs, rendering/editing/footage/upload posts

---

## STEP 3 — Know the exact evaluation criteria

For each email you review, check ALL of the following:

### Structure
- [ ] Opens with the signal — NOT with a greeting, compliment, or "Hi [name]" as the first sentence content
- [ ] Word count is 50–90 words (the code target) / 70–140 words (the voice guide target)
- [ ] Exactly one CTA — low pressure only
- [ ] Closes with warmth, no urgency
- [ ] Plain text — no bullet points, bold, or markdown inside the email

### Signal quality
- [ ] If Priority A is shown — the email opens from the company news, not the LinkedIn post
- [ ] If Priority B is shown — verify the post topic is career-relevant (not political/charity/operational)
- [ ] If Priority C — the email opens with a universal career truth, NOT a fabricated industry hook or excited opener ("Exciting times in...", "Impressive work at...")

### Voice & prohibited phrases
Check every word against this list — **any match is a fail**:
> I hope this email finds you well, I came across your profile, I'm reaching out because, I noticed, I saw your, Congratulations on, just touching base, checking in, touching base, hope you're having a great, in today's world, at the end of the day, cutting-edge, leverage, solutions, synergy, paradigm, delve, navigating, testament, realm, tapestry, foster, catalyst, Moreover, Furthermore, It is worth noting, I've been following, I've been watching, based in, located in, years of experience, you've been at, I see you went to, your alma mater, I'd love to, I would love to, amazing, incredible, fantastic, excited to, thrilled to, hop on a call, find 15 minutes on your calendar, schedule a call, book a meeting, let's connect

### Hard blacklist (never in any email)
- [ ] No verbatim quotes from the prospect's posts
- [ ] No city/location/tenure references
- [ ] No passive LinkedIn activity references ("I saw you liked...")
- [ ] No inferred emotional states ("it seems like you're considering...")
- [ ] No em dashes (—)
- [ ] No exclamation points
- [ ] Not 3+ consecutive sentences starting with "I" or "Most"
- [ ] No franchise brand names, income claims, or financial projections

### Voice QC scanner (admin UI)
If reviewing from the admin dashboard — note whether the amber Voice QC warning banner fired and what phrase it flagged.

---

## STEP 4 — Specific leads to review (previously audited)

These 10 leads were reviewed in the previous QA session. Pull them first for before/after comparison:

| Lead name | Company | Known issue in prior audit |
|---|---|---|
| **Julie G** | Blue Shield of California | Was clean — re-verify Priority A signal used |
| **David Oliphant** | Optum | Was clean Priority B — re-verify |
| **Leo Biaggi** | Major League Soccer | **Previously failed** — political post ("White House") should now fall to Priority C |
| **Michael King** | Upperline Health | **Previously failed** — "paradigm" slipped through, Priority C fabricated hook |
| **Will Gamble** | JE Dunn Construction | **Previously failed** — "incredible" + women-in-construction post should now be Priority C |
| **Samantha Storey** | Essayem Creative | **Borderline** — video fix post should now gate to Priority C |
| **Nicole Kalafut** | PMC Commercial Interiors | Was clean Priority C — verify golden handcuffs narrative intact |
| **TJ Franco** | FORTNA | Was clean after GPT self-corrected "incredible" → "interesting" |
| **Joel Goodman** | Squiz | Was clean Priority B (AI hallucinations post) |
| **Gary Rumpp** | Goodwin Recruiting | **Previously failed** — "Exciting times in healthcare" fabricated opener |

After reviewing those 10, pick **5 additional leads from the middle/bottom of the list** for a broader sample.

---

## STEP 5 — How to navigate the admin dashboard

1. Go to **https://waypointfranchise.com/admin/leads**
2. Sign in with Google (Kelsey's account)
3. Click any lead row to open the detail page
4. Scroll to **"Generated Email"** section — the email body is above the dashed separator (`--`)
5. The CAN-SPAM footer is everything after the dashes — do NOT score it as part of the email
6. Check the amber banner at the top of the email block for Voice QC flags
7. Check "Priority A — Company News" and "Priority B — Recent Post" sections to see which signal was available and used

---

## STEP 6 — Report format

For each lead, report:

```
### [Lead Name] — [Company] — Score: [X]
Signal available: Priority A / Priority B / Priority C (no signal)
Signal used: [What the email actually opened with]
Signal gate result: [Pass / Fail — if B was used, was the post career-relevant?]
Word count: [X]
Voice QC flag: [None / "phrase flagged"]
Prohibited phrase check: [Pass / Fail — list any matches]
Priority C fabrication check: [N/A / Pass / Fail]
Structure check: [Pass / Fail — note any issues]
Overall verdict: ✅ Send / ⚠️ Borderline / ❌ Regenerate
Notes: [Any specific observations]
```

At the end, provide:
- Total pass/borderline/fail count
- Root cause patterns for any failures
- Specific code or prompt fix recommendations if needed

---

## Context notes for the reviewing agent

- The pipeline runs: Clay enrichment → Google Sheets → Apps Script → `/api/webhooks/clay` → `leadHunterProcess` (scoring) → `personalizerProcess` (GPT-4o) → status = SEQUENCED
- The code for prohibited phrase guarding after this session: after GPT generates text, the server scans for any prohibited phrase and retries with an explicit note if found (`hitPhrase` returned in Inngest step output)
- The `warmupScheduler` fires Mon–Fri 8 AM MT, sends 15 leads/day to Instantly → campaign → SENT
- INSTANTLY_API_KEY is now set in Vercel environment variables (set March 21, 2026)
- All 178 SEQUENCED leads were regenerated March 21, 2026 after this round of prompt improvements
- The admin dashboard at `waypointfranchise.com/admin/leads` is part of the same Next.js app (not a separate project) — it uses the same database as the pipeline
