/**
 * FAQ schema-vs-visible parity check.
 *
 * WHY THIS EXISTS. On 2026-08-04 the /investment page was found emitting four
 * FAQPage Q&As that rendered nowhere: the schema array and the on-page array
 * were two disjoint literals with ZERO overlap. Google requires FAQPage markup
 * to correspond to content visible on the page, so the page was shipping
 * structured data for content that did not exist on it. PR #25 fixed that page
 * by deriving both from one array. This module makes the whole class of drift
 * impossible instead of fixing it once per page.
 *
 * THE RULE, for every faqPageSchema() call site:
 *   1. The first argument must be a NAMED array root (an identifier such as
 *      `investmentFaqs`, or a member path such as `industry.faqs`), optionally
 *      with a trailing .map()/.flatMap() projection. An inline array literal
 *      fails: nothing ties its contents to anything rendered.
 *   2. That same root must be rendered as `{root.map(` in JSX in a .tsx file,
 *      OUTSIDE the faqPageSchema(...) argument span. If the defining file does
 *      not render it and the root is exported, importing files are searched.
 *   3. No hand-rolled FAQPage: "@type": "FAQPage" outside structured-data.ts
 *      would bypass the gate entirely.
 *
 * WHAT THIS PROVES, AND WHAT IT DOES NOT. It proves the array feeding the
 * schema is the same array the page maps. It does NOT prove every element
 * reaches the DOM. A render that narrows (`{root.filter(...).map(...)}`), a
 * section behind an always-false flag, or a projection that maps `f.longAnswer`
 * into the schema and `f.shortAnswer` into the page would all still pass. Those
 * need a rendered DOM, which this deliberately is not (see the header of
 * verify-schema.mjs). Do not read a green run as proof of full parity; read it
 * as proof that the /investment defect class cannot recur.
 *
 * THREAT MODEL. This stops a careful engineer from repeating the /investment
 * mistake. It does not stop someone determined to hide FAQ markup from it.
 * Three adversarial Codex rounds produced 23 findings (9 + 7 + 7), of which 21
 * were fixed and 2 declined below; each round's findings got more exotic as the
 * cheap accidental paths closed. A dep-free
 * static checker cannot close the tail, and pretending otherwise would be the
 * more dangerous error. If you are extending this, spend effort on shapes an
 * honest engineer might write by accident, not on defeating circumvention.
 *
 * KNOWN LIMIT, declined with reasons rather than fixed:
 *   - Barrel re-exports (round 1). If a page imports the array through an
 *     `index.ts` re-export, the specifier resolves to the barrel and the render
 *     is not found. This fails CLOSED (a compliant page is reported as failing,
 *     loudly) rather than passing invalid markup, and the escape-hatch directive
 *     covers it. VERIFIED: zero barrel re-exports exist in src/ today.
 *   - The escape hatch proves its target EXISTS, not that the target still
 *     renders the FAQ (round 3). Proving the latter means following a prop into
 *     a child component, which needs an AST. `--verbose` lists every active
 *     directive so they stay reviewable.
 *
 * Dep-free on purpose. The pre-push hook must work on a clone with no
 * node_modules, so no TypeScript AST despite `typescript` being a devDependency.
 * That choice is why the lexer is approximate, and why maskBalanced() exists to
 * make an approximation fail loudly instead of quietly.
 */
import { existsSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";

const SQ = "'";
const BT = "`";

/** Line number (1-based) of a character offset. */
export function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src[i] === "\n") line++;
  return line;
}

function preview(text, max = 60) {
  const flat = text.trim().replace(/\s+/g, " ");
  return flat.length > max ? flat.slice(0, max) + "..." : flat;
}

/**
 * Same-length copy of `src` with the CONTENTS of comments and string/template
 * literals replaced by spaces. Delimiters and newlines are preserved, so
 * mask.length === src.length and every offset means the same thing in both.
 * Every downstream scan runs on the mask and slices text out of the raw source.
 * That one decision removes the whole class of "regex ate my closing brace" bugs.
 *
 * `singleQuote` is a real fork, not a style choice. A .tsx codebase has bare
 * apostrophes in JSX text (src/app/components/EmailCapture.tsx:179 is "You'll
 * get the checklist"), which a naive masker reads as an unterminated string;
 * and it has single-quoted strings containing double quotes
 * (src/app/api/stats/route.ts:17 is `if (ch === '"')`), which break the
 * opposite setting. The unterminated-at-newline bail below is what keeps both
 * of those specific files balanced today, VERIFIED across all 163 walked files
 * with singleQuote:true.
 *
 * The fallback in maskSource() is still live defense rather than dead code: a
 * single line such as `{items.map((i) => <p>Don't {i}</p>)}` desyncs under
 * singleQuote:true (the apostrophe blanks the closing `)}`) and is rescued by
 * the retry. VERIFIED: that case is unbalanced one way and balanced the other.
 *
 * Options. `strings:false` preserves string CONTENTS (for the Rule 3 scan, which
 * must be able to see the literal "FAQPage") while still tracking string
 * boundaries, so a `//` inside a URL is not mistaken for a comment.
 * `comments:false` is the mirror: it preserves comment text for the
 * escape-hatch directive scan, which must not be satisfiable by a string.
 * Regex literals and `${ }` interpolations are handled in all modes: a call
 * inside an interpolation stays visible, and a regex body does not leak
 * brackets into the balance canary.
 */
/** A `/` here starts a regex literal, not a division. */
function isRegexStart(prev) {
  return prev === "" || "=(,:[!&|?{};".includes(prev);
}

