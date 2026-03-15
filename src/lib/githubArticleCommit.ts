/**
 * githubArticleCommit.ts
 *
 * Commits one or more refreshed article files to GitHub using the
 * Git Data API — a single atomic commit for the entire batch.
 *
 * Required env vars:
 *   GITHUB_TOKEN      — fine-grained personal access token (contents: write)
 *   GITHUB_REPO_OWNER — e.g. "Franscale1922"
 *   GITHUB_REPO_NAME  — e.g. "waypoint-core-system"
 *   GITHUB_BRANCH     — defaults to "main" if not set
 */

import matter from "gray-matter";
import { ArticleFrontmatter } from "./contentRefresh";

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

function serializeArticle(frontmatter: ArticleFrontmatter, body: string): string {
  const today = new Date().toISOString().split("T")[0];
  return matter.stringify(body, { ...frontmatter, date: today });
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
  const blobs = await Promise.all(
    articles.map(async ({ slug, frontmatter, body }) => {
      const content = serializeArticle(frontmatter, body);
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
  const today = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const message = commitMessage
    ?? `chore: content refresh — ${articles.length} article(s) updated (${today})`;

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
