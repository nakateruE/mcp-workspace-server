'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const commands = require('../src/commands');
const store = require('../src/store');

function tmpFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todo-test-'));
  return path.join(dir, 'todos.json');
}

test('add persists a todo to the storage file', () => {
  const file = tmpFile();
  const first = commands.add('  Buy milk  ', file);
  const second = commands.add('Write tests', file);

  assert.strictEqual(first.id, 1);
  assert.strictEqual(second.id, 2);

  const saved = store.load(file);
  assert.strictEqual(saved.length, 2);
  assert.strictEqual(saved[0].text, 'Buy milk');
  assert.strictEqual(saved[0].done, false);
  assert.throws(() => commands.add('   ', file), /must not be empty/);
});

test('list formats todos with done markers', () => {
  const file = tmpFile();
  assert.strictEqual(commands.formatList(commands.list(file)), 'No todos yet.');

  commands.add('one', file);
  commands.add('two', file);
  commands.done(2, file);

  assert.strictEqual(
    commands.formatList(commands.list(file)),
    '[ ] 1 one\n[x] 2 two'
  );
});

test('done marks an item and rejects unknown or invalid ids', () => {
  const file = tmpFile();
  commands.add('one', file);

  const result = commands.done('1', file);
  assert.strictEqual(result.done, true);
  assert.strictEqual(store.load(file)[0].done, true);

  assert.throws(() => commands.done(99, file), /No todo with id 99/);
  assert.throws(() => commands.done('abc', file), /Invalid id/);
  assert.throws(() => commands.done(undefined, file), /Invalid id/);
});
