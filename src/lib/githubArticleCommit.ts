/**
 * githubArticleCommit.ts
 *
 * Commits one or more refreshed article files to GitHub using the
 * Git Data API: a single atomic commit for the entire batch.
 *
 * This is the ONLY gate in front of those commits. It writes by PATCHing the branch ref, which
 * defaults to `main`, so no local git is involved: .githooks/pre-push cannot see this path and CI
 * only reports once the commit already exists. Every article is therefore serialized and validated
 * here, against the same rules the hook applies to hand-written articles, before the first blob is
 * created. See src/lib/frontmatterDates.mjs.
 *
 * Required env vars:
 *   GITHUB_TOKEN:      fine-grained personal access token (contents: write)
 *   GITHUB_REPO_OWNER: e.g. "Franscale1922"
 *   GITHUB_REPO_NAME:  e.g. "waypoint-core-system"
 *   GITHUB_BRANCH:     defaults to "main" if not set
 */

import matter from "gray-matter";
import { ArticleFrontmatter } from "./contentRefresh";
import { validateFrontmatterDates, utcDayString } from "./frontmatterDates.mjs";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArticleCommitPayload {
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
}

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConfig(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) throw new Error("Missing env var: GITHUB_TOKEN");
  if (!owner) throw new Error("Missing env var: GITHUB_REPO_OWNER");
  if (!repo) throw new Error("Missing env var: GITHUB_REPO_NAME");

  return { token, owner, repo, branch };
}

async function githubRequest<T>(
  path: string,
  config: GitHubConfig,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub API error ${res.status} on ${path}: ${body}`);
  }

  return res.json() as T;
}

// ─── Serialize article to .md string ─────────────────────────────────────────

/**
 * Serialize one article to the exact bytes that will be committed.
 *
 * BOTH dates are stamped, never taken from the caller. The caller here is a language model: the
 * refresh hands it an existing article and keeps the frontmatter it returns, so before this every
 * field it invented was preserved verbatim. `date` was already overwritten; `updatedAt` was not,
 * which meant model output landed on `main` unchecked, and `main` is what the site builds from. A
 * model has no basis for authoring either value, so it no longer gets to: this is the single point
 * where the commit path turns frontmatter into a file, and it stamps them here.
 *
 * `today` is a parameter so the stamped value and the value the guard below validates against are
 * the same one, rather than two `new Date()` calls that can land on opposite sides of midnight.
 */
export function serializeArticle(
  frontmatter: ArticleFrontmatter,
  body: string,
  today: string = utcDayString(),
): string {
  return matter.stringify(body, { ...frontmatter, date: today, updatedAt: today });
}

/**
 * Serialize an article and validate the result against the same date rules the pre-push hook and CI
 * apply to hand-written articles (src/lib/frontmatterDates.mjs).
 *
 * Returns the serialized content alongside the errors so callers reuse it rather than serializing a
 * second time. With the stamping above this should never report anything on the live refresh path,
 * and it is here anyway for two reasons: `commitRefreshedArticles` is exported and can be called
 * with arbitrary payloads, and if somebody later restores the passthrough this fails closed instead
 * of quietly reopening the hole.
 */
export function validateArticlePayload(
  article: ArticleCommitPayload,
  { today = utcDayString() }: { today?: string } = {},
): { errors: string[]; content: string } {
  const content = serializeArticle(article.frontmatter, article.body, today);
  const { errors } = validateFrontmatterDates(content, {
    // The underlying messages are written for somebody editing a file by hand ("Quote the value in
    // frontmatter"), which is not advice a pipeline can act on. The label is what carries the
    // provenance into an Inngest failure and the monthly summary email.
    label: `content/articles/${article.slug}.md (automated content refresh)`,
    today,
  });
  return { errors, content };
}

// ─── Single-commit batch push ─────────────────────────────────────────────────

/**
 * Commits all refreshed articles in a single atomic Git commit using the
 * GitHub Git Data API (blobs → tree → commit → ref update).
 *
 * A single commit is used so the Vercel/Netlify build is triggered once
 * for the entire batch rather than once per article.
 */
export async function commitRefreshedArticles(
  articles: ArticleCommitPayload[],
  commitMessage?: string
): Promise<void> {
  if (articles.length === 0) return;

  const config = getConfig();

  // ── 0. Serialize and validate EVERYTHING before touching GitHub ──────────
  // This runs first, before the ref is read and long before it is advanced, because it is the last
  // point at which a bad article can be stopped. There is no gate after it: this function PATCHes
  // the branch ref directly (step 6), so nothing here touches local git, .githooks/pre-push never
  // runs, and the CI workflow only ever reports after the commit already exists on `main`.
  //
  // One `today` for the whole batch, so a run spanning midnight cannot stamp two different days
  // into one atomic commit.
  const today = utcDayString();
  const prepared = articles.map((article) => ({
    article,
    ...validateArticlePayload(article, { today }),
  }));

  const problems = prepared.flatMap((entry) => entry.errors);
  if (problems.length > 0) {
    throw new Error(
      `Refusing to commit ${problems.length} frontmatter date problem(s) from the automated ` +
        `content refresh. Nothing was written: no blobs were created and ${config.branch} was not ` +
        `advanced.\n` +
        problems.map((problem) => `  - ${problem}`).join("\n"),
    );
  }

  // ── 1. Get current HEAD commit SHA ───────────────────────────────────────
  const refData = await githubRequest<{ object: { sha: string } }>(
    `/git/ref/heads/${config.branch}`,
    config
  );
  const latestCommitSha = refData.object.sha;

  // ── 2. Get the tree SHA of that commit ───────────────────────────────────
  const commitData = await githubRequest<{ tree: { sha: string } }>(
    `/git/commits/${latestCommitSha}`,
    config
  );
  const baseTreeSha = commitData.tree.sha;

  // ── 3. Create blobs for each updated article ─────────────────────────────
  // Uses the content validated in step 0, never a re-serialization of it: serializing twice would
  // mean the bytes that were checked are not necessarily the bytes that get committed.
  const blobs = await Promise.all(
    prepared.map(async ({ article: { slug }, content }) => {
      const encoded = Buffer.from(content, "utf-8").toString("base64");

      const blob = await githubRequest<{ sha: string }>(
        "/git/blobs",
        config,
        {
          method: "POST",
          body: JSON.stringify({ content: encoded, encoding: "base64" }),
        }
      );

      return {
        path: `content/articles/${slug}.md`,
        mode: "100644" as const,
        type: "blob" as const,
        sha: blob.sha,
      };
    })
  );

  // ── 4. Create a new tree with all updated files ───────────────────────────
  const newTree = await githubRequest<{ sha: string }>(
    "/git/trees",
    config,
    {
      method: "POST",
      body: JSON.stringify({ base_tree: baseTreeSha, tree: blobs }),
    }
  );

  // ── 5. Create the commit ──────────────────────────────────────────────────
  const commitDate = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const message = commitMessage
    ?? `chore: content refresh, ${articles.length} article(s) updated (${commitDate})`;

  const newCommit = await githubRequest<{ sha: string }>(
    "/git/commits",
    config,
    {
      method: "POST",
      body: JSON.stringify({
        message,
        tree: newTree.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  // ── 6. Advance the branch ref to the new commit ───────────────────────────
  await githubRequest(
    `/git/refs/heads/${config.branch}`,
    config,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommit.sha }),
    }
  );
}
