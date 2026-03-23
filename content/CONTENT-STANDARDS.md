# Waypoint Franchise Advisors — Content Standards

This document is the authoritative standard for all articles and reference content on waypointfranchise.com. Every piece of content produced — regardless of who or what writes it — must comply with all five sections before it can be published.

---

## 1. Profitability Restriction

**This is a hard rule with no exceptions.**

Waypoint content may never state, imply, suggest, or reference the profitability of owning a franchise. This includes any language — direct or indirect — that would lead a reader to form expectations about financial returns.

### Prohibited content

The following are banned in all forms, including paraphrases, approximations, or framing that implies the same meaning:

- Break-even timelines ("most owners break even within 18 months")
- ROI ("franchises in this category return 30% on invested capital")
- Net profit or net profit margins
- Gross profit or gross revenue projections
- EBITDA or earnings figures presented as typical or expected
- Payback periods
- Statements that a franchise "makes" or "earns" a specific amount
- Phrases like "highly profitable," "strong returns," "lucrative," or "financially rewarding" when applied to a specific franchise or category
- Any comparison of franchise income to prior W-2 income as a projection

### What is permitted

- **Revenue ranges and investment ranges are explicitly permitted.** Prospective buyers need and deserve this context. Stating that a category's initial investment typically runs $150K–$350K, or that Item 19 disclosures show average unit revenue in a range, is factual and useful. This is not a profitability statement.
- Describing the *structure* of how a franchise model generates revenue (e.g., recurring vs. one-time, membership vs. transactional)
- Stating that a franchisor *provides* financial performance data in their FDD Item 19, without editorializing on those figures
- Discussing royalty percentages and fee structures — these are investment inputs, not profit projections
- Referring readers to validate financial performance directly with franchisees during their due diligence

### When in doubt

If a sentence could cause a reader to form a specific expectation about how much money they will make, cut it.

---

## 2. No Brand Names

**This is a hard rule with no exceptions.**

Waypoint content discusses industries, categories, and business models — not specific franchise brands. Named brands must not appear in article body copy, headings, excerpts, or metadata.

### Prohibited

- Specific franchise brand names (e.g., naming a particular cleaning, fitness, or food service franchise)
- Parent company names when used in the context of recommending or evaluating a franchise
- Competitor advisory or brokerage firm names
- Any proper noun that identifies a specific franchise system by brand

### Why this rule exists

- **Legal exposure.** Any statement about a named brand — positive or negative — creates liability risk. Saying a brand performs well implies a guarantee; saying it performs poorly is a defamation risk.
- **Positioning.** Waypoint's value is independent expertise across the full market. Naming specific brands signals preference or bias and undermines that positioning.
- **Longevity.** Brands change ownership, go bankrupt, get acquired, or change their model. Content that names brands becomes inaccurate and requires ongoing maintenance.

### What to do instead

Describe by category, model type, and characteristic — not by name:

- ❌ "[Brand X] is one of the best home services franchises available."
- ✅ "The strongest home services franchises in this category share two traits: recurring service agreements and low inventory requirements."

- ❌ "Avoid [Brand Y] — the royalty structure is punishing."
- ✅ "Watch for royalty structures above 8% in this category — the margin math stops working at that level for most operators."

### Exception

The only permitted use of a brand name is in a direct, attributed quote from a third-party source, where the brand name is incidental and not the subject of evaluation. This is rare and should be avoided wherever possible.

---

## 3. Reader-First Writing (WIIFM)

Every article must be written from the reader's perspective: *"What does this mean for me and my decision?"*

### Requirements

- **Lead with the reader's problem, not the topic.** The opening paragraph names the tension, question, or decision the reader is actually facing — not a broad overview of the subject.
- **Answer before explaining.** Give the direct answer or position early. The explanation follows. Do not build toward a conclusion — state it, then support it.
- **Use "you" language.** Write to the reader directly. Avoid third-person constructions like "franchise buyers should consider..." in favor of "here's what to look for."
- **Concrete over conceptual.** Every principle must land on something specific and actionable. If a section ends without the reader knowing what to *do* or *look for*, revise it.
- **No credential-building.** Do not write to demonstrate expertise. Write to transfer usefulness. The reader does not care that this is complex — they care what to do next.

### Tone

