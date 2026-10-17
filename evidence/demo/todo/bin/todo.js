#!/usr/bin/env node
'use strict';

const commands = require('../src/commands');

const USAGE = `Usage:
  todo add <text>   Add a new todo
  todo list         List all todos
  todo done <id>    Mark a todo as done
`;

function main(argv) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case 'add': {
      const todo = commands.add(rest.join(' '));
      console.log(`Added #${todo.id}: ${todo.text}`);
      return 0;
    }
    case 'list': {
      console.log(commands.formatList(commands.list()));
      return 0;
    }
    case 'done': {
      const todo = commands.done(rest[0]);
      console.log(`Done #${todo.id}: ${todo.text}`);
      return 0;
    }
    default:
      console.error(cmd ? `Unknown command: ${cmd}\n` : '');
      console.error(USAGE);
      return cmd ? 1 : 0;
  }
}

try {
  process.exitCode = main(process.argv.slice(2));
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
}
