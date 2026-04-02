# New Article Checklist

Follow this process every time a new resource article is created. This keeps the related-articles graph current and ensures every article enters the shared pool.

---

## Step 1 — Create the article file

Create a new `.md` file in `content/articles/` following the naming convention: `descriptive-slug-with-hyphens.md`.

Include all required frontmatter fields:

```yaml
---
title: "Your Article Title Here"
slug: "your-article-slug-here"
date: "YYYY-MM-DD"
category: "Getting Started"   # or "Going Deeper" or "Industry Spotlights"
tier: 1                         # 1 = Getting Started, 2 = Going Deeper, 3 = Industry Spotlights
excerpt: "One to two sentence teaser. This appears on the resources index and in related article cards."
relatedSlugs:
  - "slug-of-related-article-one"
  - "slug-of-related-article-two"
  - "slug-of-related-article-three"
---
```

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

> **After adding a new article:** Update the table above with the new slug and category so this checklist stays current.

---

## Step 3 — Verify the build

Run the dev server and visit the new article page to confirm the "Keep Reading" section renders with 3 cards.

```bash
cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system"
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
