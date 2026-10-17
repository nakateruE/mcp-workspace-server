import { execFile } from "node:child_process";

/** Run git with an argument ARRAY (never a shell string -> no command injection). */
export function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      args,
      { cwd, timeout: 10_000, maxBuffer: 1_000_000 },
      (err, stdout, stderr) => {
        if (err) return reject(new Error((stderr || err.message).trim()));
        resolve(stdout.trim());
      },
    );
  });
}
