// Reads the merged report that `npm run test:mutation` writes, after timeouts and crashes were rerun with a long limit.
// Writes to $GITHUB_STEP_SUMMARY when set (in Actions), otherwise prints; fails when a file's missed count moved.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ceilingProblems } from "./ceiling.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const MERGED_REPORT = path.join(repositoryRoot, "reports", "mutation", "mutation.merged.json");
const CEILING_FILE = "mutation-missed-ceiling.json";

// Stryker's own scoring: timeouts count as caught; ignored (disabled with a reason) and broken mutants do not count.
// In the merged report a timeout has had the long limit, so it is a hang, listed apart.
const CAUGHT = new Set(["Killed", "Timeout"]);
const MISSED = new Set(["Survived", "NoCoverage"]);

function scoreOf(mutants) {
    const caught = mutants.filter((m) => CAUGHT.has(m.status)).length;
    const missed = mutants.filter((m) => MISSED.has(m.status)).length;
    const excused = mutants.filter((m) => m.status === "Ignored").length;
    const total = caught + missed;
    return { caught, missed, excused, score: total ? (100 * caught) / total : 100 };
}

function listed(files, isListed) {
    const lines = files.flatMap(({ file, mutants }) =>
        mutants
            .filter(isListed)
            .sort((a, b) => a.location.start.line - b.location.start.line)
            .map((m) => `- ${file}:${m.location.start.line} ${m.mutatorName} → \`${m.replacement}\``)
    );
    return lines.length ? lines : ["None."];
}

/**
 * Markdown summary of a merged Stryker JSON report (mutation-testing-report-schema), weakest file first, and the
 * problems found comparing each file's missed count with the ceiling (`{ file: count }`); no problems is a pass.
 */
export function summarizeMutationReport(report, ceiling) {
    const files = Object.entries(report.files).map(([file, { mutants }]) => ({ file, mutants, ...scoreOf(mutants) }));
    const overall = scoreOf(files.flatMap((f) => f.mutants));
    const missedByFile = Object.fromEntries(files.filter((f) => f.missed).map((f) => [f.file, f.missed]));
    const problems = ceilingProblems(missedByFile, ceiling, {
        noun: "missed mutants",
        ceilingFile: CEILING_FILE,
        overAdvice: "Add a test or remove the code."
    });
    const row = (r) => `| ${r.file} | ${r.score.toFixed(1)}% | ${r.caught} | ${r.missed} | ${r.excused} |`;
    const markdown = [
        "## Mutation testing",
        "",
        `**Score: ${overall.score.toFixed(1)}%**: ${overall.missed} changes no test noticed, ` +
            `${overall.excused} excused with a reason.`,
        "",
        ...(problems.length ? ["**Missed counts moved:**", "", ...problems.map((p) => `- ${p}`), ""] : []),
        "| File (weakest first) | Score | Caught | Missed | Excused |",
        "| --- | ---: | ---: | ---: | ---: |",
        ...[...files].sort((a, b) => a.score - b.score || a.file.localeCompare(b.file)).map(row),
        "",
        "### Missed",
        "",
        ...listed(files, (m) => MISSED.has(m.status)),
        "",
        "### Hangs (still timing out with the long limit; counted as caught)",
        "",
        ...listed(files, (m) => m.status === "Timeout"),
        "",
        "### Not judged (the worker crashed in the rerun too; not counted)",
        "",
        ...listed(files, (m) => m.status === "RuntimeError"),
        "",
        "The full reports are attached to this run as the `mutation-report` artifact. Stryker's HTML report is from " +
            "the first pass, so it still counts that pass's timeouts as caught.",
        ""
    ].join("\n");
    return { markdown, problems };
}

function main() {
    const reportPath = process.argv[2] || MERGED_REPORT;
    if (!existsSync(reportPath)) {
        console.error(`No mutation report at ${reportPath}; run \`npm run test:mutation\`.`);
        process.exit(1);
    }
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const ceiling = JSON.parse(readFileSync(path.join(repositoryRoot, CEILING_FILE), "utf8"));
    const { markdown, problems } = summarizeMutationReport(report, ceiling);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
    else console.log(markdown);
    if (problems.length) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
