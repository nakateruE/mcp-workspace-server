'use strict';

const store = require('./store');

function add(text, file) {
  const clean = typeof text === 'string' ? text.trim() : '';
  if (!clean) {
    throw new Error('Todo text must not be empty');
  }
  const todos = store.load(file);
  const nextId = todos.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const todo = {
    id: nextId,
    text: clean,
    done: false,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  store.save(todos, file);
  return todo;
}

function list(file) {
  return store.load(file);
}

function done(id, file) {
  const num = typeof id === 'number' ? id : Number(String(id).trim());
  if (!Number.isInteger(num) || String(id).trim() === '') {
    throw new Error(`Invalid id: ${id}. Expected a whole number`);
  }
  const todos = store.load(file);
  const todo = todos.find((t) => t.id === num);
  if (!todo) {
    throw new Error(`No todo with id ${num}`);
  }
  todo.done = true;
  store.save(todos, file);
  return todo;
}

function formatList(todos) {
  if (todos.length === 0) return 'No todos yet.';
  return todos
    .map((t) => `[${t.done ? 'x' : ' '}] ${t.id} ${t.text}`)
    .join('\n');
}

module.exports = { add, list, done, formatList };
