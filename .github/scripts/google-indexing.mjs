#!/usr/bin/env node
// .github/scripts/google-indexing.mjs
// Submit all URLs from sitemap.xml to the Google Indexing API
// Requires GOOGLE_SA_KEY env var (base64-encoded service account JSON)

import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import https from 'https';

// ── 1. Decode service account key ─────────────────────────────────────────
// Accepts the secret in EITHER form: raw service-account JSON, or that JSON
// base64-encoded. This used to assume base64 unconditionally, and every run
// from at least 2026-08-02 failed because the stored secret is raw JSON:
// base64-decoding raw JSON silently yields binary garbage (the decoder skips
// non-alphabet bytes like { " :), so the failure surfaced as a bewildering
// `SyntaxError: Unexpected token 'm' ... is not valid JSON` rather than
// anything pointing at the encoding. Sniffing the format removes the guess.
// Never log or echo the key itself — errors below describe shape only.
const rawKey = (process.env.GOOGLE_SA_KEY || '').trim();
if (!rawKey) {
  console.error('GOOGLE_SA_KEY is empty or unset. Set the GOOGLE_INDEXING_SA_KEY repo secret to the service-account JSON (raw or base64).');
  process.exit(1);
}
const keyJson = rawKey.startsWith('{')
  ? rawKey
  : Buffer.from(rawKey, 'base64').toString('utf8');

let sa;
try {
  sa = JSON.parse(keyJson);
} catch {
  console.error(
    'GOOGLE_SA_KEY did not parse as service-account JSON after ' +
      (rawKey.startsWith('{') ? 'reading it as raw JSON' : 'base64-decoding it') +
      '. Expected a Google service-account key file, raw or base64-encoded. Key value not shown.'
  );
  process.exit(1);
}
if (!sa.client_email || !sa.private_key) {
  console.error('Service-account JSON parsed but is missing client_email/private_key — wrong file or a truncated secret.');
  process.exit(1);
}
const keyPath = '/tmp/sa-key.json';
writeFileSync(keyPath, keyJson, { mode: 0o600 });

// ── 2. Get OAuth2 access token via JWT ────────────────────────────────────
// Manually create a JWT without external dependencies, then exchange for token
import { createSign } from 'crypto';

function base64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

const now = Math.floor(Date.now() / 1000);
const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
const payload = base64url(JSON.stringify({
  iss: sa.client_email,
  scope: 'https://www.googleapis.com/auth/indexing',
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
}));

const sign = createSign('RSA-SHA256');
sign.update(`${header}.${payload}`);
const sig = base64url(sign.sign(sa.private_key));
const jwt = `${header}.${payload}.${sig}`;

// Exchange JWT for access token
const token = await new Promise((resolve, reject) => {
  const body = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: jwt,
  }).toString();

  const req = https.request({
    hostname: 'oauth2.googleapis.com',
    path: '/token',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
    },
  }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      if (parsed.access_token) resolve(parsed.access_token);
      else reject(new Error(`Token error: ${data}`));
    });
  });
  req.on('error', reject);
  req.write(body);
  req.end();
});

console.log('✅ Got access token');

// ── 3. Fetch sitemap and extract URLs ────────────────────────────────────
// Follow redirects manually (waypointfranchise.com redirects to www)
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(fetchUrl(res.headers.location));
      } else {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }
    }).on('error', reject);
  });
}

const sitemapXml = await fetchUrl('https://www.waypointfranchise.com/sitemap.xml');

// Split on <loc> tags — handles any whitespace/newline formatting
const urls = sitemapXml
  .split('<loc>')
  .slice(1)
  .map(s => s.split('</loc>')[0].trim())
  .filter(u => u.startsWith('http'));

console.log(`Found ${urls.length} URLs in sitemap`);

// ── 4. Submit each URL to Indexing API ───────────────────────────────────
let success = 0;
let failed = 0;

for (const url of urls) {
  const body = JSON.stringify({ url, type: 'URL_UPDATED' });

  const status = await new Promise((resolve) => {
    const req = https.request({
      hostname: 'indexing.googleapis.com',
      path: '/v3/urlNotifications:publish',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log(`✅ ${url}`);
          success++;
        } else if (res.statusCode === 429) {
          console.log(`⏳ ${url} → 429 Quota exceeded (daily limit reached — will retry tomorrow)`);
          // Don't count as failure — quota resets daily
        } else {
          console.log(`⚠️  ${url} → ${res.statusCode}: ${data}`);
          failed++;
        }
        resolve(res.statusCode);
      });
    });
    req.on('error', (e) => {
      console.log(`❌ ${url} → ${e.message}`);
      failed++;
      resolve(0);
    });
    req.write(body);
    req.end();
  });

  // Polite delay — Google allows ~200 requests/day
  await new Promise(r => setTimeout(r, 300));
}

console.log(`\nDone: ${success} submitted, ${failed} failed`);
if (failed > 0) process.exit(1);
