# Waypoint Franchise Advisors — New Site Launch Runbook

> **Last Updated:** March 2026  
> This is the authoritative step-by-step guide for launching a new instance of the Waypoint Franchise Advisors site, or re-deploying after major infrastructure changes. Every section reflects what is currently live and tested in production.

---

## Table of Contents

1. [Pre-Launch Checklist](#1-pre-launch-checklist)
2. [Repository & Deployment Setup](#2-repository--deployment-setup)
3. [Database Setup](#3-database-setup)
4. [Environment Variables](#4-environment-variables)
5. [Inngest Setup](#5-inngest-setup)
6. [Domain & DNS (Cloudflare)](#6-domain--dns-cloudflare)
7. [SEO Infrastructure](#7-seo-infrastructure)
8. [Google Indexing Automation](#8-google-indexing-automation)
9. [Content Systems](#9-content-systems)
10. [Post-Launch Verification](#10-post-launch-verification)
11. [Ongoing Maintenance Processes](#11-ongoing-maintenance-processes)

---

## 1. Pre-Launch Checklist

Before deploying, confirm all of these are ready:

- [ ] GitHub repo created and codebase pushed to `main`
- [ ] PostgreSQL database provisioned (Neon recommended)
- [ ] All environment variables gathered (see Section 4)
- [ ] Vercel project created and linked to GitHub repo
- [ ] Cloudflare domain configured with Vercel nameservers
- [ ] Resend API key created, sending domain verified
- [ ] TidyCal embed path confirmed (`m7v2jox/waypoint30`)
- [ ] Google Analytics 4 property created and Measurement ID ready
- [ ] Inngest production app created

---

## 2. Repository & Deployment Setup

### GitHub

1. Create a **private** repository at github.com under `Franscale1922`
2. Push the codebase: `git push -u origin main`
3. Confirm `main` branch is set as default

### Vercel

1. Log in to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the GitHub repo
3. Set **Build Command:** `prisma generate && prisma db push && next build`
4. Set **Output Directory:** `.next` (default)
5. Set **Node.js Version:** 20.x
6. Add all environment variables (Section 4) before clicking Deploy
7. In **Settings → Git**: confirm Production Branch = `main`, Auto-deploy = enabled

> **Critical:** Auto-deploy on push to `main` is architecturally required. The content refresh system (Inngest) commits rewritten article files back to GitHub on a schedule — if Vercel doesn't auto-rebuild, those updates never appear on the live site.

### GitHub Actions Secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions**

Add these secrets (required for the `notify-google-on-deploy` workflow):

| Secret Name | Where to Get It |
|---|---|
| `GOOGLE_INDEXING_SA_KEY` | base64-encoded Google service account JSON (see Section 8) |
| `VERCEL_DEPLOY_HOOK_URL` | Vercel → Project Settings → Git → Deploy Hooks |

Add these **variables** (not secrets):

| Variable Name | Value |
|---|---|
| `GOOGLE_INDEXING_ENABLED` | `true` (only once Google Indexing API is set up) |
| `SITE_URL` | `https://www.waypointfranchise.com` |

---

## 3. Database Setup

### Recommended: Neon (Serverless PostgreSQL)

1. Create account at [neon.tech](https://neon.tech)
2. Create a new project → copy the **Connection String** (starts with `postgresql://`)
3. That string becomes your `DATABASE_URL` environment variable

### Prisma Configuration

In `prisma/schema.prisma`, ensure:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

> Local dev uses SQLite (`file:./dev.db`). **Never use SQLite in production** — Vercel's filesystem is ephemeral.

### First Deploy

On first deploy, Prisma runs `prisma db push` as part of the build command, which creates all tables automatically.

---

## 4. Environment Variables

Set all of these in Vercel → Project → Settings → Environment Variables (Production + Preview):

| Variable | Purpose | Where to Get It |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Neon dashboard |
| `OPENAI_API_KEY` | AI content enrichment, scorecard email drafts | platform.openai.com/api-keys |
| `RESEND_API_KEY` | All transactional email (scorecard, checklists, nurture) | resend.com/api-keys |
| `RESEND_WEBHOOK_SECRET` | Validates Resend webhook events (bounces, unsubscribes) | Resend → Webhooks → signing secret |
| `AUTH_SECRET` | NextAuth.js session encryption | Copy from `.env` — never regenerate in prod |
| `AUTH_GOOGLE_ID` | Google OAuth for admin login | Google Cloud Console → OAuth credentials |
| `AUTH_GOOGLE_SECRET` | Google OAuth for admin login | Google Cloud Console → OAuth credentials |
| `GITHUB_TOKEN` | Content refresh system writes article files back to repo | GitHub → Settings → Developer settings → Fine-grained PAT (Contents: Read+Write) |
| `GITHUB_REPO_OWNER` | `Franscale1922` | — |
| `GITHUB_REPO_NAME` | `waypoint-core-system` | — |
| `GITHUB_BRANCH` | `main` | — |
| `INNGEST_SIGNING_KEY` | Authenticates Inngest webhook calls to the app | Inngest dashboard → production app |
| `INNGEST_EVENT_KEY` | Allows app to send events to Inngest | Inngest dashboard → production app |
| `TIDYCAL_WEBHOOK_SECRET` | Validates TidyCal booking webhooks | TidyCal dashboard → Webhooks |
| `NEXT_PUBLIC_GA_ID` | Google Analytics 4 Measurement ID | GA4 → Admin → Data Streams |

### Local Development

Copy `.env` from the production values above, but replace:
- `DATABASE_URL` → `file:./dev.db` (SQLite)
- Any webhook secrets can be test values locally

---

## 5. Inngest Setup

Inngest runs the following background functions:

| Function | Trigger | What It Does |
|---|---|---|
| `content-refresh` | Monthly cron (`0 6 1 * *`) | Rewrites stale articles with GPT-4o, commits to GitHub |
| `scorecard-complete` | Event: scorecard submission | Sends personalized scorecard email via Resend |
| `checklist-requested` | Event: checklist download | Sends industry-specific PDF + triggers 5-email nurture sequence |
| `nurture-sequence` | Fan-out from checklist event | Delivers 5 drip emails over 3 weeks |
| `email-status-handler` | Instantly/Resend webhook events | Handles bounces, unsubscribes, reply tracking |

### Production Setup

1. Create a production app at [app.inngest.com](https://app.inngest.com)
2. Copy `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` to Vercel env vars
3. After first deploy, go to Inngest → **Sync** → enter: `https://yourdomain.com/api/inngest`
4. Confirm all functions appear in the Inngest dashboard with ✅ status
5. Test by manually triggering `content-refresh` with a test payload

---

## 6. Domain & DNS (Cloudflare)

1. Vercel → Project → Settings → Domains → **Add Domain**: `waypointfranchise.com`
2. Vercel will show you the DNS records to add
3. In Cloudflare → DNS → add the records Vercel specifies
4. Set SSL/TLS mode to **Full (strict)** in Cloudflare
5. Enable **Always Use HTTPS**
6. Confirm the domain resolves and SSL certificate is active (usually <5 min)

### Redirects Already Configured in `next.config.ts`

- `www.waypointfranchise.com` → canonical (handled by Vercel)
- All canonical URLs set per-page in `metadata.alternates.canonical`

---

## 7. SEO Infrastructure

Everything below is already implemented. This section documents what exists and what to verify on a new deploy.

### 7.1 Sitemap

**File:** `src/app/sitemap.ts`  
Auto-generates from all routes + all content articles at build time. Submitted to Google automatically on every deploy via GitHub Actions.

**Verify:** `https://yourdomain.com/sitemap.xml` — should list all pages and articles.

### 7.2 Robots.txt

**File:** `src/app/robots.ts`  
Allows all crawlers, points to sitemap URL.

### 7.3 Structured Data (JSON-LD)

Each page has schema markup injected as `<script type="application/ld+json">`:

| Page | Schema Type | Notes |
|---|---|---|
| `/` | `WebSite` + `LocalBusiness` + `Person` | Entity block for AEO |
| `/about` | `Person` | Kelsey's credentials |
| `/process` | `HowTo` | 5-step process schema — eligible for rich results |
| `/faq` | `FAQPage` | 30 questions — dynamically built from `faqs` data array in `faq/page.tsx` — **eligible for Google FAQ rich results** |
| `/scorecard` | `FAQPage` | Quiz-related FAQs |
| `/investment` | `FAQPage` | Investment cost FAQs |
| `/resources/[slug]` | `Article` | Per-article schema |
| `/glossary` | `DefinedTermSet` | Term definitions |

> **Important:** The FAQ schema in `faq/page.tsx` is built dynamically from the same `faqs` array that renders the accordion. Adding a new question to the array automatically updates the schema — no manual sync required.

### 7.4 Open Graph Images

All OG images live in `/public/og/`. Current inventory:

| File | Page |
|---|---|
| `og-home.png` | `/` |
| `og-process.png` | `/process` |
| `og-faq.png` | `/faq` |
| `og-resources.png` | `/resources` |
| `og-checklists.png` | `/checklists` |
| `og-glossary.png` | `/glossary` |
| `og-investment.png` | `/investment` |
| `og-tools.png` | `/tools` |
| `og-consultant-vs-broker.png` | `/franchise-consultant-vs-broker` |
| `og-getting-started.png` | `/resources/getting-started` |
| `og-scorecard.png` (legacy naming) | `/scorecard` — referenced as `og_scorecard_1773343944094.png` |
| `og-about.png` (legacy naming) | `/about` — referenced as `og_about_1773343956962.png` |

**Adding a new page OG image:**
1. Generate a 1200×630px image with Antigravity's image generator
2. Copy to `/public/og/og-[pagename].png`
3. Update the page's `metadata.openGraph.images` array

### 7.5 Image Optimization

All images use `next/image` with proper attributes:
- Hero images: `fill`, `priority`, `fetchPriority="high"`, `sizes="100vw"`
- Content images: `width`, `height`, `sizes` set per context
- No raw `<img>` tags exist anywhere in marketing routes

### 7.6 Internal Linking Map

Key contextual links established across the site:

| From | To | Context |
|---|---|---|
| `/process` Step 4 | `/resources/how-to-tell-if-a-franchisor-actually-cares` | After validation calls content |
| `/process` Step 5 | `/checklists` | After decision content |
| `/scorecard` low score | `/resources/are-you-ready-to-own-a-franchise`, `/resources/w2-to-franchise-owner-when-youre-actually-ready`, `/resources/how-franchise-funding-actually-works` | Score < 40 resource cards |
| `/about` body | `/scorecard`, `/process` | Mid-body after credentials paragraph |
| `/book` footer | `/process`, `/investment`, `/scorecard` | "Want to come prepared?" section |
| `/investment` body | `/resources/how-franchise-funding-actually-works`, `/resources/fdd-decoded-what-actually-matters` | Inline ROBS and FDD references |
| `/investment` FAQ | `/resources/the-franchise-agreement-what-you-can-and-cant-negotiate` | Exit link on last FAQ |

**When adding a new page:** look for opportunities to link FROM existing pages where the topic overlaps. The `/faq` page already links to related articles via the `link` prop in the `faqs` data array.

---

## 8. Google Indexing Automation

The `notify-google-on-deploy` GitHub Actions workflow runs on every push to `main` and does three things:

1. **Sitemap ping** → tells Google a new sitemap is available
2. **IndexNow** → notifies Bing and other IndexNow-compatible engines
3. **Google Indexing API** → directly submits each URL in the sitemap to Google's crawl queue (requires one-time setup below)

### One-Time Google Indexing API Setup

Full instructions in [`docs/GOOGLE_INDEXING_SETUP.md`](./GOOGLE_INDEXING_SETUP.md). Summary:

1. Create Google Cloud project → enable Web Search Indexing API
2. Create service account → download JSON key
3. Add service account as Owner in Google Search Console
4. `base64 -i key.json | tr -d '\n' | pbcopy` → add as `GOOGLE_INDEXING_SA_KEY` secret in GitHub
5. Add `GOOGLE_INDEXING_ENABLED = true` as a GitHub Actions variable

### Google Search Console

1. Add property: `https://www.waypointfranchise.com`
2. Verify ownership via DNS TXT record in Cloudflare
3. Submit sitemap: `https://www.waypointfranchise.com/sitemap.xml`
4. Monitor indexing status under Coverage → Valid

---

## 9. Content Systems

### Articles

- Articles live in `content/articles/*.md` as MDX-compatible Markdown
- Each file has frontmatter: `title`, `description`, `publishedAt`, `category`, `readingTime`, `checklist` (optional)
- The article index at `/resources` is auto-generated from this directory
- Individual pages render at `/resources/[slug]`
- **Adding a new article:** follow the `/new-article` agent workflow (`.agents/workflows/new-article.md`)

### Content Calendar

See `content/CONTENT-CALENDAR.md` for the publishing schedule and queue.

### Content Standards

See `content/CONTENT-STANDARDS.md` for all writing rules. Key rules:
- No FDD item numbers (write out what the item covers in plain English)
- No em dashes
- Kelsey's voice: direct, honest, no hype (see `docs/VOICE_GUIDE.md`)

### Content Refresh (Automated)

Inngest runs a monthly cron (`content-refresh` function) that:
1. Identifies articles older than 60 days
2. Rewrites them with GPT-4o following content standards
3. Commits the updated `.md` files back to `main`
4. Vercel auto-rebuilds from the commit

No manual action required. Monitor in the Inngest dashboard.

### Franchise Map

- Owner locations stored in Google Sheets: `1olep7m7ZjCu_jpePBqEqMZo2rWyoiCo_RIzTlX3Hleo`
- Sheet format: **Column A = City (display label)**, **Column B = State (2-letter abbreviation)**
- Site fetches via public CSV export: `https://docs.google.com/spreadsheets/d/[ID]/export?format=csv`
- The `/api/map-cities` route parses this for the homepage map
- The `/api/stats` route counts owners (total rows) and distinct states for the testimonials section
- Stats revalidate hourly via ISR; fallback values are 146 owners / 35 states

### Scorecard & Checklist Delivery

- **Scorecard:** Submission triggers `scorecard-complete` Inngest event → Resend sends personalized email with score (capped at 98 for display)
- **Checklists:** Download triggers `checklist-requested` event → correct industry-specific PDF delivered → 5-email nurture sequence begins
- Unsubscribe links use `List-Unsubscribe` headers; Resend webhook handles suppression

---

## 10. Post-Launch Verification

Run through this after every new deploy or major change:

### Site & Routes
- [ ] `https://yourdomain.com` loads correctly
- [ ] `/about`, `/process`, `/faq`, `/resources`, `/book`, `/scorecard`, `/investment`, `/glossary`, `/checklists`, `/refer` all load
- [ ] `/sitemap.xml` lists all expected pages + articles
- [ ] `/robots.txt` shows `Allow: /`

### SEO
- [ ] Open each major page → View Source → confirm `<script type="application/ld+json">` is present with correct schema type
- [ ] Check OG tags: paste a URL into [opengraph.xyz](https://www.opengraph.xyz) and confirm the correct page-specific image appears
- [ ] Validate FAQ schema: [schema.org/validator](https://validator.schema.org) → paste `/faq` URL → confirm FAQPage with 30 questions
- [ ] Validate HowTo schema: same tool → `/process` → confirm HowToStep array

### Functionality
- [ ] Complete the scorecard → confirm email arrives with correct score
- [ ] Download a checklist → confirm PDF delivery email arrives
- [ ] Book a call on `/book` → confirm TidyCal loads and calendar works
- [ ] Check the franchise map on homepage → pins appear for all owner locations
- [ ] Dynamic stats in testimonials show current owner count and state count

### Admin
- [ ] `/admin` loads and requires Google OAuth login
- [ ] Lead list shows expected data
- [ ] Inngest dashboard shows all functions as active

### Indexing
- [ ] Go to GitHub → Actions → latest deploy workflow → confirm all 3 indexing layers ran without error
- [ ] In Google Search Console → URL inspection → test 3–4 URLs → confirm "URL is on Google" or "Request indexing" as appropriate

---

## 11. Ongoing Maintenance Processes

### Monthly
- Run `/seo-review` agent workflow — review Google Search Console rankings, AI citation status, keyword opportunities
- Check Inngest dashboard — confirm content-refresh cron ran, review any errors
- Review lead pipeline in admin dashboard

### When Adding a New Page
1. Create the page file in `src/app/(marketing)/[route]/page.tsx`
2. Add `metadata` with `title`, `description`, `alternates.canonical`, `openGraph` with a unique OG image
3. Add to `src/app/sitemap.ts`
4. Generate and add an OG image to `/public/og/`
5. Add JSON-LD structured data appropriate to the page type
6. Register in the navigation (`MobileNav.tsx` + desktop nav)
7. Add internal links FROM existing related pages (see Section 7.6)
8. Follow the `/new-page` agent workflow for full checklist

### When Adding a New Article
Follow the `/new-article` agent workflow. It handles:
- Frontmatter setup
- Related article mapping
- Back-links from existing articles
- Checklist CTA wiring

### When Updating the Franchise Owner Map
1. Open the Google Sheet: `1olep7m7ZjCu_jpePBqEqMZo2rWyoiCo_RIzTlX3Hleo`
2. Add a new row: **Column A** = "City, ST" (display format), **Column B** = state abbreviation only (e.g., `TX`)
3. The site auto-updates within 1 hour (ISR revalidation) or immediately on next deploy

### When Pushing a Sprint
1. Make changes, commit with descriptive message
2. Push to `main`
3. Vercel auto-deploys (~90 seconds)
4. GitHub Actions runs the indexing workflow automatically
5. Update `ROADMAP.md` to mark completed items

---

## Key File Reference

| What you want to change | File |
|---|---|
| Homepage content | `src/app/(marketing)/page.tsx` |
| About page | `src/app/(marketing)/about/page.tsx` |
| Process steps | `src/app/(marketing)/process/page.tsx` |
| FAQ questions | `src/app/(marketing)/faq/page.tsx` → `faqs` array |
| Resources index | `src/app/(marketing)/resources/page.tsx` |
| Individual articles | `content/articles/[slug].md` |
| Scorecard questions | `src/app/(marketing)/scorecard/ScorecardClient.tsx` → `questions` array |
| Score cap (display) | `ScorecardClient.tsx` → `displayScore = Math.min(score, 98)` |
| Scorecard email | `src/app/api/scorecard-complete/route.ts` |
| Checklist delivery | `src/inngest/functions.ts` → `checklistRequested` function |
| Franchise map data | Google Sheet `1olep7m7ZjCu_jpePBqEqMZo2rWyoiCo_RIzTlX3Hleo` |
| Dynamic stats API | `src/app/api/stats/route.ts` |
| Map cities API | `src/app/api/map-cities/route.ts` |
| Sitemap | `src/app/sitemap.ts` |
| Global styles | `src/app/globals.css` |
| Navigation | `src/app/components/MobileNav.tsx` + desktop nav in `layout.tsx` |
| Inngest functions | `src/inngest/functions.ts` |
| Cold email logic | `src/app/api/generate-email/route.ts` |
| Admin dashboard | `src/app/admin/` |
