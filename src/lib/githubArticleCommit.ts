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
 *   4. The compare-and-swap in step 2a recognises an article whose intended bytes are ALREADY the
 *      blob on the branch, which is what a partial first attempt leaves behind. Without it a retry
 *      would read its own work as somebody else's edit and report a successful batch as a total
 *      failure.
 *
 * Two things are checked, because a commit is two decisions: WHAT is written (the serialized bytes,
 * whose dates are stamped and then validated) and WHERE it is written (the slug, which becomes the
 * path of a tree entry and is validated against SLUG_PATTERN, bound to the frontmatter slug, and
 * checked for collisions across the batch).
 *
 * There is a third question underneath both of them, and it is the one a compare-and-swap answers:
 * whether the file being replaced is still the file this content was generated FROM. See step 2a.
 * Do not read the absent `force` on the ref PATCH as covering that; it does not, for the reason
 * spelled out there.
 *
 * A NOTE ON RULESETS, because the failure is loud but its cause is not
 * -------------------------------------------------------------------
 * This function PATCHes a branch ref directly, with a personal access token. A repository ruleset
 * or a branch protection rule on the target branch that requires a pull request, a passing status
 * check, or signed commits therefore makes EVERY refresh fail with 403, permanently. That status
 * is deliberately not in `isAmbiguousStatus` and deliberately not retried by the rate-limit
 * handling below: GitHub has decided, and it will decide the same way every time. Retrying it
 * would burn the function's whole 10-minute budget on a request that cannot succeed.
 *
 * If that ever happens, the fix is NOT to weaken the ruleset or to add `force`. It is to publish
 * through a branch and a pull request instead of straight to the default branch, which changes
 * what the monthly refresh IS and is a product decision rather than a code change.
 *
 * Verified 2026-08-05: this repository has no rulesets (`gh api .../rulesets` returns `[]`) and no
 * branch protection on `main`. So this is a hazard to recognise, not a live condition.
 *
 * THE ONE CASE THE COMPARE-AND-SWAP STILL CANNOT SEE, and why it was left open
 * ---------------------------------------------------------------------------
 * Step 2a compares FILE CONTENTS, so it catches an edit to an article. It does not constrain which
 * commit the branch is at, so it cannot see a force-reset: an operator moves the branch back to an
 * ancestor to remove bad commits, this function reads that older HEAD, finds each article's blob
 * exactly as it expects, and fast-forwards, resurrecting whatever the reset removed elsewhere in
 * the tree.
 *
 * Closing that needs an expected-head operation, and REST cannot express one: the ref PATCH takes
 * no expected-oid, and reading the ref first is a check, not a compare-and-swap. GraphQL
 * `createCommitOnBranch(expectedHeadOid:)` is genuinely atomic and would close it.
 *
 * Deliberately not done here. It replaces the entire blobs/tree/commit/ref sequence with one
 * mutation, which is a rewrite of this module rather than an addition to it, and the idempotency
 * machinery above is built around the intermediate objects that sequence creates. The window is
 * also narrow and operator-initiated, unlike the editor-edit window this file exists to close.
 * Recorded because the option was raised in review and a later reader should not have to rediscover
 * either the option or the reason.
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
import { gitBlobSha } from "./gitBlobSha";
import { validFaqEntries } from "@/app/lib/structured-data";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ArticleCommitPayload {
  slug: string;
  frontmatter: ArticleFrontmatter;
  body: string;
  /**
   * The git blob SHA of the article file this payload's content was generated FROM.
   *
   * Checked against the blob actually on the branch immediately before anything is overwritten
   * (step 2a). A mismatch means the file moved underneath the run and this payload is built on a
   * version that no longer exists.
   *
   * REQUIRED, deliberately, though an optional field would have spared the call sites. The check
   * it feeds is the only thing standing between a concurrent human edit and silent data loss, and
   * an optional field makes forgetting it indistinguishable from not needing it: the batch would
   * commit, the run would report success, and the overwrite would be invisible. Required means the
   * compiler refuses a caller that has not thought about it.
   */
  baseBlobSha: string;
}

/**
 * The part of a payload that becomes bytes, which is all the validation needs.
 *
 * Named rather than inlined as a `Pick` at the one call site because two functions take it and the
 * point of the narrowing is easy to undo by accident: widening either of them back to
 * `ArticleCommitPayload` would compile, and would silently make `validateArticlePayload`
 * unreachable from the per-article caller that has no blob SHA to hand yet.
 */
type ArticlePayloadContent = Pick<ArticleCommitPayload, "slug" | "frontmatter" | "body">;

interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  /**
   * How this module waits between attempts at a rate-limited request. Injectable so tests can
   * assert the backoff schedule without really sleeping, and defaulted in `getConfig` so
   * production never has to think about it. Not part of the exported surface: it is a seam, not a
   * setting.
   */
  sleep: (ms: number) => Promise<void>;
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
    /** Every article stood down at the compare-and-swap. Nothing was written. */
    | "stood-down"
    /** There were no articles to commit. */
    | "nothing-to-do";
  batchId: string | null;
  /** The commit carrying this batch: the new one, the one found, or HEAD. */
  commitSha: string | null;
  /** How many payloads this call was handed. Not how many were written; see `applied`. */
  articles: number;
  /**
   * Slugs whose intended bytes are on the branch as of this outcome, whether this call wrote them
   * or found them already there.
   */
  applied: string[];
  /**
   * Articles this call declined to write because the file had moved underneath the run.
   *
   * NOT an error list. These payloads were valid; somebody else's newer version of the file is
   * already published, so the refresh stood down rather than guessing whose version is right. The
   * caller reports them to a human, because a skip nobody is told about would be as bad as the
   * overwrite it prevents.
   *
   * ALWAYS PRESENT, possibly empty. The caller still has to tolerate it being absent, because this
   * object is memoized across an Inngest step boundary and a run that completed that step before
   * this field existed replays the older shape.
   */
  stoodDown: { slug: string; reason: string }[];
}

// ─── Slug: the destination path, not a label ─────────────────────────────────

/**
 * The one shape an article slug may take.
 *
 * `commitRefreshedArticles` turns a slug into the `path` of a tree entry, and that tree is
 * committed by PATCHing the branch ref, which defaults to `main`. So the slug is not a label on
 * this path: it is the choice of which file in the repository the run overwrites. Nothing
 * downstream re-checks it, because by the time it is downstream it is already a path in a tree
 * GitHub has accepted.
 *
 * Anchored, lowercase, hyphen-separated, which excludes exactly the characters that would let a
 * slug mean something other than one article: `/` and `..` (write anywhere in the repo, including
 * .github/workflows/), `.` (a different extension), and whitespace or control characters. Single
 * interior hyphens only, so the pattern also matches how every existing slug is actually written.
 *
 * Confirmed against all 45 articles in content/articles/ before being enforced, so the first
 * automated refresh cannot fail on an article that was always fine.
 * tests/unit/write-path-slug.test.ts re-checks the corpus on every run, which is what keeps the
 * format and the articles from drifting apart as articles are added.
 *
 * This is defense in depth, not a live hole. The slug reaching this file today is the basename of
 * an article already committed to this repository, and is never model output: src/inngest/
 * functions.ts derives it from the source file's own path and discards the model's slug before
 * building the payload. The check is here anyway because that provenance is a property of one
 * caller, and this function is exported.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Upper bound on slug length, so a slug cannot be used to build a pathological tree entry. The
 * longest article slug today is 59 characters, so this leaves real headroom for normal titles.
 */
export const SLUG_MAX_LENGTH = 80;

const ARTICLES_DIR = "content/articles";

/**
 * The single place a slug becomes a destination path, so the duplicate check below and the tree
 * entry it is protecting cannot drift apart.
 */
function articlePath(slug: string): string {
  return `${ARTICLES_DIR}/${slug}.md`;
}

/** Quote a rejected value for an error message, capped so a hostile value cannot flood the log. */
function show(value: string): string {
  return JSON.stringify(value.length > 120 ? `${value.slice(0, 120)}[truncated]` : value);
}

function slugFormatErrors(value: unknown, field: string): string[] {
  if (typeof value !== "string") {
    return [
      `automated content refresh: ${field} must be a string, got ` +
        `${value === null ? "null" : typeof value}.`,
    ];
  }
  if (value.length > SLUG_MAX_LENGTH) {
    return [
      `automated content refresh: ${field} is ${value.length} characters, over the ` +
        `${SLUG_MAX_LENGTH}-character limit: ${show(value)}`,
    ];
  }
  if (!SLUG_PATTERN.test(value)) {
    return [
      `automated content refresh: ${field} is not a valid article slug: ${show(value)}. ` +
        `Expected lowercase letters, digits and single interior hyphens ` +
        `(${SLUG_PATTERN.source}). The slug becomes the committed file path, so any other ` +
        `character could write outside ${ARTICLES_DIR}/.`,
    ];
  }
  return [];
}

/**
 * Bind the file that gets overwritten to the article that is being published.
 *
 * Two different slugs travel in one payload and they are used for two different things: the
 * payload slug picks the file to overwrite, and the frontmatter slug is what the site routes on
 * once that file is built. Nothing before this made them agree, so a payload could have replaced
 * one article's file with another article's content, leaving the original stale and the new copy
 * unreachable at its own URL.
 *
 * This check is only worth anything while the two values have INDEPENDENT origins. The refresh
 * derives the payload slug from the source file's own path for exactly that reason: taking it from
 * frontmatter instead, as `getAllArticles` does for its own `slug` field, would have this comparing
 * a value against itself and agreeing every time. If a caller is ever added that populates both
 * from one source, this stops being a check and becomes decoration.
 *
 * Note the consequence for authoring: an article whose frontmatter carries no `slug:` reaches this
 * check as `undefined` and is dropped from the refresh rather than committed to a guessed path.
 * All 45 articles currently carry one, and the corpus test asserts it stays that way.
 */
