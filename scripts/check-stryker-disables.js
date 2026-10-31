// Counts the `Stryker disable` directives in js/ and compares each file with the ceiling in stryker-disable-ceiling.json.
// A disable is only for a truly equivalent mutant, and the count goes down, never up: a file above its ceiling fails, and
// so does a file below it, so the ceiling is lowered in the same commit as the directive it no longer needs.
// Usage: node scripts/check-stryker-disables.js (run by `npm run check`).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const CEILING_FILE = "stryker-disable-ceiling.json";

function jsFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) return jsFiles(full);
        return entry.name.endsWith(".js") ? [full] : [];
    });
}

/** Directive count per file under `root`/js, keyed by forward-slash path; files with none are left out. */
export function countStrykerDisables(root = repositoryRoot) {
    const counts = {};
    for (const file of jsFiles(path.join(root, "js"))) {
        const found = readFileSync(file, "utf8").match(/Stryker disable/g)?.length ?? 0;
        if (found) counts[path.relative(root, file).split(path.sep).join("/")] = found;
    }
    return counts;
}

/** Problems found comparing the counts with the ceiling (both `{ file: count }`); empty when they match. */
export function strykerDisableProblems(counts, ceiling) {
    const problems = [];
    for (const file of [...new Set([...Object.keys(counts), ...Object.keys(ceiling)])].sort()) {
        const found = counts[file] ?? 0;
        const allowed = ceiling[file] ?? 0;
        if (found > allowed) {
            problems.push(
                `${file}: ${found} Stryker disable directives, ceiling ${allowed}. Add a test or remove the code instead; a disable is only for a truly equivalent mutant.`
            );
        } else if (found < allowed) {
            problems.push(
                `${file}: ${found} Stryker disable directives, ceiling ${allowed}. Lower the ceiling to ${found} in ${CEILING_FILE} (it only moves down).`
            );
        }
    }
    return problems;
}

function main() {
    const ceiling = JSON.parse(readFileSync(path.join(repositoryRoot, CEILING_FILE), "utf8"));
    const problems = strykerDisableProblems(countStrykerDisables(), ceiling);
    if (problems.length) {
        console.error(problems.join("\n"));
        process.exit(1);
    }
    const total = Object.values(ceiling).reduce((sum, n) => sum + n, 0);
    console.log(`Stryker disable directives: ${total}, at the ceiling.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
