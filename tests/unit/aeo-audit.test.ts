import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditArticle,
  auditAll,
  classifyMetaDescription,
  collectDataDescriptions,
  collectDataTitles,
  countRenderedEmDashes,
  hardCodesBrand,
  scanCodeEmDashes,
  stripCodeFences,
  EXCERPT_MAX,
  TITLE_BUDGET,
} from "../../scripts/aeo-audit.mjs";

/**
 * aeo-audit.mjs is the pre-push gate (.githooks/pre-push runs it first and
 * blocks on a non-zero exit) and enforces CONTENT-STANDARDS Sections 11 and 14.
 *
 * The bug class these tests exist to prevent is NOT "a violation slipped
 * through". It is "the checker silently stopped checking and still printed
 * PASS" — the same failure verify-links.mjs was rewritten to eliminate after its
 * regex matched nothing in all 45 articles and reported green for months. Two
 * concrete instances were live in this repo when these tests were written:
 *
 *   1. The em-dash gate counted only the literal U+2014, so `&mdash;` in the
 *      public contact hero and two email footers, plus a \u2014 escape in a live
 *      prompt, all reported "PASS Section 11: 0 em dashes".
 *   2. The description gate opened only page.tsx and only understood a
 *      2-space-indented double-quoted literal, so the 168-character site-wide
 *      description in src/app/layout.tsx and five over-length src/data values
 *      were never measured, while it printed "31/31" and PASS.
 *
 * So throughout, the load-bearing assertion is that the audit EXAMINED
 * something — a non-zero measured/scanned count — not merely that it returned no
 * failures. A checker that inspects nothing must go red here, not green.
 */

const EMDASH = String.fromCharCode(0x2014);

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "aeo-audit-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A well-formed article, so a fixture only has to vary the thing under test. */
function article({
  title = "A Perfectly Ordinary Title",
  excerpt = "x".repeat(155),
  faqs = 4,
  related = 3,
  body = "## What is this?\n\nBody text.\n",
  eol = "\n",
}: Partial<{
  title: string;
  excerpt: string;
  faqs: number;
  related: number;
  body: string;
  eol: string;
}> = {}): string {
  const lines = ["---", `title: "${title}"`, `excerpt: "${excerpt}"`, "relatedSlugs:"];
  for (let i = 0; i < related; i++) lines.push(`  - "other-${i}"`);
  lines.push("faqs:");
  for (let i = 0; i < faqs; i++) {
    lines.push(`  - q: "Question ${i}?"`);
    lines.push(`    a: "Answer ${i}."`);
  }
  lines.push("---", "", body);
  return lines.join(eol);
}

/**
 * Build a minimal repo layout so auditAll() can run against fixtures.
 *
 * The returned keys are exactly auditAll's parameter names. That is deliberate:
 * an earlier draft returned {articles, app, data, code}, which auditAll silently
 * ignored in favour of the REAL repo defaults, so every fixture test was
 * asserting against production content without saying so. Never cast this object
 * to `never`/`any` at the call site; the type error is the only thing that
 * catches that mistake.
 */
function repo(): { articlesDir: string; appDir: string; dataDir: string; codeDirs: string[] } {
  const articlesDir = join(dir, "articles");
  const appDir = join(dir, "app");
  const dataDir = join(dir, "data");
  const codeDir = join(dir, "code");
  for (const d of [articlesDir, appDir, dataDir, codeDir]) mkdirSync(d, { recursive: true });
  return { articlesDir, appDir, dataDir, codeDirs: [codeDir] };
}

/** A repo fixture that already contains one clean article. */
function repoWithArticle() {
  const dirs = repo();
  writeFileSync(join(dirs.articlesDir, "alpha.md"), article());
  return dirs;
}

// ─── Finding 3: CRLF ────────────────────────────────────────────────────────

