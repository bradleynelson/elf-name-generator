// Script to parse Vitest output and log to test-log.txt
// Run this after tests: npm test 2>&1 | node scripts/log-test-run.js
import { appendFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { readFileSync } from "fs";

const LOG_FILE = join(process.cwd(), "test-log.txt");

// Initialize log if it doesn't exist
if (!existsSync(LOG_FILE)) {
    writeFileSync(LOG_FILE, "=== Test Log ===\n\n", "utf8");
}

// Parse command line arguments (passed from test output)
// Expected format: node scripts/log-test-run.js <passed> <failed> <total> <duration>
const passed = parseInt(process.argv[2]) || 0;
const failed = parseInt(process.argv[3]) || 0;
const total = parseInt(process.argv[4]) || 0;
const duration = parseInt(process.argv[5]) || 0;

// Log the test run
const timestamp = new Date().toISOString();
const status = failed === 0 ? "PASS" : "FAIL";

const entry = `[RUN] ${timestamp} - ${status}\n  Passed: ${passed}/${total}\n  Failed: ${failed}/${total}\n  Duration: ${duration}ms\n\n`;

appendFileSync(LOG_FILE, entry, "utf8");
console.log(`✓ Test run logged to test-log.txt`);
