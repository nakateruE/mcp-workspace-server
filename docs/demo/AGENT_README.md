# Agent handoff protocol (read this first)

This workspace is shared memory between agent sessions. Follow this routine EVERY session.

## Start of session
1. `read_file PROJECT_STATE.md` - goal, status, next step.
2. `read_file DECISIONS.md` - do not re-decide settled things.
3. `list_files CHECKPOINTS` then read ONLY the newest checkpoint.
4. Do not re-read files you already have. Use `search` or `read_file` with line ranges.

## During the session
- Small edits: `str_replace` (never rewrite a whole file for a small change).
- `PLAN_LOG.md` is append-only: `append_file` one line per step: `- [YYYY-MM-DD HH:MM] step: result`.
- Record real choices in `DECISIONS.md` (decision, reason, date).

## End of session
1. Write `CHECKPOINTS/cp-NN.md` (NN = next number): what is done, what is next, open questions.
2. Update `PROJECT_STATE.md` (status + next step) with `str_replace`.
3. `git_commit` with a short message.
