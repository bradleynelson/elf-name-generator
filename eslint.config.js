import js from "@eslint/js";
import globals from "globals";

// Module boundaries: the core never reaches the page, storage or app, and each generator stands alone. Imports carry a
// "?v=X.Y.Z" stamp that scripts/version.js rewrites, so each pattern allows an optional query string after the file name.
const importOf = (names, message) => ({ regex: `(^|/)(${names})\\.js(\\?.*)?$`, message });
const CORE_IMPORT_PATTERNS = [
    importOf(
        "app|ui|dom|messages|sourcesPanel|nameLists|nameListsView|favorites|analytics",
        "Core code never imports the app, UI, storage or analytics modules."
    )
];
const SPECIES_GENERATOR_IMPORTS =
    "A species generator never imports another species, the generator seam or lineage descriptions.";
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
    // A lineage description arrives through the constructor, so a generator cannot look up which lineage it serves.
    {
        files: ["js/core/ElfNameGenerator.js"],
        rules: restrictImports([
            ...CORE_IMPORT_PATTERNS,
            importOf("DwarfNameGenerator|generators|\\w+Lineages", SPECIES_GENERATOR_IMPORTS)
        ])
    },
    {
        files: ["js/core/DwarfNameGenerator.js"],
        rules: restrictImports([
            ...CORE_IMPORT_PATTERNS,
            importOf("ElfNameGenerator|generators|\\w+Lineages", SPECIES_GENERATOR_IMPORTS)
        ])
    },
    {
        files: ["js/core/joiningLetters.js", "js/core/spelling.js", "js/core/nameTables.js", "js/core/nameRolls.js"],
        rules: restrictImports([
            ...CORE_IMPORT_PATTERNS,
            importOf("\\w+NameGenerator|generators|\\w+Lineages", "A shared core helper never imports a generator.")
        ])
    },
    // The app owns state; it reaches the page only through the page modules' render, focus and wire functions.
    {
        files: ["js/app.js", "js/nameLists.js"],
        rules: {
            "no-restricted-globals": [
                "error",
                { name: "document", message: "The app draws through a page module's render function." }
            ],
            ...restrictImports([importOf("dom", "The app draws through a page module's render function.")])
        }
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
