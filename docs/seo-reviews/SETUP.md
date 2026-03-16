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

### Step 4: Convert credentials to Base64

Run this in Terminal, replacing `path/to/credentials.json` with your actual file path:

```bash
base64 -i ~/Downloads/your-credentials-file.json | tr -d '\n'
```

Copy the output.

### Step 5: Add to environment variables

Add this line to your `.env` file (in the root of the repo):

```
GSC_SERVICE_ACCOUNT_KEY=paste_the_base64_string_here
GSC_SITE_URL=sc-domain:waypointfranchise.com
```

Also add `GSC_SERVICE_ACCOUNT_KEY` to your **Vercel environment variables** (not needed for script execution, but consistent with the pattern).

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
