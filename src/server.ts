import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { bootstrapWorkspace } from "./bootstrap.js";
import { createSandbox } from "./sandbox.js";
import { registerTools } from "./tools.js";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execAsync = promisify(execFile);

try { process.loadEnvFile(); } catch { /* no .env file, use real env vars */ }

const here = path.dirname(fileURLToPath(import.meta.url));
// Works from src/ (tsx) and dist/src/ (compiled): walk up to the folder with package.json
function findProjectRoot(dir: string): string {
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("package.json not found");
    dir = parent;
  }
  return dir;
}
const projectRoot = findProjectRoot(here);
const PORT = Number(process.env.PORT ?? 3000);
const WORKSPACE = path.resolve(projectRoot, process.env.WORKSPACE ?? "workspace");
const TOKEN = process.env.AUTH_TOKEN;

await bootstrapWorkspace(WORKSPACE, path.join(projectRoot, "workspace-template"));
const sandbox = await createSandbox(WORKSPACE);

const same = (a: string, b: string) => {
  const A = Buffer.from(a), B = Buffer.from(b);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
};

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => { res.json({ ok: true }); });

// Auth: either "Authorization: Bearer <token>" or secret in the URL: /s/<token>/mcp
// (some clients can't send custom headers, so the URL form is the fallback).
function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!TOKEN) return next();
  const header = req.headers.authorization ?? "";
  const secret = typeof req.params.secret === "string" ? req.params.secret : "";
  if (same(header, `Bearer ${TOKEN}`) || (secret && same(secret, TOKEN))) return next();
  res.status(401).json({ error: "unauthorized" });
}

function logCall(body: any) {
  // One JSON line per MCP request -> evidence for the efficiency rubric (pm2 logs it).
  const entry = {
    t: new Date().toISOString(),
    method: body?.method,
    tool: body?.params?.name,
    args: body?.params?.arguments ? Object.keys(body.params.arguments) : undefined,
  };
  if (entry.method === "tools/call") console.log(JSON.stringify(entry));
}

async function handleMcp(req: express.Request, res: express.Response) {
  logCall(req.body);
  const server = new McpServer({ name: "workspace-fs", version: "1.0.0" });
  registerTools(server, sandbox);
  // Stateless: a fresh server+transport per request, no session to lose on restart.
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
}

const methodNotAllowed = (_req: express.Request, res: express.Response) => {
  res.status(405).json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed" }, id: null });
};

for (const route of ["/mcp", "/s/:secret/mcp"]) {
  app.post(route, auth, (req, res) => {
    handleMcp(req, res).catch((e) => {
      console.error(e);
      if (!res.headersSent) res.status(500).json({ error: "internal error" });
    });
  });
  app.get(route, methodNotAllowed);
  app.delete(route, methodNotAllowed);
}

app.listen(PORT, () => {
  console.log(`MCP server listening on :${PORT}/mcp  workspace=${sandbox.root}  auth=${TOKEN ? "on" : "OFF"}`);
});
