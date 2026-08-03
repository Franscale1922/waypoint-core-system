import { describe, it, expect } from "vitest";
import { loadServiceAccount, describeMissing } from "../../scripts/lib/load-service-account.mjs";

/**
 * load-service-account.mjs exists because a malformed GitHub secret took down
 * two workflows for months and reported it as a stack trace.
 *
 * The stored `GOOGLE_INDEXING_SA_KEY` was not base64 at all, so Node's decoder —
 * which silently STRIPS characters outside the base64 alphabet rather than
 * rejecting them — turned it into binary, and CI printed:
 *
 *     SyntaxError: Unexpected token 'm', "m<binary>"... is not valid JSON
 *
 * Two failures are under test here, and the second matters more.
 *
 * 1. Classification. Both encodings must be accepted, and each malformed shape
 *    must be named rather than lumped into a generic parse error.
 *
 * 2. Leak safety. That V8 message embeds a slice of the parser's INPUT. The
 *    stored value happened to be junk, so only junk leaked — but the identical
 *    code path on a correctly-stored key would have printed the opening bytes of
 *    a live private key into a public Actions log. GitHub masks only exact
 *    matches of a registered secret, so a decoded fragment is not masked.
 *
 * Leak assertions use high-entropy sentinels planted in every credential VALUE
 * rather than scanning for raw substrings, because the diagnoses legitimately
 * contain field NAMES like `client_email`. What must never escape is values.
 *
 * The final test asserts the executed-case count. scripts/verify-links.mjs
 * shipped green while checking zero files (PR #15, fixed days ago); a suite that
 * quietly stops covering things is worse than no suite, so a fixture that throws
 * before it counts must fail this file rather than shrink it.
 */

// Structurally unlike anything in the module's own vocabulary, so a hit is a
// real leak and not an incidental collision.
const S = {
  email: "Q7XKPZ4MVNTR2WJH",
  key: "L9BFYCDA6EGSU3KM",
  project: "T5NRWQZX8VJHP2CB",
  id: "H4KMDTYF7NQXA9RW",
};

const KEY_MATERIAL = [S.email, S.key, S.project, S.id];

function makeKey(overrides: Record<string, unknown> = {}) {
  return {
    type: "service_account",
    project_id: `waypoint-${S.project}`,
    private_key_id: S.id,
    private_key: `-----BEGIN PRIVATE KEY-----\nMIIEv${S.key}wIBADAN\n-----END PRIVATE KEY-----\n`,
    client_email: `indexer-${S.email}@waypoint.iam.gserviceaccount.com`,
    client_id: "123456789",
    ...overrides,
  };
}

const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");
const validJson = JSON.stringify(makeKey(), null, 2);

const VAR = "GSC_SERVICE_ACCOUNT_KEY";

type Fixture = {
  name: string;
  input: string | undefined;
  status: "missing" | "ok" | "invalid";
  code?: string;
  encoding?: "json" | "base64";
};

const FIXTURES: Fixture[] = [
  // ── absent ────────────────────────────────────────────────────────────────
  { name: "undefined", input: undefined, status: "missing" },
  { name: "empty string", input: "", status: "missing" },
  { name: "whitespace only", input: "   \n\t ", status: "missing" },

  // ── accepted, both encodings ──────────────────────────────────────────────
  { name: "raw JSON", input: validJson, status: "ok", encoding: "json" },
  { name: "base64 JSON", input: b64(validJson), status: "ok", encoding: "base64" },
  {
    // `base64 -i key.json` without `tr -d '\n'` wraps its output. Node strips the
    // newlines, so this must still be accepted.
    name: "base64 with newlines (unwrapped paste)",
    input: b64(validJson).replace(/(.{40})/g, "$1\n"),
    status: "ok",
    encoding: "base64",
  },
  {
    name: "raw JSON with surrounding whitespace",
    input: `\n  ${validJson}\n  `,
    status: "ok",
    encoding: "json",
  },

  // ── the failure this repo actually hit ────────────────────────────────────
  {
    name: "setup command pasted instead of its output",
    input: "base64 -i your-key.json | tr -d '\\n' | pbcopy",
    status: "invalid",
    code: "pasted-setup-command",
  },

  // ── other malformed shapes ────────────────────────────────────────────────
  {
    name: "PEM private key alone",
    input: `-----BEGIN PRIVATE KEY-----\nMIIEv${S.key}\n-----END PRIVATE KEY-----`,
    status: "invalid",
    code: "pem-only",
  },
  { name: "encoded twice", input: b64(b64(validJson)), status: "invalid", code: "double-encoded" },
  {
    name: "prose, not a key",
    input: "this is definitely not a key! (someone pasted a note)",
    status: "invalid",
    code: "not-base64",
  },
  {
    name: "base64 of non-JSON text",
    input: b64(`some notes about ${S.project} and nothing else`),
    status: "invalid",
    code: "base64-decodes-to-non-json",
  },
  {
    name: "truncated JSON",
    input: validJson.slice(0, 120),
    status: "invalid",
    code: "json-malformed",
  },
  {
    name: "JSON without required fields",
    input: JSON.stringify({ type: "service_account", project_id: `waypoint-${S.project}` }),
    status: "invalid",
    code: "json-missing-fields",
  },
  {
    name: "client_email is not an address",
    input: JSON.stringify(makeKey({ client_email: `not-an-address-${S.email}` })),
    status: "invalid",
    code: "client-email-malformed",
  },
  {
    name: "private_key missing its envelope",
    input: JSON.stringify(makeKey({ private_key: `bare-key-${S.key}` })),
    status: "invalid",
    code: "private-key-malformed",
  },

  // ── adversarial ───────────────────────────────────────────────────────────
  {
    // A valid key whose own field value is base64-shaped, to check the classifier
    // never prefers a decoded reading of something that already parsed as JSON.
    name: "valid key whose client_email looks base64",
    input: JSON.stringify(
      makeKey({ client_email: `${b64(S.email)}@waypoint.iam.gserviceaccount.com` }),
    ),
    status: "ok",
    encoding: "json",
  },
  {
    name: "JSON array rather than object",
    input: JSON.stringify([makeKey()]),
    status: "invalid",
    code: "json-malformed",
  },
  {
    // Parses as JSON but is not an object, and does not open with JSON
    // punctuation, so it takes the base64 path.
    name: "JSON null",
    input: "null",
    status: "invalid",
    code: "base64-decodes-to-non-json",
  },
  {
    name: "invalid UTF-8 bytes",
    input: Buffer.from([0xff, 0xfe, 0xfd, 0x00, 0x01, 0x80, 0x81]).toString("base64"),
    status: "invalid",
    code: "base64-decodes-to-non-json",
  },
  {
    name: "multi-megabyte value",
    input: S.key.repeat(200_000),
    status: "invalid",
    code: "base64-decodes-to-non-json",
  },
];

