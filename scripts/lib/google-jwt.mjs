// scripts/lib/google-jwt.mjs
//
// Signs a service-account JWT and exchanges it for a Google OAuth2 access token,
// using only Node built-ins so .github/scripts/ can run without `npm install`.
//
// Lifted from .github/scripts/google-indexing.mjs (the JWT block and token
// exchange), with the scope parameterised and the failure paths given real
// messages. Note that script never reached this code in CI — it died on the
// credential first, on every run it ever had — so the signature is verified
// against a generated keypair in tests/unit/google-jwt.test.ts rather than
// being trusted on the strength of having shipped.
//
// SECURITY NOTE: the signed assertion is derived from the private key and is
// itself a short-lived credential, so it is never logged. Google's *response* is
// safe to surface and is what makes a failure diagnosable.

import { createSign } from "crypto";
import https from "https";

const TOKEN_HOST = "oauth2.googleapis.com";
const TOKEN_PATH = "/token";
const MAX_ERROR_BODY = 500;
// A connection that is accepted but never answered would otherwise hang the run
// until GitHub's multi-hour job limit.
const REQUEST_TIMEOUT_MS = 15_000;

function base64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * @param {{client_email:string, private_key:string}} credentials
 * @param {string} scope   e.g. https://www.googleapis.com/auth/webmasters
 * @param {{nowSeconds?:number, lifetimeSeconds?:number}} [options]
 */
export function createSignedJwt(credentials, scope, options = {}) {
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const lifetime = options.lifetimeSeconds ?? 3600;

  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope,
      aud: `https://${TOKEN_HOST}${TOKEN_PATH}`,
      iat: now,
      exp: now + lifetime,
    }),
  );

  const sign = createSign("RSA-SHA256");
  sign.update(`${header}.${payload}`);

  let signature;
  try {
    signature = base64url(sign.sign(credentials.private_key));
  } catch {
    // The message from node:crypto can echo key material, so it is discarded.
    throw new Error(
      "Could not sign with private_key: the key parsed as text but was rejected by OpenSSL. " +
        "The key file is probably corrupt. Regenerate it in Google Cloud.",
    );
  }

  return `${header}.${payload}.${signature}`;
}

/**
 * Exchanges a signed assertion for an access token.
 * @returns {Promise<string>}
 */
export function getAccessToken(credentials, scope, options = {}) {
  const jwt = createSignedJwt(credentials, scope, options);

  return new Promise((resolve, reject) => {
    const body = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString();

    const req = https.request(
      {
        hostname: TOKEN_HOST,
        path: TOKEN_PATH,
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: REQUEST_TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch {
            // Non-JSON here means a proxy or outage, not a credential problem.
            // Truncate rather than dumping an error page into the log.
            reject(
              new Error(
                `Token endpoint returned HTTP ${res.statusCode} with a non-JSON body: ` +
                  truncate(data),
              ),
            );
            return;
          }

          if (parsed.access_token) {
            resolve(parsed.access_token);
            return;
          }

          // Google's own error text, which is the useful part and carries no secret.
          const detail = parsed.error_description || parsed.error || truncate(data);
          reject(new Error(`Token request failed (HTTP ${res.statusCode}): ${detail}`));
        });
      },
    );

    req.on("timeout", () => {
      req.destroy(new Error(`No response from ${TOKEN_HOST} within ${REQUEST_TIMEOUT_MS}ms`));
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function truncate(text) {
  const flat = String(text).replace(/\s+/g, " ").trim();
  return flat.length > MAX_ERROR_BODY ? `${flat.slice(0, MAX_ERROR_BODY)}...` : flat;
}
