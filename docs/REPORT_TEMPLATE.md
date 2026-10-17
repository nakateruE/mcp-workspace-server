# Midterms Pt 1 report: workspace MCP server

Name / Group / Date:

## 1. Stack and why (about 1/2 page)
| Layer | Choice | Why | Alternative considered |
|---|---|---|---|
| Runtime + SDK | Node.js + TypeScript MCP SDK | (your reason) | Python + FastMCP |
| Transport | Streamable HTTP | (stateless, works through a tunnel) | stdio (local only) |
| Validation | zod | | pydantic |
| Exposure | ngrok static domain | | Cloudflare Tunnel, VPS |
| Process manager | pm2 | | systemd, Docker |
| Version control | git on the host | | |
| Testing | node:test, smoke script with real client, MCP Inspector | | |

## 2. Tool design choices (about 1/2 page)
- Why small single-purpose tools (10 tools) instead of one "do anything" tool
- Why `str_replace` requires exactly one match (no silent wrong edits, cheaper than rewriting files)
- Why `read_file` supports line ranges and returns a version (token efficiency, `if_version` conflict detection)
- Why `append_file` exists and `PLAN_LOG.md` is append-only (history cannot be erased by an agent)
- Why stateless server (no session to lose on pm2 restart)

## 3. Handoff protocol
Explain PROJECT_STATE, PLAN_LOG, CHECKPOINTS, DECISIONS and how session 2 resumed with no re-explaining. Cite the transcript.

## 4. Security tradeoffs (about 1/2 page)
- Root-resolve + containment check; why `root + sep`; symlink refusal (tradeoff: symlinks unsupported); `.git` blocked
- execFile argument arrays instead of shell strings
- Guards: size cap, protected files, append-only
- Auth: static token / URL secret; what that does NOT protect (leaked URL = full access, ngrok sees traffic)
- What you would add next (OAuth, rate limits, audit log)

## 5. Results
- Transcript summary (steps, tool calls per session, what the agent got right/wrong)
- What you would improve
