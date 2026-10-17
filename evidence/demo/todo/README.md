# todo

A tiny command-line todo app. No dependencies, JSON file storage. Requires Node 18+.

## Usage

```
node bin/todo.js add <text>   # add a new todo
node bin/todo.js list         # list all todos
node bin/todo.js done <id>    # mark a todo as done
```

Example:

```
$ node bin/todo.js add "Buy milk"
Added #1: Buy milk
$ node bin/todo.js add "Write README"
Added #2: Write README
$ node bin/todo.js done 1
Done #1: Buy milk
$ node bin/todo.js list
[x] 1 Buy milk
[ ] 2 Write README
```

You can also run it as `todo` after `npm link` from this folder.

## Storage

Todos are stored in `todos.json` in the current working directory. Set the `TODO_FILE` environment variable to use a different file:

```
TODO_FILE=/tmp/my-todos.json node bin/todo.js list
```

A missing or empty file is treated as an empty list. A file with invalid JSON causes an error and is never overwritten.

Each todo looks like:

```json
{ "id": 1, "text": "Buy milk", "done": false, "createdAt": "2026-10-17T00:00:00.000Z" }
```

## Tests

```
npm test
```

Uses the built-in `node:test` runner.

## Layout

- `bin/todo.js` - CLI entry point (argument parsing, printing, exit codes)
- `src/commands.js` - add / list / done logic
- `src/store.js` - JSON load/save
- `test/` - tests
