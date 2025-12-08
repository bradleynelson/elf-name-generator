#!/usr/bin/env node
/**
 * Version management script
 * Updates version in package.json and index.html
 * Usage: node scripts/version.js [major|minor|patch]
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

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
writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");
console.log(`✓ Updated package.json: ${currentVersion} → ${newVersion}`);

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

    const newEntry = `## [${newVersion}] - ${dateStringFull}\n\n### Changed\n- Version bump\n\n`;

    // Insert after the "# Changelog" header
    changelogContent = changelogContent.replace(/(# Changelog\n\n)/, `$1${newEntry}`);

    writeFileSync(changelogPath, changelogContent, "utf-8");
    console.log(`✓ Updated CHANGELOG.md`);
} catch (error) {
    console.warn("⚠ Could not update CHANGELOG.md:", error.message);
}

console.log(`\n✅ Version bumped: ${currentVersion} → ${newVersion} (${versionType})`);
console.log(`📅 Date updated: ${dateString}`);
console.log(`\n💡 Remember to update CHANGELOG.md with actual changes!`);
