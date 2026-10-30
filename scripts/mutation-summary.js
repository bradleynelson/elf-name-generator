// Turns Stryker's JSON report into a short Markdown summary for the GitHub Actions run page: the overall score against
// the alarm floor, then each file weakest first. Usage: node scripts/mutation-summary.js [report], after `stryker run`.
// Writes to $GITHUB_STEP_SUMMARY when set (in Actions), otherwise prints.
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const DEFAULT_REPORT = path.join(repositoryRoot, "reports", "mutation", "mutation.json");

// Stryker's own scoring: timeouts count as caught; ignored (disabled with a reason) and broken mutants do not count.
const CAUGHT = new Set(["Killed", "Timeout"]);
const MISSED = new Set(["Survived", "NoCoverage"]);

function scoreOf(mutants) {
    const caught = mutants.filter((m) => CAUGHT.has(m.status)).length;
    const missed = mutants.filter((m) => MISSED.has(m.status)).length;
    const excused = mutants.filter((m) => m.status === "Ignored").length;
    const total = caught + missed;
    return { caught, missed, excused, score: total ? (100 * caught) / total : 100 };
}

/** Markdown summary of a Stryker JSON report (mutation-testing-report-schema), weakest file first. */
export function summarizeMutationReport(report, breakAt) {
    const files = Object.entries(report.files)
        .map(([file, { mutants }]) => ({ file, ...scoreOf(mutants) }))
        .sort((a, b) => a.score - b.score || a.file.localeCompare(b.file));
    const overall = scoreOf(Object.values(report.files).flatMap((f) => f.mutants));
    const verdict =
        breakAt === undefined
            ? ""
            : overall.score < breakAt
              ? ` (below the ${breakAt}% floor)`
              : ` (floor ${breakAt}%)`;
    const row = (r) => `| ${r.file} | ${r.score.toFixed(1)}% | ${r.caught} | ${r.missed} | ${r.excused} |`;
    return [
        "## Mutation testing",
        "",
        `**Score: ${overall.score.toFixed(1)}%**${verdict}: ${overall.missed} changes no test noticed, ` +
            `${overall.excused} excused with a reason.`,
        "",
        "| File (weakest first) | Score | Caught | Missed | Excused |",
        "| --- | ---: | ---: | ---: | ---: |",
        ...files.map(row),
        "",
        "The full report, with every missed change, is attached to this run as the `mutation-report` artifact.",
        ""
    ].join("\n");
}

function main() {
    const reportPath = process.argv[2] || DEFAULT_REPORT;
    if (!existsSync(reportPath)) {
        console.error(`No mutation report at ${reportPath}; did Stryker run?`);
        process.exit(1);
    }
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    const config = JSON.parse(readFileSync(path.join(repositoryRoot, "stryker.config.json"), "utf8"));
    const summary = summarizeMutationReport(report, config.thresholds?.break);
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
    else console.log(summary);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
