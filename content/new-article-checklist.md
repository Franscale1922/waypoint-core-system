# New Article Checklist

Follow this process every time a new resource article is created. This keeps the related-articles graph current and ensures every article enters the shared pool.

---

## Step 1 — Create the article file

Create a new `.md` file in `content/articles/` following the naming convention: `descriptive-slug-with-hyphens.md`.

The fastest compliant start is to copy `content/_article-skeleton.md` and fill it in. It already contains every field below plus the answer-first structure and hard-rule reminders.

Include all required frontmatter fields. **The `faqs:` block (exactly 4 questions) is required** by the content standards and is what powers the `FAQPage` schema for AI citation, so it must be present before publishing:

```yaml
---
# ---- REQUIRED ----
title: "Plain, Searchable Title (what a person would actually type)"
slug: "your-article-slug-here"
date: "YYYY-MM-DD"
category: "Getting Started"   # Getting Started | Going Deeper | Industry Spotlights
tier: 1                         # 1 = Getting Started, 2 = Going Deeper, 3 = Industry Spotlights
excerpt: "Self-contained 1-2 sentence answer to the article's main question. Appears in metadata, the resources index, and related-article cards, so it must deliver value on its own."
relatedSlugs:
  - "slug-of-related-article-one"
  - "slug-of-related-article-two"
  - "slug-of-related-article-three"
checklistSlug: "universal"      # pick from the table in .agents/workflows/new-article.md, OR delete this line for no widget
faqs:                           # REQUIRED: exactly 4, each answer standalone (emitted as FAQPage JSON-LD)
  - q: "A real question a buyer would search?"
    a: "A complete, standalone answer. Date-qualify figures with 'as of YYYY'. No brand names, no earnings claims."
  - q: "Second buyer question?"
    a: "Standalone answer."
  - q: "Third buyer question?"
    a: "Standalone answer."
  - q: "Fourth buyer question?"
    a: "Standalone answer."

# ---- OPTIONAL (delete if unused) ----
# updatedAt: "YYYY-MM-DD"       # set when the article is meaningfully revised
# escapeKit: true               # show the Escape Kit CTA on this article
# video:                        # OPT-IN per-article VideoObject. Capability deferred (render wiring TBD); never required.
#   name: "Video title"
#   description: "One-sentence description."
#   thumbnailUrl: "https://example.com/thumb.jpg"
#   uploadDate: "YYYY-MM-DDThh:mm:ss-05:00"
#   embedUrl: "https://player.vimeo.com/video/XXXXXXXX"
---
```

### Write for answer extraction (AEO)

Before the related-slug steps, make sure the draft itself follows the answer-first pattern the rest of the library now uses:

- **Atomic summary lead.** The first paragraph (no heading) answers the title's question in 1-2 plain sentences, under ~320 characters. This is the sentence AI engines quote verbatim, so never bury it.
- **Question-format H2s.** Convert 2-3 of the highest-intent section headings into the actual question a buyer searches (for example, "The Full Funding Picture" becomes "How much cash do you actually need to fund a franchise?"). Keep the answer in the first 1-2 sentences under each. Leave list-label and synthesis headings as plain descriptors; do not turn every H2 into a question, and do not duplicate an FAQ question verbatim.
- **No em dashes, date-qualified facts, non-commodity core.** See `content/CONTENT-STANDARDS.md` (Sections 11, 6, and 13).

### Choosing related slugs for the new article

Pick 3 slugs from the existing pool that genuinely add value for a reader who just finished this article. Useful heuristics:

- **Same topic, deeper detail** — e.g., an intro article on franchise costs → point to the FDD article and the funding article
- **Adjacent decision** — e.g., an article on territory selection → point to the franchise agreement and unit count decision articles
- **Contrast/comparison** — e.g., an industry spotlight on fitness franchises → point to the wellness franchise article and recession-proof categories

**Do not** pick articles just because they share the same category tag. The goal is genuine editorial alignment.

---

## Step 2 — Add the new article to existing articles' related pools

The new article should appear as a recommendation in 1–3 existing articles where it genuinely fits. Open those articles and update their `relatedSlugs` field.

If an existing article already has 3 strong related slugs, replace the weakest one only if the new article is a meaningfully better fit. If the existing set is solid, don't force the new article in.

**Target:** the new article should appear in at least 1 existing article's related set.

### Reference: current article pool

