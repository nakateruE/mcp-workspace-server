# todo

A tiny command-line todo app. Node only, no dependencies.

## Usage

```
node cli.js add <text>    # add a todo
node cli.js list          # list all todos
node cli.js done <id>     # mark a todo as done
```

Example:

```
$ node cli.js add buy milk
Added #1: buy milk
$ node cli.js list
[ ] 1. buy milk
$ node cli.js done 1
Done #1: buy milk
```

## Storage

Todos are saved in a JSON file: `todos.json` in the current directory, or the path in the `TODO_FILE` environment variable. Ids are stable and never reused.

## Tests

Requires Node 18+ (uses the built-in `node:test`).

```
npm test
```
