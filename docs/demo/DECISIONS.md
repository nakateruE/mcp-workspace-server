# DECISIONS

Format: `- [date] DECISION - reason`
- [2026-10-17] Node CommonJS, zero dependencies, tests with built-in `node:test` - task forbids dependencies and node:test ships with Node 18+.
- [2026-10-17] Storage is one JSON file `{nextId, items:[{id,text,done}]}`; path from env `TODO_FILE`, else `todos.json` in the current directory - the env override lets tests use a temp file; `nextId` keeps ids stable and never reused.
- [2026-10-17] Layout: `todo/store.js` (logic + persistence) and `todo/cli.js` (arg parsing + output); `run(argv)` returns a string instead of printing - testable without spawning processes.
- [2026-10-17] Goal taken from docs/DEMO_TASK.md as pasted by the user; its example task is kept unchanged.