describe("front matter parsing survives a CRLF checkout", () => {
  it("reads a CRLF article identically to an LF one", () => {
    const lf = auditArticle(article({ eol: "\n" }), "a.md");
    const crlf = auditArticle(article({ eol: "\r\n" }), "a.md");

    // The old `/^---\n([\s\S]*?)\n---\n/` regex failed outright on CRLF, so the
    // whole file became "body": faqCount 0, excerptLen null, relCount 0. That is
    // a false FAILURE on a clean checkout, which is why it must be asserted
    // against real values rather than merely "the two are equal".
    expect(crlf.faqCount).toBe(4);
    expect(crlf.excerptLen).toBe(155);
    expect(crlf.relCount).toBe(3);
    expect(crlf.parseError).toBeNull();

    expect(crlf.faqCount).toBe(lf.faqCount);
    expect(crlf.excerptLen).toBe(lf.excerptLen);
    expect(crlf.relCount).toBe(lf.relCount);
  });
});

// ─── Finding 4: excerpt parsing ─────────────────────────────────────────────

describe("excerpt length is parsed, not regexed", () => {
  it("measures a single-quoted excerpt instead of calling it unparseable", () => {
    const raw = ["---", "title: \"T\"", "excerpt: 'a single quoted excerpt'", "---", "", "Body.\n"].join("\n");
    expect(auditArticle(raw, "a.md").excerptLen).toBe("a single quoted excerpt".length);
  });

  it("measures a folded block scalar", () => {
    const raw = ["---", 'title: "T"', "excerpt: >-", "  folded across", "  two lines", "---", "", "Body.\n"].join("\n");
    expect(auditArticle(raw, "a.md").excerptLen).toBe("folded across two lines".length);
  });

  it("counts an escaped quote as one character, not as the end of the value", () => {
    // The old non-greedy `"([\s\S]*?)"` stopped at the first inner quote, so an
    // excerpt containing a quotation measured far shorter than it renders and
    // could sail under the 160 limit while truncating in search.
    const raw = ['---', 'title: "T"', 'excerpt: "He said \\"no\\" firmly."', "---", "", "Body.\n"].join("\n");
    expect(auditArticle(raw, "a.md").excerptLen).toBe('He said "no" firmly.'.length);
  });

  it("reports a missing excerpt as unmeasured rather than as length zero", () => {
    const raw = ["---", 'title: "T"', "---", "", "Body.\n"].join("\n");
    expect(auditArticle(raw, "a.md").excerptLen).toBeNull();
  });

  it("surfaces malformed YAML instead of silently treating it as empty", () => {
    const raw = ["---", 'title: "T"', "faqs: [unclosed", "---", "", "Body.\n"].join("\n");
    expect(auditArticle(raw, "a.md").parseError).toContain("not valid YAML");
  });
});

// ─── Finding 5: FAQ scoping ─────────────────────────────────────────────────

describe("FAQ count is scoped to the faqs field", () => {
  it("does not let a q: key in an unrelated list stand in for a FAQ block", () => {
    // The old global `/^\s*-\s*q:/gm` counted every `- q:` anywhere in front
    // matter, so an unrelated list could mask a completely missing FAQ block.
    const raw = [
      "---",
      'title: "T"',
      'excerpt: "e"',
      "sidebar:",
      '  - q: "not a real faq"',
      '  - q: "nor this"',
      '  - q: "nor this either"',
      '  - q: "still not"',
      "---",
      "",
      "Body.\n",
    ].join("\n");

    const row = auditArticle(raw, "a.md");
    expect(row.faqCount).toBe(0); // the article genuinely has no faqs block
    expect(row.faqsMalformed).toBe(false);
  });

  it("counts entries inside the faqs block", () => {
    expect(auditArticle(article({ faqs: 4 }), "a.md").faqCount).toBe(4);
    expect(auditArticle(article({ faqs: 2 }), "a.md").faqCount).toBe(2);
  });

  it("flags a faqs field that is present but not a list", () => {
    const raw = ["---", 'title: "T"', 'faqs: "nope"', "---", "", "Body.\n"].join("\n");
    const row = auditArticle(raw, "a.md");
    expect(row.faqsMalformed).toBe(true);
    expect(row.faqCount).toBe(0);
  });
});

// ─── Finding 2: em dashes that render but are not the character ─────────────

