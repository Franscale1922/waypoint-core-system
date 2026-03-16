# Google Indexing API — One-Time Setup

This enables Layer 3 of the `notify-google-on-deploy` workflow, which directly
submits every URL in your sitemap to Google's crawl queue on each deploy.

Layers 1 & 2 (sitemap ping + IndexNow) are already active with no setup required.

---

## Steps (~10 minutes)

### 1. Create a Google Cloud Project
1. Go to https://console.cloud.google.com
2. Click **Select a project** → **New Project**
3. Name it `waypoint-seo` → **Create**

### 2. Enable the Indexing API
1. In your new project, go to **APIs & Services → Library**
2. Search for **"Web Search Indexing API"**
3. Click it → **Enable**

### 3. Create a Service Account
1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → Service Account**
3. Name: `waypoint-indexing-bot` → **Create and Continue** → **Done**
4. Click the service account in the list → **Keys** tab → **Add Key → Create new key → JSON**
5. Download the JSON file (keep it safe, don't commit it)

### 4. Grant the service account access in Search Console
1. Go to https://search.google.com/search-console
2. Open the `waypointfranchise.com` property
3. **Settings → Users and permissions → Add user**
4. Paste the service account email (ends in `@...iam.gserviceaccount.com`)
5. Set role to **Owner** → Add

### 5. Add the GitHub Secret
From the downloaded JSON file, run:
```bash
base64 -i your-key.json | tr -d '\n' | pbcopy
```
Then:
1. Go to your GitHub repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `GOOGLE_INDEXING_SA_KEY`
4. Paste the base64 string → **Add secret**

### 6. Enable the workflow step
1. Go to **Settings → Secrets and variables → Actions → Variables tab**
2. Click **New repository variable**
3. Name: `GOOGLE_INDEXING_ENABLED`, Value: `true`

The next push to `main` will automatically run all 3 layers. ✅

---

## Daily quota
Google allows ~200 Indexing API requests per day per property.
The workflow submits one request per URL in your sitemap (~40 today).
This is well within limits.
