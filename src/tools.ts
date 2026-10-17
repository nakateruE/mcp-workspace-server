import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { git } from "./git.js";
import type { Sandbox } from "./sandbox.js";

const MAX_WRITE_BYTES = 1_000_000;        // guard: refuse huge writes
const MAX_SEARCH_FILE_BYTES = 1_000_000;  // search skips big files
// Compared case-insensitively and ignoring trailing dots/spaces (Windows treats them as the same file)
const key = (s: string) => s.replace(/[. ]+$/, "").toLowerCase();
const APPEND_ONLY = new Set(["plan_log.md"]);                       // cannot be overwritten
const NO_DELETE = new Set(["project_state.md", "plan_log.md", "decisions.md"]);

const ok = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const fail = (t: string) => ({ isError: true, content: [{ type: "text" as const, text: t }] });
const version = (s: string) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 12);

/** Wrap handlers so errors come back as tool errors instead of crashing the request. */
function wrap<A>(fn: (a: A) => Promise<ReturnType<typeof ok>>) {
  return async (args: A) => {
    try {
      return await fn(args);
    } catch (e) {
      return fail(`Error: ${(e as Error).message}`);
    }
  };
}

function checkSize(content: string) {
  if (Buffer.byteLength(content) > MAX_WRITE_BYTES) {
    throw new Error(`Refusing write: content exceeds ${MAX_WRITE_BYTES} bytes`);
  }
}

