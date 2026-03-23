# Waypoint Franchise Advisors — Core System

> **waypointfranchise.com** — Free franchise consulting from Kelsey Stuart, former franchisor. Built on Next.js 15, deployed on Vercel, operated from Whitefish, Montana.

---

## What This Is

This is the full codebase for the Waypoint Franchise Advisors web application — a marketing site, lead capture system, admin CRM, and content publishing platform, all in one Next.js app.

**What it does:**
- Public marketing site at `waypointfranchise.com` — homepage, about, process, FAQ, resources, scorecard quiz, glossary, investment guide, franchise map, checklists, and referral page
- Scorecard quiz with personalized score + email delivery via Resend
- Checklist lead magnet system with industry-specific PDFs and 5-email nurture sequence
- Admin dashboard for managing leads, reviewing AI-enriched cold email drafts, and approving outreach
- Cold email pipeline via Clay → Instantly with Waypoint CRM as the control plane
- Automated content refresh via Inngest (monthly cron rewrites stale articles)
- Automated Google indexing on every deploy via GitHub Actions

---

## Quick Links

| Document | Purpose |
|----------|---------|
| [`ROADMAP.md`](./ROADMAP.md) | Current sprint status, what's done, what's next |
| [`docs/LAUNCH.md`](./docs/LAUNCH.md) | **Complete new site launch runbook** — setup, env vars, SEO, OG images, indexing |
| [`docs/hosting-requirements.md`](./docs/hosting-requirements.md) | Hosting platform requirements and env var list |
| [`docs/GOOGLE_INDEXING_SETUP.md`](./docs/GOOGLE_INDEXING_SETUP.md) | One-time Google Indexing API setup |
| [`TECH_STACK.md`](./TECH_STACK.md) | Full tool and platform inventory |
| [`content/CONTENT-CALENDAR.md`](./content/CONTENT-CALENDAR.md) | Article publishing schedule |
| [`content/CONTENT-STANDARDS.md`](./content/CONTENT-STANDARDS.md) | Voice and writing rules for all content |
| [`docs/VOICE_GUIDE.md`](./docs/VOICE_GUIDE.md) | Kelsey's voice and tone reference |
| [`CRO_ROADMAP.md`](./CRO_ROADMAP.md) | Conversion rate optimization priorities |

---

## Deployment

**Branch:** `main` → auto-deploys to Vercel  
**Build command:** `prisma generate && prisma db push && next build`  
**Domain:** Managed via Cloudflare DNS → Vercel

For a full step-by-step launch of a new instance of this site, see **[`docs/LAUNCH.md`](./docs/LAUNCH.md)**.

---

## Local Development

```bash
npm install
cp .env.example .env   # fill in all required vars
npx prisma migrate dev
npm run dev
```

The dev server runs at `http://localhost:3000`.

> Note: Local dev uses SQLite. Production uses PostgreSQL (Neon recommended). See `docs/hosting-requirements.md` for the environment variable list.
