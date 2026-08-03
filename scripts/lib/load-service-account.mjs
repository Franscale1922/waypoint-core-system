// scripts/lib/load-service-account.mjs
//
// Parses a Google service-account credential out of an environment variable,
// accepting either raw JSON or base64-encoded JSON, and reports a precise cause
// when it cannot.
//
// Dependency-free on purpose: .github/scripts/ runs without `npm install`.
//
// SECURITY CONTRACT
// ----------------
// Nothing derived from the input value may appear in a diagnosis. GitHub Actions
// masks only exact matches of a registered secret, so a decoded or re-encoded
// fragment would land in the log in the clear.
//
// The concrete leak this guards against already happened in this repo. A bare
// JSON.parse failure produced:
//
//     SyntaxError: Unexpected token 'm', "m<binary>"... is not valid JSON
//
// V8 embeds a slice of the parser input in that message. The stored value was
// junk, so only junk leaked, but the same code path on a correctly-stored key
// would have printed the opening bytes of a live private key into a public log.
// Every JSON.parse below is therefore wrapped and its message discarded.
//
// A diagnosis may only be built from: string constants defined here, the input's
// length, and booleans computed from it. Never a slice, never a decoded
// fragment, never a caught error's message.

const BASE64_ALPHABET = /^[A-Za-z0-9+/=\s]*$/;

// Deliberately stricter than BASE64_ALPHABET, which tolerates whitespace and so
// also matches ordinary prose. Used only to recognise a payload that was encoded
// twice, where the first decode yields an unbroken base64 blob.
const BASE64_BLOB = /^[A-Za-z0-9+/]{32,}={0,2}$/;

// Field names are our own constants, so naming a missing one reveals nothing.
const REQUIRED_FIELDS = ["client_email", "private_key"];

/**
 * @param {string|undefined|null} raw   The environment variable's value.
 * @param {{varName?: string}} options  Name used in messages, e.g. GSC_SERVICE_ACCOUNT_KEY.
 * @returns {{status:'missing', varName:string}
 *         | {status:'ok', credentials:object, encoding:'json'|'base64', varName:string}
 *         | {status:'invalid', code:string, diagnosis:string, varName:string}}
 */
export function loadServiceAccount(raw, options = {}) {
  const varName = options.varName ?? "SERVICE_ACCOUNT_KEY";

  if (typeof raw !== "string" || raw.trim() === "") {
    return { status: "missing", varName };
  }

  const value = raw.trim();
  const facts = {
    length: value.length,
    // '[' counts too: a JSON array is clearly an attempt at JSON and deserves a
    // JSON-shaped complaint, not a misleading "this is not base64".
    looksLikeJson: value.startsWith("{") || value.startsWith("["),
    base64Clean: BASE64_ALPHABET.test(value),
    looksLikePem: value.includes("-----BEGIN") && value.includes("-----END"),
    startsWithLiteralBase64: value.slice(0, 6).toLowerCase() === "base64",
  };

  // Path 1: stored as raw JSON.
  if (facts.looksLikeJson) {
    const parsed = safeParseJson(value);
    if (parsed.ok) return finish(parsed.value, "json", varName, facts);
    return invalid("json-malformed", varName, facts);
  }

  // Path 2: stored base64-encoded. Node's decoder strips characters outside the
  // base64 alphabet rather than rejecting them, so a value that is not base64 at
  // all still "decodes" to plausible-looking bytes. That silent tolerance is why
  // the original failure surfaced as a JSON error instead of a decode error.
  const decoded = Buffer.from(value, "base64").toString("utf8");
  const parsed = safeParseJson(decoded);
  if (parsed.ok) return finish(parsed.value, "base64", varName, facts);

  return invalid(classifyFailure(decoded, facts), varName, facts);
}

/** JSON.parse with the error message discarded. See the security contract above. */
function safeParseJson(text) {
  try {
    const value = JSON.parse(text);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false };
    }
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

function finish(credentials, encoding, varName, facts) {
  const missing = REQUIRED_FIELDS.filter(
    (f) => typeof credentials[f] !== "string" || credentials[f] === "",
  );
  if (missing.length > 0) {
    return invalid("json-missing-fields", varName, facts, missing);
  }
  if (!credentials.client_email.includes("@")) {
    return invalid("client-email-malformed", varName, facts);
  }
  const key = credentials.private_key;
  if (!key.includes("-----BEGIN") || !key.includes("-----END")) {
    return invalid("private-key-malformed", varName, facts);
  }
  return { status: "ok", credentials, encoding, varName };
}