export function maskLiterals(src, { strings = true, comments = true, singleQuote = true } = {}) {
  const out = src.split("");
  const n = src.length;
  const blank = (j) => {
    if (j < n && src[j] !== "\n") out[j] = " ";
  };
  // Brace depth per open template literal. 0 means "in template text"; above
  // zero means "inside a ${ } expression", which stays VISIBLE so a call such as
  // `${JSON.stringify(faqPageSchema(x))}` cannot hide from call-site detection.
  const tmpl = [];
  let prev = ""; // last significant char, for regex-vs-division
  let i = 0;

  while (i < n) {
    const c = src[i];

    if (tmpl.length && tmpl[tmpl.length - 1] === 0) {
      if (c === "\\") {
        if (strings) {
          blank(i);
          blank(i + 1);
        }
        i += 2;
        continue;
      }
      if (c === BT) {
        tmpl.pop();
        prev = BT;
        i++;
        continue;
      }
      if (c === "$" && src[i + 1] === "{") {
        tmpl[tmpl.length - 1] = 1; // the `${` and its `}` balance each other
        prev = "{";
        i += 2;
        continue;
      }
      if (strings) blank(i);
      i++;
      continue;
    }

    // Line comment. Reached only outside a string, because strings are consumed
    // below even when their contents are preserved. Without that ordering, the
    // `//` inside "https://example.test" blanks the rest of the line and hides
    // whatever follows it.
    if (c === "/" && src[i + 1] === "/") {
      let j = i;
      while (j < n && src[j] !== "\n") {
        if (comments) blank(j);
        j++;
      }
      i = j;
      continue;
    }

    // Block comment, which also covers JSX {/* ... */}.
    if (c === "/" && src[i + 1] === "*") {
      let j = i;
      while (j < n && !(src[j] === "*" && src[j + 1] === "/")) {
        if (comments) blank(j);
        j++;
      }
      if (j < n) {
        if (comments) {
          blank(j);
          blank(j + 1);
        }
        j += 2;
      }
      i = j;
      continue;
    }

    // Regex literal. Without this, a legitimate `const openParen = /\(/;` leaves
    // an unmatched bracket and the balance canary reports a desync that is not
    // one.
    if (c === "/" && isRegexStart(prev)) {
      let j = i + 1;
      let closed = false;
      let inClass = false;
      while (j < n && src[j] !== "\n") {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === "[") inClass = true;
        else if (src[j] === "]") inClass = false;
        else if (src[j] === "/" && !inClass) {
          closed = true;
          break;
        }
        j++;
      }
      if (closed) {
        for (let k = i + 1; k < j; k++) blank(k);
        i = j + 1;
        while (i < n && /[gimsuyd]/.test(src[i])) i++;
        prev = "/";
        continue;
      }
      // Not a regex after all; fall through and treat as division.
    }

    // Strings are always TRACKED, even when `strings:false` preserves their
    // contents for the Rule 3 scan. Tracking is what stops a `//` or a bracket
    // inside a string from being read as code.
    if (c === '"' || (singleQuote && c === SQ)) {
      const quote = c;
      let j = i + 1;
      while (j < n && src[j] !== quote && src[j] !== "\n") {
        if (src[j] === "\\") {
          if (strings) {
            blank(j);
            blank(j + 1);
          }
          j += 2;
          continue;
        }
        if (strings) blank(j);
        j++;
      }
      // Unterminated at newline: stop rather than eat the rest of the file.
      i = j < n && src[j] === quote ? j + 1 : j;
      prev = quote;
      continue;
    }

    if (c === BT) {
      tmpl.push(0);
      i++;
      continue;
    }

    if (tmpl.length) {
      if (c === "{") tmpl[tmpl.length - 1]++;
      else if (c === "}") {
        tmpl[tmpl.length - 1]--;
        if (tmpl[tmpl.length - 1] === 0) {
          prev = "}";
          i++;
          continue; // back to template text
        }
      }
    }

    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join("");
}

/**
 * True when `index` sits between a matched pair of single quotes on its own
 * line. Used to reject render "evidence" that is really string content.
 *
 * The masker's fallback strategy leaves single-quoted strings unmasked, so
 * `const example = '{faqs.map(x)}'` would otherwise read as a JSX render. A
 * paired test is what distinguishes that from JSX prose, where an apostrophe
 * normally appears alone on the line.
 */
export function insideSingleQuotedRun(src, index) {
  const lineStart = src.lastIndexOf("\n", index) + 1;
  let lineEnd = src.indexOf("\n", index);
  if (lineEnd === -1) lineEnd = src.length;
  const line = src.slice(lineStart, lineEnd);
  const col = index - lineStart;
  let open = -1;
  for (let k = 0; k < line.length; k++) {
    if (line[k] === "\\") {
      k++;
      continue;
    }
    if (line[k] !== SQ) continue;
    if (open === -1) open = k;
    else {
      if (col > open && col < k) return true;
      open = -1;
    }
  }
  return false;
}

/**
 * Bracket depth over a masked file must return to zero and never go negative.
 * TypeScript source is balanced and JSX cannot contain a bare `{` in text, so
 * an imbalance means the masker lost its place. This is the loud failure mode
 * that keeps an approximate tokenizer honest.
 */
export function maskBalanced(mask) {
  let depth = 0;
  for (const c of mask) {
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      if (--depth < 0) return false;
    }
  }
  return depth === 0;
}

