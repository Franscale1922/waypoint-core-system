# Article skeleton (copy, do not edit in place)

This file is the compliant starting point for a new resource article. Copy the
fenced block below into a new file at `content/articles/<slug>.md`, then fill it
in. It is **not** loaded as a real article (it lives outside `content/articles/`).

Every default here exists so a new article passes `npm run aeo-audit` and the
pre-publication checklist in `content/CONTENT-STANDARDS.md` on the first try.
Full process: `.agents/workflows/new-article.md`. Hard rules summary below the block.

```markdown
---
# ---- REQUIRED ----
title: "Plain, Searchable Title (what a person would actually type, no clickbait)"
slug: "lowercase-hyphenated-slug-derived-from-title"
date: "YYYY-MM-DD"                 # today's date
category: "Getting Started"        # Getting Started | Going Deeper | Industry Spotlights
tier: 1                            # 1 = Getting Started, 2 = Going Deeper, 3 = Industry Spotlights
excerpt: "A self-contained 1-2 sentence answer to the article's main question. Used in metadata, the resources index, related-article cards, and as an AEO snippet, so it must deliver value on its own. No em dashes. Date-qualify any figure."
relatedSlugs:                      # exactly 3, chosen on editorial merit (see new-article-checklist.md)
  - "related-slug-one"
  - "related-slug-two"
  - "related-slug-three"
checklistSlug: "universal"         # pick from the table in .agents/workflows/new-article.md, OR delete this line for no widget
faqs:                              # exactly 4, each answer standalone (emitted verbatim as FAQPage JSON-LD)
  - q: "A real question a buyer would search?"
    a: "A complete, standalone answer. Date-qualify figures with 'as of YYYY'. No brand names, no earnings/profit claims."
  - q: "Second real buyer question?"
    a: "Standalone answer."
  - q: "Third real buyer question?"
    a: "Standalone answer."
  - q: "Fourth real buyer question?"
    a: "Standalone answer."

# ---- OPTIONAL (delete any line you do not use) ----
# updatedAt: "YYYY-MM-DD"          # set when the article is meaningfully revised
# escapeKit: true                  # show the Escape Kit CTA on this article
# video:                           # OPT-IN per-article VideoObject. Capability is deferred (render wiring TBD); safe to include or omit. Never required.
#   name: "Video title"
#   description: "One-sentence description of the video."
#   thumbnailUrl: "https://example.com/thumb.jpg"
#   uploadDate: "YYYY-MM-DDThh:mm:ss-05:00"   # timezone-qualified
#   embedUrl: "https://player.vimeo.com/video/XXXXXXXX"
#   contentUrl: "https://example.com/video.mp4"   # optional direct file URL
---
The first paragraph is the atomic summary. In 1-2 plain sentences it directly answers the title's question, with no heading above it. This is the sentence AI answer engines lift verbatim, so keep it front-loaded (under ~320 characters) and never bury it below setup.

Second short paragraph: name the reader's actual tension or decision, in Kelsey's direct, no-pitch voice. State the position, then support it.

---

## A real buyer question this section answers? (How much / What / Should / Can ...)

Lead with the direct answer in the first 1-2 sentences. This is the Island Test: the section must make sense if an AI extracts it alone. Then support the answer. Convert 2-3 of your highest-intent H2s into the actual question a buyer searches; leave list-label and pure-synthesis headings as plain descriptors. Do not turn every H2 into a question, and do not duplicate an FAQ question verbatim.

---

## Another real question (How does X work / What are the trade-offs)?

Answer-first, then detail. Whenever you discuss two or more options, include a comparison table and place it before or alongside the prose, not buried at the end. Keep paragraphs short and self-contained.

---

## The Bottom Line

Synthesis. A plain descriptor heading is correct here, not every H2 should be a question.

If you want help thinking through this for your situation, that is a conversation we have with every candidate before they go anywhere near a franchise agreement.

*[Book a call →](/book)*
```

---

## Hard rules baked into this skeleton (see `content/CONTENT-STANDARDS.md`)

- **No franchise brand names** anywhere (body, headings, excerpt, FAQs, metadata). The only allowed proper noun is "Bloomin' Blinds" (Kelsey's former company, as a credential). Describe by category and characteristic.
- **No profitability / earnings claims**: no ROI, payback period, break-even, net/gross profit, "lucrative", "strong returns", return percentages, or owner-income figures. Investment ranges and revenue ranges are allowed.
- **No FDD item numbers** (Item 6, Item 19, etc.). Use the plain-language equivalent. (Only `fdd-decoded-what-actually-matters.md` is exempt.)
- **No em dashes (—)** anywhere. Use a colon, comma, or period. En dashes (–) in number ranges (60–90, $90,000–$150,000) are fine. Verify with `grep -c "—" <file>` = 0.
- **Date-qualify** time-sensitive facts inline ("as of YYYY"): investment ranges, financing terms, counts, third-party stats.
- **Non-commodity (Section 13)**: the core must pass the commodity test. If a competitor could write it by reading three other franchise sites, replace it with Kelsey's first-hand judgment, an aggregate Waypoint pattern, or a named framework.
- **Answer-first + question H2s (Section 4 + 7)**: atomic summary up top, the answer in the first 1-2 sentences under each question heading.

Before publishing, run `npm run aeo-audit` and `npm run test`, and confirm `grep -c "—"` is 0.
