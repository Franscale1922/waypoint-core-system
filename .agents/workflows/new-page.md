---
description: Adding a new marketing page to the Waypoint Franchise Advisors website — covers sitemap registration, structured data, OG image, navigation links, and SEO metadata.
---

# New Marketing Page Workflow

Use this workflow whenever a new public-facing page is added to the site. This includes:
- New landing pages (e.g., `/locations`, `/who-we-serve`, `/franchise-consultant-vs-broker`)
- New tool pages (e.g., new quizzes, calculators)
- New category pages (e.g., `/resources/going-deeper`)
- Any new route under `src/app/(marketing)/`

---

## Step 1 — Set page metadata

In the new page's `page.tsx`, add an exported `metadata` object:

```tsx
export const metadata: Metadata = {
  title: "Page Title | Waypoint Franchise Advisors",
  description: "150–160 character description. Include primary keyword naturally. Written to earn the click.",
  alternates: { canonical: "https://waypointfranchise.com/your-page-slug" },
  openGraph: {
    title: "Page Title",
    description: "OG description — can match meta description or be slightly adapted for social.",
    url: "https://waypointfranchise.com/your-page-slug",
    images: [{ url: "/og/og-your-page.png", width: 1200, height: 630, alt: "Descriptive alt text" }],
  },
};
```

**Title tag rules:**
- Format: `[Page Purpose] | Waypoint Franchise Advisors`
- Include the primary keyword in the first half of the title
- 50–60 characters total

---

## Step 2 — Add to sitemap

Open `src/app/sitemap.ts` and add the new page to the `corePages` array:

```ts
{
  url: `${SITE_URL}/your-page-slug`,
  lastModified: new Date(),
  changeFrequency: "monthly",
  priority: 0.8,  // adjust: 1.0 = homepage, 0.9 = core pages, 0.8 = important secondary, 0.7 = supporting
},
```

Priority guide:
- `1.0` — homepage only
- `0.9` — About, Process, Book (core conversion pages)
- `0.85` — Scorecard, Investment, FAQ, Resources index
- `0.8` — Important secondary pages (new landing pages, glossary, comparison pages)
- `0.7` — Supporting pages (category indexes, privacy, terms)

---

## Step 3 — Add structured data (if applicable)

Determine which schema type(s) apply to this page:

| Page type | Schema to add |
|---|---|
| FAQ or Q&A page | `FAQPage` JSON-LD |
| Process / how-to page | `HowTo` JSON-LD |
| Tool or calculator | No specific schema needed |
| About/person page | `Person` JSON-LD (already in `structured-data.ts`) |
| Landing page for a concept | `WebPage` + `BreadcrumbList` |
| Article or guide page | `Article` + `FAQPage` + `BreadcrumbList` (handled by article template) |

Add schema as an inline `<script type="application/ld+json">` in the page JSX, or export a helper from `src/app/lib/structured-data.ts` if the schema will be reused.

**BreadcrumbList for any non-top-level page:**
```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://waypointfranchise.com" },
        { "@type": "ListItem", position: 2, name: "Page Name", item: "https://waypointfranchise.com/your-page-slug" },
      ],
    }),
  }}
/>
```

---

## Step 4 — Generate OG image

If the page is important enough to share on social (any page a user would link to), it needs an OG image.

- Size: 1200 × 630px
- Save to: `public/og/og-your-page.png`
- Style: consistent with existing OG images (dark navy background, Waypoint branding, page-relevant text)
- Can be generated via AI image tools or Canva using the existing OG template

Update the page metadata to reference it:
```ts
images: [{ url: "/og/og-your-page.png", width: 1200, height: 630, alt: "Alt text" }]
```

---

## Step 5 — Add navigation links (if applicable)

Determine whether the new page should appear in:

- **Desktop nav** — `src/app/(marketing)/layout.tsx` (nav links array)
- **Mobile nav** — `src/app/components/MobileNav.tsx`
- **Footer** — `src/app/(marketing)/layout.tsx` (footer NAVIGATE column)

If the page is important enough that a user looking for it would expect to find it in the nav, add it. If it's a supporting page, skip.

---

## Step 6 — Add internal links from existing pages

At minimum, identify one existing page that should link to the new page:

- Does the FAQ answer a question the new page addresses? Link from the FAQ answer.
- Does the Process page mention something the new page expands on? Link from the relevant step.
- Does the Homepage mention something the new page covers? Link from the relevant section.

Add a contextual `<Link>` in the existing page's JSX pointing to the new page.

---

## Step 7 — Manually submit to Google Search Console

After deploying:

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Select waypointfranchise.com property
3. Paste the new page URL into the top search bar → "Request Indexing"

This triggers Google to crawl the new page immediately rather than waiting for the next sitemap crawl.

> **This step cannot be automated.** It requires Kelsey to log in to GSC and submit the URL manually.

---

## Step 8 — Verify

```bash
cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system" && npm run dev
```

- [ ] Page renders at `http://localhost:3000/your-page-slug`
- [ ] `<title>` tag is correct (browser tab)
- [ ] Meta description appears in view-source
- [ ] OG image appears when pasted into [opengraph.xyz](https://www.opengraph.xyz/)
- [ ] Schema validates at [search.google.com/test/rich-results](https://search.google.com/test/rich-results)
- [ ] Page appears in `http://localhost:3000/sitemap.xml`
- [ ] Nav/footer links render correctly (if added)
