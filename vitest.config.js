import { configDefaults, defineConfig } from "vitest/config";

// The site's scripts import each other as "./x.js?v=<version>" (cache-busting stamps, see scripts/stamp-version.js).
// Tests load and mock the plain module, so the stamp is dropped when resolving.
const ignoreVersionStamp = {
    name: "ignore-version-stamp",
    enforce: "pre",
    resolveId(source, importer) {
        const plain = source.replace(/\?v=[\w.-]+$/, "");
        return plain === source ? null : this.resolve(plain, importer, { skipSelf: true });
    }
};

export default defineConfig({
    plugins: [ignoreVersionStamp],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.js"],
        // a mutation rerun gives slow tests longer (scripts/mutation-run.js)
        ...(process.env.MUTATION_TEST_TIMEOUT_MS && { testTimeout: Number(process.env.MUTATION_TEST_TIMEOUT_MS) }),
        // a mutation run stopped early leaves its sandbox, with copies of every test, in .stryker-tmp
        // these two would kill nearly every generator mutant, hiding which behaviour tests are missing
        exclude: [
            ...configDefaults.exclude,
            ".stryker-tmp/**",
            ...(process.env.STRYKER_MUTATOR_WORKER
                ? ["tests/core/elfRecordedOutput.test.js", "tests/core/savedByOldReleases.test.js"]
                : [])
        ],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            // just under today's coverage (97.2 / 95.2 / 95.7 / 98.3), so a drop is noticed
            thresholds: {
                statements: 97,
                branches: 95,
                functions: 95,
                lines: 98
            },
            exclude: ["node_modules/", "tests/", "*.config.js", "data/"]
        }
    }
});