let executed = 0;

describe("classification", () => {
  it.each(FIXTURES)("$name", (f) => {
    const result = loadServiceAccount(f.input, { varName: VAR });

    expect(result.status, `status for "${f.name}"`).toBe(f.status);
    if (f.code) expect(result.code, `code for "${f.name}"`).toBe(f.code);
    if (f.encoding) {
      expect(result.encoding).toBe(f.encoding);
      expect(result.credentials.client_email).toContain("@");
      expect(result.credentials.private_key).toContain("-----BEGIN");
    }

    executed += 1;
  });
});

describe("leak audit", () => {
  const rejected = FIXTURES.filter(
    (f) => loadServiceAccount(f.input, { varName: VAR }).status === "invalid",
  );

  it("has rejected fixtures to audit", () => {
    // Without this, the suite below would pass by iterating an empty list.
    expect(rejected.length).toBeGreaterThanOrEqual(10);
  });

  it.each(rejected)("$name leaks nothing", (f) => {
    const result = loadServiceAccount(f.input, { varName: VAR });
    const text = result.diagnosis as string;

    for (const sentinel of KEY_MATERIAL) {
      expect(text, `"${f.name}" leaked credential material`).not.toContain(sentinel);
    }

    // Nothing verbatim from the input either, past a length that could carry
    // meaning. 16 clears the module's own vocabulary (`client_email`,
    // `private_key`) while still catching any real slice of the value.
    //
    // Scanned diagnosis-side rather than input-side. The two are equivalent — a
    // shared 16-character run is a window of both strings — but this bound is the
    // diagnosis length (a few hundred characters) instead of the input length,
    // which the multi-megabyte fixture would otherwise make quadratic.
    const input = String(f.input);
    for (let i = 0; i + 16 <= text.length; i += 1) {
      const window = text.slice(i, i + 16);
      if (/^\s+$/.test(window)) continue;
      expect(input, `"${f.name}" echoed 16 characters of the input`).not.toContain(window);
    }

    // The specific vector that already fired in this repo's CI.
    expect(text).not.toContain("Unexpected token");
    expect(text).not.toContain("is not valid JSON");
  });
});

describe("diagnoses are actionable", () => {
  it("names the cause and the fix", () => {
    const result = loadServiceAccount("base64 -i key.json | pbcopy", { varName: VAR });
    expect(result.status).toBe("invalid");
    expect(result.diagnosis).toContain(VAR);
    expect(result.diagnosis).toContain("gh secret set");
    expect(result.diagnosis).toMatch(/setup command/i);
  });

  it("distinguishes absent from malformed", () => {
    const missing = loadServiceAccount(undefined, { varName: VAR });
    expect(missing.status).toBe("missing");
    expect(describeMissing(missing)).toMatch(/is not set/);
    expect(describeMissing(missing)).toContain("gh secret set");
  });
});

describe("the suite actually ran", () => {
  it("executed every fixture", () => {
    expect(executed, `expected ${FIXTURES.length} fixtures to execute`).toBe(FIXTURES.length);
    expect(executed).toBeGreaterThanOrEqual(20);
  });

  it("covers both acceptance and rejection", () => {
    expect(FIXTURES.some((f) => f.status === "ok")).toBe(true);
    expect(FIXTURES.some((f) => f.status === "invalid")).toBe(true);
    expect(FIXTURES.some((f) => f.status === "missing")).toBe(true);
  });
});
