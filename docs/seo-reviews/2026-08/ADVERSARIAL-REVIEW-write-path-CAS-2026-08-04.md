# Adversarial review — the last-writer-wins CAS attempt (PR #41), 2026-08-04

Companion to `ADVERSARIAL-REVIEW-write-path-2026-08-04.md`, which describes the *finding*. This
records the first attempt to *fix* it, the review that stopped it shipping, and what a second attempt
must do differently.

**Status: PR #41 is a DRAFT and must not be merged.** The approach it proves out is sound and is
still the open item; the branch it lives on is not salvageable by merge.

---

## What the finding actually is (sharpened by this attempt)

The original write-up says the commit path "lays its blobs over whatever HEAD currently holds." Two
refinements came out of building against it, and both matter to whoever picks this up:

1. **GitHub's own protection does not cover it, and it looks like it does.** The ref PATCH omits
   `force`, which defaults to `false`, and GitHub's docs say leaving it out "will make sure you're
   not overwriting work." That guards the **branch pointer**, not file contents. Replacing someone's
   edit while still descending from the commit that made it is a perfectly good fast-forward. It is
   very easy to read the absent `force` as the compare-and-swap already being present. It is not.

2. **The retry is what makes the loss silent rather than loud.** The commit runs inside a `step.run`
   on a function configured `retries: 1`. If an editor's commit lands between the HEAD read and the
   PATCH, attempt one is refused as a non-fast-forward and the step throws — but the retry re-reads
   HEAD, rebuilds on their commit, and re-applies the same stale bytes, which now *is* a
   fast-forward. Attempt one fails loudly; attempt two overwrites them and reports success.

## What was built, and what survives review

Each article carries `baseBlobSha`, the git blob SHA of the file it was generated from, checked
against the branch's tree immediately before the write. Conflicts drop that article and are reported
rather than failing the batch.

Worth carrying forward:

- **`gitBlobSha` is correct and independently verified.** `sha1("blob " + byteLength + "\0" + bytes)`,
  cross-checked in-test against real `git hash-object --stdin`, and separately against
  `git ls-tree HEAD` for all 45 articles: **45/45 identical**. The byte-length-vs-character-length
  trap is real and the multi-byte corpus (37 of 45 files contain non-ASCII) would expose it
  immediately; the external oracle is what catches it, a frozen digest would not.
- **The UTF-8 round-trip is safe on this corpus.** `readFileSync(utf-8) → Buffer.from(utf-8)` is
  byte-identical for all 45 files: 0 CRLF, 0 BOM. No `.gitattributes` is tracked anywhere, and no
  `core.autocrlf` / `core.eol` / `core.attributesfile` is set, so git stores working-tree bytes
  unmodified. Had any of that been otherwise, every article would report a phantom conflict and the
  refresh would silently stall forever — worth re-checking if `.gitattributes` is ever added.
- **The `raw` bytes must be the hash source.** `frontmatter` + `body` cannot be recombined into them;
  gray-matter normalises key order, quoting and whitespace, so a hash of re-serialized bytes matches
  nothing git has ever stored.

## Why the branch cannot be merged

`origin/main` moved **three commits** between the branch's base and its review, and six by the end of
the session. `git merge-tree --write-tree origin/main HEAD` exits 1 with four content conflicts.

- **It would revert #42.** The branch predates `SLUG_PATTERN`/`SLUG_MAX_LENGTH` and has no slug
  validation at all, while still building `content/articles/${slug}.md` and PATCHing `main`. Merging
  it in its own favour reopens the path-traversal hole that #42 closed. This is the single reason the
  PR was drafted rather than rebased in place.
- **It re-solves #39 worse than #39 does.** `CommitOutcome` is `{committed, conflicted, commitSha}`
  on the branch versus `{status, batchId, commitSha, articles}` on `main`, and
  `ArticleCommitPayload` differs by a required field. Not textually mergeable.
- **Its green test run proves nothing**, having been measured against a base that no longer exists.

## Defects found in the attempt itself

Both confirmed by mutation, not inspection:

1. **`?recursive=1` is untested, and losing it is catastrophic.** Removing it leaves all 15 tests
   green, because the mock routes on `includes("/git/trees/")` and ignores the query string. Against
   real GitHub a non-recursive tree read returns `content` as a single `type: "tree"` entry, so the
   path→blob map gets **zero** article paths, every article takes the "no longer exists" branch, and
   the refresh reports success-with-conflicts forever while never writing a byte — blaming the
   articles in the summary email. Strictly worse than the bug being fixed. **Any second attempt needs
   a test that pins the recursive read specifically.**
2. **The `type === "blob"` filter is untested** — removing it is also green.
3. **A successful batch is misreported as a total failure on retry.** Found independently by both
   reviewers, which is the strongest signal in this document. If the PATCH succeeds but its reply is
   lost, the retry finds this run's own bytes on every path, matches no base SHA, marks everything
   conflicted, and emails "0 updated / N failed" for a batch that committed and deployed correctly.
   This is precisely the distinction #39 exists to preserve, collapsed back down.
4. **Bounded concurrency shipped without the retry/backoff it was asked for**, and its comment claims
   a failure-isolation property the code does not have: `mapWithConcurrency` still ends in
   `await Promise.all(workers)`, so one rejection still discards every blob already created.
5. **The ruleset failure mode was never documented**, though the original brief asked for it
   explicitly even absent a code change.

## What a second attempt must do

- Branch from **current `main`**, not from #41. Re-apply only the CAS and `gitBlobSha`.
- **Integrate with #39's `already-applied` status rather than duplicating it.** Compare the branch's
  current blob against **both** the recorded base SHA **and the intended output SHA**; an output-SHA
  match means this run already applied it, which is `already-applied`, not a conflict. Both reviewers
  converged on this independently and it fixes defect 3 above.
- Keep `SLUG_PATTERN` and everything else #42/#43/#45 landed. Check what #45 changed about path
  identity before designing the path→blob lookup.
- Add the recursive-read test, real retry/backoff on 403/429, and the ruleset note.
- A stricter option worth weighing: GraphQL `createCommitOnBranch(expectedHeadOid)` is a genuine
  atomic expected-head operation and would close the force-reset case, where an operator resets the
  branch back to an ancestor to remove bad commits and the worker's fast-forward silently resurrects
  them. The REST path cannot express that.

## Process note

This attempt was reviewed by Codex (round 2, security/data-integrity) **and** a Claude reviewer, and
the pairing earned its keep: they converged on defect 3 from different directions, Codex alone found
the force-reset case, and the Claude reviewer alone found the base drift — which Codex structurally
could not see, having been given only the diff. The base drift was the finding that mattered most,
and no amount of reviewing the diff in isolation would have surfaced it.
