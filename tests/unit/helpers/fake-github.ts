import { beforeEach, afterEach, vi } from "vitest";
import { createHash } from "crypto";
import { gitBlobSha } from "@/lib/gitBlobSha";

/**
 * The fake Git Data API, shared by every suite that drives commitRefreshedArticles.
 *
 * Extracted from tests/unit/write-path-dates.test.ts rather than copied. A second hand-rolled fake
 * is a second model of the same API, and the copy that drifts is the one nobody is looking at: a
 * stub that answers an endpoint with the wrong SHAPE does not fail honestly, it fails as a
 * confusing TypeError inside production code. One fake, imported by all of them.
 *
 * Not named *.test.ts on purpose: the unit project collects tests by that suffix, so a helper
 * carrying no tests would otherwise be reported as an empty suite.
 */

/** The day these suites pin the clock to, so a batch identifier is stable across runs. */
export const TODAY = "2026-08-04";

// ─── A fake Git Data API ──────────────────────────────────────────────────────

export const OWNER = "Franscale1922";
export const REPO = "waypoint-core-system";

export function shortHash(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 12);
}

export function jsonResponse(
  status: number,
  payload: unknown,
  // Real responses always carry headers, and the production code reads them to tell a rate-limit
  // refusal from a permanent one. A double without them would make every 403 look permanent, so
  // this always provides a Headers, empty by default.
  headers: Record<string, string> = {},
): Response {
  const lower = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name: string) => lower.get(name.toLowerCase()) ?? null },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

/**
 * A small, STATEFUL stand-in for the Git Data API.
 *
 * A flat stub cannot express the thing under test. The double-commit bug is a property of two runs
 * against one server: attempt one advances the branch, attempt two has to notice. So this keeps
 * real state — blobs, trees, commits, a branch pointer — and, critically, addresses trees BY
 * CONTENT the way Git does, so laying a blob that is already present over a base tree returns the
 * base tree's own SHA. That is what the production code's "would this commit change anything"
 * check reads, and modelling it here is what makes that test mean something.
 *
 * Commit SHAs are a counter, not a content hash, deliberately: a real second commit of identical
 * content gets a different SHA (its timestamp and parent differ), and the counter reproduces that.
 * `createdCommits` is therefore the number the retry tests are really about.
 */
