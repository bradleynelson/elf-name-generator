// ESLint flat config (replaces .eslintrc.json and .eslintignore, which ESLint 9+ no longer reads).
import js from "@eslint/js";
import globals from "globals";

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
