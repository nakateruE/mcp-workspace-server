import fs from "node:fs/promises";
import path from "node:path";

export class SandboxError extends Error {}

/**
 * Sandbox: every user-supplied path is resolved against a fixed root.
 * Rules (each one is a security-report talking point):
 *  1. Resolve against ROOT, then require the result to stay inside ROOT
 *     (the `root + sep` check also blocks sibling dirs like /ws-evil).
 *  2. Reject NUL bytes.
 *  3. Reject any symlink on the path (prevents link-out-of-root attacks).
 *  4. Reject anything touching .git (prevents hook/config tampering).
 */
export async function createSandbox(rootInput: string) {
  const root = await fs.realpath(path.resolve(rootInput));
  const inside = (p: string) => p === root || p.startsWith(root + path.sep);

  async function resolve(userPath: string): Promise<string> {
    if (typeof userPath !== "string" || userPath.length === 0) {
      throw new SandboxError("Path must be a non-empty string");
    }
    if (userPath.includes("\0")) throw new SandboxError("Invalid path (NUL byte)");
    // Windows: ':' enables NTFS alternate data streams (file.txt::$DATA) and drive tricks
    if (process.platform === "win32" && userPath.includes(":")) {
      throw new SandboxError("Invalid path (':' not allowed on Windows)");
    }

    const full = path.resolve(root, userPath);
    if (!inside(full)) throw new SandboxError(`Path escapes workspace: ${userPath}`);

    const rel = path.relative(root, full);
    const parts = rel === "" ? [] : rel.split(path.sep);
    // Windows/macOS filesystems are case-insensitive and ignore trailing dots/spaces
    const norm = (n: string) => n.replace(/[. ]+$/, "").toLowerCase();
    if (parts.some((n) => norm(n) === ".git")) throw new SandboxError("Access to .git is not allowed");

    // Walk each component; refuse symlinks. Stop at first missing component.
    let cur = root;
    for (const part of parts) {
      cur = path.join(cur, part);
      try {
        const st = await fs.lstat(cur);
        if (st.isSymbolicLink()) throw new SandboxError(`Symlinks are not allowed: ${part}`);
      } catch (e) {
        if (e instanceof SandboxError) throw e;
        if ((e as NodeJS.ErrnoException).code === "ENOENT") break;
        throw e;
      }
    }
    return full;
  }

  // Always report paths with forward slashes so output is the same on every OS
  const rel = (full: string) => path.relative(root, full).split(path.sep).join("/") || ".";
  return { root, resolve, rel };
}

export type Sandbox = Awaited<ReturnType<typeof createSandbox>>;
