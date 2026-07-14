<!-- BEGIN franscale-git-safety (canonical: dotfiles/claude/CLAUDE.md — do not edit copies; re-run stamp-git-safety.sh) -->
## Git & delivery ownership (hard rule — I run git end-to-end; you get told, not asked)

Kelsey has given me standing authorization to run the whole git lifecycle **autonomously** — stage,
commit, branch, push, open/merge PRs, bump submodule gitlinks — without asking. Kelsey does not do git and
must **never be asked a git question**. Safety comes from how I behave, not from you approving me. This
**overrides** the default "commit/push only when asked."

- **I own the checkpoints.** When a change is complete and verified, I commit it — I never leave verified
  work uncommitted and never wait to be told. Also before switching repos, deploying, or ending a session.
- **I never push red.** I only push work I've actually verified green (tests / build / `/verify`, sized to
  the change). Can't verify it? I commit locally and say so — I don't push unverified code.
- **I do the whole thing, then report — in plain English, not git-speak.** e.g. *"Saved and pushed the 3
  doc fixes — live for the Mini to pull. Wrong? Say 'undo that' and I'll revert it."* I never make you
  read branches or SHAs. If anything failed, I say so with the error — I never claim a success I didn't see.
- **A live go-live is a product decision, so I surface it first.** If a push would ship to a site people
  actually see (a Vercel/CI auto-deploy, a live store/app, a client tool — I'll know from `vercel.json` /
  `.vercel/` / a deploy CI workflow / a live URL), I tell you in plain English and wait for "go" before it
  goes public. Ordinary content/ops/docs repos just get pushed and reported.
- **Safe by construction:**
  - Branch + PR for app/product **code**; direct-to-`main` is fine for docs, deploy/gitlink bumps, ops repos.
  - I stage the exact files I changed — **never `git add -A` or `git add .`** — so I never sweep in
    unrelated, secret, or worktree files.
  - Never commit secrets/keys/tokens; respect `.gitignore`; never bypass repo hooks (`--no-verify` banned).
  - Submodules: commit+push the submodule first, then bump the parent gitlink and push the parent.
  - Real, specific commit messages (`type(scope): why`) — never a placeholder.
  - I only push to `Franscale1922` remotes.
- **Destructive history — I won't do it silently.** Force-push, rewrite of published history, hard-reset of
  un-pushed work, branch/tag deletion, remote/access changes: I stop, explain plainly, propose the safe
  path, and wait:
  > 🚦 **STOP — destructive, so I won't do it on my own.** <what + why + the safe alternative>. Say **"go"**
  > for the safe path, or tell me to leave it.
- **"Undo that" is a first-class command.** If you say a change was wrong, I do the safe reversal (revert
  commit / new PR / roll back the deploy) and report it — you never touch git to fix it.
- **Docs + saving travel with the change.** Relevant docs/runbook/memory update in the same delivery so
  they never drift; "saving" = committing at every coherent checkpoint so nothing verified is ever lost.
- **This binds without a plan — spawned, background, and cloud sessions included.** If I realize I
  pushed/merged something wrong, I stop, say so plainly, and fix it forward — never quietly, never with a
  force-push to hide it.

**Act, don't acknowledge:** I never leave verified work uncommitted, and I never make you decide a git question.
<!-- END franscale-git-safety -->
