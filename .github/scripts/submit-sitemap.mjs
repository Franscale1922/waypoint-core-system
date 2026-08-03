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
// Requires GSC_SERVICE_ACCOUNT_KEY (raw JSON or base64), and the service account
// needs "Full" or "Owner" on the property — Google allows sitemap submission at
// both levels. "Restricted" is not enough here, though it is enough for
// scripts/gsc-report.mjs, which only reads.

import https from "https";
import { loadServiceAccount, reportCredentialFailure } from "../../scripts/lib/load-service-account.mjs";
import { getAccessToken } from "../../scripts/lib/google-jwt.mjs";
import {
  resolveSite,
  sitemapUrlFor,
  hostOf,
  canSubmitSitemap,
} from "../../scripts/lib/gsc-property.mjs";

const SCOPE = "https://www.googleapis.com/auth/webmasters";
const CANONICAL_HOST = "www.waypointfranchise.com";
const VAR_NAME = "GSC_SERVICE_ACCOUNT_KEY";
const REQUEST_TIMEOUT_MS = 15_000;

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

  // Encoding only. This repo is PUBLIC and Actions masks only exact matches of a
  // whole registered secret, so client_email extracted from the key would appear
  // in the clear. The operator can read the address in Google Cloud Console; the
  // log does not need it.
  console.log(`✅ Credential loaded (${result.encoding})`);
  return result.credentials;
})();

// ── 2. Access token ───────────────────────────────────────────────────────
// Caught rather than left to bubble: an uncaught rejection here prints a Node
// stack trace pointing into the library, which is the same unreadable failure
// mode this whole change exists to remove.
const token = await getAccessToken(credentials, SCOPE).catch((err) => {
  fail(
    `${err.message}\n` +
      `The credential parsed, so the stored value is not the problem.\n` +
      `If this is a timeout, it is transport rather than credentials. Otherwise check\n` +
      `that the service account still exists, that its key has not been revoked, and\n` +
      `that the Search Console API is enabled on its project.`,
  );
});
console.log("✅ Got access token");

// ── 3. Resolve which Search Console property to submit against ────────────
// Resolved rather than hardcoded. Three places in this repo used to disagree
// about the identifier: a GSC_SITE_URL repo variable, a SECRET of the same name,
// and a hardcoded sc-domain default in gsc-report.mjs that named a property this
// account cannot see. The duplicate secret and the default are both gone now, so
// GSC_SITE_URL (the variable) is the single source, but the resolution stays:
// guessing a property turns a mismatch into an opaque 403, while asking the API
// turns it into a list of what the account can actually see.
const sites = await request("GET", "/webmasters/v3/sites").catch((err) =>
  fail(`Could not reach the Search Console API: ${err.message}`),
);
if (sites.status !== 200) {
  fail(`Could not list Search Console properties (HTTP ${sites.status}): ${sites.body}`);
}

// Guarded: a 200 carrying a non-JSON body (a proxy or interstitial) would throw a
// SyntaxError whose message embeds a slice of that body, which is the same V8
// behaviour load-service-account.mjs goes out of its way to suppress.
let parsedSites;
try {
  parsedSites = JSON.parse(sites.body);
} catch {
  fail("The Search Console API returned HTTP 200 with a body that is not JSON.");
}

const available = (parsedSites.siteEntry ?? []).map((e) => ({
  url: e.siteUrl,
  permission: e.permissionLevel,
}));

if (available.length === 0) {
  fail(
    `The service account can see no Search Console properties.\n` +
      `Add it as a Full user of the property in Search Console. Its address is in\n` +
      `Google Cloud Console under IAM & Admin > Service Accounts.`,
  );
}

const configured = process.env.GSC_SITE_URL;
const site = resolveSite(configured, available, { fallbackHost: CANONICAL_HOST });

