#!/usr/bin/env node
// .github/scripts/submit-sitemap.mjs
//
// Tells Google, on deploy, that the sitemap has changed, via the Search Console
// Sitemaps API.
//
// WHAT THIS REPLACED, AND WHY
// ---------------------------
// This job used to call the Indexing API on every URL in the sitemap. That could
// never have worked: Google restricts the Indexing API to pages carrying
// JobPosting or BroadcastEvent-in-VideoObject structured data, and this site is
// marketing pages and articles. Every URL was ineligible, so the job was
// submitting into a void even when its credential was healthy. It is deleted
// rather than repaired.
//
// HOW MUCH THIS ONE DOES, HONESTLY
// --------------------------------
// Google deprecated the old /ping?sitemap= endpoint in June 2023 and pointed
// site owners at Search Console instead. This is the API form of that. Google
// documents it as *registering* a sitemap and does NOT document that
// resubmitting an already-registered one triggers a recrawl. So: this is the
// supported successor to the ping, it is cheap, and it is not a crawl button.
// Do not let it grow claims it cannot support.
//
// Requires GSC_SERVICE_ACCOUNT_KEY (raw JSON or base64) and the service account
// needing Owner on the property. A read-only grant returns 403 here even though
// it is enough for scripts/gsc-report.mjs.

import https from "https";
import { loadServiceAccount, reportCredentialFailure } from "../../scripts/lib/load-service-account.mjs";
import { getAccessToken } from "../../scripts/lib/google-jwt.mjs";

const SCOPE = "https://www.googleapis.com/auth/webmasters";
const SITEMAP_URL = "https://www.waypointfranchise.com/sitemap.xml";
const VAR_NAME = "GSC_SERVICE_ACCOUNT_KEY";

// ── 1. Credentials ────────────────────────────────────────────────────────
const credentials = (() => {
  const result = loadServiceAccount(process.env[VAR_NAME], { varName: VAR_NAME });

  if (result.status === "missing") {
    // Not configured is not a failure. A malformed value IS one, and is handled
    // below, so "off" and "broken" stay distinguishable at a glance.
    console.log(`::notice title=Sitemap submission skipped::${VAR_NAME} is not set`);
    console.log(`${VAR_NAME} is not set, so Google was not notified. This step is optional.`);
    process.exit(0);
  }

  if (result.status === "invalid") {
    reportCredentialFailure(result);
    process.exit(1);
  }

  console.log(`✅ Credential loaded (${result.encoding}) for ${result.credentials.client_email}`);
  return result.credentials;
})();

// ── 2. Access token ───────────────────────────────────────────────────────
// Caught rather than left to bubble: an uncaught rejection here prints a Node
// stack trace pointing into the library, which is the same unreadable failure
// mode this whole change exists to remove.
const token = await getAccessToken(credentials, SCOPE).catch((err) => {
  fail(
    `${err.message}\n` +
      `The credential parsed, so this is about the account rather than the stored value.\n` +
      `Check that ${credentials.client_email} still exists, that its key has not been\n` +
      `revoked, and that the Search Console API is enabled on its project.`,
  );
});
console.log("✅ Got access token");

// ── 3. Resolve which Search Console property to submit against ────────────
// Not hardcoded, because three places in this repo disagree about the identifier:
// the GSC_SITE_URL repo variable says https://waypointfranchise.com, a secret of
// the same name also exists, and scripts/gsc-report.mjs defaults to
// sc-domain:waypointfranchise.com. Only one is right, and guessing turns a
// mismatch into an opaque 403. Asking the API turns it into a list of what the
// account can actually see.
const sites = await request("GET", "/webmasters/v3/sites");
if (sites.status !== 200) {
  fail(`Could not list Search Console properties (HTTP ${sites.status}): ${sites.body}`);
}

const available = (JSON.parse(sites.body).siteEntry ?? []).map((e) => ({
  url: e.siteUrl,
  permission: e.permissionLevel,
}));

if (available.length === 0) {
  fail(
    `The service account can see no Search Console properties.\n` +
      `Add ${credentials.client_email} as an Owner of the property in Search Console.`,
  );
}

const configured = process.env.GSC_SITE_URL;
const site = resolveSite(configured, available);

if (!site) {
  fail(
    `No Search Console property matches ${configured ? `"${configured}"` : "any expected form of the site URL"}.\n` +
      `Properties this account can see:\n` +
      available.map((s) => `  ${s.url}  (${s.permission})`).join("\n"),
  );
}

console.log(`✅ Property: ${site.url} (${site.permission})`);

// Sitemaps.submit needs write access; siteFullUser/siteOwner have it.
if (site.permission === "siteUnverifiedUser" || site.permission === "siteRestrictedUser") {
  fail(
    `The service account has "${site.permission}" on ${site.url}, which cannot submit sitemaps.\n` +
      `Raise ${credentials.client_email} to Owner in Search Console. Note that\n` +
      `scripts/gsc-report.mjs only needs read access, so the monthly report is unaffected.`,
  );
}

// ── 4. Submit ─────────────────────────────────────────────────────────────
const path =
  `/webmasters/v3/sites/${encodeURIComponent(site.url)}` +
  `/sitemaps/${encodeURIComponent(SITEMAP_URL)}`;

const submitted = await request("PUT", path);

if (submitted.status === 204) {
  console.log(`✅ Submitted ${SITEMAP_URL} to ${site.url}`);
} else {
  fail(`Sitemap submission failed (HTTP ${submitted.status}): ${submitted.body}`);
}

// ── helpers ───────────────────────────────────────────────────────────────

/**
 * Matches the configured identifier against what the API reports, tolerating the
 * www/non-www and domain-property spellings of the same site.
 */
function resolveSite(configured, available) {
  const byUrl = new Map(available.map((s) => [s.url, s]));
  if (configured && byUrl.has(configured)) return byUrl.get(configured);

  const host = hostOf(configured) ?? "waypointfranchise.com";
  const bare = host.replace(/^www\./, "");

  for (const candidate of [
    `sc-domain:${bare}`,
    `https://${bare}/`,
    `https://www.${bare}/`,
    `http://${bare}/`,
  ]) {
    if (byUrl.has(candidate)) return byUrl.get(candidate);
  }

  return null;
}

function hostOf(value) {
  if (!value) return null;
  if (value.startsWith("sc-domain:")) return value.slice("sc-domain:".length);
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

function request(method, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.googleapis.com",
        path,
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Length": 0 },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("error", reject);
    req.end();
  });
}

function fail(message) {
  console.error(`::error title=Sitemap submission failed::${message.split("\n")[0]}`);
  console.error(message);
  process.exit(1);
}
