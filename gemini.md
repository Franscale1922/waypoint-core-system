# Waypoint Core System — Agent Context

> **For any AI agent or Antigravity session working in this repository.**
> Read this file first. It tells you where to find accurate, up-to-date documentation before touching any code.

---

## What This Repo Is

`waypoint-core-system` is the full-stack Next.js application powering **waypointfranchise.com** — Kelsey Stuart's franchise advisory business. It includes:
- The public marketing website
- The admin dashboard (lead management, scoring, email pipeline)
- All Inngest background functions (scoring, personalization, sending, reply handling, scheduling)
- All API routes (webhooks from Clay, Instantly, TidyCal; lead import; settings)

---

## Source-of-Truth Documents (Read Before Touching Code)

| Document | What it covers |
|---|---|
| [`docs/COLD_EMAIL_STACK.md`](docs/COLD_EMAIL_STACK.md) | **Primary reference.** Full pipeline, all tools, Inngest functions, Instantly setup, compliance, env vars. Read this first. |
| [`docs/VOICE_GUIDE.md`](docs/VOICE_GUIDE.md) | Email voice and tone rules. GPT-4o prompt standards. Prohibited phrases. |
| [`docs/EMAIL_QA_AUDIT_PROMPT.md`](docs/EMAIL_QA_AUDIT_PROMPT.md) | QA rubric for evaluating generated email quality. |
| [`TECH_STACK.md`](TECH_STACK.md) | All tools used across the business (not just cold email). |
| [`ROADMAP.md`](ROADMAP.md) | Current sprint priorities and feature backlog. |

---

## The Actual Cold Email Pipeline (Do Not Reference Old Docs)

```
1. Sales Navigator → Evaboot export (server-verified emails, safe tier only)
2. Admin dashboard → POST /api/leads → PENDING_CLAY status
3. Clay table (Evaboot CSV imported manually) → enrichment runs
4. Google Apps Script → fires on Clay export → POST /api/webhooks/clay
5. Clay webhook → Lead to RAW → Inngest: leadHunterProcess → scoring
6. Score ≥ 50 → ENRICHED → personalizerProcess → GPT-4o email → WARMING
7. warmupScheduler (8 AM MT Mon–Fri) → senderProcess → Instantly campaign → SENT
8. replyGuardianProcess → Resend + Slack HITL alert → Kelsey replies
9. tidycalBookingSync cron → BOOKED
```

**Tools NOT in use (do not reference these):**
- ❌ Apify — not subscribed, not used. `/api/webhooks/apify` is dead code.
- ❌ Hunter.io — not subscribed. `HUNTER_API_KEY` env var is a legacy artifact.
- ❌ Apollo.io — not subscribed. Evaluated March 2026, not purchased.
- ❌ Resend as outbound sender — Resend is for HITL alerts only. Instantly sends campaign emails.

---

## Key Env Vars (Set in Vercel)

| Var | Purpose |
|---|---|
| `CLAY_WEBHOOK_SECRET` | Authenticates Clay → `/api/webhooks/clay` (also set in Google Apps Script) |
| `INSTANTLY_API_KEY` | senderProcess calls Instantly v2 API |
| `INSTANTLY_CAMPAIGN_ID` | `e969de1c-e244-488a-8b29-6278f1ea39a2` |
| `INBOUND_WEBHOOK_SECRET` | Instantly inbound reply webhook auth |
| `OPENAI_API_KEY` | personalizerProcess + replyGuardianProcess |
| `RESEND_API_KEY` | HITL alert emails to kelsey@waypointfranchise.com |
| `TIDYCAL_API_KEY` | tidycalBookingSync cron |

---

## Admin Dashboard

Live at: `https://waypointfranchise.com/admin`

| Page | Purpose |
|---|---|
| `/admin` | Overview + funnel stats |
| `/admin/leads` | Full lead manager — status, score, draft email |
| `/admin/leads/[id]` | Lead detail — regenerate email, send now, view signals |
| `/admin/linkedin` | LinkedIn DM queue (SENT leads 5+ days, no reply) |
| `/admin/settings` | `maxSendsPerDay` (currently 35), API keys |

---

## Brand Knowledge Vault

The vault is the **first place to check** for any franchise brand data before doing independent research.

**GitHub**: `https://github.com/Franscale1922/obsidian-vault` (private)
**Local path**: `~/Projects/obsidian-vault/` (clone here on every machine)
**Protocols**: `_protocols/BRAND_INTAKE.md` and `_protocols/VAULT_RULES.md`

### Setup (New Machine)
```bash
cd ~/Projects && git clone git@github.com:Franscale1922/obsidian-vault.git
```

### Read a Brand (Always Do This First)
```bash
git -C ~/Projects/obsidian-vault pull
cat ~/Projects/obsidian-vault/Brands/[Brand\ Name]/[Brand\ Name].md
```
Load additional files (transcripts, fdd notes) only if the task requires them.

### Write to Vault
```bash
git -C ~/Projects/obsidian-vault pull          # ALWAYS pull first
# ... make changes ...
git -C ~/Projects/obsidian-vault add .
git -C ~/Projects/obsidian-vault commit -m "update(brand): [Brand Name] — [what changed]"
git -C ~/Projects/obsidian-vault push
```

### If Brand Has No Vault Folder
Run Workflow 1 from `~/Projects/obsidian-vault/_protocols/BRAND_INTAKE.md` to create it. Never skip this — all brand knowledge must be persisted.

---

## Important Pipeline Rules

- **PENDING_CLAY** is the entry status for all admin-imported leads. `pendingClayFallback` cron (7 AM MT Mon–Fri) advances stuck leads after 24h as a safety net.
- **Signal priority** in `personalizerProcess`: Priority A (companyNewsEvent, valid >10 chars and non-numeric) → Priority B (recentPostSummary, passes institutional gate) → Priority C (universal golden handcuffs — never fabricate company-specific claims).
- **Daily cap** is read from `SystemSettings.maxSendsPerDay` in DB (currently 35). Fallback default in code is 15 — update via `/admin/settings`, not in code.
- **Regenerate** resets SENT leads to SEQUENCED before re-running personalizerProcess.