export function createFakeGitHub(initialFiles: Record<string, string> = {}) {
  const blobs = new Map<string, string>();
  const trees = new Map<string, Record<string, string>>();
  const commits = new Map<string, { tree: string; message: string; parents: string[] }>();

  const treeShaOf = (entries: Record<string, string>) =>
    `tree-${shortHash(Object.keys(entries).sort().map((p) => `${p}:${entries[p]}`).join("\n"))}`;

  const baseEntries: Record<string, string> = {};
  for (const [path, content] of Object.entries(initialFiles)) {
    // REAL git blob object IDs, not a convenient stand-in. The compare-and-swap in
    // commitRefreshedArticles compares a locally computed `gitBlobSha` against what it reads back
    // from a tree, so a fake that invented its own SHA scheme would make every article look changed
    // and no test could distinguish a working check from a broken one.
    const sha = gitBlobSha(content);
    blobs.set(sha, content);
    baseEntries[path] = sha;
  }

  /** Per-path overrides so a test can put something that is not a regular file at a path. */
  const entryOverrides = new Map<string, { type?: string; mode?: string; sha?: string }>();
  let truncated = false;
  const baseTree = treeShaOf(baseEntries);
  trees.set(baseTree, baseEntries);
  commits.set("commit-base", { tree: baseTree, message: "base commit", parents: [] });

  let head = "commit-base";
  let commitSeq = 0;
  let editSeq = 0;

  async function handle(url: string | URL, init: RequestInit = {}): Promise<Response> {
    const parsed = new URL(String(url));
    const path = parsed.pathname.replace(`/repos/${OWNER}/${REPO}`, "");
    const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined;

    if (method === "GET" && path.startsWith("/git/ref/heads/")) {
      return jsonResponse(200, { object: { sha: head } });
    }

    if (method === "GET" && path === "/commits") {
      const from = parsed.searchParams.get("sha") ?? head;
      const limit = Number(parsed.searchParams.get("per_page") ?? "30");
      const out: { sha: string; commit: { message: string } }[] = [];
      let cursor: string | undefined = from;
      while (cursor && out.length < limit) {
        const commit: { tree: string; message: string; parents: string[] } | undefined =
          commits.get(cursor);
        if (!commit) break;
        out.push({ sha: cursor, commit: { message: commit.message } });
        cursor = commit.parents[0];
      }
      return jsonResponse(200, out);
    }

    if (method === "GET" && path.startsWith("/git/commits/")) {
      const sha = path.slice("/git/commits/".length);
      const commit = commits.get(sha);
      if (!commit) return jsonResponse(404, { message: "Not Found" });
      return jsonResponse(200, { sha, tree: { sha: commit.tree } });
    }

    // Reading a tree. THE `recursive` QUERY PARAMETER IS HONOURED, and that is the entire reason
    // this handler is worth having rather than stubbing.
    //
    // Real GitHub returns only TOP-LEVEL entries without it, so `content/articles/x.md` is not in
    // the listing at all: `content` is, as a single `type: "tree"` entry. A fake that ignored the
    // query string, as the previous attempt's did, answers both reads identically, and dropping
    // `?recursive=1` from production then leaves every test green while the refresh silently stops
    // writing anything. Modelling the difference is what makes that mutation detectable.
    if (method === "GET" && path.startsWith("/git/trees/")) {
      const sha = path.slice("/git/trees/".length);
      const entries = trees.get(sha);
      if (!entries) return jsonResponse(404, { message: "Not Found" });

      const decorate = (p: string, blobSha: string) => ({
        path: p,
        mode: "100644",
        type: "blob",
        sha: blobSha,
        ...(entryOverrides.get(p) ?? {}),
      });

      let tree: { path: string; mode: string; type: string; sha: string }[];

      if (parsed.searchParams.get("recursive")) {
        // Directories appear in a recursive listing too, exactly as git reports them.
        const dirs = new Set<string>();
        for (const p of Object.keys(entries)) {
          const parts = p.split("/");
          for (let i = 1; i < parts.length; i += 1) dirs.add(parts.slice(0, i).join("/"));
        }
        tree = [
          ...[...dirs].map((d) => ({
            path: d,
            mode: "040000",
            type: "tree",
            sha: `tree-dir-${shortHash(d)}`,
          })),
          ...Object.entries(entries).map(([p, blobSha]) => decorate(p, blobSha)),
        ];
      } else {
        const top = new Map<string, { path: string; mode: string; type: string; sha: string }>();
        for (const [p, blobSha] of Object.entries(entries)) {
          const [head, ...rest] = p.split("/");
          if (rest.length === 0) top.set(head, decorate(p, blobSha));
          else if (!top.has(head)) {
            top.set(head, {
              path: head,
              mode: "040000",
              type: "tree",
              sha: `tree-dir-${shortHash(head)}`,
            });
          }
        }
        tree = [...top.values()];
      }

      return jsonResponse(200, { sha, tree, truncated });
    }

    if (method === "POST" && path === "/git/blobs") {
      const content = Buffer.from(body.content, "base64").toString("utf-8");
      const sha = gitBlobSha(content);
      blobs.set(sha, content);
      return jsonResponse(201, { sha });
    }

    if (method === "POST" && path === "/git/trees") {
      const entries = { ...(trees.get(body.base_tree) ?? {}) };
      for (const entry of body.tree) entries[entry.path] = entry.sha;
      const sha = treeShaOf(entries);
      trees.set(sha, entries);
      return jsonResponse(201, { sha });
    }

    if (method === "POST" && path === "/git/commits") {
      const sha = `commit-${++commitSeq}`;
      commits.set(sha, { tree: body.tree, message: body.message, parents: body.parents });
      return jsonResponse(201, { sha });
    }

    if (method === "PATCH" && path.startsWith("/git/refs/heads/")) {
      head = body.sha;
      return jsonResponse(200, { object: { sha: head } });
    }

    throw new Error(`fake GitHub: unhandled ${method} ${path}`);
  }

  return {
    handle,
    get head() { return head; },
    /** How many commit OBJECTS were created. The retry tests exist to keep this at 1. */
    get createdCommits() { return commitSeq; },
    /** Make the next tree read report a truncated listing, which must fail the batch closed. */
    setTruncated: (value: boolean) => { truncated = value; },
    /**
     * Put something other than a regular file at a path: a submodule (`type: "commit"`) or a
     * symlink (`mode: "120000"`). Git can hold either at a path an article expects to occupy.
     */
    setTreeEntry: (path: string, entry: { type?: string; mode?: string; sha?: string }) => {
      entryOverrides.set(path, entry);
    },
    /** Overwrite a file directly, as a concurrent human editor would. Returns its new blob SHA. */
    writeFile: (path: string, content: string) => {
      const sha = gitBlobSha(content);
      blobs.set(sha, content);
      const entries = { ...(trees.get(commits.get(head)!.tree) ?? {}), [path]: sha };
      const treeSha = treeShaOf(entries);
      trees.set(treeSha, entries);
      // A SEPARATE counter from `commitSeq`. `createdCommits` means "commits the production code
      // created", and the retry tests exist to hold it at 1; letting a simulated human edit bump it
      // would quietly break the one number those tests are about.
      const commitSha = `commit-edit-${++editSeq}`;
      commits.set(commitSha, { tree: treeSha, message: `edit ${path}`, parents: [head] });
      head = commitSha;
      return sha;
    },
    messageOf: (sha: string) => commits.get(sha)?.message,
    fileAt: (commitSha: string, path: string) => {
      const commit = commits.get(commitSha);
      const entries = commit ? trees.get(commit.tree) ?? {} : {};
      const blobSha = entries[path];
      return blobSha === undefined ? undefined : blobs.get(blobSha);
    },
  };
}