- Direct. No hedging phrases: "it's important to note," "many experts believe," "it's worth considering."
- Confident but honest. If something depends on factors specific to the reader, say so plainly rather than softening with qualifications.
- Treats the reader as a capable adult making a real business decision, not a layperson needing reassurance.

---

## 4. SEO and AEO Optimization

All articles must be written to perform in both traditional search (SEO) and answer-engine formats (AEO — AI-generated answers, featured snippets, voice results).

### SEO requirements

- **One clear primary keyword or phrase per article.** It should appear naturally in the title, the opening paragraph, and at least one subheading. Do not stuff — one well-placed instance per section is sufficient.
- **Title format:** Plain, descriptive, no punctuation tricks. The title should match what a person would actually search for.
- **Subheadings (H2s) are questions or clear descriptors.** Subheadings like "What Actually Matters in an FDD" outperform vague ones like "Key Considerations."
- **Excerpt is search-snippet-ready.** The excerpt field (used in metadata) should be a self-contained 1–2 sentence answer. If someone sees only the excerpt, they should get value from it.
- **Internal links.** Every article links to at least one other resource page via the `relatedSlugs` system. Body copy CTAs link to `/book`. No orphaned articles.
- **No keyword cannibalization.** Before writing a new article, check the existing pool. Do not write a piece that targets the same primary keyword as an existing article — expand or differentiate instead.

### AEO requirements

Answer engines (ChatGPT, Perplexity, Google AI Overviews) favor content that directly answers specific questions in a structured, scannable format.

- **Answer the title question within the first 2 paragraphs.** AI systems extract the direct answer. Burying it loses the attribution.
- **Use plain-language definitions when introducing concepts.** "The FDD, or Franchise Disclosure Document, is..." gives AI systems a quotable definition.
- **Short, self-contained paragraphs.** Each paragraph should make one complete point. Avoid block paragraphs.
- **Concrete specifics over generalizations.** AI systems prefer quotable, specific claims over vague ones. "Restoration franchises generate demand from insurance claims, not marketing spend" extracts cleanly. "Restoration franchises can be a good choice" does not.
- **No date-dependent claims without a date qualifier.** "As of [year]" protects against content becoming inaccurate in AI training data.

---

## 5. Related Article Library

Every article published on waypointfranchise.com participates in the related-article system. This is both a reader experience requirement and an SEO internal-linking requirement.

### Requirements for every new article

1. **`relatedSlugs` frontmatter must be populated** with exactly 3 slugs before the article is published. All 3 must exist in `content/articles/`. See `content/new-article-checklist.md` for the current article pool.

2. **Related slugs must be chosen on editorial merit**, not category proximity. Ask: *"If a reader just finished this article, what are the three most valuable next reads?"* Category overlap is fine as a secondary factor, not a primary one.

3. **No closed loops between two articles.** If Article A lists Article B, Article B should not list Article A as its *only* return. It can appear — it just shouldn't be the only path back.

4. **The new article must be added to at least one existing article's `relatedSlugs`.** Review the existing pool and identify where the new article is a meaningfully better fit than one of the current three references. Replace the weakest match if so.

5. **Update `content/new-article-checklist.md`** by adding the new slug and category to the article pool table. This keeps the reference current for future agents and writers.

### Why this matters

Each article's 3 related links = 3 contextual internal links pointing to other content. Across 28 articles that's 84 links distributing authority across the content cluster. As the library grows, this compounds. Skipping the related-slug requirement on a new article breaks the graph.

---

## Pre-Publication Checklist

Before any article is considered complete, verify all of the following:

- [ ] No profitability language of any kind (Section 1)
- [ ] No brand names in body copy, headings, excerpt, or metadata (Section 2)
- [ ] Opens with the reader's problem, not a topic overview (Section 3)
- [ ] Direct answer or position stated in first 2 paragraphs (Section 3)
- [ ] Primary keyword appears in title, opening paragraph, and at least one H2 (Section 4)
- [ ] Excerpt is self-contained and search-snippet-ready (Section 4)
- [ ] `relatedSlugs` contains exactly 3 valid slugs from the current pool (Section 5)
- [ ] New article slug added to at least 1 existing article's `relatedSlugs` (Section 5)
- [ ] Article pool table in `new-article-checklist.md` updated (Section 5)
- [ ] Page renders correctly at `localhost:3000/resources/{slug}` with Keep Reading section visible
- [ ] No date-sensitive claim exists without an "as of [year]" qualifier (Section 6)
- [ ] Each section passes the Island Test — it can be read alone without the rest of the article (Section 7)
- [ ] Any article comparing two or more options includes a comparison table (Section 8)
- [ ] Article with 3+ factual claims uses a `faqs:` frontmatter block with 4 questions (Section 9)
- [ ] No FDD item numbers appear anywhere in the article — concepts only, never labels (Section 10)
- [ ] No em dashes (—) anywhere in the article body, FAQs, or excerpt (Section 11)

