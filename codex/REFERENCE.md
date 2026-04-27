# Reference Notes

## Folder Rule
- `codex/` is the Codex notes folder for this workspace.
- `codex/REFERENCE.md` and `codex/WORKLOG.md` are agent-reference documents only.
- User review documents must stay under `docs/`.
- Agent-side document entry points are `codex/REFERENCE.md` and `docs/current/문서_마스터맵.md`.

## `codex/` Content Rule
- `codex/` stores agent-side operating rules only.
- Valid content types are: workflow rules, documentation update order, local operational notes, and reminders about ignored/generated files.
- Do not copy user-facing product specs into `codex/`.
- Do not move decision details out of `docs/` into `codex/`.

## Documentation Structure
- `docs/current/` contains the current source-of-truth product specs.
- `docs/decisions/` contains decision documents only.
- `docs/guides/` contains setup and test guides.
- Do not mix fixed decisions and pending questions in the same document.
- Do not spread the same topic across `codex/` and `docs/` unless the `codex/` copy is strictly agent-operational.

## Documentation Rule
- Start user-facing doc work from `docs/current/문서_마스터맵.md`.
- Start agent-side rule checks from `codex/REFERENCE.md`.
- When a document in `docs/current/` is materially updated, review and update the related companion docs in the same turn.
- When a decision is finalized, move it out of pending-review documents and into `docs/decisions/`.
- Keep file paths stable. Prefer fixed filenames over version-number sprawl for current docs.

## Forbidden Mixes
- Do not write implementation planning for the user inside `codex/` and then reference it as user-facing spec.
- Do not store agent-only workflow notes in `docs/`.
- Do not leave finalized decisions inside pending-review docs.
- Do not write Codex update instructions into `docs/` while updating user-facing docs.

## Git Rule
- Before every commit, run a source inspection on the files that are about to be committed and resolve obvious defects first.
- Source inspection includes checking changed source files for broken ranges, stale preview guards, schema mismatches, unsafe parser assumptions, and similar code-level defects.
- Git stage/commit/push must be executed sequentially, never in parallel.
- Do not use parallel tool calls for `git add`, `git status`, `git commit`, or `git push`.
- Required order is: source inspection -> `git add` -> `git status` -> `git commit` -> `git push`.
- Before every commit, review changed files and ignored files together.
- Confirm local-only notes, env files, and generated outputs are still excluded by `.gitignore`.
- If ignore rules look broken, fix `.gitignore` before staging.

## Preview And Screenshot Rule
- Do not regenerate screenshots, open screenshots, or use image-based preview review by default.
- Run screenshot capture, preview image inspection, or image confirmation only when the user explicitly asks for it.
- Default verification should stay on build, test, and source inspection unless the user requests visual confirmation.

## README Rule
- `README.md` is for external readers.
- Keep it focused on product summary and key features.
- Avoid internal planning details, local-only design notes, and working-process explanations.
