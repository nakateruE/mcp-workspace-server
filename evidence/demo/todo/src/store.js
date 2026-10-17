'use strict';

const fs = require('node:fs');
const path = require('node:path');

function defaultFile() {
  return process.env.TODO_FILE || path.join(process.cwd(), 'todos.json');
}

function load(file = defaultFile()) {
  let raw;
  try {
    raw = fs.readFileSync(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  if (raw.trim() === '') return [];
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`Storage file ${file} contains invalid JSON: ${err.message}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`Storage file ${file} must contain a JSON array`);
  }
  return data;
}

function save(todos, file = defaultFile()) {
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(todos, null, 2) + '\n', 'utf8');
}

module.exports = { defaultFile, load, save };
