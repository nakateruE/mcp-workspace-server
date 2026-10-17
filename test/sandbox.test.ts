import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createSandbox, SandboxError } from "../src/sandbox.js";

async function setup() {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "sbx-"));
  const root = path.join(base, "ws");
  await fs.mkdir(path.join(root, "sub"), { recursive: true });
  await fs.writeFile(path.join(root, "a.txt"), "hi");
  await fs.mkdir(path.join(base, "ws-evil"));            // sibling with same prefix
  await fs.writeFile(path.join(base, "secret.txt"), "top secret");
  return { base, root, sb: await createSandbox(root) };
}

test("allows normal paths", async () => {
  const { root, sb } = await setup();
  assert.equal(await sb.resolve("a.txt"), path.join(await fs.realpath(root), "a.txt"));
  await sb.resolve("sub/new/file.md");   // nonexistent is fine
  await sb.resolve(".");
  await sb.resolve("sub/../a.txt");      // stays inside
});

test("rejects ../ traversal", async () => {
  const { sb } = await setup();
  for (const p of ["../secret.txt", "../../etc/passwd", "sub/../../secret.txt", "a/../../x"]) {
    await assert.rejects(sb.resolve(p), SandboxError, p);
  }
});

test("rejects absolute paths outside root", async () => {
  const { sb } = await setup();
  await assert.rejects(sb.resolve("/etc/passwd"), SandboxError);
});

test("rejects sibling directory with the same prefix", async () => {
  const { sb } = await setup();
  await assert.rejects(sb.resolve("../ws-evil/x.txt"), SandboxError);
});

test("rejects symlink pointing outside", async () => {
  const { base, root, sb } = await setup();
  await fs.symlink(path.join(base, "secret.txt"), path.join(root, "link.txt"));
  await fs.symlink(base, path.join(root, "dirlink"));
  await assert.rejects(sb.resolve("link.txt"), SandboxError);
  await assert.rejects(sb.resolve("dirlink/secret.txt"), SandboxError);
});

test("rejects dangling symlink out of root (write-through attack)", async () => {
  const { base, root, sb } = await setup();
  await fs.symlink(path.join(base, "not-yet.txt"), path.join(root, "dangling"));
  await assert.rejects(sb.resolve("dangling"), SandboxError);
});

test("rejects .git access and NUL bytes and empty path", async () => {
  const { sb } = await setup();
  await assert.rejects(sb.resolve(".git/config"), SandboxError);
  await assert.rejects(sb.resolve("sub/.git/hooks/pre-commit"), SandboxError);
  await assert.rejects(sb.resolve("a.txt\0.png"), SandboxError);
  await assert.rejects(sb.resolve(""), SandboxError);
});