---

## Section 6 — Freshness and Date Qualification

### Rule: Anchor time-sensitive facts to a year

Any claim that can change year over year must include an "as of [year]" qualifier inline. Do not add the qualifier as a footnote or endnote — it must be part of the sentence containing the claim.

**Date qualification is required for any claim involving:**
- Investment ranges (franchise fees, total investment, working capital minimums)
- Financing parameters (SBA down payment %, loan caps, credit score thresholds)
- Brand or system counts ("4,000+ franchise brands in the US")
- Regulatory timelines or legal requirements
- Any statistic sourced from a third-party study

**Date qualification is NOT required for:**
- Structural explanations (how an FDD works, what Items 19 and 20 contain)
- Strategic advice and frameworks
- Historical references (what happened in 2008, what the 2020 closures looked like)
- Process steps that are definitional rather than market-driven

### Freshness review cadence

| Content type | Review cadence |
|---|---|
| Investment and cost articles | Every 12 months (or when FTC updates) |
| Financing articles (SBA, ROBS) | Every 12 months |
| Category analysis (home services, B2B, fitness) | Every 18 months |
| Process/structural articles (FDD, Discovery Day, agreements) | Every 24 months or when regulation changes |
| Strategic/mindset articles | No scheduled review |

---

## Section 7 — The Island Test

Every **section** in an article (every block between two H2 headings, and every FAQ Q&A) must pass the Island Test:

**A section passes the Island Test if a reader who sees only that section — with no other context — understands the point and has enough information to act on it or move forward.**

This is not just a readability principle. It is an extraction principle. AI systems and featured snippets frequently pull single sections or single Q&A blocks out of an article. If a section requires context from an earlier section to make sense, it will fail when extracted.

**Practical checks:**
- Does the section define or briefly restate any key terms it uses, even if they were introduced earlier?
- Does the section end with a conclusion or takeaway — not just data?
- Would a reader arriving mid-article on this section still understand what point is being made?

If the answer to any of these is no, revise the section before publication.

---

## Section 8 — Comparison Content

When an article naturally discusses two or more options (e.g., SBA vs. ROBS, owner-operator vs. semi-absentee, brick-and-mortar vs. asset-light), a comparison table is required.

### Comparison table format

| Dimension | Option A | Option B |
|---|---|---|
| [Factor 1] | [A's position] | [B's position] |
| [Factor 2] | [A's position] | [B's position] |

Include at minimum 4 dimensions. Use rows that highlight trade-offs, not rows that make one option look definitively better. The goal is honest, extractable comparison — not advocacy.

**The comparison table must appear before or alongside the narrative, not only after.** A table buried at the bottom of 1,500 words of prose will not be extracted by AI systems effectively. If possible, lead with the table.

---

## Section 10 — No FDD Item Numbers

**This is a hard rule with no exceptions.**

Waypoint content must never reference Franchise Disclosure Document sections by their numbered labels (Item 1, Item 6, Item 7, Item 19, Item 20, Item 21, etc.). Franchise candidates — the actual audience for this content — do not know what these labels mean. Using them creates friction, signals insider jargon, and fails the Island Test.

### The rule

Do not name the item. Explain the concept.

**Every FDD item has a plain-language equivalent. Use that instead:**

| Never use | Use instead |
|---|---|
| Item 6 | the franchise fee and royalty structure |
| Item 7 | the total investment range (what it costs to open) |
| Item 19 | the financial performance data franchisors may disclose for existing units |
| Item 20 | how many franchisees have left the system, and how recently |
| Item 21 | the franchisor's audited financial statements |
| "the FDD" as shorthand for everything | "the franchise disclosure document" (spell it out on first use) |

