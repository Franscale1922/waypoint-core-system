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
 * created. See src/lib/frontmatterDates.mjs for the date rules and src/lib/frontmatterFields.mjs
 * for the required-field rules.
 *
 * Required env vars:
 *   GITHUB_TOKEN:      fine-grained personal access token (contents: write)
 *   GITHUB_REPO_OWNER: e.g. "Franscale1922"
 *   GITHUB_REPO_NAME:  e.g. "waypoint-core-system"
 *   GITHUB_BRANCH:     defaults to "main" if not set. Slashes are fine ("release/1.0"); anything
 *                      needing URL-encoding is rejected at startup. See getConfig.
 */

import { createHash } from "crypto";
import matter from "gray-matter";
import { ArticleFrontmatter } from "./contentRefresh";
import { validateFrontmatterDates, utcDayString } from "./frontmatterDates.mjs";
import { validateRequiredFields } from "./frontmatterFields.mjs";
import { validFaqEntries } from "@/app/lib/structured-data";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArticleCommitPayload {
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
  /**
   * Git blob SHA of the article file this refresh was based on, as it existed when the content was
   * read off disk. Checked against the blob actually on the branch before anything is overwritten.
   *
   * REQUIRED, deliberately, even though an optional field would have spared the call sites. The
   * check it feeds is the only thing standing between a concurrent human edit and silent data loss,
   * and an optional field makes forgetting it indistinguishable from not needing it: the batch would
   * commit, the run would report success, and the overwrite would be invisible. Required means
   * TypeScript refuses to compile a caller that has not thought about it.
   */
  baseBlobSha: string;
}

/**
 * What a commit actually did, as opposed to what it was asked to do.
 *
 * `conflicted` is not an error list. Those articles were valid; somebody else's newer version of
 * them is simply already on the branch, so the refresh stood down. The caller folds them into the
 * summary email's failure section so a skip is always visible to a human. A silent skip would
 * trade one invisible outcome for another.
 */
export interface CommitOutcome {
  committed: string[];
  conflicted: { slug: string; reason: string }[];
  /** null when every article conflicted, because then no commit was created at all. */
  commitSha: string | null;
}

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Encode a git ref for interpolation into a URL path.
 *
 * Per segment, deliberately. `encodeURIComponent` over the whole value would turn the `/` in
 * `release/1.0` into `%2F`, and GitHub would then look for a branch literally named `release%2F1.0`,
 * breaking every legitimate slashed branch name in the course of fixing the unslashed ones.
 * Splitting on `/` first keeps the separators as separators and encodes only what sits between them.
 *
 * `#` is the case that motivates this. It is a legal branch name character (`git check-ref-format`
 * accepts `refs/heads/release#1`), and pasted raw into a URL it opens a fragment, so the request
 * for `/git/refs/heads/release#1` is sent as `/git/refs/heads/release`, with the rest dropped before
 * it ever leaves the process. On a repo that also has a `release` branch, step 6 below would read
 * and then advance THAT branch instead of the configured one, with every response looking healthy.
 * `%` and `&` are legal in a ref too and corrupt the path for their own reasons.
 *
 * Exported for the tests: with the validation in `getConfig` this is unreachable for any value that
 * actually needs it, so testing it directly is the only honest way to show it encodes correctly.
 */
export function encodeRefForPath(ref: string): string {
  return ref.split("/").map(encodeURIComponent).join("/");
}

/**
 * Both API paths for one branch, built from a single encoded ref.
 *
 * The two differ by one character because GitHub really does use different nouns for the two
 * operations: reading is `/git/ref/heads/X` (singular), updating is `/git/refs/heads/X` (plural).
 * That reads like a typo at the call site and is not one. Building both here keeps the asymmetry
 * documented in one place instead of inviting someone to "fix" it.
 *
 * It is also what makes the encoding testable. `getConfig` rejects every branch name that needs
 * encoding, so no value reaching the call sites through the public API encodes to anything other
 * than itself. A test driving `commitRefreshedArticles` therefore cannot tell an encoded path from
 * an unencoded one, and deleting the encoding would not turn anything red. Asserting on this
 * function directly is what actually guards it.
 */
/**
 * Git's blob object ID for a UTF-8 file: `sha1("blob " + byteLength + "\0" + bytes)`.
 *
 * Reimplemented rather than asked of GitHub because the whole point is to hash bytes that only this
 * process has: the file as it was when the refresh read it, minutes and one model call ago. Asking
 * GitHub for that SHA would mean asking about the file as it is NOW, which is precisely the value
 * being checked against and would make the comparison tautological.
 *
 * The header is not decoration. It is what makes this a git object ID rather than a content hash,
 * and `byteLength` is the length in BYTES, not characters: an article with a single non-ASCII
 * character (every em dash, curly quote and accented brand name in the corpus) makes those two
 * numbers differ, and a plain `.length` here would mismatch every such file and report a conflict
 * that does not exist. Hashing the Buffer rather than the string is the same guard from the other
 * side.
 *
 * SHA-1 is not a security choice here and its collision weakness does not apply: this compares an
 * object ID against git's own object ID for the same content, so it must be exactly the algorithm
 * git uses. An attacker able to author colliding article bodies already has commit access.
 */