if (!site) {
  // Only properties for the site we are looking for are named. Dumping the whole
  // inventory would put every other domain this account can reach into a log,
  // including any that are not public yet.
  const wanted = (hostOf(configured) ?? CANONICAL_HOST).replace(/^www\./, "");
  const related = available.filter((s) => s.url.includes(wanted));
  const others = available.length - related.length;

  fail(
    `No Search Console property matches ${configured ? `"${configured}"` : "any expected form of the site URL"}.\n` +
      (related.length
        ? `Properties for ${wanted} this account can see:\n` +
          related.map((s) => `  ${s.url}  (${s.permission})`).join("\n")
        : `This account can see no property for ${wanted}.`) +
      (others > 0 ? `\n(${others} unrelated propert${others === 1 ? "y" : "ies"} not listed.)` : "") +
      `\nAdd the service account to the right property in Search Console (its address\n` +
      `is in Google Cloud Console under IAM & Admin > Service Accounts), or set the\n` +
      `GSC_SITE_URL variable to one of the identifiers above.`,
  );
}

console.log(`✅ Property: ${site.url} (${site.permission})`);

// Sitemaps.submit needs write access; siteFullUser/siteOwner have it.
if (!canSubmitSitemap(site.permission)) {
  fail(
    `The service account has "${site.permission}" on ${site.url}, which cannot submit sitemaps.\n` +
      `Raise the service account to Full or Owner in Search Console\n` +
      `(Settings > Users and permissions). Note that scripts/gsc-report.mjs only reads,\n` +
      `so the monthly report is unaffected by this.`,
  );
}

// A URL-prefix property only covers its own origin. Submitting against one whose
// origin is not the site's canonical host registers a feed that redirects off the
// property and lists URLs the property does not cover, so Google accepts it with
// 204 and then cannot use it. That is a green job doing nothing, which is the
// exact failure this workflow was rewritten to stop shipping.
//
// This is live right now: the account holds https://waypointfranchise.com/ while
// the site canonicalises to www, which is why the reports read 1 impression.
const propertyHost = hostOf(site.url);
if (!site.url.startsWith("sc-domain:") && propertyHost !== CANONICAL_HOST) {
  fail(
    `Property ${site.url} does not cover the site's canonical host ${CANONICAL_HOST}.\n` +
      `Its sitemap would redirect off the property and list URLs the property does not\n` +
      `contain, so Google would accept the submission and be unable to use it.\n\n` +
      `Fix: in Search Console, give the service account Full access to the property for\n` +
      `${CANONICAL_HOST} (or a Domain property for the bare domain, which covers both\n` +
      `hosts), then set the GSC_SITE_URL variable to that identifier.`,
  );
}

// ── 4. Submit ─────────────────────────────────────────────────────────────
// The sitemap must live INSIDE the property being submitted against, or Google
// returns `400 invalidParameter` on `feedpath` (observed on run 30839225508).
const sitemapUrl = sitemapUrlFor(site.url, { canonicalHost: CANONICAL_HOST });
const path =
  `/webmasters/v3/sites/${encodeURIComponent(site.url)}` +
  `/sitemaps/${encodeURIComponent(sitemapUrl)}`;

const submitted = await request("PUT", path).catch((err) =>
  fail(`Could not reach the Search Console API to submit: ${err.message}`),
);

if (submitted.status === 204) {
  console.log(`✅ Submitted ${sitemapUrl} to ${site.url}`);
} else {
  fail(
    `Sitemap submission failed (HTTP ${submitted.status}) for ${sitemapUrl}\n` +
      `on property ${site.url}.\n${submitted.body}`,
  );
}

// ── helpers ───────────────────────────────────────────────────────────────
// Property matching and sitemap-path derivation live in
// scripts/lib/gsc-property.mjs so they can be tested without running this file,
// which authenticates and calls Google on import.


function request(method, path) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.googleapis.com",
        path,
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Length": 0 },
        // Without this, a connection that is accepted but never answered leaves
        // the promise pending until GitHub's multi-hour job limit kills the run.
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on("timeout", () => {
      req.destroy(new Error(`No response from www.googleapis.com within ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.end();
  });
}

function fail(message) {
  console.error(`::error title=Sitemap submission failed::${message.split("\n")[0]}`);
  console.error(message);
  process.exit(1);
}
