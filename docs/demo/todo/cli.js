#!/usr/bin/env node
"use strict";
const store = require("./store");

const USAGE = "Usage: node cli.js <add <text> | list | done <id>>";

function run(argv) {
  const [cmd, ...rest] = argv;
  switch (cmd) {
    case "add": {
      const item = store.add(rest.join(" "));
      return `Added #${item.id}: ${item.text}`;
    }
    case "list": {
      const items = store.list();
      if (items.length === 0) return "No todos yet.";
      return items
        .map((i) => `${i.done ? "[x]" : "[ ]"} ${i.id}. ${i.text}`)
        .join("\n");
    }
    case "done": {
      const item = store.done(rest[0]);
      return `Done #${item.id}: ${item.text}`;
    }
    default:
      throw new Error(USAGE);
  }
}

if (require.main === module) {
  try {
    console.log(run(process.argv.slice(2)));
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

module.exports = { run };
