// Test setup file
import { beforeEach, afterEach } from "vitest";
import { writeFileSync, existsSync } from "fs";
import { join } from "path";

// Initialize test log on first run
const LOG_FILE = join(process.cwd(), "test-log.txt");
if (!existsSync(LOG_FILE)) {
    writeFileSync(LOG_FILE, "=== Test Log ===\n\n", "utf8");
}

// Clean up localStorage before each test
beforeEach(() => {
    if (typeof localStorage !== "undefined") {
        localStorage.clear();
    }
});

// Clean up after each test
afterEach(() => {
    // Any cleanup needed
});
