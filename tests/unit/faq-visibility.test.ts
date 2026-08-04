/**
 * Tests for the FAQ schema-vs-visible parity check.
 *
 * The point of this check is to fail. A gate that has only ever been observed
 * passing is not known to work, and this repo has already paid for that lesson
 * once: verify-links.mjs printed green while validating zero slugs. So the
 * negative fixtures below are the load-bearing half of this file, and several
 * of them exist specifically to break if a future edit weakens a discriminator.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, relative } from "node:path";
import {
  maskLiterals,
  maskBalanced,
  maskSource,
  findCallSites,
  scanCall,
  firstArg,
  resolveRoot,
  findRenders,
  parseImports,
  checkFaqVisibility,
} from "../../scripts/lib/faq-visibility.mjs";

const BT = "`";

function mask(src: string, opts = {}) {
  return maskSource(src, opts).mask;
}

/** Extract the first argument of the first faqPageSchema call in `src`. */
function argOf(src: string) {
  const m = mask(src);
  const [site] = findCallSites(m, "faqPageSchema");
  const arg = firstArg(src, m, site.open);
  return arg!;
}

describe("maskLiterals", () => {
  it("preserves length and newline positions", () => {
    const src = 'const a = "one";\n// two\nconst b = 1;\n';
    const m = maskLiterals(src);
    expect(m.length).toBe(src.length);
    expect([...m].filter((c) => c === "\n").length).toBe(3);
  });

  it("blanks comment and string contents but keeps delimiters", () => {
    const m = maskLiterals('const a = "hello"; // note');
    expect(m).not.toContain("hello");
    expect(m).not.toContain("note");
    expect(m).toContain('"');
  });

  // The single most important masker test. A /\/\/.*$/gm sweep would eat the
  // trailing `},` here and desync brace depth for the rest of the file.
  it("does not treat a URL inside a string as a line comment", () => {
    const src = 'const x = { canonical: "https://www.example.com/investment" };\nconst y = 1;';
    const m = maskLiterals(src);
    expect(m).toContain("}");
    expect(maskBalanced(m)).toBe(true);
  });

  it("handles template literals containing ${} and both quote characters", () => {
    const src = "const t = " + BT + 'What is ${entry.term} in "franchising"?' + BT + ";\nconst y = 1;";
    const m = maskLiterals(src);
    expect(m).not.toContain("franchising");
    expect(maskBalanced(m)).toBe(true);
  });

  it("strings:false leaves string contents readable while still blanking comments", () => {
    const src = 'const a = { "@type": "FAQPage" }; // FAQPage mention';
    const m = maskLiterals(src, { strings: false });
    expect(m).toContain("FAQPage");
    expect(m.slice(m.indexOf("//"))).not.toContain("mention");
  });
});

describe("maskSource fallback", () => {
  // A bare JSX apostrophe on its own line is handled by the unterminated-at-
  // newline bail, without needing the fallback.
  it("keeps a bare JSX apostrophe balanced on the first pass", () => {
    const src = "export function C() {\n  return <p>You'll get the checklist.</p>;\n}\n";
    expect(maskSource(src).balanced).toBe(true);
  });

  // But the fallback is live defense, not dead code: when the apostrophe shares
  // a line with brackets that must stay visible, the first pass blanks them.
  it("falls back to double-quote-only masking when an apostrophe eats brackets", () => {
    const src = "const x = <div>{items.map((i) => <p>Don't {i}</p>)}</div>;\n";
    expect(maskBalanced(maskLiterals(src, { singleQuote: true }))).toBe(false);
    const result = maskSource(src);
    expect(result.balanced).toBe(true);
    expect(result.singleQuote).toBe(false);
  });

  it("uses single-quote masking when a single-quoted string holds a double quote", () => {
    const src = "function f(ch: string) {\n  if (ch === '\"') { return 1; }\n  return 0;\n}\n";
    const result = maskSource(src);
    expect(result.balanced).toBe(true);
    expect(result.singleQuote).toBe(true);
  });

  it("every real file under src/app and src/data balances under maskSource", () => {
    const root = join(__dirname, "..", "..");
    const { readdirSync, statSync, existsSync } = require("node:fs");
    const walk = (d: string): string[] => {
      if (!existsSync(d)) return [];
      const out: string[] = [];
      for (const e of readdirSync(d)) {
        const full = join(d, e);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else if (/\.tsx?$/.test(e)) out.push(full);
      }
      return out;
    };
    const files = [...walk(join(root, "src", "app")), ...walk(join(root, "src", "data"))];
    expect(files.length).toBeGreaterThan(50);
    const unbalanced = files.filter((f) => !maskSource(readFileSync(f, "utf8")).balanced);
    expect(unbalanced.map((f) => relative(root, f))).toEqual([]);
  });
});

