// Checks the published site after a deploy: the page carries this version, every approved file is served, and every
// other file in the repository returns 404. Packaging tests prove what dist/ holds; only this proves what the host
// serves. Usage: node scripts/check-live-site.js [base URL], from a Git checkout (it lists the tracked files).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
// Chosen: Pages can take a few minutes to serve a new deployment everywhere; wait up to 10 minutes for the version.
const VERSION_ATTEMPTS = 20;
const VERSION_WAIT_MS = 30_000;
// Chosen: the version can already match while Pages still serves the previous deployment (same-version deploys and
// re-runs), so the files are re-checked for up to 5 minutes before they count as wrong.
const PROBLEM_ATTEMPTS = 10;
const PROBLEM_WAIT_MS = 30_000;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

// approved, but read by GitHub Pages for its settings rather than served
const HOST_FILES = new Set(["CNAME"]);

/** What the host must serve and what it must not: the approved files, and every other tracked file. */
export function getLiveExpectations(approved, tracked) {
    const isApproved = new Set(approved);
    return {
        served: approved.filter((file) => !HOST_FILES.has(file)),
        hidden: tracked.filter((file) => !isApproved.has(file)).sort()
    };
}

// a query string the CDN has not cached, so each check sees what the host serves now
const fresh = (base, file, token) => `${base}/${file.split("/").map(encodeURIComponent).join("/")}?live-check=${token}`;

async function status(url) {
    const response = await fetch(url, { redirect: "manual" });
    return { code: response.status, text: response.ok ? await response.text() : "" };
}

async function waitForVersion(base, version, token) {
    for (let attempt = 1; attempt <= VERSION_ATTEMPTS; attempt++) {
        const { code, text } = await status(`${base}/?live-check=${token}-${attempt}`);
        if (code === 200 && text.includes(`?v=${version}"`)) return;
        if (attempt < VERSION_ATTEMPTS) await sleep(VERSION_WAIT_MS);
    }
    throw new Error(`${base}/ does not show version ${version}.`);
}

/**
 * Runs findProblems(attempt) until it returns none, waiting between attempts; returns the problems still present
 * after the last attempt (an empty list means the site is right).
 */
export async function retryWhileProblems(findProblems, { attempts = PROBLEM_ATTEMPTS, waitMs = PROBLEM_WAIT_MS } = {}) {
    let problems = [];
    for (let attempt = 1; attempt <= attempts; attempt++) {
        problems = await findProblems(attempt);
        if (!problems.length) return [];
        if (attempt < attempts) await sleep(waitMs);
    }
    return problems;
}

async function findProblems(base, served, hidden, token) {
    const problems = [];
    for (const file of served) {
        const { code } = await status(fresh(base, file, token));
        if (code !== 200) problems.push(`approved file not served (${code}): ${file}`);
    }
    for (const file of hidden) {
        const { code } = await status(fresh(base, file, token));
        if (code !== 404) problems.push(`file outside the release is reachable (${code}): ${file}`);
    }
    return problems;
}

export async function checkLiveSite(base = "https://espruar.com", root = repositoryRoot) {
    const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
    const approved = JSON.parse(readFileSync(path.join(root, "release-files.json"), "utf8"));
    const tracked = execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
    const { served, hidden } = getLiveExpectations(approved, tracked);
    const token = Date.now().toString(36);
    await waitForVersion(base, version, token);
    // a new token each attempt, so a cached answer from an earlier attempt is not read again
    const problems = await retryWhileProblems((attempt) => findProblems(base, served, hidden, `${token}-${attempt}`));
    if (problems.length) throw new Error(problems.join("\n"));
    return { version, served: served.length, hidden: hidden.length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const base = (process.argv[2] || "https://espruar.com").replace(/\/$/, "");
        const { version, served, hidden } = await checkLiveSite(base);
        console.log(
            `Live check passed: ${base} shows ${version}, ${served} approved files served, ${hidden} others 404.`
        );
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
