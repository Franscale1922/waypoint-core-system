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
 * The other thing this module has to survive is being run TWICE. `contentRefreshFunction` is
 * configured with `retries: 1`, so any throw from here runs the whole batch again against a HEAD
 * that may already contain the work, and a second identical commit is not free: every push to
 * `main` that touches content triggers a Vercel build, and every build runs `prisma db push`
 * against the PRODUCTION database. Three things keep the second run honest:
 *
 *   1. The commit message carries a `Refresh-Batch:` trailer derived from the exact bytes being
 *      committed, and a run checks the recent history for its own trailer before creating a single
 *      blob. This is what recognises already-applied work when the commit SHA is not to hand.
 *   2. If the tree that would be committed is identical to the tree already at HEAD, there is
 *      nothing to say and no commit is created.
 *   3. An ambiguous failure of the ref PATCH, one where GitHub may have applied the update and
 *      lost the reply, is resolved by re-reading the ref rather than assumed to be a failure.
 *
 * Required env vars:
 *   GITHUB_TOKEN:      fine-grained personal access token (contents: write)
 *   GITHUB_REPO_OWNER: e.g. "Franscale1922"
 *   GITHUB_REPO_NAME:  e.g. "waypoint-core-system"
 *   GITHUB_BRANCH:     defaults to "main" if not set
 */

import { createHash } from "crypto";
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

/**
 * What a call to `commitRefreshedArticles` actually did.
 *
 * Returned rather than logged because the caller wraps this in an Inngest step: the outcome lands
 * in the run history, which is where somebody looking at a retried run needs to be able to tell
 * "it committed twice" from "the retry recognised its own work and stood down".
 */
export interface CommitOutcome {
  status:
    /** A new commit was created and the branch now points at it. */
    | "committed"
    /** This exact batch was already on the branch, from an earlier attempt. Nothing was written. */
    | "already-applied"
    /** The branch already contains these bytes, so committing would have been a no-op. */
    | "no-changes"
    /** There were no articles to commit. */
    | "nothing-to-do";
  batchId: string | null;
  /** The commit carrying this batch: the new one, the one found, or HEAD. */
  commitSha: string | null;
  articles: number;
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

function describeCause(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * A failed GitHub call that knows whether its own outcome is KNOWN.
 *
 * `ambiguous` does NOT mean "probably fine". It means the failure carries no information about
 * whether the request was applied, so the caller must go and look rather than assume either way.
 * Nothing is ever treated as success because it was ambiguous. The flag only decides whether it
 * is worth spending a request to find the evidence. Success still requires the evidence itself:
 * the branch actually pointing at the commit we created.
 */
export class GitHubRequestError extends Error {
  readonly status?: number;
  readonly ambiguous: boolean;

  constructor(message: string, options: { status?: number; ambiguous: boolean; cause?: unknown }) {
    super(message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "GitHubRequestError";
    this.status = options.status;
    this.ambiguous = options.ambiguous;
  }
}

/**
 * Which HTTP statuses leave the outcome of a write UNKNOWN.
 *
 * 5xx: the request reached GitHub and something failed downstream of that, possibly after the
 * write was durable. 408: GitHub gave up on the request mid-flight. Everything else is a DECISION,
 * and a decision is information: 404 (no such ref), 422 (not a fast-forward), 403/429 (refused),
 * 401 (bad token). GitHub chose not to apply those, will choose the same on a retry, and they must
 * keep failing. Widening this list into "errors are probably fine" would be a worse bug than the
 * double-commit it is here to prevent.
 */
function isAmbiguousStatus(status: number): boolean {
  return status >= 500 || status === 408;
}

async function githubRequest<T>(
  path: string,
  config: GitHubConfig,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });
  } catch (cause) {
    // No response at all: DNS, TLS, a dropped socket, a client-side timeout. For a read this is
    // just a failure. For the ref PATCH it is the case this module exists to survive, because the
    // request may well have been applied and only the reply lost.
    throw new GitHubRequestError(
      `GitHub API request to ${path} failed before any response was received: ${describeCause(cause)}`,
      { ambiguous: true, cause }
    );
  }

  if (!res.ok) {
    let body: string;
    try {
      body = await res.text();
    } catch (cause) {
      // The status is what classifies this, so a body we could not read costs nothing but detail.
      body = `<response body unreadable: ${describeCause(cause)}>`;
    }
    throw new GitHubRequestError(`GitHub API error ${res.status} on ${path}: ${body}`, {
      status: res.status,
      ambiguous: isAmbiguousStatus(res.status),
    });
  }

