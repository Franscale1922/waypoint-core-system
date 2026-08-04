# Adversarial review — `seo/auv-cluster` and `seo/investment-selection-intent`

Run 2026-08-04. Both branches had been finished, pushed, and left unreviewed; the mandatory review
was the only thing blocking their PRs.

Written here rather than left in `.codex-reviews/` because that path is gitignored
(`.gitignore:60`), so findings left there are machine-local and effectively lost to the next session.
This path is tracked AND excluded from `vercel.json`'s `ignoreCommand`, so it costs no deploy.

| | |
|---|---|
| Baseline | `main` at `fe19d6f` |
| Reviewed | `seo/auv-cluster` `41e4bdd`, `seo/investment-selection-intent` `6ea160d` |
| Review fix | `f52281d` on the investment branch |
| Merged as | `c4dd163` (#24, AUV), and #25 (investment) |

---

## How it was run

**Codex, round 1 (senior-engineer persona), on the code branch only.** Three runs, each with its own
`--out` directory, because `scripts/codex-review.mjs:229` keys the findings path on `--round` alone
and same-round runs otherwise overwrite one another.

```bash
git diff main...HEAD > .codex-reviews/investment-branch.patch
node scripts/codex-review.mjs --target .codex-reviews/investment-branch.patch --round 1 --out .codex-reviews/investment-diff
node scripts/codex-review.mjs --target "src/app/(marketing)/investment/page.tsx" --round 1 --out .codex-reviews/investment-page
node scripts/codex-review.mjs --target src/app/components/InvestmentTierToggle.tsx --round 1 --out .codex-reviews/tier-toggle
```

**Reviewing the diff as a patch file is the part worth keeping.** The governance rule says to feed
Codex the diff, but `--target` on a source file reviews the whole file with no idea what changed, and
`--diff` is vacuous on a clean tree (it reviews nothing and returns a false all-clear). Writing the
diff to a patch and targeting that closes the gap without bypassing the wrapper. It was also the run
that found the two real defects.

Results: **0 high** across all three. Diff 0/3/0, page 0/3/3, toggle 0/3/2 (high/medium/low).

`seo/auv-cluster` got a **Claude pass only, labelled self-review and therefore the biased option**.
CLAUDE.md exempts content from external review and that branch is article prose plus glossary
strings. Nothing on it required a change.

---

## Fixed (branch-introduced in effect) — `f52281d`

Both defects share one root cause worth remembering: **four Q&As lived only in the FAQ schema on
`main` and rendered nowhere**, so their content had never been read against the rest of the page.
Making them visible is what the branch did, and it is what surfaced the conflicts. The text was
old; the contradiction was new.

1. **Liquid capital said three different things on one page.** Entry tier `$50K–$75K` cash, stat
   tile `$75K` floor, newly visible FAQ `$100,000` practical minimum. A buyer with $80K was told
   both that they qualified and that they did not. The same answer counted a rollable 401k as a
   liquid asset, which the Liquid Capital glossary entry explicitly denies (retirement accounts do
   not count toward a liquidity screen because reaching them needs a rollover first). Rewritten to
   agree with the tier table, the tile, and the glossary.
2. **Section 6 date qualification.** Required inline, in the sentence carrying the claim, for
   franchise fees and investment ranges. PR #21 dated this page, but that pass could not reach
   answers that were invisible when it ran. Cost, fee, and royalty answers now name the year. The
   buffer answer is deliberately left undated: Section 6 exempts strategic advice and structural
   explanation, which is all it contains.

---

## Logged, not fixed — pre-existing, verified real

Each was confirmed against the real code, not taken on Codex's word. All are present on `main` and
untouched by these branches. Folding unrelated repairs into an SEO branch is how a clean diff becomes
a risky one.

**`src/app/(marketing)/investment/page.tsx`**
- **Nested `<main>` landmarks.** The marketing layout renders `<main>` (`layout.tsx:95`) and the page
  renders another (`page.tsx:178`). Confirmed in the DOM: 2 mains, 1 nested. Invalid, and ambiguous
  for screen-reader landmark navigation. **Likely affects every marketing page, not just this one.**
- Investment tiers are mathematically inconsistent: $250K total fits no tier, $750K fits two.
- `LAST_REVIEWED` and `LAST_REVIEWED_LABEL` are two independently maintained constants for one date;
  updating only the ISO value silently desyncs crawler-visible `dateModified` from the human label.
- "Franchise fee is the smallest line item" is contradicted by the page's own ranges.
- Several 10–12px styles fail WCAG AA: `#7a7a7a` is 4.29:1 on white, 4.05:1 on `#FAF8F4`; `#7a7a6a`
  is 4.36:1 on white. All below 4.5:1.

**`src/app/components/InvestmentTierToggle.tsx`** (the branch changed one line of prose in this file)
- Inactive mode content is hidden visually only, so screen readers get both modes at once, including
  every "Cash required" badge while in investment mode.
- The custom radio group has no radio keyboard behaviour: both controls stay Tab stops, and Arrow /
  Home / End do not move selection.
- Fixed expanded heights clip real content at narrow widths.
- Reduced-motion handling never matches: the media query disables `.animate-range`, but
  `AnimatedRange` carries no such class.
- Neither toggle button sets `type="button"`, so rendering this component inside a form would make
  either control submit it.

---

## The gap worth acting on separately

**Nothing in the harness would have caught either defect class these branches fixed.** Verified, not
assumed:

- `scripts/aeo-audit.mjs` reads `content/*.md` only. It never looks at `src/`, so it cannot see a
  page-level FAQ at all.
- `scripts/verify-schema.mjs` checks JSON-LD invariants (canonical www hosts, `@id` refs, no review
  markup). It never compares schema against visible copy.
- `scripts/verify-links.mjs` validates only `relatedSlugs` frontmatter in `.md` files. It checks
  neither `.tsx` hrefs nor inline markdown links, so both AUV inbound links were unguarded (they were
  verified by hand against production markup instead).

So the investment fix is sound for this page but not structurally enforced: the comment claiming the
drift "cannot recur" is true of this page only. The natural home for a schema-vs-visible parity gate
is `verify-schema.mjs`. **Deliberately not built here** — standing up that infrastructure is scoped
work to agree, not something to bolt onto an SEO branch.

---

## Evidence

Everything below was observed this session, not carried over.

- **Rendered DOM, `/investment` after the fix:** one FAQPage node; 8 schema questions against 8
  visible questions with zero mismatch in either direction; zero `Item <n>` strings anywhere in
  rendered text; zero em dashes. The rendered check is load-bearing here: last session it was the
  only thing that caught an `Item 7` string inside the child component, which a file grep of the page
  missed.
- **Rendered DOM, `/glossary/average-unit-volume-auv`:** 6 questions in both the visible H2s and the
  schema, zero mismatch; zero item numbers; zero em dashes; the invented "15% vs 8% operating
  margins" illustration absent. Confirms the "six total" claim (5 entries plus the synthetic heading).
- **Inbound links:** both source articles return 200 and contain the AUV link; the target returns 200.
- **Commit claims re-counted:** 3 item-number occurrences removed from the AUV entry; article inbound
  links exactly 2 to 4 (the 5th hit is `keyword-map.md`, not an article).
- **Gates, both branches:** `npm test` exit 0; `aeo-audit` exit 0 and byte-identical to the `main`
  baseline; `npx tsc --noEmit` at the same 37 pre-existing errors in the same three `tests/unit/`
  files as `main`, so neither branch adds a type error.
