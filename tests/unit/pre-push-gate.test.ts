/**
 * pre-push-gate.test.ts
 *
 * Pins the fix for the pre-push false-green: .githooks/pre-push used to run its
 * checks against the mutable WORKING TREE rather than against the commits being
 * pushed, so a violation that was committed and then repaired in the working
 * tree sailed through while git pushed the bad blob.
 *
 * Real git, real pushes, real child processes. The exit code IS the contract:
 * git decides whether to push on the hook's status, and nothing in-process can
 * observe that. The remote is a local bare repo, so pushes are genuine but
 * offline.
 *
 * The load-bearing case is `blocks a committed violation ...` together with its
 * control. Asserting only that the new hook blocks would pass by construction
 * if the fixture were simply broken and everything blocked, so the same fixture
 * is also run against a hook that checks the working tree, which must ALLOW it.
 * That is the bug, reproduced, as the baseline the fix is measured against.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const NEW_HOOK_DIR = join(REPO_ROOT, ".githooks");

// U+2014 by codepoint. aeo-audit bans literal em dashes in src/ and builds its
// own the same way (aeo-audit.mjs:148); writing one here would be a landmine if
// that scan ever widens to tests/.
const EMDASH = String.fromCharCode(0x2014);

const ARTICLE = "content/articles/gate-probe.md";

/**
 * The real install, found the way Node itself finds it.
 *
 * This used to be `join(process.cwd(), "node_modules")`, on the reasoning that vitest runs from a
 * checkout that necessarily has one. A git worktree breaks that: it gets its own `node_modules/`
 * containing nothing but Vitest's `.vite` cache, so the path existed, the fixture below was lent an
 * empty directory, and the control hook died with ERR_MODULE_NOT_FOUND. Since the control asserts
 * exit 0, the failure surfaced as an unrelated-looking assertion about a push that should have
 * succeeded. (Reproduced 2026-08-04: 9 of these cases failed in a worktree, on main, with no source
 * change involved.)
 *
 * Probing for a package rather than for the directory is the part that matters; walking up is what
 * reaches the main checkout's install from a worktree several levels below it. scripts/
 * verify-pushed-tree.mjs resolves it the same way, for the same reason.
 */