export type FakeGitHub = ReturnType<typeof createFakeGitHub>;

// ─── Seeding the branch a commit runs against ─────────────────────────────────
//
// Every payload now carries the blob SHA of the file it was generated from, and the commit refuses
// to overwrite a path whose blob does not match. So a batch can only commit against a branch that
// actually HOLDS those files: an empty fake makes every article stand down, which is correct
// behaviour and useless as a fixture. These three keep that setup to one line per suite and, more
// importantly, keep the seeded bytes and the payload's SHA derived from ONE source, so they cannot
// drift apart and turn a real regression into a fixture bug.

/** Plausible prior contents of an article file. The bytes do not matter; their identity does. */
export function baseArticleFile(slug: string): string {
  return `---\ntitle: Previously published ${slug}\nslug: ${slug}\n---\n\nThe version already on the branch.\n`;
}

/** A seed map for `createFakeGitHub`, covering every slug a batch is about to write. */
export function seedArticles(...slugs: string[]): Record<string, string> {
  return Object.fromEntries(
    slugs.map((slug) => [`content/articles/${slug}.md`, baseArticleFile(slug)]),
  );
}

/** The `baseBlobSha` a payload must carry to match what `seedArticles` put on the branch. */
export function baseBlobShaFor(slug: string): string {
  return gitBlobSha(baseArticleFile(slug));
}

export const methodOf = (init?: RequestInit) => init?.method ?? "GET";
export const pathOf = (url: unknown) => new URL(String(url)).pathname;

/** Shared env + module hygiene for every block that drives commitRefreshedArticles. */
export function useGitHubEnv() {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env.GITHUB_TOKEN = "test-token";
    process.env.GITHUB_REPO_OWNER = OWNER;
    process.env.GITHUB_REPO_NAME = REPO;
    process.env.GITHUB_BRANCH = "main";
    // The stamped date is part of the committed bytes and therefore part of the batch identifier.
    // Pinning the clock is what lets a test assert that two runs derive the SAME id — the real
    // property, which a test straddling midnight would flake on.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(`${TODAY}T12:00:00.000Z`));
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.doUnmock("@/lib/frontmatterDates.mjs");
  });
}
