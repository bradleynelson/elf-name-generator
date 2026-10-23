// ESLint flat config (replaces .eslintrc.json and .eslintignore, which ESLint 9+ no longer reads).
import js from "@eslint/js";
import globals from "globals";

export default [
    { ignores: ["node_modules/", "coverage/", "dist/", "build/", "data/", "scripts/", "*.config.js"] },
    js.configs.recommended,
    {
        files: ["js/**/*.js", "tests/**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: { ...globals.browser, ...globals.node }
        },
        rules: {
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            "no-console": "off",
            "no-undef": "error",
            "prefer-const": "warn",
            "no-var": "error"
        }
    }
];
