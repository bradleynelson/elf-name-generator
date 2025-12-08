// Script to manually log test file updates
import { appendFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const LOG_FILE = join(process.cwd(), "test-log.txt");

// Initialize log if it doesn't exist
if (!existsSync(LOG_FILE)) {
    writeFileSync(LOG_FILE, "=== Test Log ===\n\n", "utf8");
}

// Get command line arguments
const file = process.argv[2] || "Unknown file";
const reason = process.argv[3] || "Test file updated";

// Log the update
const timestamp = new Date().toISOString();
const entry = `[UPDATE] ${timestamp}\n  File: ${file}\n  Reason: ${reason}\n\n`;

appendFileSync(LOG_FILE, entry, "utf8");
console.log(`✓ Logged test update: ${file}`);
