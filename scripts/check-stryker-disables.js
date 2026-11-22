// A Stryker disable is only for a truly equivalent mutant, so its per-file ceiling only moves down.
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ceilingProblems } from "./ceiling.js";

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
    return ceilingProblems(counts, ceiling, {
        noun: "Stryker disable directives",
        ceilingFile: CEILING_FILE,
        overAdvice: "Add a test or remove the code instead; a disable is only for a truly equivalent mutant."
    });
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