describe("em dash detection covers every rendering form", () => {
  it("counts the literal character", () => {
    expect(countRenderedEmDashes(`a ${EMDASH} b`)).toBe(1);
  });

  it.each([
    ["&mdash;", "named HTML entity"],
    ["&#8212;", "decimal HTML entity"],
    ["&#x2014;", "hex HTML entity"],
    ["\\u2014", "JS string escape"],
    ["\\u{2014}", "ES6 code point escape"],
    ["String.fromCharCode(0x2014)", "constructed at runtime"],
  ])("counts %s (%s)", (form) => {
    expect(countRenderedEmDashes(`copy ${form} more copy`)).toBe(1);
  });

  it("counts each occurrence, not just the first", () => {
    // The live contact-page violation was two &mdash; on one line.
    expect(countRenderedEmDashes("a &mdash; b &mdash; c")).toBe(2);
  });

  it("does not fire on an en dash or a hyphen", () => {
    expect(countRenderedEmDashes("5\u20130 range, well-known")).toBe(0);
  });

  it.each([
    ["&MDASH;", "HTML5 named references are case-sensitive, so this is literal text"],
    ["\\U2014", "\\U is not a JavaScript escape; this renders U2014"],
  ])("does not fire on %s (%s)", (form) => {
    // A gate that fails on a string containing no em dash cannot be satisfied by
    // rewording, which makes a false positive here worse than useless.
    expect(countRenderedEmDashes(`copy ${form} more copy`)).toBe(0);
  });

  it("still accepts the case variants that genuinely render", () => {
    expect(countRenderedEmDashes("a &#X2014; b")).toBe(1);
    expect(countRenderedEmDashes("a String.fromCharCode(0X2014) b")).toBe(1);
  });

  it("finds an em dash in front matter, not only in the body", () => {
    // Section 11 names front matter explicitly; the old scan read `body` only.
    const raw = ["---", `title: "Alpha &mdash; Beta"`, 'excerpt: "e"', "---", "", "Clean body.\n"].join("\n");
    expect(auditArticle(raw, "a.md").emdash).toBe(1);
  });

  it("finds an em dash in a FAQ answer", () => {
    const raw = ["---", 'title: "T"', "faqs:", '  - q: "Q?"', `    a: "Yes &mdash; always."`, "---", "", "Body.\n"].join("\n");
    expect(auditArticle(raw, "a.md").emdash).toBe(1);
  });

  it("still honours the per-line emdash-allow opt-out", () => {
    const { codeDirs } = repo();
    writeFileSync(
      join(codeDirs[0], "detector.ts"),
      [
        `const banned = ["${EMDASH}"]; // emdash-allow: functional detector pattern`,
        `const copy = "real &mdash; violation";`,
      ].join("\n"),
    );

    const hits = scanCodeEmDashes(codeDirs);
    expect(hits).toHaveLength(1);
    // Exactly one: the opted-out detector line is skipped, the copy line is not.
    expect(hits[0].count).toBe(1);
  });

  it("scans every text-bearing extension under src, not just tsx and css", () => {
    // .mjs, .js, .jsx and .json were silently exempt, and src/ contains data
    // files of exactly those kinds.
    const { codeDirs } = repo();
    for (const [name, body] of [
      ["a.tsx", "const x = <p>a &mdash; b</p>;"],
      ["b.css", `/* a ${EMDASH} b */`],
      ["c.mjs", "export const s = 'a &mdash; b';"],
      ["d.json", '{"s": "a &mdash; b"}'],
      ["e.jsx", "const y = 'a &mdash; b';"],
      ["f.md", "a &mdash; b"], // markdown is handled by the article scan, not here
    ] as const) {
      writeFileSync(join(codeDirs[0], name), body);
    }

    const files: string[] = scanCodeEmDashes(codeDirs).map((r: { f: string }) => r.f);
    expect(files).toHaveLength(5);
    expect(files.some((f: string) => f.endsWith("f.md"))).toBe(false);
  });

  it("decodes a CSS hex escape, and only in CSS", () => {
    // `content: "\2014"` renders an em dash. The same characters in TypeScript
    // are not one, so applying the CSS rule everywhere would be a false positive.
    const { codeDirs } = repo();
    writeFileSync(join(codeDirs[0], "a.css"), 'a::after { content: "\\2014"; }');
    writeFileSync(join(codeDirs[0], "b.ts"), 'const octalish = "\\2014";');

    const hits = scanCodeEmDashes(codeDirs);
    expect(hits).toHaveLength(1);
    expect(hits[0].f.endsWith("a.css")).toBe(true);
  });
});

// ─── Finding 6: headings inside fenced code blocks ──────────────────────────

