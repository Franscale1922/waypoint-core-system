# SEO Review Setup Guide

This is a **one-time setup** for the two automation scripts. Once complete, the agent can run both scripts without any manual action.

---

## Part 1 — Google Search Console API (for `gsc-report.mjs`)

### Step 1: Enable the API in Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Select the project tied to your Google account (or create one — "Waypoint" is fine)
3. In the search bar, search for **"Google Search Console API"**
4. Click **Enable**

### Step 2: Create a Service Account

1. In Cloud Console, go to **IAM & Admin → Service Accounts**
2. Click **+ Create Service Account**
3. Name: `waypoint-seo-reader`
4. Description: `Read-only access to GSC data for SEO reports`
5. Click **Create and Continue** → skip role assignment → click **Done**

### Step 3: Download Credentials

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key → Create new key → JSON**
4. A JSON file downloads — keep it safe

### Step 4: Store the credentials

There is no encoding step. The loader accepts the key file's raw JSON **or** base64,
so pick whichever is less error-prone — which is almost always raw JSON.

**For GitHub Actions**, pipe the file in directly. This never puts the key on the
clipboard, which is where the previous instructions went wrong: the `base64 ...`
command itself was pasted into the secret box instead of its output, and both this
report and the deploy notification failed silently for months.

```bash
gh secret set GSC_SERVICE_ACCOUNT_KEY < ~/Downloads/your-credentials-file.json
```

**For local runs**, point at the file rather than inlining it, since a multi-line
private key does not survive a `.env` cleanly:

```
GSC_SERVICE_ACCOUNT_PATH=/absolute/path/to/your-credentials-file.json
GSC_SITE_URL=<the exact property identifier from Search Console>
```

`GSC_SITE_URL` has no default and the scripts will not guess one. Copy it exactly as
Search Console shows it, because the two property types are different properties
holding different data:

| Property type | Identifier | Covers |
|---|---|---|
| Domain | `sc-domain:waypointfranchise.com` | every host and scheme |
| URL prefix | `https://www.waypointfranchise.com/` | that origin only |

Use one that covers **www**, since the site canonicalises there. A URL-prefix
property for the bare domain reports almost no traffic while looking healthy. If the
value does not match, the deploy workflow prints the identifiers the account can
actually see.

If a value is ever stored wrong, the scripts now say exactly what shape they found
and how to fix it, without printing the credential.

### Step 6: Grant the service account access to your GSC property

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Select the `waypointfranchise.com` property
3. Click **Settings** (gear icon, bottom left)
4. Click **Users and permissions → Add user**
5. Email: the service account email (looks like `waypoint-seo-reader@your-project.iam.gserviceaccount.com`)
6. Permission: **Restricted** (read-only) is fine
7. Click **Add**

### Step 7: Install googleapis

```bash
cd "/Users/kelseystuart/Desktop/Anti-Gravity Build/waypoint-core-system"
npm install googleapis
```

### Test it:

```bash
node scripts/gsc-report.mjs
```

Expected output:
```
📊 Pulling Google Search Console data...
   Pages with data: [N]
   Queries with data: [N]
✅ Report saved to: docs/seo-reviews/2026-03/gsc-report.md
✅ Sitemap pinged to Google
```

---

## Part 2 — AI Citation Check (for `ai-citation-check.mjs`)

`OPENAI_API_KEY` is already in `.env` — GPT-4o checks work immediately.

To add Perplexity and Gemini (takes 5 minutes each):

### Perplexity API

1. Go to [perplexity.ai/api](https://perplexity.ai/api)
2. Sign up or log in → copy your API key
3. Add to `.env`:
   ```
   PERPLEXITY_API_KEY=your_key_here
   ```

### Gemini API

1. Go to [aistudio.google.com](https://aistudio.google.com/)
2. Click **Get API key** → Create API key
3. Add to `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```

### Test it:

```bash
node scripts/ai-citation-check.mjs
```

Expected output:
```
🤖 AI Citation Check — March 16, 2026

   "What does a franchise consultant do?..." ❌
   "How much does it cost to buy a franchise?..." ❌
   ...

✅ Report saved to: docs/seo-reviews/2026-03/ai-citation-check.md
```

Initially all ❌ is expected — you're not in any AI model's training data yet. The goal is to see ✅ appear over the coming months as the site builds authority.

---

## Running the Full SEO Review

Once both scripts are set up, the entire monthly review runs like this:

```bash
# From the repo root:
node scripts/gsc-report.mjs
node scripts/ai-citation-check.mjs
```

The agent then reads the two generated reports in `docs/seo-reviews/[month]/` and executes Steps 2–8 of the `seo-review` workflow.