export function registerTools(server: McpServer, sb: Sandbox) {
  const relName = (full: string) => sb.rel(full);
  const guardOverwrite = (full: string) => {
    if (APPEND_ONLY.has(key(relName(full)))) {
      throw new Error(`${relName(full)} is append-only. Use append_file.`);
    }
  };

  server.registerTool(
    "list_files",
    {
      description: "List files and folders in a workspace directory (folders end with /).",
      inputSchema: { dir: z.string().default(".").describe("Directory relative to workspace root") },
    },
    wrap(async ({ dir }) => {
      const full = await sb.resolve(dir);
      const entries = await fs.readdir(full, { withFileTypes: true });
      const lines = entries
        .filter((e) => e.name !== ".git")
        .map((e) => e.name + (e.isDirectory() ? "/" : ""))
        .sort();
      return ok(lines.join("\n") || "(empty)");
    }),
  );

  server.registerTool(
    "read_file",
    {
      description:
        "Read a text file. Optional start_line/end_line (1-based, inclusive) to read only part. Returns a version hash usable with if_version.",
      inputSchema: {
        path: z.string(),
        start_line: z.number().int().min(1).optional(),
        end_line: z.number().int().min(1).optional(),
      },
    },
    wrap(async ({ path: p, start_line, end_line }) => {
      const full = await sb.resolve(p);
      const src = await fs.readFile(full, "utf8");
      let out = src;
      if (start_line || end_line) {
        const lines = src.split("\n");
        out = lines.slice((start_line ?? 1) - 1, end_line ?? lines.length).join("\n");
      }
      return ok(`${out}\n--\nversion: ${version(src)}`);
    }),
  );

  server.registerTool(
    "write_file",
    {
      description:
        "Create or overwrite a file (parent folders are created). Use str_replace for small edits. Optional if_version rejects the write if the file changed since you read it.",
      inputSchema: { path: z.string(), content: z.string(), if_version: z.string().optional() },
    },
    wrap(async ({ path: p, content, if_version }) => {
      const full = await sb.resolve(p);
      guardOverwrite(full);
      checkSize(content);
      if (if_version) {
        const cur = await fs.readFile(full, "utf8").catch(() => "");
        if (version(cur) !== if_version) {
          throw new Error(`Version conflict: file is now ${version(cur)}, you had ${if_version}. Re-read it.`);
        }
      }
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content);
      return ok(`wrote ${relName(full)} (${Buffer.byteLength(content)} bytes) version: ${version(content)}`);
    }),
  );

  server.registerTool(
    "append_file",
    {
      description: "Append text to the end of a file (creates it if missing). Use this for PLAN_LOG.md.",
      inputSchema: { path: z.string(), content: z.string() },
    },
    wrap(async ({ path: p, content }) => {
      const full = await sb.resolve(p);
      checkSize(content);
      await fs.mkdir(path.dirname(full), { recursive: true });
      const sep = content.endsWith("\n") ? "" : "\n";
      await fs.appendFile(full, content + sep);
      return ok(`appended to ${relName(full)}`);
    }),
  );

  server.registerTool(
    "str_replace",
    {
      description:
        "Replace one exact string in a file. old_str must match EXACTLY ONE place, otherwise nothing changes. Optional if_version for conflict detection.",
      inputSchema: {
        path: z.string(),
        old_str: z.string().min(1),
        new_str: z.string(),
        if_version: z.string().optional(),
      },
    },
    wrap(async ({ path: p, old_str, new_str, if_version }) => {
      const full = await sb.resolve(p);
      guardOverwrite(full);
      const src = await fs.readFile(full, "utf8");
      if (if_version && version(src) !== if_version) {
        throw new Error(`Version conflict: file is now ${version(src)}, you had ${if_version}. Re-read it.`);
      }
      const count = src.split(old_str).length - 1;
      if (count !== 1) throw new Error(`old_str matched ${count} times; it must match exactly 1`);
      const next = src.replace(old_str, () => new_str); // fn avoids $-pattern surprises
      checkSize(next);
      await fs.writeFile(full, next);
      return ok(`replaced in ${relName(full)} version: ${version(next)}`);
    }),
  );

  server.registerTool(
    "delete_file",
    {
      description: "Delete a single file (not folders). Protocol files cannot be deleted.",
      inputSchema: { path: z.string() },
    },
    wrap(async ({ path: p }) => {
      const full = await sb.resolve(p);
      if (NO_DELETE.has(key(relName(full)))) throw new Error(`${relName(full)} is protected and cannot be deleted`);
      const st = await fs.stat(full);
      if (st.isDirectory()) throw new Error("delete_file only deletes files, not directories");
      await fs.rm(full);
      return ok(`deleted ${relName(full)}`);
    }),
  );

  server.registerTool(
    "search",
    {
      description:
        "Search text across workspace files. Returns 'path:line: text' lines. Literal match by default; set regex=true for a regular expression.",
      inputSchema: {
        query: z.string().min(1),
        dir: z.string().default("."),
        regex: z.boolean().default(false),
        case_insensitive: z.boolean().default(true),
        max_results: z.number().int().min(1).max(100).default(30),
      },
    },
    wrap(async ({ query, dir, regex, case_insensitive, max_results }) => {
      const start = await sb.resolve(dir);
      let re: RegExp;
      try {
        const src = regex ? query : query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        re = new RegExp(src, case_insensitive ? "i" : "");
      } catch {
        throw new Error("Invalid regular expression");
      }
      const results: string[] = [];
      async function walk(d: string): Promise<void> {
        if (results.length >= max_results) return;
        for (const e of await fs.readdir(d, { withFileTypes: true })) {
          if (results.length >= max_results) return;
          if (e.name === ".git" || e.name === "node_modules" || e.isSymbolicLink()) continue;
          const f = path.join(d, e.name);
          if (e.isDirectory()) await walk(f);
          else if (e.isFile()) {
            const st = await fs.stat(f);
            if (st.size > MAX_SEARCH_FILE_BYTES) continue;
            const text = await fs.readFile(f, "utf8");
            if (text.includes("\0")) continue; // skip binary
            const lines = text.split("\n");
            for (let i = 0; i < lines.length && results.length < max_results; i++) {
              if (re.test(lines[i])) results.push(`${sb.rel(f)}:${i + 1}: ${lines[i].slice(0, 200)}`);
            }
          }
        }
      }
      const st = await fs.stat(start);
      if (st.isDirectory()) await walk(start);
      else throw new Error("dir must be a directory");
      return ok(results.length ? results.join("\n") : "no matches");
    }),
  );

  server.registerTool(
    "git_status",
    { description: "Show git branch and changed files (short format).", inputSchema: {} },
    wrap(async () => ok((await git(sb.root, ["status", "--short", "--branch"])) || "clean")),
  );

  server.registerTool(
    "git_commit",
    {
      description: "Stage all changes and commit with a message (max 200 chars). Use after finishing a step or writing a checkpoint.",
      inputSchema: { message: z.string().min(1).max(200) },
    },
    wrap(async ({ message }) => {
      const status = await git(sb.root, ["status", "--porcelain"]);
      if (!status) return ok("nothing to commit");
      await git(sb.root, ["add", "-A"]);
      await git(sb.root, [
        "-c", "user.name=mcp-agent", "-c", "user.email=mcp-agent@localhost",
        "commit", "-q", "-m", message,
      ]);
      return ok(`committed: ${await git(sb.root, ["log", "-1", "--oneline"])}`);
    }),
  );

  server.registerTool(
    "git_log",
    {
      description: "Show recent commits (one line each).",
      inputSchema: { n: z.number().int().min(1).max(50).default(10) },
    },
    wrap(async ({ n }) => ok((await git(sb.root, ["log", "--oneline", "-n", String(n)])) || "no commits")),
  );
}