describe("markdown structure ignores fenced code blocks", () => {
  it("does not count a heading inside a code fence", () => {
    const fence = "```";
    const body = [
      "## A real heading?",
      "",
      `${fence}markdown`,
      "## not a real heading",
      "## nor this one",
      fence,
      "",
      "Text.",
    ].join("\n");

    const row = auditArticle(article({ body }), "a.md");
    expect(row.h2).toBe(1);
    expect(row.h2q).toBe(1);
  });

  it("handles tilde fences and longer backtick runs", () => {
    const body = ["~~~", "## hidden", "~~~", "````", "## also hidden", "````", "## Visible?"].join("\n");
    expect(auditArticle(article({ body }), "a.md").h2).toBe(1);
  });

  it("does not let a fence line with an info string close the block", () => {
    // CommonMark: a closing fence carries no info string. Treating ```not-a-close
    // as a close ends the block early, counts the sample heading after it, AND
    // shifts the real closing fence into an opening one, which then swallows the
    // genuine headings.
    //
    // The counts must differ between correct and broken behaviour or this test
    // proves nothing: correct gives 2 (both real headings), broken gives 1
    // (the sample heading, with the real ones hidden inside a phantom fence).
    const fence = "```";
    const body = [
      `${fence}js`,
      "## hidden one",
      `${fence}not-a-close`,
      "## hidden two",
      fence,
      "## Visible one?",
      "## Visible two?",
    ].join("\n");

    const row = auditArticle(article({ body }), "a.md");
    expect(row.h2).toBe(2);
    expect(row.h2q).toBe(2);
  });

  it("counts an indented heading, which CommonMark allows", () => {
    const body = ["  ## Indented question?", "text"].join("\n");
    const row = auditArticle(article({ body }), "a.md");
    expect(row.h2).toBe(1);
    expect(row.h2q).toBe(1);
  });

  it("leaves ordinary prose untouched", () => {
    expect(stripCodeFences("## One\n\ntext\n\n## Two")).toBe("## One\n\ntext\n\n## Two");
  });
});

// ─── Finding 7: the as-of placeholder ───────────────────────────────────────

describe("date qualifier vs unfilled placeholder", () => {
  it("counts a real year as a date qualifier", () => {
    const row = auditArticle(article({ body: "Fees are typical as of 2026." }), "a.md");
    expect(row.hasAsOf).toBe(true);
    expect(row.asOfPlaceholder).toBe(false);
  });

  it("treats an unfilled [year] placeholder as broken copy, not as coverage", () => {
    // The old single regex alternated 20\d\d with \[year\], so shipping the
    // literal template placeholder IMPROVED the reported coverage.
    const row = auditArticle(article({ body: "Fees are typical as of [year]." }), "a.md");
    expect(row.hasAsOf).toBe(false);
    expect(row.asOfPlaceholder).toBe(true);
  });

  it("fails the run when a placeholder ships", () => {
    const dirs = repoWithArticle();
    writeFileSync(join(dirs.articlesDir, "beta.md"), article({ body: "Correct as of [year]." }));
    const result = auditAll(dirs);
    expect(result.asOfPlaceholders).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("as of [year]");
  });
});

// ─── Finding 1: description resolution, fail closed ─────────────────────────

