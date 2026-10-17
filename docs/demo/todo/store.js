"use strict";
const fs = require("node:fs");
const path = require("node:path");

function filePath() {
  return process.env.TODO_FILE || path.join(process.cwd(), "todos.json");
}

function load() {
  try {
    const data = JSON.parse(fs.readFileSync(filePath(), "utf8"));
    if (data && Array.isArray(data.items)) return data;
    return { nextId: 1, items: [] };
  } catch (err) {
    if (err.code === "ENOENT") return { nextId: 1, items: [] };
    throw err;
  }
}

function save(data) {
  fs.writeFileSync(filePath(), JSON.stringify(data, null, 2) + "\n");
}

function add(text) {
  const clean = String(text || "").trim();
  if (!clean) throw new Error("Todo text cannot be empty.");
  const data = load();
  const item = { id: data.nextId, text: clean, done: false };
  data.items.push(item);
  data.nextId += 1;
  save(data);
  return item;
}

function list() {
  return load().items;
}

function done(id) {
  const n = Number(id);
  if (!Number.isInteger(n)) throw new Error(`Invalid id: ${id}`);
  const data = load();
  const item = data.items.find((i) => i.id === n);
  if (!item) throw new Error(`No todo with id ${n}.`);
  item.done = true;
  save(data);
  return item;
}

module.exports = { add, list, done, load, save };
