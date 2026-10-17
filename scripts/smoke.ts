// End-to-end check using the REAL MCP client SDK against a running server.
// Usage: npm run smoke   (server must be running)  |  MCP_URL=https://x.ngrok-free.app/s/<token>/mcp npm run smoke
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

try { process.loadEnvFile(); } catch {}
const url = process.env.MCP_URL ?? `http://localhost:${process.env.PORT ?? 3000}/mcp`;
const headers: Record<string, string> = {};
if (process.env.AUTH_TOKEN) headers.Authorization = `Bearer ${process.env.AUTH_TOKEN}`;

const client = new Client({ name: "smoke", version: "1.0.0" });
await client.connect(new StreamableHTTPClientTransport(new URL(url), { requestInit: { headers } }));

const call = async (name: string, args: Record<string, unknown> = {}) => {
  const r: any = await client.callTool({ name, arguments: args });
  return { err: !!r.isError, text: r.content?.[0]?.text as string };
};
const pass = (m: string) => console.log("PASS", m);

const tools = (await client.listTools()).tools.map((t) => t.name);
assert.ok(tools.length >= 8, `need >= 8 tools, got ${tools.length}`);
pass(`${tools.length} tools: ${tools.join(", ")}`);

assert.ok(!(await call("list_files")).err); pass("list_files");
assert.ok(!(await call("write_file", { path: "_smoke/a.txt", content: "hello world" })).err); pass("write_file");
const r = await call("read_file", { path: "_smoke/a.txt" });
assert.match(r.text, /hello world/); pass("read_file");
const ver = r.text.match(/version: (\w+)/)![1];
assert.ok(!(await call("str_replace", { path: "_smoke/a.txt", old_str: "world", new_str: "MCP" })).err); pass("str_replace");
assert.ok((await call("str_replace", { path: "_smoke/a.txt", old_str: "zzz", new_str: "x" })).err); pass("str_replace rejects 0 matches");
assert.ok((await call("write_file", { path: "_smoke/a.txt", content: "x", if_version: ver })).err); pass("if_version conflict detected");
assert.match((await call("search", { query: "hello mcp" })).text, /_smoke\/a\.txt:1/); pass("search");
assert.ok(!(await call("git_status")).err); pass("git_status");
assert.ok(!(await call("git_log")).err); pass("git_log");

for (const p of ["../x.txt", "/etc/passwd", "sub/../../x", ".git/config"]) {
  assert.ok((await call("read_file", { path: p })).err, `escape not blocked: ${p}`);
}
pass("path escapes rejected");
assert.ok((await call("write_file", { path: "PLAN_LOG.md", content: "wiped" })).err); pass("PLAN_LOG.md overwrite blocked");
assert.ok((await call("delete_file", { path: "PROJECT_STATE.md" })).err); pass("protected file delete blocked");
assert.ok((await call("write_file", { path: "plan_log.md", content: "wiped" })).err); pass("append-only guard is case-insensitive");
assert.ok((await call("read_file", { path: ".GIT/config" })).err); pass(".GIT (different case) blocked");
assert.ok((await call("write_file", { path: "_smoke/big.txt", content: "x".repeat(1_000_001) })).err); pass("oversize write blocked");

assert.ok(!(await call("delete_file", { path: "_smoke/a.txt" })).err); pass("delete_file");
console.log("\nALL SMOKE CHECKS PASSED");
await client.close();