describe("meta description classification", () => {
  it("resolves a plain double-quoted literal", () => {
    const src = `export const metadata: Metadata = {\n  description: "hello",\n};`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: 5 });
  });

  it("resolves single quotes, backticks and odd indentation", () => {
    for (const src of [
      `export const metadata = {\n  description: 'hello',\n};`,
      "export const metadata = {\n  description: `hello`,\n};",
      `export const metadata = {\n        description: "hello",\n};`,
      `export const metadata = {\n  description:\n    "hello",\n};`,
    ]) {
      expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: 5 });
    }
  });

  it("ignores a nested openGraph description and reads the top-level one", () => {
    // The old implementation relied on a two-space indent to mean "top level".
    // Depth tracking makes that robust to formatting.
    const src = [
      "export const metadata = {",
      '  description: "top",',
      "  openGraph: {",
      '    description: "a much longer nested description that should not be measured",',
      "  },",
      "};",
    ].join("\n");
    expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: 3 });
  });

  it("finds a top-level description declared after a nested object", () => {
    const src = [
      "export const metadata = {",
      "  openGraph: { description: 'nested' },",
      '  description: "top",',
      "};",
    ].join("\n");
    expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: 3 });
  });

  it("marks a variable reference unresolved rather than skipping it", () => {
    const src = `export const metadata = {\n  description: SITE_DESCRIPTION,\n};`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved", acknowledged: false });
  });

  it("marks an interpolated template literal unresolved", () => {
    const src = "export const metadata = {\n  description: `cost of ${name} here`,\n};";
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
  });

  it("marks generateMetadata unresolved", () => {
    const src = `export async function generateMetadata() {\n  return { description: "x" };\n}`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
  });

  it("reports a file with no metadata as absent, not as a violation", () => {
    expect(classifyMetaDescription("export default function Page() { return null; }")).toMatchObject({
      state: "absent",
    });
  });

  it("does not wave through a metadata export that is not an object literal", () => {
    // `export const metadata = buildMetadata(...)` still ships a description.
    // Classifying it "absent" would silently exempt the whole route, which is
    // the same fail-open shape as the page.tsx-only walker this replaced.
    for (const src of [
      "export const metadata = buildMetadata({ slug });",
      "export const metadata: Metadata = SHARED_METADATA;",
    ]) {
      expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved", acknowledged: false });
    }
  });

  it("does not let a spread hide or overwrite the description", () => {
    // `{ ...shared }` was classified absent, exempting the route entirely; and
    // `{ description: "short", ...shared }` measured 5 even though the spread can
    // replace it with 200. Both are unknowable from this file, so both must be
    // unresolved rather than quietly accepted.
    for (const src of [
      "export const metadata = { ...shared };",
      `export const metadata = { description: "short", ...shared };`,
    ]) {
      expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
    }
  });

  it("does not treat a shorthand description as absent", () => {
    // `const description = "..."; export const metadata = { description };`
    // ships a real description from a variable. Reading it as absent exempted
    // the entire route.
    const src = `const description = "x";\nexport const metadata = { description };`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
  });

  it("does not treat a computed property name as absent", () => {
    const src = `export const metadata = { ["desc" + suffix]: "x" };`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
  });

  it("sees generateMetadata exported as an arrow function", () => {
    const src = "export const generateMetadata = async () => ({ description: LONG });";
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
  });

  it("sees a re-exported metadata binding", () => {
    const src = `const metadata = { description: "x" };\nexport { metadata };`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
  });

  it("reads a quoted description key", () => {
    const src = `export const metadata = { "description": "${"z".repeat(200)}" };`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: 200 });
  });

  it("is not fooled by a commented-out generateMetadata", () => {
    // Source-text matching fired on this and blocked a push over a comment.
    const src = `// export function generateMetadata() {}\nexport const metadata = { description: "ok" };`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: 2 });
  });

  it("accepts a static value followed by a comment", () => {
    const src = `export const metadata = {\n  description: "fine" /* rationale */,\n};`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: 4 });
  });

  it("refuses to measure a concatenated description instead of under-counting it", () => {
    // Reading only the first operand reports 5 characters for a description
    // that renders far longer, so an over-limit value would pass. Must be
    // unresolved, not resolved-at-the-wrong-length.
    const src = `export const metadata = {\n  description: "short" + LONG_TAIL,\n};`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved" });
  });

  it("records the aeo-desc-dynamic acknowledgement", () => {
    const src = `// aeo-desc-dynamic: bounded upstream\nexport async function generateMetadata() { return {}; }`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "unresolved", acknowledged: true });
  });

  it.each([
    ["aeo-desc-dynamic", "bare token, no colon"],
    ["aeo-desc-dynamic:", "colon but no reason"],
    ["aeo-desc-dynamic:   ", "colon and whitespace only"],
  ])("does not accept %s as an acknowledgement (%s)", (token) => {
    // An escape hatch that costs nothing to invoke becomes the default. The note
    // has to actually say what bounds the length.
    const src = `// ${token}\nexport async function generateMetadata() { return {}; }`;
    expect(classifyMetaDescription(src)).toMatchObject({ acknowledged: false });
  });

  it("only accepts the waiver when it is written as a comment", () => {
    // Regexing raw source meant a string mentioning the token, including docs
    // about the token itself, waived an unrelated unbounded description.
    const inString = `const help = "aeo-desc-dynamic: how to use this";\nexport async function generateMetadata() { return {}; }`;
    expect(classifyMetaDescription(inString)).toMatchObject({ acknowledged: false });

    const inComment = `/* aeo-desc-dynamic: truncated upstream at 155 */\nexport async function generateMetadata() { return {}; }`;
    expect(classifyMetaDescription(inComment)).toMatchObject({ acknowledged: true });
  });
});

