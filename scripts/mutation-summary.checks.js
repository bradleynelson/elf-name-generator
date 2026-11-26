// Node's test runner (`npm run test:release`).
import assert from "node:assert/strict";
import test from "node:test";
import { summarizeMutationReport } from "./mutation-summary.js";

const mutant = (status, line = 1, mutatorName = "BooleanLiteral", replacement = "false") => ({
    status,
    mutatorName,
    replacement,
    location: { start: { line, column: 5 }, end: { line, column: 9 } }
});
const mutants = (...statuses) => ({ mutants: statuses.map((status) => mutant(status)) });

test("the mutation summary scores timeouts as caught, leaves excused mutants out, and lists the weakest file first", () => {
    const report = {
        files: {
            "js/core/strong.js": mutants("Killed", "Killed", "Timeout", "Survived"),
            "js/core/weak.js": mutants("Killed", "Survived", "NoCoverage", "Ignored", "CompileError")
        }
    };
    const { markdown } = summarizeMutationReport(report, { "js/core/strong.js": 1, "js/core/weak.js": 2 });
    // 4 caught of 7 counted; Ignored (excused with a reason) and CompileError are not counted
    assert.match(markdown, /\*\*Score: 57\.1%\*\*: 3 changes no test noticed, 1 excused/);
    assert.ok(markdown.indexOf("weak.js | 33.3%") < markdown.indexOf("strong.js | 75.0%"), "weakest file first");
});

test("the mutation summary fails when a file has more or fewer missed mutants than its ceiling, naming the file", () => {
    const report = { files: { "js/core/a.js": mutants("Survived", "NoCoverage"), "js/core/b.js": mutants("Killed") } };
    assert.deepEqual(summarizeMutationReport(report, { "js/core/a.js": 2 }).problems, []);
    const more = summarizeMutationReport(report, { "js/core/a.js": 1 }).problems;
    assert.match(more[0], /^js\/core\/a\.js: 2 missed mutants, ceiling 1\. Add a test or remove the code/);
    const fewer = summarizeMutationReport(report, { "js/core/a.js": 2, "js/core/b.js": 1 }).problems;
    assert.match(fewer[0], /^js\/core\/b\.js: .*Lower the ceiling to 0 /);
    assert.match(summarizeMutationReport(report, { "js/core/a.js": 1 }).markdown, /js\/core\/a\.js: 2 missed mutants/);
});

test("the mutation summary lists every missed mutant, and hangs and unjudged crashes apart", () => {
    const report = {
        files: {
            "js/core/a.js": {
                mutants: [
                    mutant("NoCoverage", 30),
                    mutant("Survived", 12, "EqualityOperator", "a <= b"),
                    mutant("Timeout", 40, "BlockStatement", "{}"),
                    mutant("RuntimeError", 50, "ArrayDeclaration", "[]"),
                    mutant("Killed", 60)
                ]
            }
        }
    };
    const { markdown } = summarizeMutationReport(report, { "js/core/a.js": 2 });
    const section = (title) => markdown.split(`### ${title}`)[1].split("###")[0];
    assert.match(
        section("Missed"),
        /a\.js:12 EqualityOperator → `a <= b`\n- js\/core\/a\.js:30 BooleanLiteral → `false`/
    );
    assert.doesNotMatch(markdown, /\n\n\n/, "no empty block when no count moved");
    assert.match(section("Hangs"), /js\/core\/a\.js:40 BlockStatement → `\{\}`/);
    assert.match(section("Not judged"), /js\/core\/a\.js:50 ArrayDeclaration → `\[\]`/);
    assert.doesNotMatch(markdown, /a\.js:60/);
});