describe("findCallSites", () => {
  it("skips the function declaration", () => {
    const src = "export function faqPageSchema(items: { q: string }[], url?: string) { return 1; }";
    expect(findCallSites(mask(src), "faqPageSchema")).toHaveLength(0);
  });

  it("skips a call mentioned inside a comment", () => {
    const src = "// is faqPageSchema(scorecardFaqs))\nconst a = 1;";
    expect(findCallSites(mask(src), "faqPageSchema")).toHaveLength(0);
  });

  it("does not match a different identifier ending in the same name", () => {
    const src = "const x = myFaqPageSchema(faqs);";
    expect(findCallSites(mask(src), "faqPageSchema")).toHaveLength(0);
  });

  it("matches a real call", () => {
    expect(findCallSites(mask("const s = faqPageSchema(faqs, url);"), "faqPageSchema")).toHaveLength(1);
  });
});

describe("firstArg", () => {
  it("returns a multiline argument containing arrow functions whole", () => {
    const src =
      "const s = faqPageSchema(\n  investmentFaqs.map(({ q, a }) => ({ q, a })),\n  `${SITE_URL}/investment`,\n);";
    const arg = argOf(src);
    expect(arg.raw.trim()).toBe("investmentFaqs.map(({ q, a }) => ({ q, a }))");
    // Negative assertion: a naive [^)]* or comma split truncates here.
    expect(arg.raw.trim().endsWith("({ q")).toBe(false);
  });

  it("does not truncate a nested flatMap/map chain", () => {
    const src = "const s = faqPageSchema(faqs.flatMap(({ questions }) => questions.map(({ q, a }) => ({ q, a }))), url);";
    expect(argOf(src).raw.trim()).toBe("faqs.flatMap(({ questions }) => questions.map(({ q, a }) => ({ q, a })))");
  });

  it("is unaffected by surrounding conditional-spread punctuation", () => {
    const src = "const g = [...(faqs && faqs.length > 0 ? [faqPageSchema(faqs, articleUrl)] : [])];";
    expect(argOf(src).raw.trim()).toBe("faqs");
  });

  it("handles a call with no second argument", () => {
    expect(argOf("const s = faqPageSchema(faqs);").raw.trim()).toBe("faqs");
  });

  it("returns null for an unterminated call rather than a truncated string", () => {
    const src = "const s = faqPageSchema(faqs";
    const m = mask(src);
    const [site] = findCallSites(m, "faqPageSchema");
    expect(firstArg(src, m, site.open)).toBeNull();
  });
});

describe("resolveRoot", () => {
  const cases: [string, string][] = [
    ["faqs", "faqs"],
    ["industry.faqs", "industry.faqs"],
    ["investmentFaqs.map(({ q, a }) => ({ q, a }))", "investmentFaqs"],
    ["faqs.flatMap(({ questions }) => questions.map(({ q, a }) => ({ q, a })))", "faqs"],
    ["entry?.faqs?.map((f) => f)", "entry.faqs"],
    ["faqs ?? []", "faqs"],
  ];
  for (const [input, expected] of cases) {
    it(`resolves ${input} to root ${expected}`, () => {
      const r = resolveRoot(mask(input), input);
      expect(r.kind).toBe("root");
      expect((r as { normalized: string }).normalized).toBe(expected);
    });
  }

  it("rejects an inline array literal", () => {
    const arg = "[ { q: `What is ${t} in franchising?`, a: d }, ...(entry.faqs ?? []) ]";
    expect(resolveRoot(mask(arg), arg).kind).toBe("literal");
  });

  it("rejects a spread-only literal", () => {
    expect(resolveRoot("[...faqs]", "[...faqs]").kind).toBe("literal");
  });

  it("rejects a function-call result", () => {
    expect(resolveRoot("getFaqs()", "getFaqs()").kind).toBe("call");
  });

  it("rejects a ternary", () => {
    expect(resolveRoot("cond ? faqs : other", "cond ? faqs : other").kind).toBe("expression");
  });

  // Deliberate strictness, per Codex round 3. `.filter()` only narrows and would
  // be harmless, but allowing ANY trailing chain also allowed
  // `.concat(hiddenFaqs)`, which adds unrendered questions to the schema.
  // Deciding which methods are safe needs evaluation, so none are allowed. No
  // call site in this repo uses one.
  it("rejects a trailing chained call after the projection", () => {
    const chained = "faqs.map((f) => f).filter(Boolean)";
    expect(resolveRoot(chained, chained).kind).toBe("expression");
    const concat = "visibleFaqs.map((f) => f).concat(hiddenFaqs)";
    expect(resolveRoot(concat, concat).kind).toBe("expression");
  });
});