/**
 * Mask `src`, preferring single-quote-as-delimiter and falling back when that
 * desyncs. Returns { mask, balanced, singleQuote }. `balanced:false` means both
 * strategies failed and nothing derived from this file can be trusted.
 */
export function maskSource(src, opts = {}) {
  for (const singleQuote of [true, false]) {
    const mask = maskLiterals(src, { ...opts, singleQuote });
    if (maskBalanced(mask)) return { mask, balanced: true, singleQuote };
  }
  return { mask: maskLiterals(src, { ...opts, singleQuote: true }), balanced: false, singleQuote: true };
}

/**
 * Offsets of genuine calls to `name`. Skips the declaration, which matches the
 * same pattern: structured-data.ts has `export function faqPageSchema(items:...)`.
 * Comment and string mentions are already gone because this runs on the mask.
 */
export function findCallSites(mask, name) {
  const sites = [];
  const re = new RegExp(`(^|[^\\w$])${name}\\s*\\(`, "g");
  let m;
  while ((m = re.exec(mask)) !== null) {
    const nameStart = m.index + m[1].length;
    const open = m.index + m[0].length - 1;
    const before = mask.slice(Math.max(0, nameStart - 40), nameStart);
    if (/\b(function|class)\s+$/.test(before)) {
      re.lastIndex = open;
      continue;
    }
    sites.push({ nameStart, open });
    re.lastIndex = open;
  }
  return sites;
}

/**
 * From the `(` at `open`, find the matching `)` and the first top-level comma.
 * Counts ()[]{} together; the input is valid TS, so we only ever ask whether we
 * are back at the outermost level. Returns null if the scan runs off the end.
 */
export function scanCall(mask, open) {
  let depth = 0;
  let firstComma = -1;
  for (let i = open; i < mask.length; i++) {
    const c = mask[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      if (--depth === 0) return { open, close: i, firstComma };
    } else if (c === "," && depth === 1 && firstComma === -1) firstComma = i;
  }
  return null;
}

/** First argument of the call whose `(` is at `open`, as raw and masked text. */
export function firstArg(src, mask, open) {
  const span = scanCall(mask, open);
  if (!span) return null;
  const end = span.firstComma === -1 ? span.close : span.firstComma;
  return { raw: src.slice(open + 1, end), masked: mask.slice(open + 1, end), span };
}

/**
 * Trailing chained calls are NOT stripped, they are refused.
 *
 * This used to skip any `.foo(...)` after the projection, which meant
 * `visibleFaqs.map(f => f).concat(hiddenFaqs)` resolved to root `visibleFaqs`
 * and passed while hiddenFaqs entered the JSON-LD unrendered. Deciding which
 * chained methods can add elements needs real evaluation, so the safe rule is
 * to allow none. No call site in this repo uses one.
 */
function stripChainedCalls(rest) {
  return rest;
}

/**
 * Classify the first argument.
 *   { kind: "root", path, normalized } a named array root, Rule 1 satisfied
 *   { kind: "literal" }                an inline [ ... ]
 *   { kind: "call", preview }          getFaqs(), a result rather than a binding
 *   { kind: "expression", preview }    ternary, &&, anything else
 *   { kind: "empty" }
 */
