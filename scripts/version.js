#!/usr/bin/env node
// Bumps the version in package.json, package-lock.json, the index.html footer and every ?v= stamp, and turns the
// CHANGELOG's [Unreleased] entry into the new version. Nothing is written unless every file can be updated.
// Usage: node scripts/version.js [major|minor|patch]
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stampSources } from "./stamp-version.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const FOOTER = /v\d+\.\d+\.\d+\s*-\s*Last Updated\s*\d{2}-\d{2}-\d{2}/;
const UNRELEASED = /^## \[Unreleased\]/m;

/** The version after `current` for a "major", "minor" or "patch" bump. */
export function nextVersion(current, type) {
    const [major, minor, patch] = current.split(".").map(Number);
    if (type === "major") return `${major + 1}.0.0`;
    if (type === "minor") return `${major}.${minor + 1}.0`;
    if (type === "patch") return `${major}.${minor}.${patch + 1}`;
    throw new Error(`Invalid version type: ${type}. Use major, minor or patch.`);
}

/**
 * Bumps the version in the project under `root`; returns the new version.
 * @throws {Error} before writing anything, if the footer line or the changelog's [Unreleased] heading is missing
 */
export function bumpVersion(root, type, now = new Date()) {
    const read = (file) => readFileSync(path.join(root, file), "utf-8");
    const pad = (number) => String(number).padStart(2, "0");
    const [year, month, day] = [now.getFullYear(), pad(now.getMonth() + 1), pad(now.getDate())];

    const packageJson = JSON.parse(read("package.json"));
    const version = nextVersion(packageJson.version, type);
    // package-lock.json repeats the version at its top and for the root package; keep its indentation, as npm does
    const lockText = read("package-lock.json");
    const lock = JSON.parse(lockText);
    lock.version = version;
    lock.packages[""].version = version;
    const page = read("index.html");
    if (!FOOTER.test(page)) throw new Error("index.html has no footer line like: v1.2.3 - Last Updated 01-31-26");
    const changelog = read("CHANGELOG.md");
    if (!UNRELEASED.test(changelog)) {
        throw new Error(
            "CHANGELOG.md has no [Unreleased] heading to turn into the new version: write the changes up first."
        );
    }

    const written = {
        "package.json": JSON.stringify({ ...packageJson, version }, null, 4) + "\n",
        "package-lock.json": JSON.stringify(lock, null, lockText.match(/^\{\r?\n([ \t]+)/)?.[1] ?? 2) + "\n",
        "index.html": page.replace(FOOTER, `v${version} - Last Updated ${month}-${day}-${String(year).slice(-2)}`),
        "CHANGELOG.md": changelog.replace(UNRELEASED, `## [${version}] - ${year}-${month}-${day}`)
    };
    for (const [file, text] of Object.entries(written)) writeFileSync(path.join(root, file), text, "utf-8");
    stampSources(root, version);
    return version;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const type = process.argv[2] || "patch";
        const before = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf-8")).version;
        console.log(`Version bumped (${type}): ${before} -> ${bumpVersion(repositoryRoot, type)}`);
        console.log("Check that CHANGELOG.md describes the changes for visitors.");
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
