#!/usr/bin/env node
// .github/scripts/google-indexing.mjs
// Submit all URLs from sitemap.xml to the Google Indexing API
// Requires GOOGLE_SA_KEY env var (base64-encoded service account JSON)

import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import https from 'https';

// ── 1. Decode service account key ─────────────────────────────────────────
const keyJson = Buffer.from(process.env.GOOGLE_SA_KEY, 'base64').toString('utf8');
const keyPath = '/tmp/sa-key.json';
writeFileSync(keyPath, keyJson, { mode: 0o600 });
const sa = JSON.parse(keyJson);

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
const sitemapXml = await new Promise((resolve, reject) => {
  https.get('https://waypointfranchise.com/sitemap.xml', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

const urls = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
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