export function resolveRoot(argMasked, argRaw = argMasked) {
  const trimmed = argMasked.trim();
  if (trimmed === "") return { kind: "empty" };
  if (trimmed.startsWith("[")) return { kind: "literal" };

  const m = /^[A-Za-z_$][\w$]*(?:\s*\??\.\s*[A-Za-z_$][\w$]*)*/.exec(trimmed);
  if (!m) return { kind: "expression", preview: preview(argRaw) };

  let path = m[0].replace(/\s+/g, "");
  let rest = trimmed.slice(m[0].length);

  // A trailing .map/.flatMap is a projection of the root, not a different array.
  // Without this the root resolves to `investmentFaqs.map`, which matches nothing.
  const seg = /^(.*?)\??\.(map|flatMap)$/.exec(path);
  if (seg && /^\s*\(/.test(rest)) {
    const openRel = rest.indexOf("(");
    const span = scanCall(rest, openRel);
    if (!span) return { kind: "expression", preview: preview(argRaw) };
    path = seg[1];
    rest = stripChainedCalls(rest.slice(span.close + 1));
  } else if (/^\s*\(/.test(rest)) {
    return { kind: "call", preview: preview(argRaw) };
  }

  // `?? []` is a defensive default for the same array, so it is tolerated.
  // Anything else left over means this is an expression, not a root.
  const tail = rest.trim();
  if (tail !== "" && !/^\?\?\s*\[\s*\]$/.test(tail)) {
    return { kind: "expression", preview: preview(argRaw) };
  }

  return { kind: "root", path, normalized: path.replace(/\?\./g, ".") };
}

function rootRegex(normalizedRoot) {
  const sep = "(?:\\?\\.|\\.)";
  const parts = normalizedRoot.split(".").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  // The leading boundary excludes `.` so root `faqs` is NOT satisfied by
  // `entry.faqs.map(`, which is a different array that happens to end in `faqs`.
  return new RegExp(`(^|[^\\w$.])${parts.join(sep)}${sep}map\\s*\\(`, "g");
}

/**
 * Visible renders of `normalizedRoot`: occurrences of `{root.map(` that are not
 * inside any faqPageSchema argument span.
 *
 * Both conditions are load-bearing.
 *   - Span exclusion, because on /investment `investmentFaqs.map(` appears at
 *     line 85 feeding the schema and again at 411 in JSX. Without exclusion the
 *     schema projection would prove its own visibility and the check would be
 *     self-satisfying.
 *   - The `{` (JSX position), because a bare `root.map(` only proves the array
 *     is mapped somewhere. `src/lib/markdown-views.ts` already consumes these
 *     same arrays to build non-visible .md output. A `faqs.map(f => f.q).join()`
 *     feeding a meta description would otherwise pass while rendering nothing.
 * VERIFIED: the strict form matches all 11 real render sites at identical lines,
 * so it costs no false alarms today.
 */
export function findRenders(src, mask, normalizedRoot, schemaArgSpans = []) {
  const hits = [];
  const re = rootRegex(normalizedRoot);
  let m;
  while ((m = re.exec(mask)) !== null) {
    const at = m.index + m[1].length;
    if (schemaArgSpans.some(([s, e]) => at >= s && at <= e)) continue;
    if (insideSingleQuotedRun(src, at)) continue;
    let j = at - 1;
    while (j >= 0 && /\s/.test(mask[j])) j--;
    if (j < 0 || mask[j] !== "{") continue;
    // The `{` must open a JSX expression container, not a statement block. In
    // `onClick={() => { faqs.map(logFaq) }}` the brace is an arrow-function body
    // and the map produces no DOM at all.
    let k = j - 1;
    while (k >= 0 && /\s/.test(mask[k])) k--;
    if (k >= 1 && mask[k] === ">" && mask[k - 1] === "=") continue; // `=> {`
    if (k >= 0 && mask[k] === ")") continue; // `) {`
    hits.push({ index: at, line: lineOf(src, at) });
  }
  return hits;
}

/**
 * Distinct initializers among the `const|let|var <name>` declarations in a file.
 *
 * More than one DISTINCT initializer means the render evidence may bind to a
 * different array than the schema does, since this check matches names rather
 * than resolving lexical scope. Such a name is treated as unprovable and failed.
 *
 * Counting declarations alone was too blunt and false-flagged three real pages:
 * `industries/[slug]/page.tsx` declares `const industry = getIndustry(slug)`
 * once in generateMetadata and once in the component. Those are separate scopes
 * holding the same value, not a shadow. Identical initializer text is the signal
 * that separates them from a genuine `const faqs = []` shadow.
 *
 * Approximation: the initializer is read to end of line, so two declarations
 * differing only on a later line read as identical. That direction is a missed
 * catch rather than a false alarm, and the render check still has to pass.
 */
export function declarationInitializers(mask, name) {
  const re = new RegExp(`\\b(?:const|let|var)\\s+${name}\\b\\s*(?::[^=\\n]*)?=\\s*([^;\\n]*)`, "g");
  const seen = new Set();
  let m;
  while ((m = re.exec(mask)) !== null) seen.add(m[1].trim().replace(/\s+/g, " "));
  return seen;
}

/**
 * False when `name` is declared mutably or reassigned as a statement.
 *
 * `let faqs = [hidden]; faqPageSchema(faqs); faqs = []; {faqs.map(...)}` feeds
 * the schema one array and renders another while every name matches. Only an
 * immutable binding makes name equality a proxy for value equality.
 *
 * The reassignment probe is anchored to statement start so a JSX prop such as
 * `<C faqs={faqs} />` is not mistaken for an assignment.
 */
export function isStableBinding(mask, name) {
  const decl = new RegExp(`\\b(const|let|var)\\s+${name}\\b`, "g");
  let m;
  while ((m = decl.exec(mask)) !== null) {
    if (m[1] !== "const") return false;
  }
  if (new RegExp(`^\\s*${name}\\s*=(?!=)`, "m").test(mask)) return false;
  // `const` freezes the binding, not the contents. `faqs.splice(0, faqs.length,
  // ...different)` after the schema call leaves the helper holding a snapshot of
  // the old items while JSX maps the replacements.
  return !new RegExp(`\\b${name}\\s*\\.\\s*(?:${MUTATORS.join("|")})\\s*\\(`).test(mask);
}

const MUTATORS = ["splice", "push", "pop", "shift", "unshift", "sort", "reverse", "fill", "copyWithin"];

/** Name the faqPageSchema() result is assigned to, if any: `const X = faqPageSchema(...)`. */
export function schemaBindingName(mask, nameStart) {
  const before = mask.slice(Math.max(0, nameStart - 120), nameStart);
  const m = /(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*$/.exec(before);
  return m ? m[1] : null;
}

/**
 * Named and namespace imports. Matched on the mask so a commented-out import is
 * invisible, then sliced from the raw source because the mask blanks the module
 * specifier's contents.
 */
export function parseImports(src, mask) {
  const out = [];
  const re = /import\s+(?:type\s+)?(?:(\*\s*as\s*[A-Za-z_$][\w$]*)|(\{[^}]*\}))\s*from\s*["'][^"']*["']\s*;?/g;
  let m;
  while ((m = re.exec(mask)) !== null) {
    const raw = src.slice(m.index, m.index + m[0].length);
    const spec = /from\s*["']([^"']+)["']/.exec(raw)?.[1];
    if (!spec) continue;
    const entry = { specifier: spec, named: new Map(), namespace: null };
    if (m[1]) {
      entry.namespace = /\*\s*as\s*([A-Za-z_$][\w$]*)/.exec(m[1])[1];
    } else {
      for (const part of m[2].slice(1, -1).split(",")) {
        if (/^\s*type\s/.test(part)) continue; // type-only imports never render
        const p = /^\s*([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?\s*$/.exec(part);
        if (!p) continue;
        entry.named.set(p[1], p[2] ?? p[1]); // exported name -> local name
      }
    }
    out.push(entry);
  }
  return out;
}

/** Resolve a relative or `@/`-aliased specifier to an absolute real path. */
export function resolveSpecifier(spec, fromFile, root) {
  let base;
  if (spec.startsWith("@/")) base = join(root, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = join(dirname(fromFile), spec);
  else return null; // bare package
  for (const c of [base, base + ".ts", base + ".tsx", join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(c)) {
      try {
        return realpathSync(c);
      } catch {
        return c;
      }
    }
  }
  return null;
}

const FAQ_HELPER = "faqPageSchema";
const STRUCTURED_DATA_REL = join("src", "app", "lib", "structured-data.ts");

// Escape hatch for a render this static check cannot see (a child component, a
// hoisted variable). Deliberately greppable and deliberately requires naming
// where the FAQ actually renders, so it shows up as a reviewable line in a diff.
const DIRECTIVE = /verify-schema:\s*faq-visible\s+(\S+)?/;

// Rule 3 runs on comment-masked but string-PRESERVED source, so it can see the
// literal. The property form only: faq/page.tsx:34 is `function FAQPage()`, and
// a bare /FAQPage/ would hard-fail on it.
//
// The third pattern catches an @type whose value is an identifier rather than a
// literal (`const kind = "FAQPage"; { "@type": kind }`), which the first two
// miss. VERIFIED: zero non-literal @type values exist anywhere in src/, so this
// costs no false positives today.
const HANDROLLED_FAQ = [
  /["'`]?@type["'`]?\s*:\s*["'`]FAQPage["'`]/,
  /\[\s*["']@type["']\s*\]\s*:\s*["'`]FAQPage["'`]/,
  /["'`]@type["'`]\s*:\s*[A-Za-z_$][\w$.]*/,
];

/**
 * Every `@type:` value in a file, as { index, text }. Rule 3 inspects the VALUE
 * rather than pattern-matching the whole property, because a computed
 * expression such as `"FAQ" + "Page"` produces a valid FAQPage node while
 * matching no literal pattern. Anything that is not a plain string literal (or
 * an array of them) is unprovable and therefore rejected.
 */
export function typeValues(stringsVisible) {
  const out = [];
  const re = /["'`]?@type["'`]?\s*:\s*/g;
  let m;
  while ((m = re.exec(stringsVisible)) !== null) {
    const start = m.index + m[0].length;
    let depth = 0;
    let i = start;
    for (; i < stringsVisible.length; i++) {
      const c = stringsVisible[i];
      if (c === "[" || c === "{" || c === "(") depth++;
      else if (c === "]" || c === "}" || c === ")") {
        if (depth === 0) break;
        depth--;
      } else if (c === "," && depth === 0) break;
    }
    out.push({ index: m.index, text: stringsVisible.slice(start, i).trim() });
    re.lastIndex = i;
  }
  return out;
}

const LONE_STRING = /^(["'`])([^"'`]*)\1$/;

/** null when the value is a provable non-FAQPage literal; otherwise a reason. */
function faqTypeViolation(text) {
  const lone = LONE_STRING.exec(text);
  if (lone) return lone[2] === "FAQPage" ? "declares an FAQPage node" : null;
  if (text.startsWith("[")) {
    const parts = text.slice(1, -1).split(",").map((p) => p.trim()).filter(Boolean);
    if (parts.every((p) => LONE_STRING.test(p))) {
      return parts.some((p) => LONE_STRING.exec(p)[2] === "FAQPage") ? "declares an FAQPage node" : null;
    }
  }
  return `uses a computed @type (\`${preview(text, 40)}\`), which cannot be proven not to be FAQPage`;
}

// Anti-vacuity sentinel: proof that this repo still emits FAQPage at all.
//
// Deliberately NOT derived from FAQ_HELPER. An earlier version tested for
// `function ${FAQ_HELPER}(`, which meant a typo in FAQ_HELPER disabled the
// scanner AND the guard meant to catch that, and verify-schema printed a green
// "0 FAQPage call site(s) verified visible". That was caught by mutation test
// (d) during implementation, and it is precisely the vacuous-pass shape that
// verify-links.mjs was patched for. The sentinel must fail independently of the
// thing it is guarding. If the helper is ever legitimately renamed, this fires
// and forces the scanner to be updated with it, which is the correct outcome.
const FAQ_INFRASTRUCTURE = /["'`]@type["'`]\s*:\s*["'`]FAQPage["'`]/;

/**
 * Run the whole check.
 *
 * @param {object} o
 * @param {string[]} o.files    absolute paths to scan (.ts and .tsx)
 * @param {(f: string) => string} o.readFile
 * @param {string} o.root       repo root, for relative paths and `@/` resolution
 * @param {(f: string) => string} [o.relative]
 * @returns {{errors: string[], warnings: string[], siteCount: number, sites: object[]}}
 */
export function checkFaqVisibility({ files, readFile, root, relative: rel = (f) => f }) {
  const errors = [];
  const warnings = [];
  const sites = [];

  const parsed = new Map();
  const load = (file) => {
    if (!parsed.has(file)) {
      const src = readFile(file);
      parsed.set(file, { src, ...maskSource(src) });
    }
    return parsed.get(file);
  };

  let helperDefined = false;
  let callSitesSeen = 0;
  const mentioning = [];

  for (const file of files) {
    let entry;
    try {
      entry = load(file);
    } catch (err) {
      // Never silent. An unreadable file could be the one holding invalid FAQ
      // markup, and skipping it turns a verification gap into a green run.
      errors.push(`${rel(file)}: could not be read, so its FAQ markup is unverified (${err.code ?? err.message}).`);
      continue;
    }
    const { src, mask, balanced } = entry;
    const relPath = rel(file);
    const mentions = mask.includes(FAQ_HELPER);

    // Canary severity is scoped to what is actually at stake, because this
    // lexer is approximate by construction and it gates every push to the repo.
    //
    // Erroring on ANY unbalanced .tsx made one unusual construct in one of ~130
    // page/component files enough to block all pushes, with no sanctioned bypass
    // (CLAUDE.md bans --no-verify). That is a repo-wide outage risk resting on a
    // hand-rolled tokenizer's edge cases, and it is the wrong trade for a lint
    // gate. A file with no FAQ code has nothing to verify, so a desync there is
    // worth reporting, not worth blocking on.
    if (!balanced) {
      const detail =
        `${relPath}: bracket depth does not return to zero after masking strings and comments. ` +
        `The FAQ scanner lost its place in this file. See maskLiterals() in scripts/lib/faq-visibility.mjs.`;
      if (mentions) {
        // Fail closed: this file DOES touch FAQ markup and we cannot read it.
        errors.push(`${detail} Its FAQ markup is therefore unverified.`);
        continue;
      }
      warnings.push(`${detail} No FAQ code in it, so nothing is unverified.`);
      continue;
    }

    // Rule 3, applied to EVERY file including structured-data.ts. Only the
    // canonical helper body is exempt there, not the whole file: a second
    // exported FAQPage object in that file would otherwise be free to ship.
    const stringsVisible = maskLiterals(src, { strings: false });
    const isStructuredData = relPath.endsWith(STRUCTURED_DATA_REL) || file.endsWith(STRUCTURED_DATA_REL);
    let exemptSpan = null;
    if (isStructuredData) {
      if (FAQ_INFRASTRUCTURE.test(stringsVisible)) helperDefined = true;
      const decl = new RegExp(`function\\s+${FAQ_HELPER}\\s*\\(`).exec(mask);
      if (decl) {
        // Step over the PARAMETER LIST before looking for the body brace. The
        // real signature is `faqPageSchema(items: { q: string; a: string }[], …)`,
        // so a bare indexOf("{") lands inside the type annotation and the
        // exempt span covers the wrong region.
        const params = scanCall(mask, decl.index + decl[0].length - 1);
        const bodyStart = params ? mask.indexOf("{", params.close) : -1;
        const body = bodyStart === -1 ? null : scanCall(mask, bodyStart);
        if (body) exemptSpan = [body.open, body.close];
      }
    }
    // Catch-all first: the literal string "FAQPage" has no business appearing
    // anywhere except inside the canonical helper. This subsumes computed keys
    // (`{ [typeKey]: "FAQPage" }`), which typeValues() cannot see because it
    // looks for a literal `@type:` property name.
    const faqLiteral = /["'`]FAQPage["'`]/g;
    let fl;
    while ((fl = faqLiteral.exec(stringsVisible)) !== null) {
      if (exemptSpan && fl.index >= exemptSpan[0] && fl.index <= exemptSpan[1]) continue;
      errors.push(
        `${relPath}:${lineOf(src, fl.index)}: contains the literal "FAQPage" outside ${FAQ_HELPER}(). ` +
          `All FAQPage JSON-LD must go through that helper in src/app/lib/structured-data.ts, because that call ` +
          `is what the FAQ-visibility check keys on. A node built any other way bypasses the gate.`,
      );
      break;
    }
    for (const { index, text } of typeValues(stringsVisible)) {
      if (exemptSpan && index >= exemptSpan[0] && index <= exemptSpan[1]) continue;
      const violation = faqTypeViolation(text);
      if (violation) {
        errors.push(
          `${relPath}:${lineOf(src, index)}: ${violation}. All FAQPage JSON-LD must go through ${FAQ_HELPER}() ` +
            `in src/app/lib/structured-data.ts, because that call is what the FAQ-visibility check keys on. ` +
            `A node built any other way bypasses the gate.`,
        );
        break;
      }
    }

    // The helper may only be CALLED, never taken as a value. `const build =
    // faqPageSchema; build(hidden)` emits FAQPage markup that call-site
    // detection cannot see, and the partial-detection guard misses it because
    // the file still has one recognised call.
    if (!isStructuredData) {
      const importSpans = [];
      const impRe = /import\s+(?:type\s+)?(?:\*\s*as\s*[A-Za-z_$][\w$]*|\{[^}]*\})\s*from\s*["'][^"']*["']\s*;?/g;
      let im;
      while ((im = impRe.exec(mask)) !== null) importSpans.push([im.index, im.index + im[0].length]);
      for (const imp of parseImports(src, mask)) {
        const local = imp.named.get(FAQ_HELPER);
        if (local && local !== FAQ_HELPER) {
          errors.push(
            `${relPath}: imports ${FAQ_HELPER} as \`${local}\`. Aliasing the helper hides its call sites from ` +
              `this check. Import and call it under its own name.`,
          );
        }
      }
      const useRe = new RegExp(`(^|[^\\w$.])${FAQ_HELPER}\\b`, "g");
      let u;
      while ((u = useRe.exec(mask)) !== null) {
        const at = u.index + u[1].length;
        const after = mask.slice(at + FAQ_HELPER.length);
        if (/^\s*\(/.test(after)) continue; // a call
        if (importSpans.some(([s, e]) => at >= s && at < e)) continue; // an import specifier
        errors.push(
          `${relPath}:${lineOf(src, at)}: ${FAQ_HELPER} is used as a value rather than called. Aliasing the ` +
            `helper hides call sites from this check. Call it directly at each site.`,
        );
        break;
      }
    }

    const callSites = findCallSites(mask, FAQ_HELPER);
    callSitesSeen += callSites.length;
    if (mentions) mentioning.push({ relPath, callSites: callSites.length });
    if (callSites.length === 0) continue;

    const spans = [];
    for (const { open } of callSites) {
      const span = scanCall(mask, open);
      if (span) spans.push([span.open, span.close]);
    }

    for (const { nameStart, open } of callSites) {
      const line = lineOf(src, nameStart);
      const arg = firstArg(src, mask, open);
      if (!arg) {
        errors.push(`${relPath}:${line}: could not parse the ${FAQ_HELPER}() argument list (unterminated call).`);
        continue;
      }

      const resolved = resolveRoot(arg.masked, arg.raw);
      if (resolved.kind === "literal") {
        errors.push(
          `${relPath}:${line}: ${FAQ_HELPER}() is called with an inline array literal. Pass a NAMED array ` +
            `(a const, or a field such as \`entry.faqs\`) that the page also renders, so the visible FAQ and ` +
            `the JSON-LD cannot drift. Hoist the literal to a const above this call and map that const in JSX.`,
        );
        continue;
      }
      if (resolved.kind !== "root") {
        errors.push(
          `${relPath}:${line}: ${FAQ_HELPER}() first argument \`${resolved.preview ?? ""}\` is not a named array ` +
            `root. Expected an identifier or member path, optionally with a trailing .map()/.flatMap() projection. ` +
            `Assign it to a const first so the same binding can be rendered on the page.`,
        );
        continue;
      }

      const { normalized } = resolved;

      // The directive suppresses only the RENDER-LOCATION check, and only after
      // the argument has been classified. It used to short-circuit before
      // resolveRoot, which let an annotated inline literal through, defeating
      // Rule 1 entirely. It is also matched against a comment-only view, because
      // read from raw source a mere string containing the phrase triggered it.
      const commentsOnly = maskLiterals(src, { strings: true, comments: false });
      const lineStart = commentsOnly.lastIndexOf("\n", nameStart) + 1;
      const prevStart = commentsOnly.lastIndexOf("\n", lineStart - 2) + 1;
      const lineEnd = commentsOnly.indexOf("\n", nameStart);
      const directive = DIRECTIVE.exec(commentsOnly.slice(prevStart, lineEnd === -1 ? commentsOnly.length : lineEnd));
      if (directive) {
        // The named path must exist. An unvalidated hatch silently keeps
        // vouching for a component that was deleted or renamed, which is the
        // one thing an escape hatch must never do.
        const claimed = directive[1];
        if (!claimed) {
          errors.push(
            `${relPath}:${line}: the faq-visible directive must name the file that renders this FAQ, ` +
              `as \`// verify-schema: faq-visible <path>\`.`,
          );
          continue;
        }
        if (!existsSync(join(root, claimed))) {
          errors.push(
            `${relPath}:${line}: the faq-visible directive points at \`${claimed}\`, which does not exist. ` +
              `Either the render moved or the annotation went stale; a stale hatch vouches for markup nobody renders.`,
          );
          continue;
        }
        sites.push({ file: relPath, line, root: normalized, via: `directive -> ${claimed}` });
        continue;
      }

      const rootHead = normalized.split(".")[0];
      if (!isStableBinding(mask, rootHead)) {
        errors.push(
          `${relPath}:${line}: ${FAQ_HELPER}(${normalized}) depends on \`${rootHead}\`, which is declared with ` +
            `let/var or reassigned. Only a const binding makes the rendered array provably the same one fed to the ` +
            `schema, since this check matches names rather than values.`,
        );
        continue;
      }
      const localHits = file.endsWith(".tsx") ? findRenders(src, mask, normalized, spans) : [];
      if (localHits.length) {
        if (declarationInitializers(mask, rootHead).size > 1) {
          errors.push(
            `${relPath}:${line}: ${FAQ_HELPER}(${normalized}) appears to be rendered, but \`${rootHead}\` is ` +
              `declared more than once in this file with different values. This check matches names, not lexical ` +
              `bindings, so a shadowed name cannot prove the rendered array is the one fed to the schema. Rename one.`,
          );
          continue;
        }
        sites.push({ file: relPath, line, root: normalized, via: `${relPath}:${localHits[0].line}` });
        continue;
      }

      // Cross-file arm. Only for single-segment roots: a dotted root such as
      // `industry.faqs` is a property of a local binding, not an exported symbol,
      // so chasing it across files would be guesswork.
      if (normalized.includes(".")) {
        errors.push(
          `${relPath}:${line}: ${FAQ_HELPER}(${normalized}) builds FAQPage JSON-LD, but this file never renders it. ` +
            `Searched for \`{${normalized}.map(\` in JSX. Google ignores FAQ markup whose Q&A is not visible on the ` +
            `page. If it renders somewhere this check cannot see, add \`// verify-schema: faq-visible <path>\` above this call.`,
        );
        continue;
      }

      // Cross-file renders must be page-LOCAL, not merely somewhere in the repo.
      // Without this, a data module exporting both `faqs` and
      // `schema = faqPageSchema(faqs)` passes as soon as ANY page maps `faqs`,
      // even if the page consuming `schema` renders no FAQ at all. Requiring the
      // rendering file to also reference the schema binding ties the two together.
      const binding = schemaBindingName(mask, nameStart);
      if (!binding) {
        errors.push(
          `${relPath}:${line}: ${FAQ_HELPER}(${normalized}) has no visible render in this file, and the result is ` +
            `not assigned to a named const, so there is no way to tell which page consumes it. Render the FAQ here, ` +
            `or assign the schema to an exported const that the rendering page also imports.`,
        );
        continue;
      }
      const cross = findCrossFileRender({
        root: normalized,
        binding,
        defFile: file,
        defMask: mask,
        files,
        load,
        repoRoot: root,
        rel,
      });
      if (cross.ok) {
        sites.push({ file: relPath, line, root: normalized, via: `${cross.file}:${cross.line} (cross-file)` });
        continue;
      }
      if (!cross.exported) {
        errors.push(
          `${relPath}:${line}: ${FAQ_HELPER}(${normalized}) has no visible render in this file, and \`${normalized}\` ` +
            `is not exported, so no other file can render it either. Render it here, or export it and map it on the page.`,
        );
      } else {
        errors.push(
          `${relPath}:${line}: ${FAQ_HELPER}(${normalized}) has no visible render. \`${normalized}\` is exported here, ` +
            `but none of the ${cross.searched.length} file(s) importing it renders \`{${normalized}.map(\`` +
            (cross.searched.length ? `: ${cross.searched.join(", ")}.` : "."),
        );
      }
    }
  }

  // Anti-vacuity layer (a): the checker finding nothing is not the same as the
  // FAQ surface being clean. This repo has a double-digit number of call sites.
  // Keyed on DETECTION, not on verification. Gating this on `errors.length === 0`
  // meant an unrelated Rule 3 error masked the vacuity diagnostic, which is the
  // one message that tells you the scanner itself stopped working.
  if (helperDefined && callSitesSeen === 0) {
    errors.push(
      `Found 0 ${FAQ_HELPER}() call sites across ${files.length} scanned file(s) while ` +
        `src/app/lib/structured-data.ts still emits FAQPage JSON-LD. That means call-site detection is broken, ` +
        `not that the FAQ surface is clean. If the helper was renamed, update FAQ_HELPER in ` +
        `scripts/lib/faq-visibility.mjs; otherwise check the scanner against ` +
        `src/app/(marketing)/faq/page.tsx before weakening or deleting this guard.`,
    );
  }

  // Anti-vacuity layer (b): a file that mentions the helper in real code but
  // parses to no call site means the scanner is PARTIALLY broken, which a
  // zero-total check would never notice.
  for (const { relPath, callSites } of mentioning) {
    if (callSites === 0 && !relPath.endsWith(STRUCTURED_DATA_REL)) {
      errors.push(
        `${relPath}: mentions ${FAQ_HELPER} in code but no call site could be parsed from it. The FAQ scanner ` +
          `is not seeing this file correctly; treat its FAQ markup as unverified.`,
      );
    }
  }

  return { errors, warnings, siteCount: sites.length, sites };
}

function findCrossFileRender({ root, binding, defFile, defMask, files, load, repoRoot, rel }) {
  const exported =
    new RegExp(`^\\s*export\\s+(?:const|let|var)\\s+${root}\\b`, "m").test(defMask) ||
    new RegExp(`export\\s*\\{[^}]*\\b${root}\\b[^}]*\\}`).test(defMask);
  if (!exported) return { ok: false, exported: false, searched: [] };

  let defReal = defFile;
  try {
    defReal = realpathSync(defFile);
  } catch {
    /* keep the original path */
  }

  const searched = [];
  for (const file of files) {
    if (file === defFile || !file.endsWith(".tsx")) continue;
    let entry;
    try {
      entry = load(file);
    } catch {
      continue;
    }
    const { src, mask, balanced } = entry;
    if (!balanced) continue;

    for (const imp of parseImports(src, mask)) {
      if (resolveSpecifier(imp.specifier, file, repoRoot) !== defReal) continue;
      searched.push(rel(file));

      const candidates = [];
      if (imp.named.has(root)) candidates.push(imp.named.get(root));
      if (imp.namespace) candidates.push(`${imp.namespace}.${root}`);

      const spans = findCallSites(mask, FAQ_HELPER)
        .map(({ open }) => scanCall(mask, open))
        .filter(Boolean)
        .map((s) => [s.open, s.close]);

      // Page-locality: this file must IMPORT the schema binding from the
      // defining module. A bare name test was not enough, because an unrelated
      // local `const schema = 1` on another page satisfied it.
      const consumesSchema =
        imp.named.has(binding) ||
        (Boolean(imp.namespace) && new RegExp(`\\b${imp.namespace}\\.${binding}\\b`).test(mask));
      if (!consumesSchema) continue;

      for (const candidate of candidates) {
        const hits = findRenders(src, mask, candidate, spans);
        if (!hits.length) continue;
        if (declarationInitializers(mask, candidate.split(".")[0]).size > 1) continue; // shadowed, unprovable
        return { ok: true, exported: true, file: rel(file), local: candidate, line: hits[0].line, searched };
      }
    }
  }
  return { ok: false, exported: true, searched };
}
