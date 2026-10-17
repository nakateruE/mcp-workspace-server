"use strict";
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { run } = require("../cli");

function withTempFile(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "todo-"));
  process.env.TODO_FILE = path.join(dir, "todos.json");
  try {
    fn();
  } finally {
    delete process.env.TODO_FILE;
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test("add then list shows the new todo", () => {
  withTempFile(() => {
    assert.strictEqual(run(["list"]), "No todos yet.");
    assert.strictEqual(run(["add", "buy", "milk"]), "Added #1: buy milk");
    assert.strictEqual(run(["list"]), "[ ] 1. buy milk");
  });
});

test("done marks a todo as completed", () => {
  withTempFile(() => {
    run(["add", "first"]);
    run(["add", "second"]);
    assert.strictEqual(run(["done", "2"]), "Done #2: second");
    assert.strictEqual(run(["list"]), "[ ] 1. first\n[x] 2. second");
  });
});

test("done with an unknown id throws and ids are never reused", () => {
  withTempFile(() => {
    run(["add", "only"]);
    assert.throws(() => run(["done", "99"]), /No todo with id 99/);
    assert.throws(() => run(["done", "abc"]), /Invalid id/);
    run(["done", "1"]);
    assert.strictEqual(run(["add", "next"]), "Added #2: next");
  });
});