describe("the description gate fails closed", () => {
  it("discovers a page.jsx route, not just .tsx", () => {
    // Next.js accepts .js/.jsx/.ts/.tsx. Matching only .tsx let a jsx route with
    // an overlong description through while the surrounding .tsx routes kept
    // every anti-vacuity count healthy.
    const dirs = repoWithArticle();
    writeFileSync(
      join(dirs.appDir, "page.jsx"),
      `export const metadata = {\n  description: "${"x".repeat(EXCERPT_MAX + 40)}",\n};`,
    );

    const result = auditAll(dirs);
    expect(result.resolved).toHaveLength(1);
    expect(result.routeTooLong).toHaveLength(1);
  });

  it("measures layout.tsx, not only page.tsx", () => {
    // This is the exact live defect: a 168-character site-wide description in
    // src/app/layout.tsx that the page.tsx-only walker never opened.
    const dirs = repoWithArticle();
    writeFileSync(
      join(dirs.appDir, "layout.tsx"),
      `export const metadata = {\n  description: "${"x".repeat(EXCERPT_MAX + 8)}",\n};`,
    );

    const result = auditAll(dirs);
    expect(result.resolved).toHaveLength(1); // it actually looked at the file
    expect(result.routeTooLong).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("route description");
  });

  it("fails on an unresolvable description with no acknowledgement", () => {
    const dirs = repoWithArticle();
    writeFileSync(join(dirs.appDir, "page.tsx"), `export const metadata = {\n  description: SOME_CONST,\n};`);

    const result = auditAll(dirs);
    expect(result.unacknowledged).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("unacknowledged");
  });

  it("passes once that route is acknowledged", () => {
    const dirs = repoWithArticle();
    writeFileSync(
      join(dirs.appDir, "page.tsx"),
      `// aeo-desc-dynamic: bounded by the data layer\nexport const metadata = {\n  description: SOME_CONST,\n};`,
    );

    const result = auditAll(dirs);
    expect(result.unresolved).toHaveLength(1);
    expect(result.unacknowledged).toHaveLength(0);
    expect(result.failures).toEqual([]);
  });

  it("does not treat an admin page with no metadata as a violation", () => {
    const dirs = repoWithArticle();
    writeFileSync(join(dirs.appDir, "page.tsx"), "export default function Page() { return null; }");

    const result = auditAll(dirs);
    expect(result.absent).toHaveLength(1);
    expect(result.failures).toEqual([]);
  });
});

