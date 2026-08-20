# Follow-ups deferred from the /llms.txt generation work (2026-08-20)

Branch `feat/llms-txt-generated`. Kelsey scoped that change to "llms.txt + the
drift gate", with adjacent issues written up rather than fixed. This is that
write-up. Each item was verified this session; none is a hypothesis.

## Reachability gaps in the markdown views (the reason llms.txt links 19 guides directly)

- `financingMarkdown()` (`src/lib/markdown-views.ts`) emits **no per-guide links
  at all**, so the 3 pages under `/franchise-financing/<slug>` are unreachable
  from `/franchise-financing.md`.
- `industryMarkdown()` never links its own `/cost` page, so the 8 cost guides are
  unreachable from their industry page.
- Together that left 11 real pages reachable from the markdown graph by no number
  of hops. `/llms.txt` now links them directly, which papers over the gap for
  agents entering through the index but not for one entering at
  `/franchise-financing.md`. Fixing the views is the real repair.

## Sitemap

- `src/app/sitemap.ts` omits three indexable pages: `/guide`, `/ai-fdd-reader`,
  `/pitch-decoder`. All three are self-canonical with OpenGraph and WebPage
  JSON-LD, so the omission looks unintended. They need real `lastModified` dates,
  not `new Date()`, per the comment in that file.
- Once they are added, `tests/unit/llms-index.test.ts` can grow a sitemap-parity
  assertion against `staticPages`. It was deliberately left out because it would
  have failed on day one and dragged sitemap work into a scoped PR.

## Canonical origin

- `src/app/feed.xml/route.ts` defaults to the **non-www** apex, the only such
  divergence left, and puts a 301 hop on every RSS item URL. It also sets no
  `dynamic` / `revalidate`.
- `src/lib/pdf-magnet-email.ts` hardcodes a non-www `/book`.
- Both are exempt from the `verify-schema.mjs` non-www guard. The `/llms.txt`
  exemption was removed in this work; these two remain.

## `verify-schema.mjs` scan set

- `EXTRA_FILES` is a hand-maintained list of `src/lib` files to scan for non-www
  URLs. Nothing fails when a new `src/lib/*.ts` starts emitting site links and is
  not added, which is the same drift shape the llms.txt gate exists to kill. A
  scan of all of `src/lib` with an explicit exemption for
  `pdf-magnet-email.ts` would close it.

## Grammar bug shared by three files

- `"How Much Does a ${industry.name} Franchise Cost?"` renders "a Express Car
  Wash". Present in `markdown-views.ts` (`industryCostMarkdown`),
  `src/app/(marketing)/industries/[slug]/page.tsx`, and
  `industries/[slug]/cost/opengraph-image.tsx`. `/llms.txt` fixes only its own
  copy; a shared helper would fix all four.

## Other

- `next.config.ts`'s `Vary: Accept` header omits `/industries` and
  `/franchise-financing`, both of which the middleware does negotiate.
- The `/glossary` index metadata says "90+ Key Terms" against an actual 99.
- No test covers `sitemap.ts`, `robots.txt`, `llms-full.txt` or `feed.xml`.
  `route-inventory.mjs` inventories `page.*` files only, so `route.ts` handlers
  are outside the gate entirely.
