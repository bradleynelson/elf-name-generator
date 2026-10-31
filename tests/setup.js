// Test setup file
import { beforeEach } from "vitest";

// Clean up localStorage before each test
beforeEach(() => {
    if (typeof localStorage !== "undefined") {
        localStorage.clear();
    }
});