| Slug | Category |
|---|---|
| are-you-ready-to-own-a-franchise | Getting Started |
| asset-light-vs-capital-heavy-choosing-your-franchise-type | Getting Started |
| do-you-need-a-franchise-consultant | Getting Started |
| fdd-decoded-what-actually-matters | Getting Started |
| recession-proof-franchise-categories | Getting Started |
| red-flags-franchise-types-to-avoid | Getting Started |
| the-true-cost-of-buying-a-franchise | Getting Started |
| you-dont-need-to-love-your-franchise | Getting Started |
| big-name-vs-emerging-which-franchise-to-buy | Going Deeper |
| fast-growing-franchise-brand-good-sign-or-red-flag | Going Deeper |
| how-franchise-funding-actually-works | Going Deeper |
| how-to-pick-a-franchise-territory | Going Deeper |
| how-to-tell-if-a-franchisor-actually-cares | Going Deeper |
| one-unit-or-multi-unit-what-first-timers-get-wrong | Going Deeper |
| the-franchise-agreement-what-you-can-and-cant-negotiate | Going Deeper |
| the-semi-absentee-franchise-real-talk | Going Deeper |
| w2-to-franchise-owner-when-youre-actually-ready | Going Deeper |
| what-is-your-time-worth-the-roi-math-of-franchise-ownership | Going Deeper |
| what-to-expect-at-discovery-day | Going Deeper |
| your-first-90-days-as-a-franchise-owner | Going Deeper |
| b2b-franchise-opportunities-lower-risk-steadier-cash | Industry Spotlights |
| fitness-franchise-comparison-what-the-numbers-say | Industry Spotlights |
| health-wellness-franchises-fad-vs-durable-business | Industry Spotlights |
| home-services-franchises-most-overlooked-category | Industry Spotlights |
| junk-removal-franchise-economics-explained | Industry Spotlights |
| restoration-franchises-the-disaster-proof-business | Industry Spotlights |
| senior-care-franchise-is-it-right-for-you | Industry Spotlights |
| should-you-buy-a-car-wash-franchise | Industry Spotlights |
| buying-an-existing-franchise-what-you-need-to-know | Going Deeper |
| sba-loan-vs-robs-franchise-funding-comparison | Going Deeper |
| food-and-beverage-franchise-what-it-actually-demands | Industry Spotlights |
| understanding-franchise-royalties-what-youre-paying-for | Getting Started |
| pet-care-franchise-built-on-unconditional-demand | Industry Spotlights |
| how-to-sell-a-franchise-exit-strategy | Going Deeper |
| property-management-franchises | Industry Spotlights |
| maid-and-residential-cleaning-franchises | Industry Spotlights |
| staffing-franchises | Industry Spotlights |
| garage-transformation-franchises | Industry Spotlights |
| mosquito-control-franchises | Industry Spotlights |
| weight-loss-franchises | Industry Spotlights |
| pilates-franchises | Industry Spotlights |
| it-services-and-msp-franchises | Industry Spotlights |
| what-the-franchise-process-looks-like-start-to-finish | Getting Started |
| which-candidate-avatar-are-you | Getting Started |

> **After adding a new article:** Update the table above with the new slug and category so this checklist stays current.

---

## Step 3 — Verify the build

First run the structural checks from the repo root. The new slug should be clean on all of them:

```bash
npm run aeo-audit                         # new slug must NOT appear under "missing FAQ", "zero question H2s", or "relatedSlugs != 3"
npm run test                              # related-slug link check
grep -c "—" content/articles/<slug>.md    # must be 0 (em-dash ban, Section 11)
```

Then run the dev server and visit the new article page to confirm the "Keep Reading" section renders with 3 cards.

```bash
cd "/Users/kelseystuart/Projects/waypoint-core-system"
npm run dev
```

Then open: `http://localhost:3000/resources/your-new-article-slug`

Confirm:
- [ ] "Keep Reading" section appears above the dark CTA footer
- [ ] All 3 cards link to valid existing articles (no 404s)
- [ ] Card titles, excerpts, and categories display correctly

---

## SEO notes

- The `relatedSlugs` field drives 3 internal links on every article page. These links are contextual (not navigation links), which gives them higher SEO weight.
- The "Keep Reading" heading was chosen deliberately over "Related Articles" to avoid generic content signals.
- Every new internal link added is a small positive signal for both the source and destination article's topical authority.
