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
 *
 * Two things are checked, because a commit is two decisions: WHAT is written (the serialized bytes,
 * whose dates are stamped and then validated) and WHERE it is written (the slug, which becomes the
 * path of a tree entry and is validated against SLUG_PATTERN, bound to the frontmatter slug, and
 * checked for collisions across the batch).
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
function slugErrors(article: ArticleCommitPayload): string[] {
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
 * `faqs`: src/inngest/functions.ts pins slug, category, tier and relatedSlugs back to the original
 * article and takes those three from model output verbatim. They cannot be stamped the way a date
 * can, because unlike a date the pipeline has no correct value to substitute, which is the whole
 * reason this is a validate-and-skip rather than an overwrite. Before this existed they were the
 * one part of a refreshed article that reached `main` with nothing in front of it at all.
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
  article: ArticleCommitPayload,
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
  commitMessage?: string
): Promise<CommitOutcome> {
  if (articles.length === 0) {
    return { status: "nothing-to-do", batchId: null, commitSha: null, articles: 0 };
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

  // Computed only once the batch is known to name distinct files, so the identity of a batch is
  // never derived from one that would have been refused anyway.
  const batchId = computeBatchId(
    prepared.map(({ article, content }) => ({ slug: article.slug, content }))
  );

  // ── 1. Get current HEAD commit SHA ───────────────────────────────────────
  const refPaths = branchRefPaths(config.branch);
  const refData = await githubRequest<{ object: { sha: string } }>(
    refPaths.read,
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
    carriesBatch(entry.commit.message, batchId)
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
  // mean the bytes that were checked are not necessarily the bytes that get committed. Same
  // reasoning for `path`, which is the one built and checked for collisions in step 0b rather than
  // a second interpolation of the slug.
  const blobs = await Promise.all(
    prepared.map(async ({ path, content }) => {
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

  return { status: "committed", batchId, commitSha: newCommit.sha, articles: articles.length };
}