function slugErrors(article: ArticlePayloadContent): string[] {
  const formatProblems = [
    ...slugFormatErrors(article.slug, "payload slug"),
    ...slugFormatErrors(article.frontmatter?.slug, "frontmatter slug"),
  ];
  // A mismatch message stacked on top of a malformed value is noise: the malformed value is the
  // problem to fix, and the two cannot be meaningfully compared until it is.
  if (formatProblems.length > 0) return formatProblems;

  if (article.slug !== article.frontmatter.slug) {
    return [
      `automated content refresh: payload slug ${show(article.slug)} does not match the ` +
        `frontmatter slug ${show(article.frontmatter.slug)}. The payload slug chooses the file ` +
        `that is overwritten and the frontmatter slug is what the site routes on, so committing ` +
        `a mismatch would replace one article's file with another article's content.`,
    ];
  }
  return [];
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

/** The default wait: a real timer. Overridden only by tests, through `commitRefreshedArticles`. */
const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function getConfig(overrides: { sleep?: (ms: number) => Promise<void> } = {}): GitHubConfig {
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

  return { token, owner, repo, branch, sleep: overrides.sleep ?? realSleep };
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

// ─── Rate limits: the one refusal that is worth waiting out ──────────────────

/** Attempts for a single request, INCLUDING the first. Three waits at most. */
export const RATE_LIMIT_MAX_ATTEMPTS = 4;
/** The longest single wait honoured from a header, however large the header says. */
export const RATE_LIMIT_MAX_WAIT_MS = 60_000;
/** Total added wait across every retry of one request. The function's own budget is 10 minutes. */
export const RATE_LIMIT_TOTAL_BUDGET_MS = 120_000;
/**
 * Spread added on top of the server's own figure.
 *
 * Blob creation fires the whole batch in one tick, so a secondary rate limit refuses them all at
 * once with the same `retry-after`, and an unjittered retry would send them all again in one tick
 * too. Small, and only ever added, so it cannot retry EARLIER than the server asked.
 */
export const RATE_LIMIT_JITTER_MS = 250;

/**
 * How long to wait before retrying this response, or `null` for "do not retry".
 *
 * 403 IS TWO DIFFERENT ANSWERS AND ONLY ONE OF THEM IS TEMPORARY. GitHub returns it both for a
 * secondary rate limit, which clears on its own, and for a refusal that never will: a ruleset
 * requiring a pull request, a token without `contents: write`, an archived repository. Retrying
 * the second kind spends the function's entire 10-minute budget waiting for an answer that is
 * already final, and it would do so on the monthly run that most needs to fail fast and say why.
 *
 * So the evidence, not the status, decides. A `retry-after` header is GitHub explicitly saying
 * "again later". Exhausted `x-ratelimit-remaining` with a reset still in the future says the same
 * thing implicitly. A 403 carrying neither is a decision, and is left to `isAmbiguousStatus` and
 * the throw path, unretried.
 *
 * A reset in the PAST is deliberately NOT retried either. The window it names has already closed,
 * so the exhausted counter is stale evidence, and the likelier reading of a 403 that arrives with
 * it is a permission refusal that happens to carry rate-limit headers, as every GitHub response
 * does.
 *
 * Pure, and exported, because the header parsing is the part that rots: it is worth asserting
 * directly rather than only through a retry loop that has to be provoked into running.
 */
export function rateLimitDelayMs(
  status: number,
  headers: { get(name: string): string | null } | undefined,
  now: number,
): number | null {
  if (status !== 403 && status !== 429) return null;
  if (!headers) return null;

  const cap = (ms: number) => Math.min(Math.max(ms, 0), RATE_LIMIT_MAX_WAIT_MS);

  const retryAfter = headers.get("retry-after");
  if (retryAfter !== null && retryAfter.trim() !== "") {
    // Delta-seconds is what GitHub sends. An HTTP-date is also legal per RFC 9110, and parsing it
    // costs one line, so a compliant proxy in front of the API cannot turn a retryable refusal
    // into a permanent one.
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return cap(seconds * 1000);
    const at = Date.parse(retryAfter);
    if (Number.isFinite(at)) return cap(at - now);
    return null;
  }

  if (headers.get("x-ratelimit-remaining") !== "0") return null;
  const reset = Number(headers.get("x-ratelimit-reset"));
  if (!Number.isFinite(reset)) return null;
  const waitMs = reset * 1000 - now;
  return waitMs > 0 ? cap(waitMs) : null;
}

async function githubRequest<T>(
  path: string,
  config: GitHubConfig,
  options: RequestInit = {}
): Promise<T> {
  let attempt = 0;
  let waited = 0;

  for (;;) {
    attempt += 1;
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
      //
      // Deliberately NOT retried here, and the rate-limit loop below is exactly why that is not an
      // inconsistency. A rate-limit refusal is GitHub telling us it did not act; this is GitHub
      // telling us nothing at all. Re-sending a write whose outcome is unknown is the double-commit
      // this module was built to prevent, so it goes up to the caller that knows what to do about
      // it.
      throw new GitHubRequestError(
        `GitHub API request to ${path} failed before any response was received: ${describeCause(cause)}`,
        { ambiguous: true, cause }
      );
    }

    if (!res.ok) {
      const delay = rateLimitDelayMs(res.status, res.headers, Date.now());

      if (delay !== null && attempt < RATE_LIMIT_MAX_ATTEMPTS) {
        const wait = delay + Math.floor(Math.random() * RATE_LIMIT_JITTER_MS);
        if (waited + wait <= RATE_LIMIT_TOTAL_BUDGET_MS) {
          waited += wait;
          await config.sleep(wait);
          continue;
        }
      }

      let body: string;
      try {
        body = await res.text();
      } catch (cause) {
        // The status is what classifies this, so a body we could not read costs nothing but detail.
        body = `<response body unreadable: ${describeCause(cause)}>`;
      }
      // The attempt count is in the message because the two failures read identically otherwise,
      // and they call for opposite responses: a rate limit that outlasted the budget means run it
      // again later, a refusal on the first attempt means fix the configuration.
      const tried =
        attempt > 1 ? ` after ${attempt} attempts and ${Math.round(waited / 1000)}s of backoff` : "";
      throw new GitHubRequestError(
        `GitHub API error ${res.status} on ${path}${tried}: ${body}`,
        {
          status: res.status,
          ambiguous: isAmbiguousStatus(res.status),
        }
      );
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
}

// ─── Serialize article to .md string ─────────────────────────────────────────

/**
 * Serialize one article to the exact bytes that will be committed.
 *
 * THE TWO DATES MEAN DIFFERENT THINGS, AND ONLY ONE OF THEM IS THE CLOCK'S
 * -----------------------------------------------------------------------
 * `updatedAt` is stamped to today: it records that this revision happened, which is exactly what a
 * refresh knows. `date` is PRESERVED: it is the article's publication date, a fact about the past
 * that no later run has any standing to restate.
 *
 * This function used to overwrite both. That silently destroyed the publication date of every
 * article it touched, and the value was unrecoverable from the committed file, so an article first
 * published in January reported `datePublished: <the day the cron ran>`. Both consumers followed it:
 * `resources/[slug]/page.tsx` feeds `date` to the Article node, and `sitemap.ts` reads
 * `updatedAt ?? date` into `lastModified`. The article therefore presented to Google as newly
 * published rather than as long-standing and revised, inverting the signal a content refresh exists
 * to send, on the pages the refresh touches most.
 *
 * WHERE THE "A MODEL CANNOT AUTHOR A DATE" GUARANTEE LIVES NOW
 * ------------------------------------------------------------
 * It moved, so do not read the preserved `date` as a hole reopening. The overwrite here used to be
 * what stopped model-authored dates. That job now belongs to `mergeRefreshedFrontmatter`
 * (src/lib/contentRefresh.ts), which builds the frontmatter by starting from the ORIGINAL article
 * and copying only MODEL_OWNED_FIELDS -- title, excerpt, faqs. `date` is not among them, so what
 * arrives here is the value already on disk, never the model's.
 *
 * That relocation is why `date` is safe to keep and why it is tested end to end rather than
 * asserted here: see "a model-supplied date does not survive the merge" in
 * tests/unit/write-path-dates.test.ts. If MODEL_OWNED_FIELDS ever grows to include a date field,
 * that test is what goes red.
 *
 * A malformed preserved `date` is not laundered into something plausible. It flows to
 * `validateArticlePayload` below, which refuses the whole batch, matching how every other bad input
 * on this path behaves.
 *
 * `today` is a parameter so the stamped value and the value the guard below validates against are
 * the same one, rather than two `new Date()` calls that can land on opposite sides of midnight.
 */
export function serializeArticle(
  frontmatter: ArticleFrontmatter,
  body: string,
  today: string = utcDayString(),
): string {
  return matter.stringify(body, { ...frontmatter, updatedAt: today });
}

/**
 * Serialize an article and validate the result against the same rules the pre-push hook and CI
 * apply to hand-written articles: the date rules in src/lib/frontmatterDates.mjs and the
 * required-field rules in src/lib/frontmatterFields.mjs. Plus the one rule that is about neither
 * the bytes nor the fields: the SLUG, which decides which file those bytes replace.
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
 * `faqs`: mergeRefreshedFrontmatter in src/lib/contentRefresh.ts preserves every other field from
 * the original article and takes those three from model output verbatim. They cannot be stamped the
 * way a date can, because unlike a date the pipeline has no correct value to substitute, which is
 * the whole reason this is a validate-and-skip rather than an overwrite. Before this existed they
 * were the one part of a refreshed article that reached `main` with nothing in front of it at all.
 *
 * Both are checked against the SERIALIZED BYTES rather than the frontmatter object, because the
 * bytes are what gets committed and what production later parses. Validating the object would
 * check something adjacent to the artifact instead of the artifact.
 *
 * The SLUG half is the one check that is not about the bytes at all. Those two halves both ask
 * whether this article is fit to publish; the slug asks which file publishing it overwrites, which
 * no amount of inspecting the content can answer. It is a backstop like the dates rather than
 * load-bearing like the fields, for the same reason: the refresh derives the slug from a file
 * already committed to this repository, so a malformed one cannot arrive on the live path. It is
 * checked because this function is exported and its result is a path in a tree.
 */
export function validateArticlePayload(
  // Only the three fields that become bytes. `baseBlobSha` decides WHERE the result may safely be
  // written, which is the commit boundary's business rather than this function's, and requiring it
  // here would force the per-article caller in src/inngest/functions.ts to produce a hash purely to
  // satisfy a signature that ignores it.
  article: ArticlePayloadContent,
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
  // The destination, checked independently of the bytes and reported alongside them. An article can
  // be perfectly well-formed and still name the wrong file, and no inspection of its content would
  // notice.
  const slugProblems = slugErrors(article);

  let content: string;
  try {
    content = serializeArticle(article.frontmatter, article.body, today);
  } catch (error) {
    return {
      // Slug problems survive this path rather than being lost to it: a payload can easily be both
      // unserializable and pointed at the wrong file, and reporting one problem per article per run
      // would take a month to surface the second.
      errors: [
        ...slugProblems,
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

  return { errors: [...slugProblems, ...dateErrors, ...fieldErrors], content };
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
 * Does this commit message claim to carry `batchId`?
 *
 * A whole LINE has to match, not a substring anywhere in the message. The difference matters
 * because a false positive here is silent: the run decides the work is already published, returns
 * success, and the articles never land. Matching a line means prose that merely quotes a trailer,
 * including this module's own error messages when somebody pastes one into a commit, cannot be
 * mistaken for the trailer itself.
 */
function carriesBatch(message: string, batchId: string): boolean {
  const trailer = batchTrailer(batchId);
  return message.split("\n").some((line) => line.trim() === trailer);
}

/**
 * A stable name for one exact set of article bytes.
 *
 * Stable is the whole requirement: a retry re-derives it from the same payload (Inngest replays
 * the memoized per-article steps, so the model output is identical) and recognises its own work
 * in the history without needing the commit SHA it never received. So this hashes content, not a
 * clock and not a counter.
 *
 * `prepared` here is what the run PUBLISHES, not everything it was handed: the compare-and-swap in
 * step 2a runs first and removes any article that stood down. That keeps the identifier a true name
 * for the commit's contents, and it stays stable across a retry for as long as the stand-down set
 * is, which is exactly as long as it should. Hashing the full payload set instead would name a
 * batch that was never committed, and the retry would then find that name in history and stand down
 * over articles it had never published.
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
 *
 * `readPath` is passed in rather than rebuilt from `config.branch`, so this reads back the same
 * encoded ref the PATCH just wrote to. Building it a second time here would be the one place the
 * encoding could drift, and it would drift silently: a re-read of a DIFFERENT branch that happens
 * to be at the expected SHA would report the update as landed.
 */
async function confirmRefAdvanced(
  config: GitHubConfig,
  readPath: string,
  expectedSha: string,
  batchId: string,
  original: GitHubRequestError,
): Promise<void> {
  let head: string;

  try {
    const after = await githubRequest<{ object: { sha: string } }>(readPath, config);
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
  commitMessage?: string,
  // The wait between attempts at a rate-limited request, injectable so a test can assert the
  // backoff without spending it. Nothing in production passes this.
  options: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<CommitOutcome> {
  if (articles.length === 0) {
    return {
      status: "nothing-to-do",
      batchId: null,
      commitSha: null,
      articles: 0,
      applied: [],
      stoodDown: [],
    };
  }

  // The trailer is how a retry identifies its own work, so a caller does not get to write one. A
  // message carrying a forged or copied `Refresh-Batch:` line would let one batch answer for
  // another, and the failure it produces is the quiet kind: a later batch decides it is already
  // published and returns success having written nothing. Refused here, before any request.
  if (commitMessage?.includes(`${BATCH_TRAILER_KEY}:`)) {
    throw new Error(
      `Refusing a commit message containing a "${BATCH_TRAILER_KEY}:" line. That trailer is how a ` +
        `retry recognises work it already published, and it is derived from the article bytes ` +
        `rather than supplied. Pass a summary without it; the trailer is appended automatically.`,
    );
  }

  const config = getConfig(options);

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
    path: articlePath(article.slug),
    ...validateArticlePayload(article, { today }),
  }));

  const problems = prepared.flatMap((entry) => entry.errors);
  if (problems.length > 0) {
    throw new Error(
      // Not "frontmatter problem(s)": the slug is not a frontmatter field, and a run refused for a
      // bad destination should not be described as having bad frontmatter.
      `Refusing to commit ${problems.length} problem(s) from the automated content refresh. ` +
        `Nothing was written: no blobs were created and ${config.branch} was not advanced.\n` +
        problems.map((problem) => `  - ${problem}`).join("\n"),
    );
  }

  // ── 0b. No two payloads may claim the same file ──────────────────────────
  // This is a property of the batch, not of any one payload, so it cannot live in the per-article
  // validation above. A tree cannot carry two entries for one path: GitHub keeps whichever is
  // listed last and discards the other silently, with a successful commit and no warning anywhere.
  // The batch would look like it refreshed N articles while one of them was thrown away.
  //
  // Because every slug is now validated as lowercase, exact string comparison is the whole check:
  // there is no case-folding collision left for GitHub's filesystem to resolve differently.
  const byPath = new Map<string, string[]>();
  for (const { path, article } of prepared) {
    byPath.set(path, [...(byPath.get(path) ?? []), article.slug]);
  }
  const collisions = [...byPath.entries()].filter(([, slugs]) => slugs.length > 1);
  if (collisions.length > 0) {
    throw new Error(
      `Refusing to commit ${collisions.length} duplicate destination(s) from the automated ` +
        `content refresh: two payloads resolve to the same file, and a commit would keep only ` +
        `one of them. Nothing was written: no blobs were created and ${config.branch} was not ` +
        `advanced.\n` +
        collisions
          .map(([path, slugs]) => `  - ${path} claimed by ${slugs.length} payloads`)
          .join("\n"),
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

  // ── 2a. Compare-and-swap: is each file still the file we generated FROM? ──
  //
  // Everything below replaces `content/articles/<slug>.md` wholesale, and until this existed it did
  // so with no idea what it was replacing. Three facts combine into silent data loss without it:
  //
  //   1. The content being written was generated from `process.cwd()/content/articles` (see
  //      discoverArticles), which in a deployed function is the LAST BUILD's copy of the file, not
  //      whatever is on the branch now.
  //   2. Step 4 builds its tree on `base_tree`, so a path this batch names is replaced outright.
  //      Nothing compares it to what is already there.
  //   3. GITHUB'S OWN PROTECTION DOES NOT COVER THIS, AND IT LOOKS LIKE IT DOES. The PATCH in step
  //      6 omits `force`, which defaults to false, and GitHub's docs say leaving it out "will make
  //      sure you're not overwriting work". That guards the BRANCH POINTER, not file contents.
  //      Replacing somebody's edit to a file while still descending from the commit that made it
  //      is a perfectly good fast-forward, so the ref update succeeds and the edit is gone.
  //
  // The retry is what made it silent rather than merely possible. This runs inside a `step.run` on
  // a function configured `retries: 1` (src/inngest/functions.ts). If an editor's commit lands
  // between step 1 and step 6, the PATCH is refused as a non-fast-forward, the step throws, and
  // Inngest retries. The retry re-reads HEAD, rebuilds on their commit, and applies the same stale
  // bytes, which now IS a fast-forward. Attempt one fails loudly; attempt two overwrites them and
  // reports success.
  //
  // So each payload carries the blob SHA of the file it was generated from, and that has to still
  // be the blob on the branch. Anything else means the file moved underneath this run and this
  // run's version is built on a copy that no longer exists. The article stands down rather than
  // guessing whose version is right; it keeps the newer content and comes back at the next cadence.
  //
  // `?recursive=1` IS LOAD-BEARING AND ITS ABSENCE IS CATASTROPHIC RATHER THAN DEGRADING. Without
  // it GitHub returns only top-level entries, so `content` arrives as a single `type: "tree"` entry
  // and this map gets ZERO article paths. Every article would then stand down, forever, while the
  // run reported success and blamed the articles in the summary email: strictly worse than the bug
  // being fixed. tests/unit/write-path-cas.test.ts pins it, because a mock that ignores the query
  // string cannot tell the two reads apart and this stayed green under exactly that mock once.
  const baseTree = await githubRequest<{
    tree: { path: string; sha: string; type: string; mode: string }[];
    truncated: boolean;
  }>(`/git/trees/${baseTreeSha}?recursive=1`, config);

  // Fail closed. A truncated listing is missing paths, and a missing path is indistinguishable
  // here from a deleted file: both read as "no blob for this article". Standing every article down
  // on that basis would be wrong, and trusting the gap would be the silent overwrite this check
  // exists to prevent, so the batch stops instead. GitHub truncates around 100k entries; this
  // repository has ~700, so if this ever fires something is wrong that a fallback would only hide.
  if (baseTree.truncated) {
    throw new Error(
      `Refusing to commit: GitHub truncated the tree listing for ${baseTreeSha}, so the current ` +
        `blob of each article cannot be established and a stale overwrite could not be detected. ` +
        `Nothing was written: no blobs were created and ${config.branch} was not advanced.`,
    );
  }

  const entryByPath = new Map(baseTree.tree.map((entry) => [entry.path, entry]));

  /** Articles whose file is unchanged since this run read it. These are the ones to write. */
  const writeSet: typeof prepared = [];
  /** Articles whose intended bytes are ALREADY the blob on the branch. Not written, not a problem. */
  const alreadyOnBranch: typeof prepared = [];
  const stoodDown: { slug: string; reason: string }[] = [];

  for (const item of prepared) {
    const { article, path, content } = item;
    const entry = entryByPath.get(path);

    if (entry === undefined) {
      stoodDown.push({
        slug: article.slug,
        reason:
          `${path} no longer exists on ${config.branch}. It was deleted or renamed after this ` +
          `refresh read it, so re-creating it here would silently revert that.`,
      });
      continue;
    }

    // Step 3 hard-codes `mode: "100644"` on the tree entry it writes, so the path must already hold
    // exactly that: a plain, non-executable blob. Anything else and the commit would be changing
    // something it was never asked to change.
    //
    // Three shapes reach this. A submodule (`type: "commit"`) and a symlink (`mode: "120000"`) are
    // not files at all, and the SHA comparison below would be reading an object of a different kind.
    // An executable blob (`mode: "100755"`) IS a file, and is caught for a subtler reason: writing
    // over it would silently clear the executable bit, an edit nobody requested and nothing would
    // report. All 45 articles are 100644 today (verified 2026-08-05), so this cannot fire on the
    // current corpus.
    //
    // Checked by looking the entry UP rather than by filtering the listing, which is what makes this
    // branch reachable from a test. The previous attempt filtered on `type === "blob"`, and deleting
    // that filter left every test green, because a filtered-out entry and an absent one are
    // indistinguishable once the map is built.
    if (entry.type !== "blob" || entry.mode !== "100644") {
      stoodDown.push({
        slug: article.slug,
        reason:
          `${path} on ${config.branch} is not the plain file this refresh writes (type ` +
          `"${entry.type}", mode "${entry.mode}", expected type "blob" mode "100644"). Committing ` +
          `over it would change more than the article's contents.`,
      });
      continue;
    }

    // THE BASE ARM IS TESTED FIRST AND THE ORDER IS LOAD-BEARING.
    //
    // When a refresh produces output byte-identical to its input, the base SHA and the output SHA
    // are THE SAME VALUE and both arms match. Testing output first would label an untouched
    // article "already applied by this run", and a batch of nothing but no-ops would report
    // `already-applied` when the honest answer is `no-changes`. Taking the base arm first makes it
    // an ordinary write that step 4a then collapses to `no-changes` on the tree comparison.
    if (entry.sha === article.baseBlobSha) {
      writeSet.push(item);
      continue;
    }

    // The branch already holds exactly what this run intended to write, so an earlier attempt of
    // this run published it. That is NOT a conflict, and calling it one is the defect that stopped
    // the previous attempt shipping: after a partial batch, the retry would find its own bytes on
    // every path it had committed, match no base SHA, mark them all conflicted, and email
    // "0 updated / N failed" for work that committed and deployed correctly. This arm is what
    // preserves the distinction #39 exists to make.
    if (entry.sha === gitBlobSha(content)) {
      alreadyOnBranch.push(item);
      continue;
    }

    stoodDown.push({
      slug: article.slug,
      reason:
        `${path} changed on ${config.branch} after this refresh read it (expected blob ` +
        `${article.baseBlobSha.slice(0, 7)}, found ${entry.sha.slice(0, 7)}). Committing would ` +
        `overwrite that newer version with content generated from the older one, so this article ` +
        `stood down and keeps the newer version.`,
    });
  }

  // Everything this run is responsible for publishing: what it will write, plus what an earlier
  // attempt already wrote. Deliberately excludes stand-downs, which nothing published.
  const published = [...writeSet, ...alreadyOnBranch];

  if (published.length === 0) {
    return {
      status: "stood-down",
      batchId: null,
      commitSha: null,
      articles: articles.length,
      applied: [],
      stoodDown,
    };
  }

  // ── 2b. Batch identity, and did an earlier attempt already publish it? ────
  //
  // BOTH OF THESE MOVED HERE FROM AHEAD OF STEP 1, AND THE MOVE IS REQUIRED RATHER THAN TIDYING.
  // #39 derives the batch identity from the exact bytes being committed, which is what lets a
  // retry recognise its own work. Before the compare-and-swap existed, that set was always every
  // payload. Now it is not: a batch can commit a SUBSET of what it was handed.
  //
  // Left where it was, the id would be hashed over payloads that were never committed, and the
  // failure is the quiet kind. Attempt one stands article A down and commits {B,C} under a trailer
  // naming {A,B,C}; the retry re-derives that same id from the same payloads, finds the trailer
  // before reading any tree, and returns `already-applied` with nothing to report. A never appears
  // anywhere, and the summary email lists it as refreshed.
  //
  // Hashing over `published` fixes both halves at once: the trailer names what is actually on the
  // branch, and it stays STABLE across a retry for as long as the stand-down set is stable, which
  // is exactly when it should.
  //
  // #39's guarantee is unharmed. What it promises is that already-applied work is recognised
  // BEFORE A BLOB IS CREATED, not before any request at all, and reading a tree creates nothing.
  //
  // AND THE TRAILER NO LONGER DECIDES WHETHER TO WRITE. It answers a narrower question now, and
  // only once step 2a has established there is nothing to write.
  //
  // A trailer in history proves a commit carrying these bytes EXISTED. It says nothing about what
  // the branch holds today, and the two answers come apart the moment anything moves a file back.
  // Raised by review and reproduced: attempt one commits and loses its reply badly enough to throw,
  // the article is then restored to its pre-refresh bytes, and the retry arrives. Step 2a correctly
  // puts the article in the write set; a trailer scan allowed to override that returns
  // `already-applied` and writes nothing, so the run reports the refresh as published while the
  // branch holds the old content. That is this module's own failure mode wearing a different hat.
  //
  // So the bytes decide, and the trailer is consulted only to name WHICH commit carries them, which
  // is the one thing the bytes cannot say. Nothing is lost: whenever there is work to do, doing it
  // is right regardless of what history claims. Skipping the scan on the ordinary path also saves a
  // request per run.
  const batchId = computeBatchId(
    published.map(({ article, content }) => ({ slug: article.slug, content }))
  );
  const appliedSlugs = published.map(({ article }) => article.slug);

  if (writeSet.length === 0) {
    // Every surviving article's bytes are ALREADY the blob on the branch, so there is nothing to
    // write whatever history says. The only open question is which commit put them there.
    const recentCommits = await githubRequest<{ sha: string; commit: { message: string } }[]>(
      `/commits?sha=${encodeURIComponent(latestCommitSha)}&per_page=${BATCH_LOOKBACK}`,
      config
    );
    const carrier = recentCommits.find((entry) => carriesBatch(entry.commit.message, batchId));
    // No trailer in the window means the commit is unknown, not that the bytes are absent. HEAD is
    // reported rather than a SHA invented.
    return {
      status: "already-applied",
      batchId,
      commitSha: carrier?.sha ?? latestCommitSha,
      articles: articles.length,
      applied: appliedSlugs,
      stoodDown,
    };
  }

  // ── 3. Create blobs for each updated article ─────────────────────────────
  // Uses the content validated in step 0, never a re-serialization of it: serializing twice would
  // mean the bytes that were checked are not necessarily the bytes that get committed. Same
  // reasoning for `path`, which is the one built and checked for collisions in step 0b rather than
  // a second interpolation of the slug.
  //
  // Over the write set, not over `prepared`: an article that stood down must not have its bytes
  // laid over the newer version, which is the entire point of step 2a, and one already on the
  // branch would cost a request to produce a blob that is already there.
  const blobs = await Promise.all(
    writeSet.map(async ({ path, content }) => {
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
        path,
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
    return {
      status: "no-changes",
      batchId,
      commitSha: latestCommitSha,
      articles: articles.length,
      applied: appliedSlugs,
      stoodDown,
    };
  }

  // ── 5. Create the commit ──────────────────────────────────────────────────
  const commitDate = new Date().toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  // writeSet.length, not articles.length: an article that stood down at step 2a is not in this
  // commit, and a message counting it would misdescribe the commit's own contents in git history.
  const summary = commitMessage
    ?? `chore: content refresh, ${writeSet.length} article(s) updated (${commitDate})`;
  // The trailer goes on every commit this function makes, including one with a caller-supplied
  // message, because step 2b of the NEXT attempt is the only thing that can see it.
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
      refPaths.update,
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
    await confirmRefAdvanced(config, refPaths.read, newCommit.sha, batchId, error);
  }

  return {
    status: "committed",
    batchId,
    commitSha: newCommit.sha,
    articles: articles.length,
    applied: appliedSlugs,
    stoodDown,
  };
}