  try {
    return (await res.json()) as T;
  } catch (cause) {
    // GitHub accepted the request, the status says so, and the connection died while the reply
    // was being read. For a write, the write landed; only our copy of the answer did not.
    throw new GitHubRequestError(
      `GitHub API returned ${res.status} on ${path} but the response body could not be read: ` +
        describeCause(cause),
      { status: res.status, ambiguous: true, cause }
    );
  }
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

// ─── Batch identity ──────────────────────────────────────────────────────────

const BATCH_TRAILER_KEY = "Refresh-Batch";

/**
 * How many commits back to look for a previous attempt's trailer.
 *
 * The window only has to span whatever landed on the branch between a lost reply and the retry
 * that follows it, which is seconds. Fifteen is generous for that and still one API call.
 */
const BATCH_LOOKBACK = 15;

/** The commit-message line that marks a commit as carrying a given batch. */
export function batchTrailer(batchId: string): string {
  return `${BATCH_TRAILER_KEY}: ${batchId}`;
}

/**
 * A stable name for one exact set of article bytes.
 *
 * Stable is the whole requirement: a retry re-derives it from the same payload (Inngest replays
 * the memoized per-article steps, so the model output is identical) and recognises its own work
 * in the history without needing the commit SHA it never received. So this hashes content, not a
 * clock and not a counter.
 *
 * Entries are length-prefixed rather than delimiter-joined so no slug or body can impersonate a
 * different batch by containing the delimiter, and sorted by slug so batch order does not change
 * the name. Sorting is by code unit, not `localeCompare`, which is locale-dependent and would make
 * the identifier depend on the machine.
 *
 * One caveat worth naming: `content` carries the stamped date, so a retry that crosses midnight UTC
 * derives a different id and will not match. That is correct rather than unfortunate, since the
 * bytes really are different at that point, but it does mean the midnight retry falls through to
 * the tree comparison in `commitRefreshedArticles` rather than being caught here.
 */
export function computeBatchId(prepared: { slug: string; content: string }[]): string {
  const hash = createHash("sha256");
  const ordered = [...prepared].sort((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));

  for (const { slug, content } of ordered) {
    hash.update(`${slug.length}:${slug}\n${content.length}:${content}\n`);
  }

  return hash.digest("hex").slice(0, 16);
}

/**
 * Resolve an ambiguous failure of the ref PATCH by looking at what the branch actually points at.
 *
 * Returns normally only when the branch is at `expectedSha`, that is, when the update demonstrably
 * landed and only the reply was lost. Every other outcome throws, including "we could not find
 * out", because an unknown outcome is not a success.
 */
async function confirmRefAdvanced(
  config: GitHubConfig,
  expectedSha: string,
  batchId: string,
  original: GitHubRequestError,
): Promise<void> {
  let head: string;

  try {
    const after = await githubRequest<{ object: { sha: string } }>(
      `/git/ref/heads/${config.branch}`,
      config
    );
    head = after.object.sha;
  } catch (cause) {
    throw new Error(
      `The ${config.branch} ref update for content-refresh batch ${batchId} failed ambiguously, ` +
        `and re-reading the ref to find out whether it landed also failed. Commit ${expectedSha} ` +
        `may or may not be on ${config.branch}. A retry is safe: it looks for ` +
        `"${batchTrailer(batchId)}" in the last ${BATCH_LOOKBACK} commits and will not commit ` +
        `this batch a second time.\n` +
        `  ref update failed: ${original.message}\n` +
        `  re-read failed: ${describeCause(cause)}`,
      { cause: original }
    );
  }

  if (head !== expectedSha) {
    // Two shapes end up here. Either the update genuinely did not land (the ordinary case, and a
    // real failure), or it landed and something else has already moved the branch past it, which
    // is rare and cannot be told apart from the first without walking history. Failing is right for
    // both: the retry's trailer check resolves the second one without committing twice.
    throw new Error(
      `The ${config.branch} ref update for content-refresh batch ${batchId} failed and the branch ` +
        `is at ${head}, not the commit that was created (${expectedSha}). Treating this as a ` +
        `failure. If ${expectedSha} did land and was then superseded, a retry will find ` +
        `"${batchTrailer(batchId)}" in recent history and stand down rather than commit again.\n` +
        `  ref update failed: ${original.message}`,
      { cause: original }
    );
  }

  // head === expectedSha. GitHub applied the update and lost the reply on the way back. The work
  // is published; the only thing that failed was our knowledge of it.
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
): Promise<CommitOutcome> {
  if (articles.length === 0) {
    return { status: "nothing-to-do", batchId: null, commitSha: null, articles: 0 };
  }

  const config = getConfig();

  // ── 0. Serialize and validate EVERYTHING before touching GitHub ──────────
  // This runs first, before the ref is read and long before it is advanced, because it is the last
  // point at which a bad article can be stopped. There is no gate after it: this function PATCHes
  // the branch ref directly (step 6), so nothing here touches local git, .githooks/pre-push never
  // runs, and the CI workflow only ever reports after the commit already exists on `main`.
  //
  // It also stays first, ahead of every idempotency check below, because it is DETERMINISTIC: the
  // same payload fails it the same way on every retry. There is nothing for a retry to recover
  // here and nothing it could have half-applied, so there is no reason to spend a request before
  // refusing.
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

  const batchId = computeBatchId(
    prepared.map(({ article, content }) => ({ slug: article.slug, content }))
  );

  // ── 1. Get current HEAD commit SHA ───────────────────────────────────────
  const refData = await githubRequest<{ object: { sha: string } }>(
    `/git/ref/heads/${config.branch}`,
    config
  );
  const latestCommitSha = refData.object.sha;

  // ── 1a. Did an earlier attempt already publish this exact batch? ──────────
  // The case this covers is the one where the SHA is not to hand: a previous run advanced the ref,
  // lost the reply, and could not re-read it either, so it threw and Inngest retried. That retry is
  // here, holding the same bytes and no memory of the commit they went into. The trailer is the
  // only handle it has, and looking for it BEFORE creating a blob means an already-applied batch
  // costs one GET rather than a duplicate commit and the production deploy behind it.
  const recentCommits = await githubRequest<{ sha: string; commit: { message: string } }[]>(
    `/commits?sha=${encodeURIComponent(latestCommitSha)}&per_page=${BATCH_LOOKBACK}`,
    config
  );
  const alreadyApplied = recentCommits.find((entry) =>
    entry.commit.message.includes(batchTrailer(batchId))
  );
  if (alreadyApplied) {
    return {
      status: "already-applied",
      batchId,
      commitSha: alreadyApplied.sha,
      articles: articles.length,
    };
  }

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

  // ── 4a. Would this commit change anything? ────────────────────────────────
  // Git trees are content-addressed, so laying these blobs over the base tree returns the base
  // tree's own SHA when every one of them is already there. That makes this a second, independent
  // read on "has this work already landed": it does not depend on the trailer, and so it still
  // fires for the retry that crossed midnight and derived a different batch id.
  //
  // Committing anyway would produce a commit with no file changes, which is not an audit trail of
  // anything and still costs a production deploy plus the `prisma db push` that rides along with
  // it. Blobs created above are unreferenced and GitHub collects them.
  if (newTree.sha === baseTreeSha) {
    return { status: "no-changes", batchId, commitSha: latestCommitSha, articles: articles.length };
  }

  // ── 5. Create the commit ──────────────────────────────────────────────────
  const commitDate = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  const summary = commitMessage
    ?? `chore: content refresh, ${articles.length} article(s) updated (${commitDate})`;
  // The trailer goes on every commit this function makes, including one with a caller-supplied
  // message, because step 1a of the NEXT attempt is the only thing that can see it.
  const message = `${summary}\n\n${batchTrailer(batchId)}\n`;

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
  // The one write in this function whose failure is worth interpreting. Everything above creates
  // Git objects, which are content-addressed and unreachable until something points at them: a
  // failed blob or tree leaves garbage GitHub collects, and a retry recreates it at the same SHA.
  // This call is what makes the batch real, so a failure that carries no information about whether
  // it was applied gets checked instead of believed.
  try {
    await githubRequest(
      `/git/refs/heads/${config.branch}`,
      config,
      {
        method: "PATCH",
        body: JSON.stringify({ sha: newCommit.sha }),
      }
    );
  } catch (error) {
    // A definite failure stays a failure and is rethrown untouched: 422 (not a fast-forward), 404
    // (no such branch), 403 (refused). Only an ambiguous one is worth a request to resolve.
    if (!(error instanceof GitHubRequestError) || !error.ambiguous) throw error;
    await confirmRefAdvanced(config, newCommit.sha, batchId, error);
  }

  return { status: "committed", batchId, commitSha: newCommit.sha, articles: articles.length };
}
