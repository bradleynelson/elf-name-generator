// Checks the shape of data/elfNames.json and data/drowNames.json, which the private pipeline writes and the site
// publishes as-is. The shapes below are what ElfNameGenerator, DrowNameGenerator, SplitComponents and the UI read
// (fields, required provenance, meanings), not a copy of today's JSON. A failure means fixing the pipeline script and
// rebuilding, never editing the JSON (.claude/DATA_PIPELINE.md).
// The generator constructors still refuse data with no prefix or suffix table at run time; the same requirement is
// stated here (a required, non-empty list) so a bad rebuild fails before it ships.
// Usage: node scripts/check-data.js (run by `npm run check`).
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ELF_SUBRACES } from "../js/core/species.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
export const NAME_DATA_FILES = ["data/elfNames.json", "data/drowNames.json"];

// A rule inspects a value found at `at` ({ file, path, label, problems }) and records what is wrong with it.
const fail = (at, message) => {
    const record = at.label ? ` (record "${at.label}")` : "";
    at.problems.push(`${at.file}: ${at.path}: ${message}${record}`);
};
const field = (at, name) => ({ ...at, path: at.path ? `${at.path}.${name}` : name });
const item = (at, index, label) => ({ ...at, path: `${at.path}[${index}]`, label });

const text = (value, at) => {
    if (typeof value !== "string" || !value.trim()) fail(at, "expected non-empty text");
};
const positiveInteger = (value, at) => {
    if (!Number.isInteger(value) || value < 1) fail(at, "expected a positive whole number");
};
const isTrue = (value, at) => {
    if (value !== true) fail(at, "expected true");
};
const fraction = (value, at) => {
    if (typeof value !== "number" || !(value >= 0 && value <= 1)) fail(at, "expected a number from 0 to 1");
};
const oneOf =
    (...allowed) =>
    (value, at) => {
        if (!allowed.includes(value)) fail(at, `expected one of ${allowed.map((a) => `"${a}"`).join(", ")}`);
    };
const nullable = (rule) => (value, at) => {
    if (value !== null) rule(value, at);
};
const optional = (rule) => Object.assign((value, at) => value === undefined || rule(value, at), { optional: true });
const list =
    (rule, { min = 1 } = {}) =>
    (value, at) => {
        if (!Array.isArray(value)) return fail(at, "expected a list");
        if (value.length < min) fail(at, "expected a non-empty list");
        // the record's own text names the row in the pipeline's output
        value.forEach((entry, index) =>
            rule(entry, item(at, index, typeof entry?.text === "string" ? entry.text : at.label))
        );
    };
const record = (fields) => (value, at) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(at, "expected a record");
    for (const [name, rule] of Object.entries(fields)) {
        if (value[name] === undefined && !rule.optional) fail(field(at, name), "is missing");
        else rule(value[name], field(at, name));
    }
};

const SEX_OF_PUBLISHED_NAME = nullable(oneOf("female", "male"));
// "unstated": the source gives the name no sex
const SEX_OF_ENDING = oneOf("female", "male", "unstated");
const source = record({
    title: text,
    file: text,
    pdfPages: list(positiveInteger),
    scope: text,
    // true for a name from the Realms' creator (a forum answer), which the UI credits to him
    creator: optional(isTrue)
});
const subraces = list(oneOf(...ELF_SUBRACES), { min: 0 });
const publishedName = record({ text, sex: SEX_OF_PUBLISHED_NAME, source });
const cutFrom = record({ text, from: list(text) });
const cutEndingFrom = record({ text, sex: SEX_OF_ENDING, from: list(text) });
const meaningOnly = record({ text, meaning: text });
const approvedWord = record({ text, subraces });

const SHAPES = {
    "data/elfNames.json": record({
        description: text,
        generated: text,
        tables: record({
            title: text,
            origin: text,
            prefixes: list(meaningOnly),
            suffixes: list(record({ male: list(text), female: list(text), meaning: text }))
        }),
        openings: list(cutFrom),
        endings: list(cutEndingFrom),
        joinClusters: list(text),
        publishedNames: list(publishedName),
        familyNames: list(
            record({
                text,
                form: oneOf("elvish", "common"),
                subraces,
                source,
                translation: optional(record({ text, title: text })),
                note: optional(text)
            })
        ),
        familyOpenings: list(cutFrom),
        familyEndings: list(cutFrom),
        familyJoinClusters: list(text),
        approvedWords: record({ first: list(approvedWord), second: list(approvedWord) }),
        commonFormShare: record(Object.fromEntries(ELF_SUBRACES.map((subrace) => [subrace, fraction])))
    }),
    "data/drowNames.json": record({
        description: text,
        generated: text,
        tableSource: record({ title: text }),
        prefixes: list(record({ female: text, male: text, meaning: text })),
        suffixes: list(record({ female: text, male: text, meaning: text })),
        housePrefixes: list(meaningOnly),
        houseSuffixes: list(meaningOnly),
        publishedNames: list(publishedName),
        publishedHouses: list(record({ text, source })),
        openings: list(cutFrom),
        endings: list(cutEndingFrom),
        joinClusters: list(text),
        forbiddenNames: list(text),
        commonWords: list(text)
    })
};

// Components cut from published names say which names; each must be one the data publishes, or its books are lost.
const CUT_FROM = {
    "data/elfNames.json": [
        ["openings", "publishedNames"],
        ["endings", "publishedNames"],
        ["familyOpenings", "familyNames"],
        ["familyEndings", "familyNames"]
    ],
    "data/drowNames.json": [
        ["openings", "publishedNames"],
        ["endings", "publishedNames"]
    ]
};

function checkCutFrom(data, listName, publishedList, at) {
    if (!Array.isArray(data[listName]) || !Array.isArray(data[publishedList])) return;
    const published = new Set(data[publishedList].map((entry) => entry?.text));
    data[listName].forEach((entry, index) => {
        if (!Array.isArray(entry?.from)) return;
        for (const name of entry.from.filter((name) => !published.has(name))) {
            fail(
                field(item({ ...at, path: listName }, index, entry.text), "from"),
                `"${name}" is not a text in ${publishedList}`
            );
        }
    });
}

/**
 * Problems in a name data file, each a sentence naming the file, the record's place in its list, the field and the
 * record's text; empty when the data has the agreed shape.
 * @param {string} file - one of NAME_DATA_FILES, as the messages should name it
 * @param {Object} data - the parsed JSON
 * @returns {string[]}
 */
export function validateNameData(file, data) {
    const at = { file, path: "", label: undefined, problems: [] };
    SHAPES[file](data, at);
    for (const [listName, publishedList] of CUT_FROM[file]) checkCutFrom(data, listName, publishedList, at);
    return at.problems;
}

function main() {
    const problems = NAME_DATA_FILES.flatMap((file) =>
        validateNameData(file, JSON.parse(readFileSync(path.join(repositoryRoot, file), "utf8")))
    );
    if (problems.length) {
        console.error(problems.join("\n"));
        console.error(
            "Fix the pipeline script and rebuild the data; do not edit data/*.json (.claude/DATA_PIPELINE.md)."
        );
        process.exit(1);
    }
    console.log(`Name data: ${NAME_DATA_FILES.length} files have the agreed shape.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