function classifyFailure(decoded, facts) {
  if (facts.startsWithLiteralBase64) return "pasted-setup-command";
  if (facts.looksLikePem) return "pem-only";
  // Decoded to an unbroken base64 blob rather than text: encoded twice.
  if (BASE64_BLOB.test(decoded.trim())) return "double-encoded";
  if (!facts.base64Clean) return "not-base64";
  return "base64-decodes-to-non-json";
}

const EXPLANATIONS = {
  "pasted-setup-command":
    "The value begins with the literal text 'base64', which makes it the setup command\n" +
    "rather than the output that command prints. Re-store it using the line below, which\n" +
    "reads the file directly and skips the clipboard step where this goes wrong.",
  "pem-only":
    "The value looks like a PEM private key on its own. This needs the whole service-account\n" +
    "JSON file, of which the private key is one field.",
  "double-encoded":
    "The value base64-decodes to another base64-looking string, so it was probably encoded\n" +
    "twice. Store the key file once, not the output of encoding it twice.",
  "not-base64":
    "The value does not start with '{' and contains characters outside the base64 alphabet,\n" +
    "so it is neither raw JSON nor base64.",
  "base64-decodes-to-non-json":
    "The value base64-decodes, but not to JSON. The stored text is probably not the key file.",
  // Wording note: this must not contain the phrases V8 puts in a SyntaxError
  // ("Unexpected token", "is not valid JSON"). The test greps for those to prove
  // no parser message was forwarded, and an explanation that quoted them would
  // make that guard unfalsifiable.
  "json-malformed":
    "The value opens like JSON but does not parse as a JSON object. It may have been\n" +
    "truncated on paste, or it may be an array rather than the key object.",
  "json-missing-fields": "The value parses as JSON but is missing required service-account fields.",
  "client-email-malformed": "The value parses, but client_email is not an email address.",
  "private-key-malformed":
    "The value parses, but private_key is missing its -----BEGIN/-----END envelope.",
};

function invalid(code, varName, facts, missingFields) {
  const lines = [
    `${varName} is set but could not be read as a Google service-account key.`,
    "",
    EXPLANATIONS[code] ?? "The value could not be parsed.",
  ];

  if (missingFields && missingFields.length > 0) {
    lines.push("", `Missing field(s): ${missingFields.join(", ")}`);
  }

  lines.push(
    "",
    // Shape only. Numbers and booleans, never content.
    `Shape seen: ${facts.length} characters, opens like JSON: ${facts.looksLikeJson}, ` +
      `base64 alphabet only: ${facts.base64Clean}.`,
    "",
    "Fix: store the downloaded key file directly, which avoids the clipboard entirely.",
    `  gh secret set ${varName} < /path/to/your-key.json`,
    "Raw JSON and base64 are both accepted.",
  );

  return { status: "invalid", code, diagnosis: lines.join("\n"), varName };
}

/**
 * Message for a missing (as opposed to malformed) variable.
 * @param {{varName:string}} result
 */
export function describeMissing(result) {
  return (
    `${result.varName} is not set, so this step has nothing to authenticate with.\n` +
    `Set it with:  gh secret set ${result.varName} < /path/to/your-key.json`
  );
}

/**
 * Prints a credential failure so it is visible where people actually look.
 *
 * Under Actions this also emits a `::error::` annotation, which surfaces on the
 * run summary rather than only inside the step log. That distinction is the
 * reason this workflow stayed broken for 8+ deploys: the failure was there in
 * the log the whole time and nothing pulled it up to where it would be seen.
 *
 * The annotation carries only a one-line summary because Actions renders
 * annotations on a single line; the full diagnosis follows as ordinary output.
 */
export function reportCredentialFailure(result, logger = console) {
  const summary =
    result.status === "missing"
      ? `${result.varName} is not set`
      : `${result.varName} is set but is not a usable service-account key (${result.code})`;

  if (process.env.GITHUB_ACTIONS === "true") {
    logger.error(`::error title=Google credential problem::${summary}`);
  }

  logger.error(result.status === "missing" ? describeMissing(result) : result.diagnosis);
}