describe("data-layer metaDescription lengths", () => {
  it("measures values and flags the over-length ones", () => {
    const { dataDir } = repo();
    writeFileSync(
      join(dataDir, "industries.ts"),
      [
        "export const industries = [",
        `  { metaDescription: "${"x".repeat(EXCERPT_MAX + 13)}" },`,
        `  { metaDescription: "${"y".repeat(155)}" },`,
        "];",
      ].join("\n"),
    );

    const found = collectDataDescriptions(dataDir);
    expect(found).toHaveLength(2);
    expect(found[0].len).toBe(EXCERPT_MAX + 13);
    expect(found[1].len).toBe(155);
  });

  it("ignores a TypeScript shape declaration", () => {
    // `metaDescription: string;` in a type alias is not a value. Reporting it as
    // unreadable would fail every push on a false positive.
    const { dataDir } = repo();
    writeFileSync(
      join(dataDir, "industries.ts"),
      [
        "export type Industry = {",
        "  slug: string;",
        "  metaDescription: string;",
        "};",
        "export const all = [",
        `  { metaDescription: "${"x".repeat(151)}" },`,
        "];",
      ].join("\n"),
    );

    const found = collectDataDescriptions(dataDir);
    expect(found).toHaveLength(1);
    expect(found[0].len).toBe(151);
  });

  it("marks a concatenated metaDescription unreadable rather than under-measuring it", () => {
    const { dataDir } = repo();
    writeFileSync(
      join(dataDir, "industries.ts"),
      ["export const all = [", `  { metaDescription: "short" + TAIL },`, "];"].join("\n"),
    );

    const found = collectDataDescriptions(dataDir);
    expect(found).toHaveLength(1);
    expect(found[0].len).toBeNull();
  });

  it("fails the run on an unreadable data metaDescription", () => {
    const dirs = repoWithArticle();
    writeFileSync(
      join(dirs.dataDir, "industries.ts"),
      ["export const all = [", `  { metaDescription: "short" + TAIL },`, "];"].join("\n"),
    );

    const result = auditAll(dirs);
    expect(result.dataUnreadable).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("unreadable");
  });

  it("reports the line the value is actually on", () => {
    const { dataDir } = repo();
    writeFileSync(
      join(dataDir, "industries.ts"),
      ["export type I = {", "  metaDescription: string;", "};", "export const all = [", `  { metaDescription: "v" },`, "];"].join(
        "\n",
      ),
    );

    const found = collectDataDescriptions(dataDir);
    expect(found).toHaveLength(1);
    expect(found[0].line).toBe(5);
  });

  it("records a shorthand metaDescription as unreadable, not as absent", () => {
    const { dataDir } = repo();
    writeFileSync(join(dataDir, "d.ts"), "export const all = [{ metaDescription }];");

    const found = collectDataDescriptions(dataDir);
    expect(found).toHaveLength(1);
    expect(found[0].len).toBeNull();
  });

  it("collects a quoted metaDescription key", () => {
    const { dataDir } = repo();
    writeFileSync(join(dataDir, "d.ts"), `export const all = [{ "metaDescription": "${"x".repeat(170)}" }];`);

    const found = collectDataDescriptions(dataDir);
    expect(found).toHaveLength(1);
    expect(found[0].len).toBe(170);
  });
});

// ─── Section 14: the advisory must never become a gate ──────────────────────

describe("the over-budget title report is an advisory, not a gate", () => {
  it("reports a wildly over-budget title without failing the run", () => {
    // Deliberate, documented decision: keywords are front-loaded, so truncation
    // costs the brand rather than the match, and rewriting a title on a page
    // that already ranks risks real traffic. Gating it would force exactly the
    // rushed rewrite of ~30 ranking titles that the reasoning rejects.
    // If this test goes red, someone has turned the advisory into a gate.
    const dirs = repo();
    writeFileSync(join(dirs.articlesDir, "alpha.md"), article({ title: "T".repeat(TITLE_BUDGET * 2) }));

    const result = auditAll(dirs);
    expect(result.longTitles).toHaveLength(1);
    expect(result.longTitles[0].rendered).toBeGreaterThan(TITLE_BUDGET);
    expect(result.failures).toEqual([]);
  });

  it("still fails a title that hard-codes the brand", () => {
    const dirs = repo();
    writeFileSync(join(dirs.articlesDir, "alpha.md"), article({ title: "Why Waypoint Works" }));

    const result = auditAll(dirs);
    expect(result.brandDupes).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("hard-code the brand");
  });
});

// ─── Length is the RENDERED length ──────────────────────────────────────────

describe("measured length is what a search engine would render", () => {
  it.each([
    ['"a\\"b"', 3, "escaped quote is one character"],
    ['"a\\u2014b"', 3, "unicode escape is one character"],
    ['"a\\nb"', 3, "newline escape is one character"],
    ["`plain`", 5, "non-interpolated template literal"],
  ])("%s measures %i (%s)", (literal, expected) => {
    const src = `export const metadata = {\n  description: ${literal},\n};`;
    expect(classifyMetaDescription(src)).toMatchObject({ state: "resolved", len: expected });
  });
});

// ─── Section 14: the brand test is a whole word, any case ───────────────────