export function gitBlobSha(content: string): string {
  const bytes = Buffer.from(content, "utf-8");
  return createHash("sha1")
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest("hex");
}

export function branchRefPaths(branch: string): { read: string; update: string } {
  const ref = encodeRefForPath(branch);
  return { read: `/git/ref/heads/${ref}`, update: `/git/refs/heads/${ref}` };
}

/**
 * What this write path will accept in the names it interpolates into an API URL.
 *
 * Deliberately narrower than `git check-ref-format`: `#`, `%`, `&` and `+` are all legal in a branch
 * name and every one of them means something else inside a URL. `encodeRefForPath` makes them safe
 * to send, but a configured value that needs encoding is far more likely a mangled environment
 * variable than a ref anybody meant to write to, and `getConfig` is the last point before a PATCH
 * to a production ref. So the two are not redundant: the encoding is the correctness fix, this is
 * the loud failure, and they close different halves of the same hole.
 *
 * Refs that are URL-safe but still invalid (`a..b`, a `.lock` suffix) are left to GitHub, which
 * answers 404 and `githubRequest` turns into a thrown error naming the path. That is already a loud
 * failure, so reimplementing check-ref-format here would buy nothing.
 */
const SAFE_REF_SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;
/** GitHub owners and repos are `[A-Za-z0-9._-]` only, so they never legitimately need encoding. */
const SAFE_OWNER_OR_REPO = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * The value is named but never echoed, deliberately.
 *
 * This error is thrown from inside an Inngest step, so its message lands in failure telemetry and
 * the monthly summary email. The whole premise of the check above is that a value reaching it is
 * probably a mis-mapped environment variable rather than an intentional target, which means the
 * thing being echoed could be whatever was mapped there by mistake, including a credential. The
 * variable name plus the rule is what makes the failure actionable; the bytes add nothing an
 * operator looking at their own configuration does not already have.
 */
function rejectConfigValue(envVar: string, value: string): Error {
  return new Error(
    `Refusing to use ${envVar} (${value.length} character(s)): it is not a plain slash-separated ` +
      `name. This function PATCHes a branch ref directly, so a value that needs URL-encoding here ` +
      `is treated as a misconfigured environment variable rather than an intentional target. ` +
      `Allowed per slash-separated segment: letters, digits, "." "_" "-", starting with a letter, ` +
      `digit or "_". The value itself is withheld on purpose; see the note above this function.`,
  );
}

