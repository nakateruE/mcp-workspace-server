# mcp-workspace-server

A sandboxed **MCP file-server connector**: shared memory for you and your AI agents.
Node.js + TypeScript MCP SDK, Streamable HTTP, zod validation, ngrok tunnel, pm2.

## Requirements covered
| # | Requirement | Where |
|---|---|---|
| 01 | Sandboxed workspace root, escapes rejected | `src/sandbox.ts`, `test/sandbox.test.ts` |
| 02 | 8+ tools (file ops + git-lite + search) | `src/tools.ts` (10 tools) |
| 03 | HTTPS via tunnel, kept alive by a process manager | ngrok + pm2 (`ecosystem.config.cjs`) |
| 04 | Handoff protocol | `workspace-template/` (PROJECT_STATE, PLAN_LOG, CHECKPOINTS, DECISIONS) |
| 05 | Real MCP client, multi-step task, 2+ sessions | `docs/DEMO_TASK.md` |
| 06 | Report on stack, tool design, security | `docs/REPORT_TEMPLATE.md` |
| Stretch | `if_version` locking, `search`, token auth | `read_file` returns a version; `write_file`/`str_replace` accept `if_version` |

## Tools
| Tool | What it does |
|---|---|
| `list_files` | List a directory |
| `read_file` | Read a file (optional line range) and return its version hash |
| `write_file` | Create/overwrite (1 MB cap, optional `if_version`) |
| `append_file` | Append to a file (use for `PLAN_LOG.md`) |
| `str_replace` | Replace one exact string; must match exactly once |
| `delete_file` | Delete one file (protocol files protected) |
| `search` | Literal or regex search, capped results |
| `git_status` / `git_commit` / `git_log` | Git-lite on the workspace repo |

## Setup
Requires Node 20.12+ (tested on 22) and git.

```bash
npm install
cp .env.example .env          # then edit it (see below)
npm test                      # sandbox unit tests
npm run dev                   # starts on http://localhost:3000/mcp
```
In `.env`, set `AUTH_TOKEN` (`openssl rand -hex 24`) and `NGROK_DOMAIN`.
On first boot the server creates `workspace/`, copies the protocol files from
`workspace-template/`, runs `git init`, and makes the first commit.

### Check it works
With the server running, in a second terminal:
```bash
npm run smoke        # real MCP client: lists tools, exercises each, tries escapes
npx @modelcontextprotocol/inspector   # optional GUI; Streamable HTTP, URL http://localhost:3000/mcp
```
In the Inspector, add the header `Authorization: Bearer <AUTH_TOKEN>`.

## Deploy (HTTPS + keep-alive)
1. Create a free ngrok account, install ngrok, run `ngrok config add-authtoken <token>`.
2. In the ngrok dashboard, claim your free **static domain**; put it in `.env` as `NGROK_DOMAIN`.
3. Run:
```bash
npm run build
npm i -g pm2
set -a; source .env; set +a      # so ecosystem.config.cjs sees NGROK_DOMAIN
pm2 start ecosystem.config.cjs
pm2 save
pm2 status                       # both mcp-server and mcp-tunnel should be "online"
```
4. Test the public URL:
```bash
curl https://$NGROK_DOMAIN/health
MCP_URL=https://$NGROK_DOMAIN/s/$AUTH_TOKEN/mcp npm run smoke
```
5. Auto-start on reboot: `pm2 startup` (run the command it prints).
Useful: `pm2 logs mcp-server` shows one JSON line per tool call (evidence for the efficiency rubric).

## Connect a real MCP client
Use the URL **`https://<NGROK_DOMAIN>/s/<AUTH_TOKEN>/mcp`**. The secret in the path is the fallback for clients that cannot send an `Authorization` header (the server also accepts `Authorization: Bearer <AUTH_TOKEN>`).
Add it as a custom connector in your MCP client (for example Claude: Settings, Connectors, Add custom connector). If your plan does not allow custom connectors, use another real client your course accepts.

## Handoff protocol
Agents read `AGENT_README.md` first. Session start: `PROJECT_STATE.md`, `DECISIONS.md`, newest checkpoint.
During: `str_replace` for edits, `append_file` for `PLAN_LOG.md`. End: write `CHECKPOINTS/cp-NN.md`,
update `PROJECT_STATE.md`, `git_commit`.

## Security notes
- Every path is resolved against the workspace root; results outside it are rejected (also blocks `/abs` paths and sibling-prefix dirs).
- Symlinks and `.git` are refused; NUL bytes rejected.
- git runs with `execFile` and an argument array (no shell, no injection); commit messages capped.
- Guards: 1 MB write cap, `PLAN_LOG.md` append-only, protocol files cannot be deleted, `str_replace` needs exactly one match, optional `if_version`.
- Auth: static token (header or URL secret). Anyone with the URL secret can edit the workspace. Traffic passes through ngrok (third party). Rotate `AUTH_TOKEN` after the demo.
- Not covered: rate limiting, per-user auth/OAuth, audit beyond pm2 logs.

## Before you record the real demo
Reset the workspace so the transcript is clean: `pm2 stop mcp-server && rm -rf workspace && pm2 restart mcp-server`
(the smoke test leaves an empty `workspace/_smoke/` folder).
