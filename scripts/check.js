// Runs the same complete quality gate locally and in CI, using the npm executable that launched this script.
import { spawnSync } from "node:child_process";

const checks = [
    "lint",
    "format:check",
    "check:duplication",
    "check:unused",
    "test:coverage",
    "test:release",
    "build:site",
    "check:release"
];

if (!process.env.npm_execpath) throw new Error("Run this quality gate with `npm run check`.");

for (const check of checks) {
    const result = spawnSync(process.execPath, [process.env.npm_execpath, "run", check], { stdio: "inherit" });
    if (result.status !== 0) process.exit(result.status ?? 1);
}
