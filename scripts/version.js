#!/usr/bin/env node
/**
 * Version management script
 * Updates the version in package.json, package-lock.json, the index.html footer and every ?v= stamp, and turns the
 * CHANGELOG's [Unreleased] entry into the new version.
 * Usage: node scripts/version.js [major|minor|patch]
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { stampSources } from "./stamp-version.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Get version type from command line (major, minor, patch)
const versionType = process.argv[2] || "patch";

// Validate version type
if (!["major", "minor", "patch"].includes(versionType)) {
    console.error(`Invalid version type: ${versionType}`);
    console.error("Usage: node scripts/version.js [major|minor|patch]");
    process.exit(1);
}

// Read current package.json
const packagePath = join(rootDir, "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
const currentVersion = packageJson.version;

// Parse version
const [major, minor, patch] = currentVersion.split(".").map(Number);

// Bump version based on type
let newMajor = major;
let newMinor = minor;
let newPatch = patch;

if (versionType === "major") {
    newMajor += 1;
    newMinor = 0;
    newPatch = 0;
} else if (versionType === "minor") {
    newMinor += 1;
    newPatch = 0;
} else {
    newPatch += 1;
}

const newVersion = `${newMajor}.${newMinor}.${newPatch}`;

// Update package.json
packageJson.version = newVersion;
writeFileSync(packagePath, JSON.stringify(packageJson, null, 4) + "\n");
console.log(`✓ Updated package.json: ${currentVersion} → ${newVersion}`);

// package-lock.json repeats the version at its top and for the root package; keep its indentation, as npm does
const lockPath = join(rootDir, "package-lock.json");
const lockText = readFileSync(lockPath, "utf-8");
const lock = JSON.parse(lockText);
lock.version = newVersion;
lock.packages[""].version = newVersion;
writeFileSync(lockPath, JSON.stringify(lock, null, lockText.match(/^\{\r?\n([ \t]+)/)?.[1] ?? 2) + "\n");
console.log(`✓ Updated package-lock.json`);

// Update index.html
const indexPath = join(rootDir, "index.html");
let indexContent = readFileSync(indexPath, "utf-8");

// Get current date in MM-DD-YY format
const now = new Date();
const month = String(now.getMonth() + 1).padStart(2, "0");
const day = String(now.getDate()).padStart(2, "0");
const year = String(now.getFullYear()).slice(-2);
const dateString = `${month}-${day}-${year}`;

// Replace version line: v#.#.# - Last Updated MM-DD-YY
const versionRegex = /v\d+\.\d+\.\d+\s*-\s*Last Updated\s*\d{2}-\d{2}-\d{2}/;
const newVersionLine = `v${newVersion} - Last Updated ${dateString}`;

if (versionRegex.test(indexContent)) {
    indexContent = indexContent.replace(versionRegex, newVersionLine);
    writeFileSync(indexPath, indexContent, "utf-8");
    console.log(`✓ Updated index.html: ${newVersionLine}`);
} else {
    console.warn("⚠ Could not find version line in index.html");
}

// Stamp every script, stylesheet and data link with the new version (the site is served from these files)
const stamped = stampSources(rootDir, newVersion);
console.log(`✓ Stamped v${newVersion} on ${stamped.length} files`);

// Update CHANGELOG.md
const changelogPath = join(rootDir, "CHANGELOG.md");
try {
    let changelogContent = readFileSync(changelogPath, "utf-8");

    // Add new version entry at the top
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const dateStringFull = `${year}-${month}-${day}`;

    const heading = `## [${newVersion}] - ${dateStringFull}`;

    if (/^## \[Unreleased\]/m.test(changelogContent)) {
        // the changes were written up as they were made: they become this version
        changelogContent = changelogContent.replace(/^## \[Unreleased\]/m, heading);
    } else {
        // Insert above the newest existing entry, so the intro paragraph stays under the "# Changelog" header
        changelogContent = changelogContent.replace(/^## \[/m, `${heading}\n\n### Changed\n- Version bump\n\n## [`);
    }

    writeFileSync(changelogPath, changelogContent, "utf-8");
    console.log(`✓ Updated CHANGELOG.md`);
} catch (error) {
    console.warn("⚠ Could not update CHANGELOG.md:", error.message);
}

console.log(`\n✅ Version bumped: ${currentVersion} → ${newVersion} (${versionType})`);
console.log(`📅 Date updated: ${dateString}`);
console.log(`\n💡 Check that CHANGELOG.md describes the changes for visitors.`);
