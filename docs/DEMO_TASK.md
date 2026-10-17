# Demo task: multi-step run across 2 sessions

**Task (example, change if you like):** "Build a small command-line todo app in `todo/` (Node, no dependencies):
add / list / done commands, saved to a JSON file, with a README and 3 tests."

Why this works: it has natural phases (design, code, tests/docs) so the handoff between sessions is real.

## Session 1 (fresh chat, MCP connector enabled)
Paste:
> You have a workspace connector. Read AGENT_README.md and follow it exactly.
> Goal: build a Node CLI todo app in `todo/` (add, list, done; JSON storage; README; 3 tests).
> In this session: fill in PROJECT_STATE.md (goal), record design choices in DECISIONS.md, implement the add and list commands.
> Log each step in PLAN_LOG.md, then write a checkpoint, update PROJECT_STATE.md, and commit.

## Session 2 (brand-new chat, do NOT re-explain the task)
Paste only:
> You have a workspace connector. Read AGENT_README.md and continue the project from where the last session stopped.

The agent should: read PROJECT_STATE, DECISIONS, newest checkpoint; implement `done`, tests, README; write `cp-02.md`; commit.

## Efficiency tips (rubric A, 20 pts, judged from transcript and logs)
- Do not paste file contents to the agent; make it read via tools.
- Agent should use `str_replace` for edits and `read_file` line ranges, not re-read whole files.
- One tool call per purpose; no repeated listing. Keep checkpoints short.

## Evidence to collect
- Export both chat transcripts.
- `pm2 logs mcp-server --lines 200 --nostream > logs/tool-calls.log`
- Copy `workspace/PLAN_LOG.md`, `workspace/CHECKPOINTS/`, `workspace/DECISIONS.md`, and `git -C workspace log --oneline` output.