describe("brand detection", () => {
  it.each(["Waypoint", "waypoint", "WAYPOINT", "Why Waypoint Works", "Foo |Waypoint"])(
    "flags %s",
    (title) => {
      // A case-sensitive substring test let WHY WAYPOINT WORKS through, and it
      // would have received a second " | Waypoint" from the layout template.
      expect(hardCodesBrand(title)).toBe(true);
    },
  );

  it.each(["Waypointing Through Franchises", "Waypoints on the Journey", "A Wayward Point"])(
    "does not flag %s",
    (title) => {
      // These do not name the brand; blocking them would be a false gate failure.
      expect(hardCodesBrand(title)).toBe(false);
    },
  );

  it("flags a page-level metadata title that hard-codes the brand", () => {
    const dirs = repoWithArticle();
    writeFileSync(join(dirs.appDir, "page.tsx"), `export const metadata = { title: "About | Waypoint" };`);

    const result = auditAll(dirs);
    expect(result.brandDupes).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("hard-code the brand");
  });

  it("leaves the root layout's title.default and template alone", () => {
    // Section 14 explicitly allows the brand in title.default, title.template
    // and title.absolute. Only a plain string title feeds the %s slot.
    const dirs = repoWithArticle();
    writeFileSync(
      join(dirs.appDir, "layout.tsx"),
      [
        "export const metadata = {",
        '  title: { default: "Guidance | Waypoint", template: "%s | Waypoint" },',
        `  description: "${"x".repeat(155)}",`,
        "};",
      ].join("\n"),
    );

    const result = auditAll(dirs);
    expect(result.brandDupes).toEqual([]);
    expect(result.resolved).toHaveLength(1); // it did read the file
    expect(result.failures).toEqual([]);
  });

  it("does not reach into openGraph titles, where the brand is allowed", () => {
    const dirs = repoWithArticle();
    writeFileSync(
      join(dirs.appDir, "page.tsx"),
      [
        "export const metadata = {",
        '  title: "About Us",',
        '  openGraph: { title: "About Us | Waypoint Franchise Advisors" },',
        "};",
      ].join("\n"),
    );

    expect(auditAll(dirs).brandDupes).toEqual([]);
  });

  it("fails a metaTitle it cannot statically read rather than skipping it", () => {
    const dirs = repoWithArticle();
    writeFileSync(join(dirs.dataDir, "d.ts"), "export const all = [{ metaTitle: buildTitle(slug) }];");

    const titles = collectDataTitles(dirs.dataDir);
    expect(titles).toHaveLength(1);
    expect(titles[0].value).toBeNull();

    const result = auditAll(dirs);
    expect(result.brandUnreadable).toHaveLength(1);
    expect(result.failures.join(" ")).toContain("not statically readable");
  });
});

// ─── Anti-vacuity: a moved input path must fail, not pass ───────────────────

describe("missing audit inputs fail closed", () => {
  it("fails when an input directory has moved", () => {
    const dirs = repoWithArticle();
    const result = auditAll({ ...dirs, appDir: join(dir, "does-not-exist") });
    expect(result.failures.join(" ")).toContain("missing");
  });

  it("fails when the article directory is empty", () => {
    // Zero articles must read as "extraction is broken", never as "clean".
    const dirs = repo();
    const result = auditAll(dirs);
    expect(result.failures.join(" ")).toContain("found 0 articles");
  });
});

// ─── The real repository ────────────────────────────────────────────────────

describe("the real repo", () => {
  it("passes the audit while proving it actually examined the content", () => {
    const result = auditAll();

    expect(result.failures).toEqual([]);

    // Anti-vacuity. Each of these was zero at some point in a broken build, and
    // zero must read as "extraction is broken", never as "the content is clean".
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.resolved.length).toBeGreaterThan(0);
    expect(result.dataDescs.length).toBeGreaterThan(0);
    expect(result.routes.length).toBeGreaterThan(result.resolved.length);

    // Every article must yield a measurable excerpt and a real FAQ block; a
    // parser drift that broke 44 of 45 would still leave `failures` empty
    // without these.
    expect(result.missingExcerpt).toEqual([]);
    expect(result.rows.every((r) => r.faqCount > 0)).toBe(true);
    expect(result.rows.every((r) => r.title !== null)).toBe(true);
  });

  it("still has over-budget titles, reported and not gated", () => {
    // Guards the advisory end to end: real over-budget titles exist today, and
    // the real run is still green.
    const result = auditAll();
    expect(result.longTitles.length).toBeGreaterThan(0);
    expect(result.failures).toEqual([]);
  });
});
