import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Linter } from "eslint";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const MAX_LINES = 2;
const SKIPPED_DIRECTORIES = new Set(["node_modules", "dist", "coverage", "reports", "data"]);
const HASH_FILES = new Set([".gitignore", ".prettierignore", ".gitattributes", "CODEOWNERS", "robots.txt"]);
const NAMING_EXEMPT = new Set([
    ".github/CODEOWNERS",
    ".prettierignore",
    "scripts/release-site.js",
    "scripts/release-site.checks.js"
]);
const TICKET = { pattern: /\bBMN-\d+/i, what: "a ticket" };
const PRIVATE_ID = { pattern: /\b[DQ]\d{1,2}\b/, what: "a private rule or decision ID" };
const STRING_CHECKED = /^(js|tests)\/.*\.js$/;
const FORBIDDEN = [
    TICKET,
    PRIVATE_ID,
    {
        pattern: /\b(brad|bradley|nelson|bradleynelson|(project|repo|repository) (owner|maintainer)s?)\b/i,
        what: "the owner"
    },
    {
        pattern:
            /\b(AGENTS(\.override)?|DECISIONS|PROJECT_ASSESSMENT|RELEASE_CHECKLIST|LOCAL_DEVELOPMENT|CLAUDE)\.md\b|\.(claude|codex|agents)\//i,
        what: "a private file"
    }
];

const linter = new Linter();

function syntaxOf(file) {
    const name = path.posix.basename(file);
    if (HASH_FILES.has(name)) return "hash";
    return { ".js": "js", ".css": "css", ".html": "html", ".xml": "html", ".yml": "yaml", ".yaml": "yaml" }[
        path.posix.extname(name)
    ];
}

const lineAt = (text, index) => text.slice(0, index).split("\n").length;
const isWholeLine = (text, index) => text.slice(text.lastIndexOf("\n", index - 1) + 1, index).trim() === "";

function comment(text, startIndex, endIndex, body) {
    return {
        start: lineAt(text, startIndex),
        end: lineAt(text, endIndex),
        text: body,
        wholeLine: isWholeLine(text, startIndex)
    };
}

function publicInterfaceStarts(ast) {
    const starts = new Set();
    for (const node of ast.body.filter(({ type }) => type.startsWith("Export"))) {
        starts.add(node.range[0]);
        const members = node.declaration?.type === "ClassDeclaration" ? node.declaration.body.body : [];
        for (const { type, key, range } of members) {
            if (type === "MethodDefinition" && key.type === "Identifier" && !key.name.startsWith("_")) {
                starts.add(range[0]);
            }
        }
    }
    return starts;
}

function parseJavascript(file, text) {
    const config = { languageOptions: { ecmaVersion: "latest", sourceType: "module" } };
    const fatal = linter.verify(text, config, "file.js").find((message) => message.fatal);
    if (fatal) throw new Error(`${file}:${fatal.line}: cannot parse: ${fatal.message}`);
    return linter.getSourceCode();
}

function stringsIn(node) {
    if (Array.isArray(node)) return node.flatMap(stringsIn);
    if (!node || typeof node.type !== "string") return [];
    const own = typeof node.value === "string" && node.type === "Literal" ? [node] : [];
    const cooked = node.type === "TemplateElement" ? [{ ...node, value: node.value.cooked }] : [];
    const children = Object.entries(node).filter(([key]) => key !== "parent" && key !== "loc" && key !== "range");
    return [...own, ...cooked, ...children.flatMap(([, child]) => stringsIn(child))];
}

function javascriptComments(file, text) {
    const sourceCode = parseJavascript(file, text);
    const publicStarts = publicInterfaceStarts(sourceCode.ast);
    const documents = (end) => publicStarts.has(end + text.slice(end).match(/^\s*/)[0].length);
    return sourceCode
        .getAllComments()
        .filter(({ type }) => type !== "Shebang")
        .map(({ type, value, range }) => ({
            ...comment(text, range[0], range[1] - 1, value),
            documentsInterface:
                type === "Block" &&
                value.startsWith("*") &&
                (documents(range[1]) || /@(typedef|callback)\b/.test(value))
        }));
}

function cssComments(text) {
    const found = [];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '"' || text[i] === "'") {
            const close = text.indexOf(text[i], i + 1);
            i = close < 0 ? text.length : close;
        } else if (text.startsWith("/*", i)) {
            const close = text.indexOf("*/", i + 2);
            const end = close < 0 ? text.length : close + 2;
            found.push(comment(text, i, end - 1, text.slice(i + 2, end - 2)));
            i = end - 1;
        }
    }
    return found;
}

function htmlComments(text) {
    const found = [...text.matchAll(/<!--([\s\S]*?)-->/g)].map((match) =>
        comment(text, match.index, match.index + match[0].length - 1, match[1])
    );
    for (const match of text.matchAll(/(<style\b[^>]*>)([\s\S]*?)<\/style>/gi)) {
        const shift = lineAt(text, match.index + match[1].length) - 1;
        found.push(...cssComments(match[2]).map((c) => ({ ...c, start: c.start + shift, end: c.end + shift })));
    }
    return found.sort((a, b) => a.start - b.start);
}