describe("findRenders", () => {
  // The regression that would silently gut the check: on /investment the root is
  // mapped at the schema call AND in JSX. Only the JSX one counts.
  it("ignores the schema projection and finds the JSX render", () => {
    const src = [
      "const schema = faqPageSchema(",
      "  investmentFaqs.map(({ q, a }) => ({ q, a })),",
      "  url,",
      ");",
      "export default function P() {",
      "  return <div>{investmentFaqs.map(({ q, a }) => (<p>{q}</p>))}</div>;",
      "}",
    ].join("\n");
    const m = mask(src);
    const spans = findCallSites(m, "faqPageSchema")
      .map(({ open }) => scanCall(m, open)!)
      .map((s) => [s.open, s.close] as [number, number]);
    const hits = findRenders(src, m, "investmentFaqs", spans);
    expect(hits).toHaveLength(1);
    expect(hits[0].line).toBe(6);
  });

  it("does not accept a non-JSX projection as a visible render", () => {
    const src = 'const md = faqs.map((f) => f.q).join("\\n");';
    expect(findRenders(src, mask(src), "faqs", [])).toHaveLength(0);
  });

  it("does not let entry.faqs.map satisfy the bare root faqs", () => {
    const src = "const x = <div>{entry.faqs.map((f) => f.q)}</div>;";
    expect(findRenders(src, mask(src), "faqs", [])).toHaveLength(0);
  });

  it("does not let flatMap satisfy a map render", () => {
    const src = "const x = <div>{faqs.flatMap((f) => f.q)}</div>;";
    expect(findRenders(src, mask(src), "faqs", [])).toHaveLength(0);
  });

  it("accepts optional chaining", () => {
    const src = "const x = <div>{faqs?.map((f) => f.q)}</div>;";
    expect(findRenders(src, mask(src), "faqs", [])).toHaveLength(1);
  });

  // Documents the deliberate strictness, so loosening it is a conscious diff.
  it("does not accept a guarded render (known limit, escape hatch exists)", () => {
    const src = "const x = <div>{cond && faqs.map((f) => f.q)}</div>;";
    expect(findRenders(src, mask(src), "faqs", [])).toHaveLength(0);
  });
});

describe("parseImports", () => {
  it("reads named, aliased, and namespace imports and ignores type-only ones", () => {
    const src = [
      'import { a, b as c } from "./x";',
      'import * as NS from "@/data/y";',
      'import { type T } from "./z";',
    ].join("\n");
    const imports = parseImports(src, mask(src));
    expect(imports[0].named.get("a")).toBe("a");
    expect(imports[0].named.get("b")).toBe("c");
    expect(imports[1].namespace).toBe("NS");
    expect(imports[2].named.size).toBe(0);
  });

  it("ignores a commented-out import", () => {
    const src = '// import { a } from "./x";';
    expect(parseImports(src, mask(src))).toHaveLength(0);
  });
});

