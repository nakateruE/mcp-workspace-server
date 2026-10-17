import fs from "node:fs/promises";
import path from "node:path";
import { git } from "./git.js";

/** Create the workspace, seed protocol files, init git. Safe to run every boot. */
export async function bootstrapWorkspace(root: string, templateDir: string) {
  await fs.mkdir(root, { recursive: true });
  // force:false keeps any existing files untouched
  await fs.cp(templateDir, root, { recursive: true, force: false, errorOnExist: false });
  try {
    await fs.access(path.join(root, ".git"));
  } catch {
    await git(root, ["init", "-q"]);
  }
  try {
    await git(root, ["rev-parse", "HEAD"]);
  } catch {
    await git(root, ["add", "-A"]);
    await git(root, [
      "-c", "user.name=mcp-agent", "-c", "user.email=mcp-agent@localhost",
      "commit", "-q", "-m", "init: seed protocol files",
    ]);
  }
}