function locateNodeModules(start: string): string | null {
  let dir = resolve(start);
  for (;;) {
    const candidate = join(dir, "node_modules");
    if (existsSync(join(candidate, "gray-matter"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const NODE_MODULES = locateNodeModules(process.cwd());
const TIMEOUT = 180_000;

/**
 * These cases need a real git repository to seed from, and there is one place
 * they will not get it: inside the gate itself.
 *
 * The hook extracts the pushed commit into a temp dir with `git archive` and
 * runs this suite there, and an extracted tree has no .git. Without this guard
 * the seed would throw and every push in the repo would be blocked by the very
 * test that proves the gate works. Skipping is also the right answer on the
 * merits: verifying the gate from inside the gate proves nothing, and it would
 * add roughly 8 seconds to every push. The suite still runs in `npm test`, in
 * CI, and in any ordinary checkout.
 */
const IN_GIT_REPO =
  spawnSync("git", ["rev-parse", "--is-inside-work-tree"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    timeout: 30_000,
    // Must not inherit. Git exports GIT_DIR to its hooks, and the gate passes
    // its environment down to vitest, so an inherited GIT_DIR would answer this
    // question from the REAL repository while cwd is an extracted tree with no
    // .git at all. The guard would then never fire, which is the one case it
    // exists for. gitEnv() is not usable here: this runs at module load, before
    // fakeHome exists.
    env: { PATH: process.env.PATH ?? "", GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_SYSTEM: "/dev/null" },
  }).status === 0;

let base: string;
let repo: string;
let remote: string;
let fakeHome: string;
let oldHookDir: string;
let seedSha: string;

/**
 * A stand-in for the pre-fix hook: check the WORKING TREE, ignore stdin.
 *
 * Written inline rather than recovered with `git show <sha>:.githooks/pre-push`
 * so the control cannot rot as history moves. What the control has to encode is
 * the old DESIGN, not one historical revision of it, and this is that design in
 * one line.
 */
const WORKING_TREE_HOOK = "#!/bin/sh\nexec node scripts/aeo-audit.mjs\n";

/**
 * A minimal but VALID article. Neither field is decorative: aeo-audit fails an
 * article whose excerpt it cannot parse, and verify-dates fails one with no
 * quoted date. Either omission makes every case in this file fail for the wrong
 * reason, and the em-dash assertions would then prove nothing.
 */
function article(body: string) {
  return `---\ntitle: "Gate Probe"\nexcerpt: "A short probe excerpt for the pre-push gate fixture."\ndate: "2026-08-04"\n---\n\n${body}\n`;
}

/**
 * A git environment built from nothing, never inherited.
 *
 * EVERY git call in this file must use this, not just the convenient ones. Git
 * exports GIT_DIR when it runs a hook, and this suite runs inside that hook,
 * because the gate executes the unit suites. An inherited GIT_DIR takes
 * precedence over `cwd`, so an un-scrubbed call silently addresses the REAL
 * repository instead of the fixture.
 *
 * That is not hypothetical. Two cases here passed standalone and failed the
 * moment they ran under the gate, because `git show` against the fixture's bare
 * remote was answering from the real repo and reporting "branch not found".
 *
 * Building the env from scratch also keeps the developer's own config out: a
 * personal core.hooksPath, commit.gpgsign or template dir would each change
 * what these cases measure.
 */
function gitEnv(extra: Record<string, string> = {}) {
  return {
    PATH: process.env.PATH ?? "",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    // A HOME with no Projects/brand-intelligence-pipeline, so the brand-map
    // drift check takes its documented absent-repo skip instead of hard
    // failing. Deliberately NOT SKIP_BIP_DRIFT=1, which would also disarm the
    // drift test that shares that variable.
    HOME: fakeHome,
    ...extra,
  };
}

function git(args: string[], env: Record<string, string> = {}, cwd = repo) {
  return spawnSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: TIMEOUT,
    env: gitEnv(env),
  });
}

/** Push HEAD to a fresh remote branch through `hookDir`, returning code + output. */
function pushThrough(hookDir: string, branch: string, env: Record<string, string> = {}) {
  git(["config", "core.hooksPath", hookDir]);
  const r = git(["push", "origin", `HEAD:refs/heads/${branch}`], env);
  return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

/** What actually landed on the remote: the only unfakeable answer. */
function emDashesOnRemote(branch: string, path = ARTICLE) {
  const r = spawnSync("git", ["show", `refs/heads/${branch}:${path}`], {
    cwd: remote,
    encoding: "utf8",
    timeout: TIMEOUT,
    env: gitEnv(),
  });
  if (r.status !== 0) return null;
  return (r.stdout.match(new RegExp(EMDASH, "g")) ?? []).length;
}

function resetToSeed() {
  git(["reset", "--hard", seedSha]);
  git(["clean", "-fdq"]);
}

function commitAll(message: string) {
  git(["add", "-A"]);
  git(["commit", "-qm", message]);
}

beforeAll(() => {
  if (!IN_GIT_REPO) return;
  base = mkdtempSync(join(realpathSync(tmpdir()), "prepush-gate-"));
  repo = join(base, "repo");
  remote = join(base, "remote.git");
  fakeHome = join(base, "home");
  oldHookDir = join(base, "oldhooks");
  mkdirSync(repo);
  mkdirSync(fakeHome);
  mkdirSync(oldHookDir);

  writeFileSync(join(oldHookDir, "pre-push"), WORKING_TREE_HOOK);
  chmodSync(join(oldHookDir, "pre-push"), 0o755);

  spawnSync("git", ["init", "--bare", "-q", remote], { timeout: TIMEOUT, env: gitEnv() });

  // Seed from the real tree so the checks have their real inputs and the
  // orchestrator's floor guard is satisfied. brands/ is excluded: ~989MB of
  // PDFs that no check reads.
  const tarball = join(base, "seed.tar");
  const archived = spawnSync("git", ["archive", "--output", tarball, "HEAD", "--", ":(exclude)brands"], {
    cwd: REPO_ROOT,
    timeout: TIMEOUT,
    env: gitEnv(),
  });
  if (archived.status !== 0) throw new Error("could not seed the fixture from HEAD");
  spawnSync("tar", ["-xf", tarball, "-C", repo], { timeout: TIMEOUT });

  git(["init", "-q"]);
  git(["config", "user.email", "gate@example.invalid"]);
  git(["config", "user.name", "Gate Test"]);
  git(["remote", "add", "origin", remote]);
  // `git add -A` is safe here and only here: a fresh mktemp dir whose only
  // contents are the tarball just extracted.
  commitAll("seed");
  seedSha = git(["rev-parse", "HEAD"]).stdout.trim();

  // Lend the fixture the real node_modules. Not a convenience: aeo-audit and
  // verify-dates import gray-matter and typescript since PR #23, so without it
  // even the working-tree control hook dies with ERR_MODULE_NOT_FOUND and the
  // bidirectional comparison measures nothing. Ignored by the seeded .gitignore,
  // so it never enters a commit.
  if (NODE_MODULES !== null && !existsSync(join(repo, "node_modules"))) {
    symlinkSync(NODE_MODULES, join(repo, "node_modules"), "dir");
  }
}, TIMEOUT);

afterAll(() => {
  if (base) rmSync(base, { recursive: true, force: true });
});

describe.skipIf(!IN_GIT_REPO)("pre-push gate: the pushed commit, not the working tree", () => {
  it(
    "blocks a committed violation that has been repaired only in the working tree",
    () => {
      resetToSeed();
      writeFileSync(join(repo, ARTICLE), article(`A line with an ${EMDASH} em dash.`));
      commitAll("commit an em dash");
      // Repair the working tree WITHOUT committing. This is the exact scenario.
      writeFileSync(join(repo, ARTICLE), article("A line with an - en dash."));

      // Control: a working-tree-checking hook sees the clean copy and allows it,
      // and the bad blob reaches the remote. Without this the assertion below
      // would pass even against a fixture that blocked everything.
      const before = pushThrough(oldHookDir, "control");
      expect(before.code).toBe(0);
      // The unfakeable assertion: not that it printed something reassuring, but
      // that the bad blob actually reached the remote.
      expect(emDashesOnRemote("control")).toBe(1);

      // The fix: same commit, same dirty working tree, blocked.
      const after = pushThrough(NEW_HOOK_DIR, "fixed", { SKIP_UNIT_TESTS: "1" });
      expect(after.code).not.toBe(0);
      expect(after.out).toContain("em dash");
      expect(emDashesOnRemote("fixed")).toBeNull();
    },
    TIMEOUT,
  );

  it(
    "allows a clean commit even when the working tree holds a violation",
    () => {
      resetToSeed();
      writeFileSync(join(repo, ARTICLE), article("A clean line."));
      commitAll("clean commit");
      // Dirty the working tree AFTER committing. The gate must judge the commit,
      // not the union of commit and working tree, or every unrelated edit in
      // flight would block a legitimate push.
      writeFileSync(join(repo, ARTICLE), article(`Dirty ${EMDASH} only here.`));

      const r = pushThrough(NEW_HOOK_DIR, "mirror", { SKIP_UNIT_TESTS: "1" });
      expect(r.code).toBe(0);
      expect(emDashesOnRemote("mirror")).toBe(0);
    },
    TIMEOUT,
  );
});

describe.skipIf(!IN_GIT_REPO)("pre-push gate: reads stdin, and covers the whole push", () => {
  it(
    "blocks a violation in an INTERMEDIATE commit, not just the tip",
    () => {
      resetToSeed();
      // A introduces the violation, B repairs it. A tip-only gate reports green
      // and A's bad blob lands on the remote anyway: the original bug wearing a
      // different hat, and the common case, since most branches have >1 commit.
      writeFileSync(join(repo, ARTICLE), article(`Intermediate ${EMDASH} violation.`));
      commitAll("A: introduce an em dash");
      writeFileSync(join(repo, ARTICLE), article("Repaired in the next commit."));
      commitAll("B: repair it");

      const r = pushThrough(NEW_HOOK_DIR, "range", { SKIP_UNIT_TESTS: "1" });
      expect(r.code).not.toBe(0);
      expect(r.out).toContain("em dash");
      expect(emDashesOnRemote("range")).toBeNull();
    },
    TIMEOUT,
  );

  it(
    "verifies the SHA it is given, not whatever HEAD happens to be",
    () => {
      resetToSeed();
      // Every other case pushes HEAD, so all of them would still pass against a
      // hook that ignored stdin and ran `git rev-parse HEAD`. That is the whole
      // mechanism, so it needs a case where the two differ: push an older commit
      // explicitly while HEAD sits on a clean one.
      writeFileSync(join(repo, ARTICLE), article(`Bad ${EMDASH} commit.`));
      commitAll("bad commit");
      const badSha = git(["rev-parse", "HEAD"]).stdout.trim();
      writeFileSync(join(repo, ARTICLE), article("Clean tip."));
      commitAll("clean commit on top");

      git(["config", "core.hooksPath", NEW_HOOK_DIR]);
      const r = git(["push", "origin", `${badSha}:refs/heads/explicit-sha`], { SKIP_UNIT_TESTS: "1" });
      const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      expect(r.status).not.toBe(0);
      expect(out).toContain("em dash");
    },
    TIMEOUT,
  );
});

describe.skipIf(!IN_GIT_REPO)("pre-push gate: refuses to pass vacuously", () => {
  it(
    "blocks when the extraction is incomplete rather than reporting green",
    () => {
      resetToSeed();
      // export-ignore makes `git archive` drop paths that `git ls-tree` still
      // counts. That is the real mechanism the count guard exists to catch, and
      // it matters because three of aeo-audit's four checks degrade SILENTLY to
      // PASS when their input directory is absent (existsSync guards at
      // aeo-audit.mjs:110, 153, 238).
      writeFileSync(join(repo, ".gitattributes"), "content/articles/ export-ignore\n");
      commitAll("add export-ignore");

      const r = pushThrough(NEW_HOOK_DIR, "vacuous", { SKIP_UNIT_TESTS: "1" });
      expect(r.code).not.toBe(0);
      expect(r.out).toContain("extracted tree");
      // The specific failure must be the count guard, not a downstream check
      // that happened to notice. If this ever reads "PASS", the guard is dead.
      expect(r.out).not.toContain("PASS");
    },
    TIMEOUT,
  );

  it(
    "blocks a commit that redirects a checked path outside the tree",
    () => {
      resetToSeed();
      // Both other guards are blind to this. git ls-tree counts a symlink blob
      // as one entry, so the count still balances, and existsSync FOLLOWS the
      // link, so the floor check is satisfied by a directory somewhere else on
      // the machine. Measured before the fix: committing content/articles as a
      // symlink held the count at 419 = 419 and passed the floor check, leaving
      // the audit reading content no clone would ever have.
      const decoy = join(base, "decoy-articles");
      mkdirSync(decoy, { recursive: true });
      writeFileSync(join(decoy, "ok.md"), article("Clean decoy content."));
      git(["rm", "-rq", "content/articles"]);
      symlinkSync(decoy, join(repo, "content", "articles"), "dir");
      commitAll("point content/articles outside the tree");

      const r = pushThrough(NEW_HOOK_DIR, "symlink", { SKIP_UNIT_TESTS: "1" });
      expect(r.code).not.toBe(0);
      expect(r.out).toContain("symlinks pointing outside the tree");
    },
    TIMEOUT,
  );

  it(
    "blocks a commit whose tree predates the checks instead of crashing",
    () => {
      resetToSeed();
      git(["rm", "-rq", "tests/unit", "tests/auth"]);
      commitAll("remove the test suites");

      const r = pushThrough(NEW_HOOK_DIR, "floors", { SKIP_UNIT_TESTS: "1" });
      expect(r.code).not.toBe(0);
      expect(r.out).toContain("does not contain everything the checks need");
      expect(r.out).toContain("tests/unit");
    },
    TIMEOUT,
  );

  it(
    "fails closed on an unreadable commit rather than exiting 0 having done nothing",
    () => {
      // `git archive <bad> | tar -x` exits 0 with zero files extracted, because
      // a pipeline reports only the last command's status and bsdtar accepts an
      // empty archive. The orchestrator must not be built that way.
      const r = spawnSync(
        process.execPath,
        [join(REPO_ROOT, "scripts", "verify-pushed-tree.mjs"), "deadbeefdeadbeefdeadbeefdeadbeefdeadbeef"],
        { cwd: repo, encoding: "utf8", timeout: TIMEOUT, env: { PATH: process.env.PATH ?? "", HOME: fakeHome } },
      );
      expect(r.status).toBe(1);
      expect(`${r.stdout}${r.stderr}`).toContain("PUSH BLOCKED");
    },
    TIMEOUT,
  );

  it(
    "refuses to report success when handed nothing to verify",
    () => {
      const r = spawnSync(process.execPath, [join(REPO_ROOT, "scripts", "verify-pushed-tree.mjs")], {
        cwd: repo,
        encoding: "utf8",
        timeout: TIMEOUT,
        env: { PATH: process.env.PATH ?? "", HOME: fakeHome },
      });
      expect(r.status).toBe(2);
      expect(`${r.stdout}${r.stderr}`).toContain("Refusing to report success");
    },
    TIMEOUT,
  );
});

describe.skipIf(!IN_GIT_REPO)("pre-push gate: runs the pushed tree's own checkers", () => {
  it(
    "invokes the committed build-brand-map, not the working tree's copy",
    () => {
      resetToSeed();
      // build-brand-map.mjs derives its root from its own location (:56), so
      // changing directory does NOT redirect it. If the orchestrator ran the
      // INSTALLED copy, it would compare the wrong repo's map and silently
      // validate a tree that was never checked. Committing a sentinel that
      // always fails, while leaving the working tree's copy pristine, is the
      // only way to tell which one actually ran.
      writeFileSync(
        join(repo, "scripts", "build-brand-map.mjs"),
        'console.error("SENTINEL_COMMITTED_COPY_RAN"); process.exit(1);\n',
      );
      commitAll("commit a failing brand-map checker");
      git(["checkout", seedSha, "--", "scripts/build-brand-map.mjs"]);
      git(["reset", "-q"]);

      const r = pushThrough(NEW_HOOK_DIR, "selfcheck", { SKIP_UNIT_TESTS: "1" });
      expect(r.code).not.toBe(0);
      expect(r.out).toContain("SENTINEL_COMMITTED_COPY_RAN");
    },
    TIMEOUT,
  );
});

describe.skipIf(!IN_GIT_REPO)("pre-push gate: push protocol", () => {
  it(
    "allows a delete-only push, which has no tree to verify",
    () => {
      resetToSeed();
      pushThrough(NEW_HOOK_DIR, "doomed", { SKIP_UNIT_TESTS: "1" });
      const r = git(["push", "origin", "--delete", "doomed"], { SKIP_UNIT_TESTS: "1" });
      const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      expect(r.status).toBe(0);
      // "Nothing to verify" must be a distinct, legitimate success. Conflating
      // it with "verification did not run" would either block every branch
      // deletion or open a hole.
      expect(out).toContain("nothing to verify");
    },
    TIMEOUT,
  );

  it(
    "verifies a tip pushed to two refs only once",
    () => {
      resetToSeed();
      git(["config", "core.hooksPath", NEW_HOOK_DIR]);
      const r = git(["push", "origin", "HEAD:refs/heads/dup-a", "HEAD:refs/heads/dup-b"], {
        SKIP_UNIT_TESTS: "1",
      });
      const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
      expect(r.status).toBe(0);
      expect(out).toContain("Verifying 1 pushed commit");
    },
    TIMEOUT,
  );
});

describe.skipIf(!IN_GIT_REPO)("pre-push gate: skip switches mean exactly \"1\"", () => {
  // Regression for the sibling of an already-fixed bug. SKIP_BIP_DRIFT was
  // corrected to test for exactly "1" because `-z` meant SKIP_BIP_DRIFT=0
  // disabled the guard. SKIP_UNIT_TESTS was left on `-z` and had no test at
  // all, so the value that reads like "off" turned the suites off.
  const haveVitest = NODE_MODULES !== null && existsSync(join(NODE_MODULES, ".bin", "vitest"));

  function stageFailingSuite() {
    resetToSeed();
    rmSync(join(repo, "tests", "unit"), { recursive: true, force: true });
    rmSync(join(repo, "tests", "auth"), { recursive: true, force: true });
    mkdirSync(join(repo, "tests", "unit"), { recursive: true });
    mkdirSync(join(repo, "tests", "auth"), { recursive: true });
    // One tiny always-failing suite. Replacing the real suites also stops this
    // very file from being re-run inside the fixture, which would recurse.
    const failing = 'import { it, expect } from "vitest";\nit("fails", () => { expect(1).toBe(2); });\n';
    const passing = 'import { it, expect } from "vitest";\nit("passes", () => { expect(1).toBe(1); });\n';
    writeFileSync(join(repo, "tests", "unit", "sentinel.test.ts"), failing);
    writeFileSync(join(repo, "tests", "auth", "sentinel.test.ts"), passing);
    commitAll("replace the suites with a failing sentinel");
  }

  it.runIf(haveVitest)(
    "runs the suites when SKIP_UNIT_TESTS is \"0\"",
    () => {
      stageFailingSuite();
      const r = pushThrough(NEW_HOOK_DIR, "skip-zero", { SKIP_UNIT_TESTS: "0" });
      // "0" reads like off and used to BE off. The failing sentinel must block.
      expect(r.code).not.toBe(0);
      expect(r.out).toContain("unit tests failed");
    },
    TIMEOUT,
  );

  it.runIf(haveVitest)(
    "skips the suites only when SKIP_UNIT_TESTS is exactly \"1\"",
    () => {
      stageFailingSuite();
      const r = pushThrough(NEW_HOOK_DIR, "skip-one", { SKIP_UNIT_TESTS: "1" });
      expect(r.code).toBe(0);
    },
    TIMEOUT,
  );
});

describe.skipIf(!IN_GIT_REPO)("pre-push gate: degraded mode is loud", () => {
  it(
    "says so plainly when it falls back to checking the working tree",
    () => {
      resetToSeed();
      const r = pushThrough(NEW_HOOK_DIR, "degraded", {
        SKIP_ARCHIVE_VERIFY: "1",
        SKIP_UNIT_TESTS: "1",
      });
      expect(r.code).toBe(0);
      // The fallback knowingly reinstates the original bug. If it is ever
      // silent, a false green looks exactly like a real one.
      expect(r.out).toContain("DEGRADED MODE");
      expect(r.out).toContain("not the commits being pushed");
    },
    TIMEOUT,
  );
});

describe.skipIf(!IN_GIT_REPO)("the hook itself", () => {
  it("is POSIX sh and resolves its orchestrator from its own location", () => {
    const hook = readFileSync(join(NEW_HOOK_DIR, "pre-push"), "utf8");
    expect(hook.startsWith("#!/bin/sh")).toBe(true);
    // Resolving from $0 rather than the working directory is what keeps the
    // hook and the orchestrator on the same side of this repo's mixed worktree
    // topology: extensions.worktreeConfig is on, and some checkouts point
    // core.hooksPath at the main checkout while others use their own.
    expect(hook).toContain('dirname -- "$0"');
    expect(hook).not.toMatch(/^\s*if \[ -z "\$SKIP_UNIT_TESTS" \]/m);
  });
});
