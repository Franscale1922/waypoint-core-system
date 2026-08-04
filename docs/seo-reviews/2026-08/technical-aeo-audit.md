# Technical AEO/SEO Audit — 2026-08-03

Companion to `gsc-report.md` and `ai-citation-check.md`. Those two measure the month; this one
diagnoses the site. Every claim below was checked against the live site, the repo, or the Search
Console API on 2026-08-03, and the ones that were acted on are marked FIXED.

---

## What is already right

Naming these so nobody pays to have them "added" later. All verified live:

| Signal | State |
|---|---|
| `robots.txt` | Present, with a **Content-Signal** policy (`search=yes, ai-input=yes, ai-train=no`) |
| `llms.txt` | 200, 99 lines, genuinely well written: positioning, key facts, the honest 30% conversion figure |
| `llms-full.txt` | 200, 470 KB |
| Structured data | Organization, Person, Article, FAQPage, BreadcrumbList, DefinedTerm, DefinedTermSet, WebSite, HowTo, Service |
| Author signals | Visible byline plus `Person` schema on articles |
| Sitemap | 191 URLs, all hubs link to all children |

On-page AEO is close to saturated. What follows is structural.

---

## 1. The glossary index cannibalises its own 99 term pages

**The mechanism.** `/glossary` publishes all 99 full definitions on a single **33,370-word** page.
Each `/glossary/<term>` page then repeats one of those definitions verbatim. Measured: an untouched
term page is ~273 words, of which the only unique content already exists on a far stronger page on
the same domain.

**The evidence.**

- **98 of 99 term pages have zero impressions.** AUV is the only one with any.
- `what does auv mean` lands on the **index at position 2** while the dedicated AUV page sits at 37.
- Thirteen more definitional queries rank at **position 1 on the index**, not on the term page that
  exists for them: `how do franchises work`, `what is a fdd document`, `how to become a franchisee`,
  `piggyback franchise definition`, `questions to ask a franchisor before buying`, `what can you
  franchise`, `turn key business`, `franchise broker`, `moving franchise`, `owner side`,
  `how does franchise work`, `how does franchising work`, `how to become a franchise consultant`.

**Decision: do not thin the index.** It draws 311 impressions and is the site's best-ranked page.
Gutting a working page to fix a theoretical duplication is the wrong trade. Differentiate the term
pages instead, so each one earns its own place.

**FIXED (partial):** 18 of 99 terms now carry three unique FAQs each, rendered as H2s and into the
existing FAQPage schema. Ten were chosen on 2026-08-03 morning from the cost and funding clusters;
eight more from the 90-day `/glossary` query pull, which names precisely which terms the index is
absorbing. `/glossary/royalty` went from 273 to 421 words.

**Open:** 81 terms remain undifferentiated. They should be done on demand evidence, not in bulk.
Writing 243 generic FAQs would replace a duplication problem with a thin-content problem.

**Content gap found:** `piggyback franchise definition` ranks **position 1** and there is no
Piggyback entry in the glossary at all.

---

## 2. The brand suffix was spending half of every title

`src/app/layout.tsx` set `title.template` to `"%s | Waypoint Franchise Advisors"`. That suffix is
**30 characters of the ~60 Google renders** — half of every title on the site, spent on the brand.

Measured before the fix: **44 of 45 article titles** and 7 of 12 sampled core pages overflowed.
Worst was `/franchise-consultant-vs-broker` at **100 characters**.

**FIXED.** The template is now `"%s | Waypoint"`, 11 characters, freeing 19 on every page. The
display URL already reads `waypointfranchise.com`, so the long form was saying "Franchise" twice in
one result. Four core pages with real impressions were also shortened by dropping a low-value tail
rather than rewriting the keyword:

| Page | Before | After |
|---|---|---|
| `/investment` | 61 | 42 |
| `/franchise-consultant-vs-broker` | 76 | 52 |
| `/franchise-vs-starting-a-business` | 66 | 51 |
| `/franchise-financing` | 62 | 56 |

**Deliberately not done:** bulk-rewriting the 30 article titles still over budget. Keywords are
front-loaded, so truncation costs the brand rather than the match, and changing a title on a page
that already ranks is a real risk for a modest gain. `aeo-audit.mjs` now reports them as an
**advisory** rather than a gate, for exactly that reason. The brand-duplication guard was updated to
catch both the new short suffix and the old long one.

---

## 3. Four-fifths of the site draws nothing

**40 of 191 sitemap URLs** received any impression in 28 days. Beyond the glossary, **32 of 45
articles had zero**. They are indexed and linked from `/resources`, so this is not a crawl problem;
they are simply not competitive yet.

An earlier draft of this audit claimed 119 orphan pages. **That was wrong** — the check missed
dynamically generated links. Every hub links to every child: `/glossary` to all 99 terms,
`/resources` to all 45 articles, `/industries` to all 8. The real weakness was thinner: term pages
had exactly one inbound link, the index, with no contextual links from articles until 17 were added
on 2026-08-03.

---

## 4. Freshness was invisible on the second-biggest page

`/investment` (168 impressions) read "Last updated: March 2026" in prose while its schema emitted
**no `dateModified` at all**. A page whose entire value is currency had a five-month-old date on the
surface and no freshness signal for a crawler.

**FIXED.** A single `LAST_REVIEWED` constant now feeds both the visible line and a new optional
`dateModified` on `webPageSchema`. Update it when the figures are re-checked, not when the file is
edited.

---

## 5. The site is already appearing in AI-mediated search

Worth knowing, because it is easy to miss. The 90-day query set contains raw assistant prompts that
reached Google:

- `context: location: canada (not for language). do not include location references in your
  response. question: what are the most popular franchising options for beginners?`
- A full ChatGPT-style persona block ending `how do i qualify for an sba loan in arizona?` —
  **position 1**
- `which group account classification type represents a legal entity that has licensed the right to
  operate a brand's stores...` — **position 1**
- `can you give more examples`

These are AI assistants passing user context into a search. The site surfaces for them already, even
while `ai-citation-check.mjs` reports 0 of 48 direct citations.

---

## The honest ceiling

Average position 26.5, 8 clicks, 0 of 48 AI citations. On-page work is near its limit; what remains
is **authority**, which is earned offsite and not in this repo. That inference comes from ranking
behaviour, not from a backlink measurement, which has not been done.

**A permanent limit on all of this:** Search Console withholds roughly **65% of a page's
impressions** under its anonymised-query threshold. For `/glossary`, 93 named queries account for
~97 of 279 impressions. No tool sees the rest, so every query-level statement here describes about a
third of reality.

---

## Ranked next steps

1. **Differentiate the remaining 81 glossary terms**, on demand evidence, a batch at a time. Biggest
   prize, and the mechanism is now proven.
2. **Add a Piggyback entry** — position 1 with no page behind it.
3. **Re-measure in September.** The eighteen differentiated terms are the experiment: do they take
   definitional queries off the index?
4. **Offsite authority.** Nothing in this repo moves it.
