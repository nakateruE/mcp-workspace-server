# DECISIONS

Format: `- [date] DECISION - reason`
- [2026-10-17] Plain Node (no dependencies), CommonJS modules, Node 18+ built-in `node:test` for tests - zero install, simple.
- [2026-10-17] Layout: todo/src/store.js (JSON load/save), todo/src/commands.js (add/list/done logic), todo/bin/todo.js (CLI entry) - keeps logic testable apart from argv parsing.
- [2026-10-17] Storage file defaults to `todos.json` in the current working directory, overridable via `TODO_FILE` env var - easy to test with a temp file.
- [2026-10-17] Todo shape: `{ id: number, text: string, done: boolean, createdAt: ISO string }`; ids increment from max existing id + 1 so ids are never reused after future deletions.
- [2026-10-17] Missing or empty storage file is treated as an empty list; corrupt JSON raises a clear error rather than being overwritten.
- [2026-10-17] `list` shows all todos by default as `[ ] 1 text` / `[x] 2 text`; `--pending` filter deferred (not required).
- [2026-10-17] Command functions take the file path as a parameter and return values/strings; the CLI layer does printing and exit codes.
- [2026-10-17] This session implements only add and list; done, README, and the 3 tests are deferred to later sessions.
- [2026-10-17] `done <id>` accepts numbers or numeric strings; non-integer/missing id throws `Invalid id`, unknown id throws `No todo with id N` - clear errors, CLI exits 1.
- [2026-10-17] Re-running `done` on an already-done todo is allowed (idempotent, no error) - simplest behaviour, not specified as an error.
- [2026-10-17] Tests live in one file todo/test/todo.test.js, using temp files via the `file` parameter - matches the earlier plan.