describe("checkFaqVisibility", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "faq-visibility-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function write(rel: string, content: string) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    return full;
  }

  /** Always present so the anti-vacuity guard has a helper definition to see. */
  function writeHelper() {
    return write(
      "src/app/lib/structured-data.ts",
      "export function faqPageSchema(items: { q: string; a: string }[], url?: string) {\n" +
        '  return { "@type": "FAQPage", mainEntity: items };\n' +
        "}\n",
    );
  }

  function run(files: string[]) {
    return checkFaqVisibility({
      files,
      readFile: (f: string) => readFileSync(f, "utf8"),
      root: dir,
      relative: (f: string) => relative(dir, f),
    });
  }

  it("passes a page that maps the same array it feeds the schema", () => {
    const helper = writeHelper();
    const page = write(
      "src/app/(marketing)/x/page.tsx",
      'import { faqPageSchema } from "../../lib/structured-data";\n' +
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
        "const schema = faqPageSchema(faqs, url);\n" +
        "export default function P() { return <div>{faqs.map((f) => (<p>{f.q}</p>))}</div>; }\n",
    );
    const r = run([helper, page]);
    expect(r.errors).toEqual([]);
    expect(r.siteCount).toBe(1);
  });

  it("FAILS an inline array literal", () => {
    const helper = writeHelper();
    const page = write(
      "src/app/(marketing)/x/page.tsx",
      'import { faqPageSchema } from "../../lib/structured-data";\n' +
        "const schema = faqPageSchema([{ q: 'a', a: 'b' }], url);\n" +
        "export default function P() { return <div>hi</div>; }\n",
    );
    const r = run([helper, page]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("inline array literal");
  });

  it("FAILS a named root that is never rendered", () => {
    const helper = writeHelper();
    const page = write(
      "src/app/(marketing)/x/page.tsx",
      'import { faqPageSchema } from "../../lib/structured-data";\n' +
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
        "const schema = faqPageSchema(faqs, url);\n" +
        "export default function P() { return <div>hi</div>; }\n",
    );
    const r = run([helper, page]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("not exported");
  });

  it("FAILS when the only map is the schema projection itself", () => {
    const helper = writeHelper();
    const page = write(
      "src/app/(marketing)/x/page.tsx",
      'import { faqPageSchema } from "../../lib/structured-data";\n' +
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
        "const schema = faqPageSchema(faqs.map((f) => ({ q: f.q, a: f.a })), url);\n" +
        "export default function P() { return <div>hi</div>; }\n",
    );
    expect(run([helper, page]).errors).toHaveLength(1);
  });

  it("FAILS when the root is only mapped in a .ts file, never in JSX", () => {
    const helper = writeHelper();
    const data = write(
      "src/data/f.ts",
      "export const faqs = [{ q: 'a', a: 'b' }];\n" + "export const md = faqs.map((f) => f.q).join('\\n');\n",
    );
    const caller = write(
      "src/app/lib/x.ts",
      'import { faqPageSchema } from "./structured-data";\n' +
        'import { faqs } from "../../data/f";\n' +
        "export const schema = faqPageSchema(faqs, url);\n",
    );
    const r = run([helper, data, caller]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("no visible render");
  });

  it("passes the cross-file export/import case", () => {
    const helper = writeHelper();
    const defs = write(
      "src/app/lib/defs.ts",
      'import { faqPageSchema } from "./structured-data";\n' +
        "export const scorecardFaqs = [{ q: 'a', a: 'b' }];\n" +
        "export const scorecardFaqSchema = faqPageSchema(scorecardFaqs, url);\n",
    );
    const page = write(
      "src/app/(marketing)/scorecard/page.tsx",
      // Imports BOTH, exactly as the real /scorecard page does. The schema
      // import is what proves this is the page the markup belongs to.
      'import { scorecardFaqSchema, scorecardFaqs } from "../../lib/defs";\n' +
        "export default function P() { return <div>{JSON.stringify(scorecardFaqSchema)}{scorecardFaqs.map((f) => (<p>{f.q}</p>))}</div>; }\n",
    );
    const r = run([helper, defs, page]);
    expect(r.errors).toEqual([]);
    expect(r.sites[0].via).toContain("cross-file");
  });

  it("passes the cross-file case through an aliased import", () => {
    const helper = writeHelper();
    const defs = write(
      "src/app/lib/defs.ts",
      'import { faqPageSchema } from "./structured-data";\n' +
        "export const scorecardFaqs = [{ q: 'a', a: 'b' }];\n" +
        "export const s = faqPageSchema(scorecardFaqs, url);\n",
    );
    const page = write(
      "src/app/(marketing)/scorecard/page.tsx",
      'import { s, scorecardFaqs as sf } from "../../lib/defs";\n' +
        "export default function P() { return <div>{JSON.stringify(s)}{sf.map((f) => (<p>{f.q}</p>))}</div>; }\n",
    );
    expect(run([helper, defs, page]).errors).toEqual([]);
  });

  it("FAILS when an importer exists but never maps the symbol", () => {
    const helper = writeHelper();
    const defs = write(
      "src/app/lib/defs.ts",
      'import { faqPageSchema } from "./structured-data";\n' +
        "export const scorecardFaqs = [{ q: 'a', a: 'b' }];\n" +
        "export const s = faqPageSchema(scorecardFaqs, url);\n",
    );
    const page = write(
      "src/app/(marketing)/scorecard/page.tsx",
      'import { scorecardFaqs } from "../../lib/defs";\n' +
        "export default function P() { return <div>{scorecardFaqs.length}</div>; }\n",
    );
    const r = run([helper, defs, page]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("none of the");
  });

  it("FAILS a hand-rolled FAQPage node", () => {
    const helper = writeHelper();
    const page = write(
      "src/app/(marketing)/x/page.tsx",
      'const node = { "@type": "FAQPage", mainEntity: [] };\n' +
        "export default function P() { return <div>hi</div>; }\n",
    );
    const r = run([helper, page]);
    expect(r.errors.some((e) => e.includes("declares an FAQPage node"))).toBe(true);
  });

  it("does NOT flag a component named FAQPage", () => {
    const helper = writeHelper();
    const page = write(
      "src/app/(marketing)/faq/page.tsx",
      'import { faqPageSchema } from "../../lib/structured-data";\n' +
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
        "const schema = faqPageSchema(faqs, url);\n" +
        "export default function FAQPage() { return <div>{faqs.map((f) => (<p>{f.q}</p>))}</div>; }\n",
    );
    expect(run([helper, page]).errors).toEqual([]);
  });

  it("FAILS vacuously-empty runs (layer a)", () => {
    const helper = writeHelper();
    const page = write("src/app/(marketing)/x/page.tsx", "export default function P() { return <div>hi</div>; }\n");
    const r = run([helper, page]);
    expect(r.siteCount).toBe(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("Found 0 faqPageSchema() call sites");
  });

  // Regression lock. The first implementation detected "does this repo still do
  // FAQs?" by looking for `function ${FAQ_HELPER}(`, so renaming the helper
  // disabled the scanner AND this guard at once, and verify-schema printed a
  // green "0 call sites verified" line. Mutation test (d) caught it. The
  // sentinel must key on the emitted FAQPage literal, independently of the
  // helper's name, which is what this fixture proves: a helper by ANY name that
  // emits FAQPage still trips the guard.
  it("FAILS vacuously even when the helper is not named faqPageSchema", () => {
    const helper = write(
      "src/app/lib/structured-data.ts",
      "export function renamedFaqBuilder(items: { q: string; a: string }[]) {\n" +
        '  return { "@type": "FAQPage", mainEntity: items };\n' +
        "}\n",
    );
    const page = write("src/app/(marketing)/x/page.tsx", "export default function P() { return <div>hi</div>; }\n");
    const r = run([helper, page]);
    expect(r.siteCount).toBe(0);
    // Two errors, both correct: the renamed helper's own node is no longer
    // covered by the canonical exemption, AND detection found nothing.
    expect(r.errors.some((e) => e.includes("still emits FAQPage JSON-LD"))).toBe(true);
  });

  it("FAILS a file that mentions the helper but parses to no call site (layer b)", () => {
    const helper = writeHelper();
    const good = write(
      "src/app/(marketing)/x/page.tsx",
      "const faqs = [{ q: 'a', a: 'b' }];\n" +
        "const schema = faqPageSchema(faqs, url);\n" +
        "export default function P() { return <div>{faqs.map((f) => (<p>{f.q}</p>))}</div>; }\n",
    );
    // Mentions the helper only as an import, never calls it.
    const odd = write("src/app/(marketing)/y/page.tsx", 'import { faqPageSchema } from "../../lib/structured-data";\n');
    const r = run([helper, good, odd]);
    expect(r.errors.some((e) => e.includes("no call site could be parsed"))).toBe(true);
  });

  it("honours the documented escape-hatch directive when its path exists", () => {
    const helper = writeHelper();
    const section = write("src/app/components/FaqSection.tsx", "export default function F() { return <div/>; }\n");
    const page = write(
      "src/app/(marketing)/x/page.tsx",
      "const faqs = [{ q: 'a', a: 'b' }];\n" +
        "// verify-schema: faq-visible src/app/components/FaqSection.tsx\n" +
        "const schema = faqPageSchema(faqs, url);\n" +
        "export default function P() { return <div>hi</div>; }\n",
    );
    const r = run([helper, section, page]);
    expect(r.errors).toEqual([]);
    expect(r.sites[0].via).toContain("directive");
  });
});

/**
 * Codex adversarial review, round 1 (2026-08-04). Seven Highs and two Mediums;
 * seven were reproduced and fixed, and each keeps a test here so it cannot come
 * back. Two were declined with reasons recorded in the module header.
 */
describe("Codex round-1 regressions", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "faq-codex-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });
  function write(rel: string, content: string) {
    const full = join(dir, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
    return full;
  }
  function helper() {
    return write(
      "src/app/lib/structured-data.ts",
      'export function faqPageSchema(i) { return { "@type": "FAQPage", mainEntity: i }; }\n',
    );
  }
  function run(files: string[]) {
    return checkFaqVisibility({
      files,
      readFile: (f: string) => readFileSync(f, "utf8"),
      root: dir,
      relative: (f: string) => relative(dir, f),
    });
  }

  it("H1: a render on a DIFFERENT page does not satisfy a data-module schema", () => {
    const h = helper();
    const defs = write(
      "src/app/lib/defs.ts",
      'import { faqPageSchema } from "./structured-data";\n' +
        "export const faqs = [{ q: 'a', a: 'b' }];\n" +
        "export const schema = faqPageSchema(faqs, url);\n",
    );
    // /bad consumes the schema but renders no FAQ; /good maps the array but
    // never consumes the schema. Neither page is compliant on its own.
    const bad = write(
      "src/app/(marketing)/bad/page.tsx",
      'import { schema } from "../../lib/defs";\nexport default function P() { return <div>{JSON.stringify(schema)}</div>; }\n',
    );
    const good = write(
      "src/app/(marketing)/good/page.tsx",
      'import { faqs } from "../../lib/defs";\nexport default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n',
    );
    expect(run([h, defs, bad, good]).errors.length).toBeGreaterThan(0);
  });

  it("H1: still passes when the SAME page consumes the schema and renders the array", () => {
    const h = helper();
    const defs = write(
      "src/app/lib/defs.ts",
      'import { faqPageSchema } from "./structured-data";\n' +
        "export const faqs = [{ q: 'a', a: 'b' }];\n" +
        "export const schema = faqPageSchema(faqs, url);\n",
    );
    const page = write(
      "src/app/(marketing)/ok/page.tsx",
      'import { schema, faqs } from "../../lib/defs";\n' +
        "export default function P() { return <div>{JSON.stringify(schema)}{faqs.map((f) => f.q)}</div>; }\n",
    );
    expect(run([h, defs, page]).errors).toEqual([]);
  });

  it("H2: a shadowed root with a different value fails", () => {
    const h = helper();
    const page = write(
      "src/app/(marketing)/s/page.tsx",
      "const faqs = [{ q: 'real', a: 'real' }];\n" +
        "const s = faqPageSchema(faqs, url);\n" +
        "export default function P() { const faqs = []; return <div>{faqs.map((f) => f.q)}</div>; }\n",
    );
    expect(run([h, page]).errors.length).toBeGreaterThan(0);
  });

  it("H2: the same name declared twice with the SAME initializer is not a shadow", () => {
    const h = helper();
    // The real shape: generateMetadata and the component both call one getter.
    const page = write(
      "src/app/(marketing)/i/page.tsx",
      "export async function generateMetadata() {\n" +
        "  const industry = getIndustry(slug);\n" +
        "  return industry.meta;\n" +
        "}\n" +
        "export default function P() {\n" +
        "  const industry = getIndustry(slug);\n" +
        "  const s = faqPageSchema(industry.faqs, url);\n" +
        "  return <div>{JSON.stringify(s)}{industry.faqs.map((f) => f.q)}</div>;\n" +
        "}\n",
    );
    expect(run([h, page]).errors).toEqual([]);
  });

  it("H3: the escape-hatch directive does NOT excuse an inline array literal", () => {
    const h = helper();
    const page = write(
      "src/app/(marketing)/a/page.tsx",
      "// verify-schema: faq-visible somewhere.tsx\n" +
        'const s = faqPageSchema([{ q: "hidden", a: "hidden" }], url);\n' +
        "export default function P() { return <div>hi</div>; }\n",
    );
    expect(run([h, page]).errors.length).toBeGreaterThan(0);
  });

  it("H3: the directive cannot be faked by a string containing the phrase", () => {
    const h = helper();
    const page = write(
      "src/app/(marketing)/b/page.tsx",
      "const faqs = [{ q: 'a', a: 'b' }];\n" +
        'const note = "verify-schema: faq-visible x";\n' +
        "const s = faqPageSchema(faqs, url);\n" +
        "export default function P() { return <div>{note}</div>; }\n",
    );
    expect(run([h, page]).errors.length).toBeGreaterThan(0);
  });

  it("H4: a single-quoted string is not accepted as render evidence", () => {
    // Forces the masker fallback, which leaves single-quoted strings unmasked.
    const src = "const example = '{faqs.map(x)}';\nconst z = <div>{items.map((i) => <p>Don't {i}</p>)}</div>;\n";
    const m = maskSource(src);
    expect(m.singleQuote).toBe(false); // fallback really is in play
    expect(findRenders(src, m.mask, "faqs", [])).toHaveLength(0);
  });

  it("H5: a call inside a template interpolation is still detected", () => {
    const src = "const s = `${JSON.stringify(faqPageSchema(hiddenFaqs))}`;";
    expect(findCallSites(maskSource(src).mask, "faqPageSchema")).toHaveLength(1);
  });

  it("H6: a URL inside a string does not blank the rest of the line", () => {
    const src = 'const url = "https://example.test"; const node = { "@type": "FAQPage" };';
    expect(maskLiterals(src, { strings: false })).toContain("FAQPage");
  });

  it("H7: an @type whose value is an identifier is still rejected", () => {
    const h = helper();
    const page = write(
      "src/app/(marketing)/h/page.tsx",
      'const kind = "FAQPage";\n' +
        "const node = { \"@type\": kind, mainEntity: [] };\n" +
        "export default function P() { return <div>hi</div>; }\n",
    );
    // An identifier value is unprovable rather than provably FAQPage, so it is
    // rejected by the computed-@type branch.
    expect(run([h, page]).errors.some((e) => e.includes("computed @type"))).toBe(true);
  });

  it("M1: a valid regex literal does not trip the balance canary", () => {
    const src = "const openParen = /\\(/;\nexport default function C() { return <p>hi</p>; }\n";
    expect(maskSource(src).balanced).toBe(true);
  });
});

/**
 * Codex adversarial review, round 2 (security and data-integrity persona), run
 * against the round-1-hardened module. Six Highs and one Medium, all reproduced
 * and all fixed. Each is a deliberate bypass attempt, so these are the tests
 * that matter most if someone later loosens a rule.
 *
 * Every scenario gets its OWN temp dir. Sharing one let a later fixture
 * overwrite structured-data.ts and made an earlier case look broken.
 */
describe("Codex round-2 regressions", () => {
  const HELPER =
    "export function faqPageSchema(items: { q: string; a: string }[], url?: string) " +
    '{ return { "@type": "FAQPage", mainEntity: items }; }\n';

  function scenario(files: [string, string | null][], helperSrc = HELPER) {
    const dir = mkdtempSync(join(tmpdir(), "faq-codex2-"));
    try {
      const write = (rel: string, content: string) => {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content);
        return full;
      };
      const paths = [
        write("src/app/lib/structured-data.ts", helperSrc),
        // A null body means "this path is listed but does not exist on disk".
        ...files.map(([rel, content]) => (content === null ? join(dir, rel) : write(rel, content))),
      ];
      return checkFaqVisibility({
        files: paths,
        readFile: (f: string) => readFileSync(f, "utf8"),
        root: dir,
        relative: (f: string) => relative(dir, f),
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("R2-1: an unrelated same-named local does not satisfy page-locality", () => {
    const r = scenario([
      [
        "src/app/lib/d1.ts",
        'import { faqPageSchema } from "./structured-data";\n' +
          "export const faqs = [{ q: 'a', a: 'b' }];\n" +
          "export const schema = faqPageSchema(faqs, url);\n",
      ],
      [
        "src/app/(marketing)/b1/page.tsx",
        'import { schema } from "../../lib/d1";\nexport default function P() { return <div>{JSON.stringify(schema)}</div>; }\n',
      ],
      [
        // Renders the array but only declares its OWN `schema`, so it is not the
        // page the markup belongs to.
        "src/app/(marketing)/g1/page.tsx",
        'import { faqs } from "../../lib/d1";\nconst schema = 1;\nexport default function P() { return <div>{schema}{faqs.map((f) => f.q)}</div>; }\n',
      ],
    ]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("R2-2: a directive naming a nonexistent path fails", () => {
    const r = scenario([
      [
        "src/app/(marketing)/p2/page.tsx",
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "// verify-schema: faq-visible src/app/components/Nope.tsx\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "export default function P() { return <div>hi</div>; }\n",
      ],
    ]);
    expect(r.errors[0]).toContain("does not exist");
  });

  it("R2-2: a directive naming a real path still passes", () => {
    const r = scenario([
      ["src/app/components/FaqSection.tsx", "export default function F() { return <div/>; }\n"],
      [
        "src/app/(marketing)/p8/page.tsx",
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "// verify-schema: faq-visible src/app/components/FaqSection.tsx\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "export default function P() { return <div>hi</div>; }\n",
      ],
    ]);
    expect(r.errors).toEqual([]);
  });

  it("R2-3: a reassigned let binding fails", () => {
    const r = scenario([
      [
        "src/app/(marketing)/p3/page.tsx",
        "let faqs = [{ q: 'hidden', a: 'hidden' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "faqs = [];\n" +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
    ]);
    expect(r.errors[0]).toContain("reassigned");
  });

  it("R2-4: a second FAQPage node inside structured-data.ts is not exempt", () => {
    const r = scenario(
      [
        [
          "src/app/(marketing)/p4/page.tsx",
          "const faqs = [{ q: 'a', a: 'b' }];\n" +
            "const s = faqPageSchema(faqs, url);\n" +
            "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
        ],
      ],
      HELPER + 'export const sneaky = { "@type": "FAQPage", mainEntity: [] };\n',
    );
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("R2-4: the canonical helper body itself is still exempt", () => {
    // Regression for the exempt-span bug: a bare indexOf("{") landed inside the
    // `items: { q: string; a: string }[]` type annotation instead of the body.
    const r = scenario([
      [
        "src/app/(marketing)/n/page.tsx",
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
    ]);
    expect(r.errors).toEqual([]);
  });

  it("R2-5: a computed @type is rejected", () => {
    const r = scenario([
      [
        "src/app/(marketing)/p5/page.tsx",
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          'const n = { "@type": "FAQ" + "Page", mainEntity: hidden };\n' +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
    ]);
    expect(r.errors.some((e) => e.includes("computed @type"))).toBe(true);
  });

  it("R2-6: taking the helper as a value is rejected", () => {
    const r = scenario([
      [
        "src/app/(marketing)/p6/page.tsx",
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "const build = faqPageSchema;\n" +
          "const hidden2 = build([{ q: 'h', a: 'h' }]);\n" +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
    ]);
    expect(r.errors.some((e) => e.includes("used as a value"))).toBe(true);
  });

  it("R2-M1: an unreadable file is an error, not a silent skip", () => {
    const r = scenario([
      [
        "src/app/(marketing)/p7/page.tsx",
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
      ["src/app/(marketing)/gone/page.tsx", null],
    ]);
    expect(r.errors.some((e) => e.includes("could not be read"))).toBe(true);
  });
});

/**
 * Codex adversarial review, round 3 (ops/SRE persona). Five Highs and two
 * Mediums, all reproduced and fixed. By this round the findings are mostly
 * deliberate circumvention rather than accidental drift, which is the boundary
 * recorded in the module header: this gate is built to stop a careful engineer
 * making the /investment mistake, not to defeat someone determined to hide FAQ
 * markup from it.
 */
describe("Codex round-3 regressions", () => {
  const HELPER =
    "export function faqPageSchema(items: { q: string; a: string }[], url?: string) " +
    '{ return { "@type": "FAQPage", mainEntity: items }; }\n';

  function scenario(files: [string, string][], helperSrc = HELPER) {
    const dir = mkdtempSync(join(tmpdir(), "faq-codex3-"));
    try {
      const write = (rel: string, content: string) => {
        const full = join(dir, rel);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content);
        return full;
      };
      const paths = [write("src/app/lib/structured-data.ts", helperSrc), ...files.map(([r, c]) => write(r, c))];
      return checkFaqVisibility({
        files: paths,
        readFile: (f: string) => readFileSync(f, "utf8"),
        root: dir,
        relative: (f: string) => relative(dir, f),
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }

  it("R3-1: a trailing .concat() is not stripped down to the visible root", () => {
    // Would otherwise resolve to `visibleFaqs` while hiddenFaqs enters the JSON-LD.
    const arg = "visibleFaqs.map((f) => f).concat(hiddenFaqs)";
    expect(resolveRoot(arg, arg).kind).not.toBe("root");
  });

  it("R3-2: importing the helper under an alias is rejected", () => {
    const r = scenario([
      [
        "src/app/(marketing)/a/page.tsx",
        'import { faqPageSchema, faqPageSchema as build } from "../../lib/structured-data";\n' +
          "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "const h = build([{ q: 'h', a: 'h' }]);\n" +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
    ]);
    expect(r.errors.some((e) => e.includes("as `build`"))).toBe(true);
  });

  it("R3-3: a computed object key holding FAQPage is rejected", () => {
    const r = scenario([
      [
        "src/app/(marketing)/b/page.tsx",
        'const typeKey = "@type";\n' +
          "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          'const n = { [typeKey]: "FAQPage", mainEntity: hidden };\n' +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
    ]);
    expect(r.errors.some((e) => e.includes('literal "FAQPage" outside'))).toBe(true);
  });

  it("R3-4: a namespace import that never uses the schema fails page-locality", () => {
    const r = scenario([
      [
        "src/app/lib/d.ts",
        'import { faqPageSchema } from "./structured-data";\n' +
          "export const faqs = [{ q: 'a', a: 'b' }];\n" +
          "export const schema = faqPageSchema(faqs, url);\n",
      ],
      [
        "src/app/(marketing)/a/page.tsx",
        'import { schema } from "../../lib/d";\nexport default function P() { return <div>{JSON.stringify(schema)}</div>; }\n',
      ],
      [
        "src/app/(marketing)/b/page.tsx",
        'import * as defs from "../../lib/d";\nexport default function P() { return <div>{defs.faqs.map((f) => f.q)}</div>; }\n',
      ],
    ]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("R3-5: mutating the array's contents after the schema call is rejected", () => {
    const r = scenario([
      [
        "src/app/(marketing)/c/page.tsx",
        "const faqs = [{ q: 'a', a: 'b' }];\n" +
          "const s = faqPageSchema(faqs, url);\n" +
          "faqs.splice(0, faqs.length, ...different);\n" +
          "export default function P() { return <div>{faqs.map((f) => f.q)}</div>; }\n",
      ],
    ]);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("R3-M1: a map inside a JSX event handler is not render evidence", () => {
    const src = "const x = <button onClick={() => { faqs.map(logFaq) }}>No FAQs</button>;";
    expect(findRenders(src, maskSource(src).mask, "faqs", [])).toHaveLength(0);
  });
});

describe("against the real tree", () => {
  it("passes and pins the known call-site inventory", () => {
    const root = join(__dirname, "..", "..");
    const { readdirSync, statSync, existsSync } = require("node:fs");
    const walk = (d: string): string[] => {
      if (!existsSync(d)) return [];
      const out: string[] = [];
      for (const e of readdirSync(d)) {
        const full = join(d, e);
        if (statSync(full).isDirectory()) out.push(...walk(full));
        else if (/\.tsx?$/.test(e)) out.push(full);
      }
      return out;
    };
    const files = [...walk(join(root, "src", "app")), ...walk(join(root, "src", "data"))];
    const r = checkFaqVisibility({
      files,
      readFile: (f: string) => readFileSync(f, "utf8"),
      root,
      relative: (f: string) => relative(root, f),
    });
    expect(r.errors).toEqual([]);
    // Pinned so a refactor that quietly drops a call site trips the count, not
    // merely the (still-empty) error list.
    expect(r.siteCount).toBeGreaterThanOrEqual(12);
  });
});
