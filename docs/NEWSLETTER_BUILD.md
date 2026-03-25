# Newsletter Build — Waypoint Franchise Advisors

> **Roadmap Section:** §5. 🎥 Content Ecosystem — `[/] Beehiiv + LinkedIn Newsletters`
>
> **Status:** CRM sync live (March 25, 2026). `/newsletter` page live. Newsletter subscribe form on all 34+ article pages. Bulk backfill script ready. Next: activate Beehiiv paid plan → MCP early access → first issue.
>
> **Purpose:** Deep, SEO-optimized content distribution through beehiiv newsletter + LinkedIn newsletters. Feeds audience growth for Horizon 2 community/monetization (Skool).

---

## Platform Decision

**Platform: beehiiv**

Chosen for:
- Creator/publisher-grade tools (monetization, referrals, paid subscriptions)
- Native SEO for newsletter archives (Google indexable)
- Superior deliverability infrastructure
- Deep analytics (subscriber-level open/click data, cohort views)
- Native referral program (viral growth loop)
- Integrates with external tools via API + now MCP (see below)
- Content strategy alignment: franchise advisory content maps well to long-form newsletter format

---

## beehiiv MCP — Impact Assessment

**Announcement date:** March 24, 2026
**Current status:** v1 live (read-only), early access for paid plans. v2 (write access) in development.

### What it is

The beehiiv MCP (Model Context Protocol) is a native integration that connects a beehiiv account directly to AI clients — Claude, ChatGPT, Gemini, or any MCP-compatible tool. Instead of pasting data into a chat, the AI accesses live account data and can reason across the full dataset.

**This is not a webhook or Zapier-style trigger** — it's a persistent, bidirectional data context layer. The AI can read *and* (in v2) write back to beehiiv.

### v1 Capabilities (Read-only, available now)

Useful queries once the newsletter is live:
- "Who are my most engaged free subscribers who haven't upgraded, and what do they have in common?" → informs paid tier offer
- "Are there any unusual unsubscribe spikes in the last 90 days? What posts correlate?" → content quality feedback loop
- "Audit my newsletter website and give me a prioritized list of SEO fixes based on my content and structure." → SEO improvement without manual audit
- Subscriber cohort analysis for sponsor media kit (franchise-curious Corporate Refugees — sellable audience profile)

### v2 Capabilities (Write access — coming)

This unlocks autonomous newsletter operations — extremely relevant for the Waypoint content engine:

| Capability | Waypoint Application |
|---|---|
| Pull last 5 posts → generate "greatest hits" roundup → save as draft | Quarterly retrospective sends, minimal manual effort |
| Segment "High Intent Free" subscribers (5+ opens, no upgrade) → send timed discount | Converts free readers to paid discovery calls |
| Post-purchase automation: thank-you → tips → upsell sequence | If/when paid newsletter tier launches (Horizon 2) |
| Weekly performance pull → editorial brief draft → calendar invite | Replaces manual Monday planning |
| Auto-generate landing pages from subscriber testimonials | Growth page for paid tier |

### Cross-tool Automations (v1 capable via agent orchestration)

Once MCP is live, these automations become possible without custom code:
- **Monday 8am:** Pull last week's newsletter revenue (ads + subscriptions) → post summary to Slack
- **Triggered by engagement:** Subscriber hits 10+ opens + 5+ clicks → create/update contact in HubSpot → enroll in consultation sales sequence
- **Friday:** Week's send performance → editorial brief in Gmail → 9am Monday calendar event

> ⚡ **The HubSpot/CRM trigger is directly relevant** — if we wire beehiiv → HubSpot/CRM → existing Inngest nurture pipeline, high-intent newsletter readers can be automatically moved into the same lead flow as scorecard/checklist leads.

### Impact Rating: **HIGH**

Reasons:
1. **Eliminates custom analytics tooling** — no need to build subscriber reporting infrastructure; AI handles it natively
2. **Closes the loop between content and CRM** — newsletter engagement signals feed into the same lead pipeline Waypoint already uses for scorecard/checklist leads
3. **Reduces content ops overhead** — v2 write access turns the newsletter into a semi-autonomous system (generate → draft → schedule without a human in the loop)
4. **Audience monetization unlock** — subscriber segmentation + automated upsell flow covers the Skool/paid community ramp (§7) without building bespoke logic
5. **SEO audit capability** — AI auditing newsletter web archives means the SEO feedback loop runs continuously without monthly manual reviews

### Action Items

- [ ] **Request MCP early access** once on a beehiiv paid plan (required) — form at `beehiiv.com/mcp`
- [ ] **Prioritize beehiiv paid plan** when activating newsletter — MCP is restricted to paid tiers
- [ ] **Design CRM integration flow** early: beehiiv engagement signal → HubSpot/CRM → Inngest nurture (mirrors existing checklist/scorecard pipeline)
- [ ] **Plan v2 write automations** before launch so they can be activated immediately when v2 ships:
  - Weekly editorial brief automation
  - High-intent free subscriber → consultation funnel
  - Greatest hits roundup automation
- [ ] **Join beehiiv MCP early adopter Slack** (included with early access approval) — use to shape roadmap toward franchise advisory use cases

---

## Content Strategy Notes

*(To be expanded when newsletter build begins)*

- **Audience:** Corporate Refugees — professionals considering franchise ownership as an exit from corporate
- **Tone:** Consistent with `docs/VOICE_GUIDE.md` — direct, grounded, no hype
- **Cadence:** TBD (weekly likely)
- **Content sources:** Repurposed from article library (34+ SEO articles), scorecard/checklist insights, client stories
- **Monetization path:** Free → paid tier → Skool community (Horizon 2)
- **Distribution loop:** beehiiv archive pages → organic search → new subscribers → CRM pipeline → discovery calls

---

## Build Sequence (When Ready)

1. [x] **CRM auto-sync live** — all scorecard/checklist/escape-kit submissions auto-subscribe via `src/lib/beehiiv.ts` + 3 route hooks + Inngest "Not now" rescue
2. [x] **`/newsletter` page built** — full landing page at `waypointfranchise.com/newsletter` with subscribe form, what-you-get section, persona targeting
3. [x] **Newsletter form on all 34+ articles** — inline callout in `resources/[slug]/page.tsx` after related articles
4. [x] **Backfill script ready** — `scripts/beehiiv-backfill.ts` dry-runs by default, `--live` flag to push all existing leads to Beehiiv
5. [x] **Sitemap + MobileNav** — `/newsletter` registered in sitemap, link added to mobile nav footer
6. [ ] **Activate Beehiiv paid plan** — required for MCP early access
7. [ ] **Request MCP early access** — form at `beehiiv.com/mcp`
8. [ ] **Run backfill script** (`npx ts-node scripts/beehiiv-backfill.ts --live`) to push existing leads
9. [ ] **Launch first issue** + enable referral program
10. [ ] **Wire MCP automations** when v2 ships: Monday digest, Friday editorial brief, high-intent segment → consultation funnel
