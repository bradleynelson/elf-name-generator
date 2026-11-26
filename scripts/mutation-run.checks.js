// Node's test runner (`npm run test:release`).
import assert from "node:assert/strict";
import test from "node:test";
import { formatMutateRanges, mergeRerun, selectRerunMutants } from "./mutation-run.js";

const mutant = (status, start, end = start, { mutatorName = "BooleanLiteral", replacement = "false" } = {}) => ({
    status,
    mutatorName,
    replacement,
    location: { start: { line: start, column: 5 }, end: { line: end, column: 9 } }
});
const reportOf = (files) => ({
    files: Object.fromEntries(Object.entries(files).map(([file, list]) => [file, { mutants: list }]))
});

test("timeouts and worker crashes are picked for the rerun, as whole-line ranges", () => {
    const report = reportOf({
        "js/core/b.js": [mutant("Timeout", 7, 9), mutant("Survived", 8)],
        "js/core/a.js": [mutant("RuntimeError", 3), mutant("Timeout", 3), mutant("Killed", 4), mutant("Ignored", 5)]
    });
    const picked = selectRerunMutants(report);
    assert.deepEqual(
        picked.map(({ file, mutant: m }) => `${file}:${m.location.start.line} ${m.status}`),
        ["js/core/b.js:7 Timeout", "js/core/a.js:3 RuntimeError", "js/core/a.js:3 Timeout"]
    );
    // column ranges missed a third of the mutants, so whole lines are rerun; one entry per range
    assert.deepEqual(formatMutateRanges(picked), ["js/core/a.js:3-3", "js/core/b.js:7-9"]);
});

test("the merge takes each rerun mutant's new status and leaves every other mutant as the first run judged it", () => {
    const negated = { mutatorName: "BooleanLiteral", replacement: "true" };
    const report = reportOf({
        "js/core/a.js": [mutant("Timeout", 3), mutant("Timeout", 3, 3, negated), mutant("Survived", 4)],
        "js/core/b.js": [mutant("RuntimeError", 7), mutant("Killed", 8)]
    });
    // the rerun also judged mutants that only shared a line with them; those keep the first run's status
    const rerun = reportOf({
        "js/core/a.js": [mutant("Survived", 3), mutant("Timeout", 3, 3, negated)],
        "js/core/b.js": [mutant("Killed", 7), mutant("Survived", 8)]
    });
    const merged = mergeRerun(report, rerun);
    const statuses = (file) => merged.files[file].mutants.map((m) => m.status);
    assert.deepEqual(statuses("js/core/a.js"), ["Survived", "Timeout", "Survived"]);
    assert.deepEqual(statuses("js/core/b.js"), ["Killed", "Killed"]);
    assert.equal(report.files["js/core/a.js"].mutants[0].status, "Timeout", "the first run's report is not changed");
});

test("the merge fails, naming each one, when a picked mutant is missing from the rerun", () => {
    const report = reportOf({ "js/core/a.js": [mutant("Timeout", 3), mutant("Timeout", 9)] });
    const rerun = reportOf({ "js/core/a.js": [mutant("Killed", 3)] });
    assert.throws(
        () => mergeRerun(report, rerun),
        /1 mutant missing from the rerun.*js\/core\/a\.js:9:5 BooleanLiteral/s
    );
});