### Examples

- ❌ "Item 19 disclosures show average unit revenue of $450,000."
- ✅ "Franchisors that disclose financial performance data for existing units show average unit revenue of $450,000."

- ❌ "Check Item 20 before deciding on a brand."
- ✅ "Before choosing a brand, find out how many franchisees have left the system in the last three years and why."

- ❌ "Investment figures are disclosed in Item 7 of the FDD."
- ✅ "Investment figures are disclosed in the franchise disclosure document the franchisor is required to share before you sign."

### Why this rule exists

The reader is evaluating franchise ownership for the first time. They have not read an FDD. They do not know what Item 19 means. When we use item numbers, we are writing for insiders, not for the person who actually needs this content. The content fails them. It also fails AI extraction, because AI systems cannot substitute a plain-language explanation when it finds only a numbered label.

### Exception

**`fdd-decoded-what-actually-matters.md` is the only article exempt from this rule.** That article is a structural guide to the Franchise Disclosure Document itself. It uses item numbers as navigation landmarks because the entire purpose of the article is to explain what each section of the FDD contains. Item numbers are the subject matter, not jargon. All other articles must follow the no-item-numbers rule without exception.

---

## Section 11 — No Em Dashes

**This is a hard rule with no exceptions.**

Em dashes (—) are prohibited in all Waypoint article content: body copy, headings, excerpts, FAQ answers, and frontmatter.

### Why

Em dashes create sentence structures that are harder to parse, harder for AI systems to extract cleanly, and easier to overuse in ways that interrupt reading flow. They are also a common marker of AI-generated content, which signals to readers and search engines that the content may not be human.

### What to do instead

- If the em dash is separating a parenthetical thought, use parentheses or restructure into two sentences.
- If the em dash is introducing a list or elaboration, use a colon or start a new sentence.
- If the em dash is connecting two independent clauses, use a period or a comma with a conjunction.

**Examples:**

- ❌ "The royalty — which is taken from gross revenue — applies every month."
- ✅ "The royalty is taken from gross revenue and applies every month."

- ❌ "The decision is straightforward — start with fit, then model the financials."
- ✅ "The decision is straightforward: start with fit, then model the financials."

### Verification

Before committing any article, run: `grep -c "—" filename.md` and confirm the result is 0.

---

## Section 12 — FDD Item References in Downloadable Assets

This rule applies to **checklists, guides, PDF-formatted documents, and any downloadable asset** stored in `content/downloads/`. It does not apply to articles (which follow Section 10).

### The rule

Downloadable assets may reference FDD items by their numbered label (Item 7, Item 19, Item 20, etc.), but every numbered reference must include an inline explanation in the same sentence or phrase. The label is permitted as navigation shorthand because a reader with the FDD in hand will be cross-referencing it directly. The explanation is required because the reader may not yet know what that item contains.

**Required format:** `Item [N] (the section that [plain-language description])`

### Reference table — use these explanations verbatim

| Label | Required inline explanation |
|-------|----------------------------|
| Item 7 | the section of the franchise disclosure document that details the total estimated investment required to open |
| Item 19 | the section where franchisors may voluntarily disclose financial performance data for existing units |
| Item 20 | the section that shows how many franchisees have left the system, and how recently |
| Item 21 | the section containing the franchisor's audited financial statements |
| Item 6 | the section detailing the franchise fee, royalty rate, and ongoing required fees |

### Examples

- ❌ `Have you reviewed Item 7 of the FDD?`
- ✅ `Have you reviewed Item 7 (the section of the franchise disclosure document that details the total estimated investment required to open)?`

- ❌ `Look at Item 19 data before deciding.`
- ✅ `Look at Item 19 (the section where franchisors may voluntarily disclose financial performance data for existing units) before deciding.`

### Why this differs from articles

Articles (Section 10) ban Item numbers entirely because the reader is a first-time visitor who does not have the FDD in front of them. A checklist reader is typically in or near the due diligence phase and may be using the checklist alongside the actual document. The label helps them navigate. The explanation ensures they are never left without context.

### Applies to all asset types

This rule applies to: checklists, buyer guides, one-pagers, email sequences, and any other non-article asset that contains instructional content about evaluating a franchise.