const wholeLineHash = (line) => (/^\s*#/.test(line) ? line.indexOf("#") : -1);

function yamlHash(line) {
    let quote = null;
    for (let i = 0; i < line.length; i++) {
        const character = line[i];
        if (quote) {
            if (character === quote) quote = null;
        } else if ((character === '"' || character === "'") && (i === 0 || /[\s:[{,]/.test(line[i - 1]))) {
            quote = character;
        } else if (character === "#" && (i === 0 || /\s/.test(line[i - 1]))) {
            return i;
        }
    }
    return -1;
}

function hashComments(text, hashIndexOf) {
    return text.split("\n").flatMap((line, index) => {
        const at = hashIndexOf(line);
        if (at < 0) return [];
        return [{ start: index + 1, end: index + 1, text: line.slice(at + 1), wholeLine: !line.slice(0, at).trim() }];
    });
}

/**
 * The comments in one file, in order, by the file's syntax (none for a file type that is not checked).
 * @returns {{ start: number, end: number, text: string, wholeLine: boolean, documentsInterface?: boolean }[]}
 */
export function findComments(file, text) {
    switch (syntaxOf(file)) {
        case "js":
            return javascriptComments(file, text);
        case "css":
            return cssComments(text);
        case "html":
            return htmlComments(text);
        case "yaml":
            return hashComments(text, yamlHash);
        case "hash":
            return hashComments(text, wholeLineHash);
        default:
            return [];
    }
}

function commentUnits(comments) {
    const units = [];
    for (const current of comments) {
        const last = units.at(-1);
        if (last?.wholeLine && current.wholeLine && current.start === last.end + 1) {
            last.end = current.end;
            last.comments.push(current);
        } else {
            units.push({ start: current.start, end: current.end, wholeLine: current.wholeLine, comments: [current] });
        }
    }
    return units;
}

/** Each comment in `text` that matches FORBIDDEN or runs over MAX_LINES. */
export function commentRuleProblems(file, text) {
    const comments = findComments(file, text);
    const problems = [];
    if (!NAMING_EXEMPT.has(file)) {
        for (const { start, text: body } of comments) {
            for (const { pattern, what } of FORBIDDEN) {
                const match = pattern.exec(body);
                if (match)
                    problems.push({ line: lineAt(body, match.index) + start - 1, message: `comment names ${what}.` });
            }
        }
    }
    for (const unit of commentUnits(comments)) {
        const lineCount = unit.end - unit.start + 1;
        if (lineCount > MAX_LINES && !(unit.comments.length === 1 && unit.comments[0].documentsInterface)) {
            problems.push({
                line: unit.start,
                message: `comment runs ${lineCount} lines; keep it to ${MAX_LINES} (only JSDoc on a public interface or data shape may run longer).`
            });
        }
    }
    return problems.sort((a, b) => a.line - b.line).map(({ line, message }) => `${file}:${line}: ${message}`);
}

/** Each string or template text in a script of `js/` or `tests/` that names a ticket or a private ID. */
export function stringRuleProblems(file, text) {
    if (!STRING_CHECKED.test(file)) return [];
    const strings = stringsIn(parseJavascript(file, text).ast.body);
    return strings
        .flatMap(({ value, loc }) =>
            [TICKET, PRIVATE_ID].flatMap(({ pattern, what }) => {
                const match = pattern.exec(value);
                return match
                    ? [{ line: lineAt(value, match.index) + loc.start.line - 1, message: `string names ${what}.` }]
                    : [];
            })
        )
        .sort((a, b) => a.line - b.line)
        .map(({ line, message }) => `${file}:${line}: ${message}`);
}

const range = (first, last) => Array.from({ length: last - first + 1 }, (_, i) => first + i);

/** New-file line numbers added by a unified diff of one file (as `git diff -U0` prints it). */
export function addedLineNumbers(diff) {
    const added = new Set();
    for (const [, first, count = "1"] of diff.matchAll(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/gm)) {
        for (const line of range(Number(first), Number(first) + Number(count) - 1)) added.add(line);
    }
    return added;
}

function checkedFiles(root, directory = root) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            const hidden = entry.name.startsWith(".") && entry.name !== ".github";
            return hidden || SKIPPED_DIRECTORIES.has(entry.name) ? [] : checkedFiles(root, full);
        }
        const file = path.relative(root, full).split(path.sep).join("/");
        return syntaxOf(file) ? [file] : [];
    });
}

/** Every comment rule problem in the repository at `root`; empty when it passes. */
export function checkRepository(root = repositoryRoot) {
    return checkedFiles(root).flatMap((file) => {
        const text = readFileSync(path.join(root, file), "utf8");
        return [...commentRuleProblems(file, text), ...stringRuleProblems(file, text)];
    });
}

function listAddedComments(base) {
    const git = (...args) => execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" });
    const untracked = new Set(git("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean));
    const changed = [...git("diff", "--name-only", base).split("\n").filter(Boolean), ...untracked];
    let total = 0;
    for (const file of changed.filter(syntaxOf)) {
        if (!existsSync(path.join(repositoryRoot, file))) continue;
        const text = readFileSync(path.join(repositoryRoot, file), "utf8");
        const sourceLines = text.split("\n");
        const added = untracked.has(file)
            ? new Set(range(1, sourceLines.length))
            : addedLineNumbers(git("diff", "-U0", base, "--", file));
        const commentLines = new Set(findComments(file, text).flatMap(({ start, end }) => range(start, end)));
        for (const line of [...commentLines].filter((n) => added.has(n)).sort((a, b) => a - b)) {
            console.log(`${file}:${line}: ${sourceLines[line - 1].trim()}`);
            total++;
        }
    }
    console.log(`${total} comment lines added since ${base}.`);
}

function main() {
    const addedAt = process.argv.indexOf("--added");
    if (addedAt >= 0) return listAddedComments(process.argv[addedAt + 1] ?? "HEAD");
    const problems = checkRepository();
    if (problems.length) {
        console.error(problems.join("\n"));
        process.exit(1);
    }
    console.log("Comment rules: no problems.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
