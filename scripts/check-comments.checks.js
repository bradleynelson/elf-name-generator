import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
    addedLineNumbers,
    checkRepository,
    commentRuleProblems,
    findComments,
    stringRuleProblems
} from "./check-comments.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

const lines = (comments) => comments.map(({ start, end }) => [start, end]);

test("finds JavaScript comments but not comment-like text in strings, templates or regular expressions", () => {
    const source = [
        'const url = "https://example.com"; // trailing',
        "const pattern = /\\/\\/ not a comment/;",
        "const text = `/* not a comment */`;",
        "/* block",
        "   comment */",
        "f(); // last"
    ].join("\n");
    assert.deepEqual(lines(findComments("js/a.js", source)), [
        [1, 1],
        [4, 5],
        [6, 6]
    ]);
});

test("finds CSS comments outside strings, including in an HTML page's style element", () => {
    const css = ['a::before { content: "/* no */"; }', "/* one */", "b {} /* two", "three */"].join("\n");
    assert.deepEqual(lines(findComments("style.css", css)), [
        [2, 2],
        [3, 4]
    ]);
    const html = ["<!-- top", "-->", "<style>", "  /* inside */", "</style>", "<p>text</p>"].join("\n");
    assert.deepEqual(lines(findComments("page.html", html)), [
        [1, 2],
        [4, 4]
    ]);
});

test("finds hash comments, trailing ones only in YAML and never inside quotes", () => {
    const yaml = ["# whole line", 'key: "a # b"', "uses: x@abc # v1", "url: a#b"].join("\n");
    assert.deepEqual(lines(findComments("ci.yml", yaml)), [
        [1, 1],
        [3, 3]
    ]);
    assert.deepEqual(lines(findComments(".gitignore", "# heading\nfile#name\n")), [[1, 1]]);
});

test("a comment names no ticket, owner or private file, except in the files that must", () => {
    const problems = commentRuleProblems(
        "js/a.js",
        ["// BMN-12 fix", "// Brad asked for this", "", "// the project owner chose it", "// see DECISIONS.md"].join(
            "\n"
        )
    );
    assert.equal(problems.length, 4);
    assert.match(problems[0], /^js\/a\.js:1: .*ticket/);
    assert.match(problems[1], /^js\/a\.js:2: .*owner/);
    assert.match(problems[2], /^js\/a\.js:4: .*owner/);
    assert.match(problems[3], /^js\/a\.js:5: .*private file/);
    assert.deepEqual(commentRuleProblems("js/a.js", "// a jsdoc-free line about ownership and brads"), []);
    assert.deepEqual(commentRuleProblems("js/a.js", "// The resource owner releases the handle"), []);
    assert.equal(commentRuleProblems("js/a.js", "// the repository maintainer wants this").length, 1);
    for (const exempt of [".github/CODEOWNERS", ".prettierignore"]) {
        assert.deepEqual(commentRuleProblems(exempt, "# The project owner keeps AGENTS.md out"), [], exempt);
    }
    assert.deepEqual(commentRuleProblems("scripts/release-site.js", "// keeps AGENTS.md out"), []);
});

test("a comment names no private rule or decision ID", () => {
    const problems = commentRuleProblems("js/a.js", ["// join rule (D15, D16)", "x(); // chosen (Q7)"].join("\n"));
    assert.equal(problems.length, 2);
    assert.match(problems[0], /^js\/a\.js:1: .*private rule or decision ID/);
    assert.match(problems[1], /^js\/a\.js:2: .*private rule or decision ID/);
    assert.deepEqual(commentRuleProblems("js/a.js", "// a D&D book, DD1x, ID14 and Q1234 are not IDs"), []);
});

test("a string in js or tests names no ticket or private ID, but a regular expression may", () => {
    const source = ['it("of a place (D4; BMN-193)", () => {});', "const note = `line\n${1} Q7`;"].join("\n");
    const problems = stringRuleProblems("tests/a.test.js", source);
    assert.equal(problems.length, 3);
    assert.match(problems[0], /^tests\/a\.test\.js:1: string names a ticket/);
    assert.match(problems[1], /^tests\/a\.test\.js:1: string names a private rule or decision ID/);
    assert.match(problems[2], /^tests\/a\.test\.js:3: string names a private rule or decision ID/);
    assert.equal(stringRuleProblems("js/a.js", 'const a = "BMN-1";').length, 1);
    assert.deepEqual(stringRuleProblems("js/a.js", "const a = /D4/; const b = 'D'; const c = 'ID14';"), []);
    assert.deepEqual(stringRuleProblems("scripts/a.js", 'const a = "BMN-1 D4";'), []);
    assert.deepEqual(stringRuleProblems("style.css", '"BMN-1"'), []);
});

test("a comment runs at most two lines, counting adjacent whole-line comments as one", () => {
    assert.deepEqual(commentRuleProblems("js/a.js", "// one\n// two\nx();"), []);
    const [three] = commentRuleProblems("js/a.js", "x();\n// one\n// two\n/* three */\n");
    assert.match(three, /^js\/a\.js:2: comment runs 3 lines/);
    assert.deepEqual(commentRuleProblems("js/a.js", "a(); // one\nb(); // two\nc(); // three"), []);
    assert.equal(commentRuleProblems("style.css", "/* one\ntwo\nthree */").length, 1);
    assert.equal(commentRuleProblems("ci.yml", "# one\n# two\n# three").length, 1);
    assert.equal(commentRuleProblems("index.html", "<!-- one\ntwo\nthree -->").length, 1);
});

test("only JSDoc on an exported function, type or public method may run longer", () => {
    const jsdoc = "/**\n * One.\n * Two.\n */\n";
    assert.deepEqual(commentRuleProblems("js/a.js", `${jsdoc}export function f() {}`), []);
    assert.deepEqual(commentRuleProblems("js/a.js", `${jsdoc}export class C {}`), []);
    assert.deepEqual(
        commentRuleProblems("js/a.js", "/**\n * @typedef {object} Shape\n * @property {string} a\n */"),
        []
    );
    assert.deepEqual(commentRuleProblems("js/a.js", `export class C {\n${jsdoc}    method() {}\n}`), []);
    assert.equal(commentRuleProblems("js/a.js", `export class C {\n${jsdoc}    _internal() {}\n}`).length, 1);
    assert.equal(commentRuleProblems("js/a.js", `class C {\n${jsdoc}    method() {}\n}`).length, 1);
    assert.equal(commentRuleProblems("js/a.js", `${jsdoc}function f() {}`).length, 1);
    assert.equal(commentRuleProblems("js/a.js", "/*\n * One.\n * Two.\n */\nexport function f() {}").length, 1);
});

test("lists the new-file line numbers a unified diff adds", () => {
    const diff = [
        "diff --git a/x b/x",
        "@@ -3,0 +4,2 @@",
        "+a",
        "+b",
        "@@ -10 +12 @@",
        "-old",
        "+new",
        "@@ -20,2 +23,0 @@"
    ].join("\n");
    assert.deepEqual([...addedLineNumbers(diff)], [4, 5, 12]);
});

test("every comment in the repository keeps the rules", () => {
    assert.deepEqual(checkRepository(repositoryRoot), []);
});

test("adding or removing comments in a file never fails on a count", () => {
    const source = ["// one", "x();", "// two", "y();", "// three"].join("\n");
    assert.deepEqual(commentRuleProblems("js/a.js", source), []);
});