function getConfig(): GitHubConfig {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_REPO_OWNER;
  const repo = process.env.GITHUB_REPO_NAME;
  const branch = process.env.GITHUB_BRANCH ?? "main";

  if (!token) throw new Error("Missing env var: GITHUB_TOKEN");
  if (!owner) throw new Error("Missing env var: GITHUB_REPO_OWNER");
  if (!repo) throw new Error("Missing env var: GITHUB_REPO_NAME");

  // Checked before anything is read or written, so a mangled value fails on configuration rather
  // than halfway through a batch, or, worse, quietly against a ref nobody chose.
  if (!SAFE_OWNER_OR_REPO.test(owner)) throw rejectConfigValue("GITHUB_REPO_OWNER", owner);
  if (!SAFE_OWNER_OR_REPO.test(repo)) throw rejectConfigValue("GITHUB_REPO_NAME", repo);
  if (!branch.split("/").every((segment) => SAFE_REF_SEGMENT.test(segment))) {
    throw rejectConfigValue("GITHUB_BRANCH", branch);
  }

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
 * Serialize an article and validate the result against the same rules the pre-push hook and CI
 * apply to hand-written articles: the date rules in src/lib/frontmatterDates.mjs and the
 * required-field rules in src/lib/frontmatterFields.mjs.
 *
 * Returns the serialized content alongside the errors so callers reuse it rather than serializing a
 * second time.
 *
 * THE TWO HALVES ARE NOT THE SAME KIND OF CHECK, and conflating them is how the second one would
 * get deleted as redundant.
 *
 * The DATE half is a backstop. `serializeArticle` above stamps both dates, so no model-authored
 * date value survives to be validated, and this should never report anything on the live path. It
 * is here because `commitRefreshedArticles` is exported and can be called with arbitrary payloads,
 * and so that restoring the passthrough fails closed instead of quietly reopening the hole.
 *
 * The FIELD half is load-bearing and fires on real input. Nothing stamps `title`, `excerpt` or
 * `faqs`: src/inngest/functions.ts pins slug, category, tier and relatedSlugs back to the original
 * article and takes those three from model output verbatim. They cannot be stamped the way a date
 * can, because unlike a date the pipeline has no correct value to substitute, which is the whole
 * reason this is a validate-and-skip rather than an overwrite. Before this existed they were the
 * one part of a refreshed article that reached `main` with nothing in front of it at all.
 *
 * Both are checked against the SERIALIZED BYTES rather than the frontmatter object, because the
 * bytes are what gets committed and what production later parses. Validating the object would
 * check something adjacent to the artifact instead of the artifact.
 */
export function validateArticlePayload(
  // Only the three fields that become bytes. `baseBlobSha` is about WHERE the result may safely be
  // written, which is the commit boundary's business and not this function's, and demanding it here
  // would force the per-article caller in src/inngest/functions.ts to compute a hash purely to
  // satisfy a signature that ignores it.
  article: Pick<ArticleCommitPayload, "slug" | "frontmatter" | "body">,
  { today = utcDayString() }: { today?: string } = {},
): { errors: string[]; content: string } {
  // The underlying messages are written for somebody editing a file by hand ("Quote the value in
  // frontmatter"), which is not advice a pipeline can act on. The label is what carries the
  // provenance into an Inngest failure and the monthly summary email.
  const label = `content/articles/${article.slug}.md (automated content refresh)`;

  // Serialization itself can fail, and a throw here would defeat the entire point of returning
  // errors. js-yaml refuses to dump a key whose value is explicitly `undefined` ("unacceptable kind
  // of an object to dump"), and src/inngest/functions.ts produces exactly that shape when it pins a
  // field back from an original article that lacks it: `newFrontmatter.tier =
  // article.frontmatter.tier` writes the key with an undefined value rather than leaving it out.
  //
  // Unhandled, that propagates out of the `step.run` wrapping this call, which fails the step, gets
  // retried, and eventually takes down the whole monthly run so the summary email never sends. That
  // is precisely the batch-wide failure the caller drops individual articles to avoid. So a
  // serialization failure is reported as an article-level error like any other, and that article is
  // skipped.
  let content: string;
  try {
    content = serializeArticle(article.frontmatter, article.body, today);
  } catch (error) {
    return {
      errors: [
        `${label}: the frontmatter could not be serialized to YAML at all ` +
          `(${String(error instanceof Error ? error.message : error).split("\n")[0]}). A key ` +
          `whose value is explicitly undefined does this. The article cannot be written and is ` +
          `skipped.`,
      ],
      content: "",
    };
  }

  const { errors: dateErrors } = validateFrontmatterDates(content, { label, today });
  const { errors: fieldErrors } = validateRequiredFields(content, {
    label,
    // Production's own FAQ filter, handed in rather than reimplemented. A list of entries that all
    // get dropped at render time publishes nothing while passing every structural check, and the
    // only way to know which entries survive is to ask the function that decides.
    faqEntryFilter: (entries) => validFaqEntries(entries as { q: string; a: string }[], label),
  });

  return { errors: [...dateErrors, ...fieldErrors], content };
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
  if (articles.length === 0) return { committed: [], conflicted: [], commitSha: null };

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
      `Refusing to commit ${problems.length} frontmatter problem(s) from the automated ` +
        `content refresh. Nothing was written: no blobs were created and ${config.branch} was not ` +
        `advanced.\n` +
        problems.map((problem) => `  - ${problem}`).join("\n"),
    );
  }

  // ── 1. Get current HEAD commit SHA ───────────────────────────────────────
  const refPaths = branchRefPaths(config.branch);
  const refData = await githubRequest<{ object: { sha: string } }>(
    refPaths.read,
    config
  );
  const latestCommitSha = refData.object.sha;

  // ── 2. Get the tree SHA of that commit ───────────────────────────────────
  const commitData = await githubRequest<{ tree: { sha: string } }>(
    `/git/commits/${latestCommitSha}`,
    config
  );
  const baseTreeSha = commitData.tree.sha;

  // ── 2a. Compare-and-swap: drop any article the branch has moved on from ───
  //
  // Everything below overwrites `content/articles/<slug>.md` wholesale, and until this existed it
  // did so with no idea what it was overwriting. Three facts combine into silent data loss without
  // this check:
  //
  //   1. The content being written was generated from `process.cwd()/content/articles` (see
  //      getAllArticles), which in a deployed function is the LAST DEPLOY's copy of the file, not
  //      whatever is on the branch now.
  //   2. Step 4 builds its tree on `base_tree`, so a path this batch names is replaced outright.
  //      Nothing compares it to what is already there.
  //   3. GitHub's own protection does not cover this. The PATCH in step 6 omits `force`, which
  //      defaults to false and refuses a non-fast-forward, but that guards the BRANCH POINTER, not
  //      file contents. Replacing someone's edit to a file while still descending from their commit
  //      is a perfectly good fast-forward, so the ref update succeeds and the edit is gone.
  //
  // The retry is what made it silent rather than merely possible. This runs inside a `step.run` on
  // a function configured `retries: 1` (src/inngest/functions.ts). If an editor's commit lands
  // between step 1 and step 6, the PATCH is refused, the step throws, and Inngest retries. The
  // retry re-reads HEAD, rebuilds on their commit, and applies the same stale bytes, which now IS a
  // fast-forward. Attempt one fails loudly; attempt two overwrites them and reports success.
  //
  // So each article carries the blob SHA of the file it was generated from, and that has to still be
  // the blob on the branch. Anything else means the file changed underneath this run, and this run's
  // version is built on a copy that no longer exists. It stands down for that article rather than
  // guessing whose version is right. The article keeps the newer content and comes back round at
  // the next cadence.
  //
  // Fixing the CAS also removes the duplicate-commit case, without a second mechanism: if step 6
  // succeeded but its response was lost, the retry reads the new HEAD, finds this run's own bytes on
  // every path, matches none of the base SHAs, and commits nothing.
  const baseTree = await githubRequest<{
    tree: { path: string; sha: string; type: string }[];
    truncated: boolean;
  }>(`/git/trees/${baseTreeSha}?recursive=1`, config);

  // Fail closed. A truncated tree is missing paths, and a missing path is indistinguishable here
  // from a deleted file: both look like "no blob for this article". Guessing in that state is
  // exactly the silent overwrite this check exists to prevent, so the batch stops instead. GitHub
  // truncates around 100k entries; this repo is three orders of magnitude short of that, so if this
  // ever fires something is wrong that a fallback would only hide.
  if (baseTree.truncated) {
    throw new Error(
      `Refusing to commit: GitHub truncated the tree listing for ${baseTreeSha}, so the current ` +
        `blob SHA of each article cannot be established. Nothing was written and ${config.branch} ` +
        `was not advanced.`,
    );
  }

  const blobShaByPath = new Map(
    baseTree.tree.filter((entry) => entry.type === "blob").map((entry) => [entry.path, entry.sha]),
  );

  const conflicted: { slug: string; reason: string }[] = [];
  const survivors = prepared.filter(({ article }) => {
    const path = `content/articles/${article.slug}.md`;
    const currentSha = blobShaByPath.get(path);

    if (currentSha === undefined) {
      conflicted.push({
        slug: article.slug,
        reason:
          `${path} no longer exists on ${config.branch}. It was deleted or renamed after this ` +
          `refresh read it, so re-creating it here would silently revert that.`,
      });
      return false;
    }

    if (currentSha !== article.baseBlobSha) {
      conflicted.push({
        slug: article.slug,
        reason:
          `${path} changed on ${config.branch} after this refresh read it (expected blob ` +
          `${article.baseBlobSha.slice(0, 7)}, found ${currentSha.slice(0, 7)}). Committing would ` +
          `overwrite that newer version with content generated from the older one, so this article ` +
          `was skipped and keeps the newer version.`,
      });
      return false;
    }

    return true;
  });

  if (survivors.length === 0) {
    return {
      committed: [],
      conflicted,
      commitSha: null,
    };
  }

  // ── 3. Create blobs for each updated article ─────────────────────────────
  // Uses the content validated in step 0, never a re-serialization of it: serializing twice would
  // mean the bytes that were checked are not necessarily the bytes that get committed.
  const blobs = await Promise.all(
    survivors.map(async ({ article: { slug }, content }) => {
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
  // survivors.length, not articles.length: a conflict-skipped article is not in this commit, and a
  // message counting it would misreport the commit's own contents in git history.
  const message = commitMessage
    ?? `chore: content refresh, ${survivors.length} article(s) updated (${commitDate})`;

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
  //
  // `force` is deliberately absent: it defaults to false, which makes GitHub refuse a
  // non-fast-forward update. That is a second, independent guard and not a substitute for the CAS
  // above. This one protects the branch pointer against a commit that landed since step 1, the CAS
  // protects the file contents. Adding `force: true` here would disable the half GitHub gives for
  // free while leaving the harder half looking intact.
  await githubRequest(
    refPaths.update,
    config,
    {
      method: "PATCH",
      body: JSON.stringify({ sha: newCommit.sha }),
    }
  );

  return {
    committed: survivors.map(({ article }) => article.slug),
    conflicted,
    commitSha: newCommit.sha,
  };
}
