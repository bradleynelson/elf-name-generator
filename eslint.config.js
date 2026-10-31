// ESLint flat config (replaces .eslintrc.json and .eslintignore, which ESLint 9+ no longer reads).
import js from "@eslint/js";
import globals from "globals";

// Module boundaries (AGENTS.md, Code conventions: Boundaries). Imports carry a "?v=X.Y.Z" stamp that scripts/version.js
// rewrites, so each pattern allows an optional query string after the file name.
const importOf = (names, message) => ({ regex: `(^|/)(${names})\\.js(\\?.*)?$`, message });
const CORE_IMPORT_PATTERNS = [
    importOf("app|ui|favorites|analytics", "Core code never imports the app, UI, storage or analytics modules.")
];
const restrictImports = (patterns) => ({ "no-restricted-imports": ["error", { patterns }] });

export default [
    { ignores: ["node_modules/", "coverage/", "dist/", "build/", "data/"] },
    js.configs.recommended,
    {
        files: ["js/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.browser
        }
    },
    { files: ["js/core/**/*.js"], rules: restrictImports(CORE_IMPORT_PATTERNS) },
    {
        files: ["js/core/ElfNameGenerator.js"],
        rules: restrictImports([
            ...CORE_IMPORT_PATTERNS,
            importOf(
                "DrowNameGenerator|generators",
                "A species generator never imports another species or the generator seam."
            )
        ])
    },
    {
        files: ["js/core/DrowNameGenerator.js"],
        rules: restrictImports([
            ...CORE_IMPORT_PATTERNS,
            importOf(
                "ElfNameGenerator|generators",
                "A species generator never imports another species or the generator seam."
            )
        ])
    },
    {
        files: ["js/favorites.js"],
        rules: restrictImports([
            importOf(
                "\\w+NameGenerator",
                "Storage depends on shared constants (core/species.js), not a generator class."
            )
        ])
    },
    {
        files: ["tests/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.browser, ...globals.node }
        }
    },
    {
        files: ["scripts/**/*.js", "*.config.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.node
        }
    },
    {
        files: ["js/**/*.js", "tests/**/*.js", "scripts/**/*.js", "*.config.js"],
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-console": "off",
            "no-undef": "error",
            "prefer-const": "warn",
            "no-var": "error"
        }
    }
];
