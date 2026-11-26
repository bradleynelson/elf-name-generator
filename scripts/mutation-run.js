// `npm run test:mutation`: a full Stryker run, then its timeouts and worker crashes rerun with a long limit and merged.
// Stryker counts a timeout as caught, but most timeouts here are slow tests, and survivors hid among them.
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Stryker } from "@stryker-mutator/core";
import { MERGED_REPORT } from "./mutation-summary.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const REPORT = path.join(repositoryRoot, "reports", "mutation", "mutation.json");
const RERUN_REPORT = "reports/mutation/mutation.rerun.json";
const RERUN = new Set(["Timeout", "RuntimeError"]);
// Chosen: ten minutes per mutant and two per test, so a slow test finishes; a mutant that really loops still ends.
const RERUN_TIMEOUT_MS = 600000;
const RERUN_TEST_TIMEOUT_MS = 120000;

const keyOf = (file, m) =>
    `${file}:${m.location.start.line}:${m.location.start.column} ${m.mutatorName} ${m.replacement}`;

/** The mutants a run timed out or crashed on, as `{ file, mutant }`, in report order. */
export function selectRerunMutants(report) {
    return Object.entries(report.files).flatMap(([file, { mutants }]) =>
        mutants.filter((m) => RERUN.has(m.status)).map((mutant) => ({ file, mutant }))
    );
}

/** Stryker `mutate` entries covering the picked mutants' whole lines, one per distinct range. */
export function formatMutateRanges(picked) {
    const ranges = picked.map(
        ({ file, mutant: { location } }) => `${file}:${location.start.line}-${location.end.line}`
    );
    return [...new Set(ranges)].sort();
}

/** A copy of `report` with each picked mutant's status taken from `rerun`; throws if any is missing from it. */
export function mergeRerun(report, rerun) {
    const rerunStatus = new Map(
        Object.entries(rerun.files).flatMap(([file, { mutants }]) => mutants.map((m) => [keyOf(file, m), m.status]))
    );
    const merged = structuredClone(report);
    const missing = [];
    for (const { file, mutant } of selectRerunMutants(merged)) {
        const status = rerunStatus.get(keyOf(file, mutant));
        if (status) mutant.status = status;
        else missing.push(keyOf(file, mutant));
    }
    if (missing.length) {
        throw new Error(`${missing.length} mutant missing from the rerun, so not judged:\n${missing.join("\n")}`);
    }
    return merged;
}

const readReport = (file) => JSON.parse(readFileSync(file, "utf8"));

async function main() {
    await new Stryker({}).runMutationTest();
    const report = readReport(REPORT);
    const picked = selectRerunMutants(report);
    if (!picked.length) {
        copyFileSync(REPORT, MERGED_REPORT);
        return;
    }
    console.log(`Rerunning ${picked.length} timed-out or crashed mutants with a long limit.`);
    // read by vitest.config.js in the Stryker workers this starts
    process.env.MUTATION_TEST_TIMEOUT_MS = String(RERUN_TEST_TIMEOUT_MS);
    await new Stryker({
        mutate: formatMutateRanges(picked),
        timeoutMS: RERUN_TIMEOUT_MS,
        reporters: ["clear-text", "progress", "json"],
        jsonReporter: { fileName: RERUN_REPORT }
    }).runMutationTest();
    writeFileSync(
        MERGED_REPORT,
        JSON.stringify(mergeRerun(report, readReport(path.join(repositoryRoot, RERUN_REPORT))))
    );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
