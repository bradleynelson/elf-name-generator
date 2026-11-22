// The shape below is what loadSpeciesData, the generators and the UI read, not a copy of today's JSON. A failure means
// fixing the data builder and rebuilding, never editing the generated JSON.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SPECIES } from "../js/core/species.js";
import { NAME_TYPE, SCHEMA } from "../js/core/speciesData.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
// each species' data file, as the page asks for it without its version stamp
const SPECIES_OF_FILE = new Map(Object.values(SPECIES).map((species) => [species.dataFile.split("?")[0], species]));
export const NAME_DATA_FILES = [...SPECIES_OF_FILE.keys()];

// A rule inspects a value found at `at` ({ file, path, label, problems }) and records what is wrong with it.
const fail = (at, message) => {
    const record = at.label ? ` (record "${at.label}")` : "";
    at.problems.push(`${at.file}: ${at.path}: ${message}${record}`);
};
const field = (at, name) => ({ ...at, path: at.path ? `${at.path}.${name}` : name });
const item = (at, index, label) => ({ ...at, path: `${at.path}[${index}]`, label });
// the record's own text names it in a message; a plain text inherits its record's name
const entryOf = (at, index, entry) => item(at, index, typeof entry?.text === "string" ? entry.text : at.label);

const text = (value, at) => {
    if (typeof value !== "string" || !value.trim()) fail(at, "expected non-empty text");
};
const is = (expected) => (value, at) => {
    if (value !== expected) fail(at, `expected ${JSON.stringify(expected)}`);
};
const oneOf =
    (...allowed) =>
    (value, at) => {
        if (!allowed.includes(value)) fail(at, `expected one of ${allowed.map((a) => `"${a}"`).join(", ")}`);
    };
const optional = (rule) => Object.assign((value, at) => value === undefined || rule(value, at), { optional: true });
const list =
    (rule, { min = 1 } = {}) =>
    (value, at) => {
        if (!Array.isArray(value)) return fail(at, "expected a list");
        if (value.length < min) fail(at, "expected a non-empty list");
        value.forEach((entry, index) => rule(entry, entryOf(at, index, entry)));
    };
const record = (fields) => (value, at) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(at, "expected a record");
    for (const [name, rule] of Object.entries(fields)) {
        if (value[name] === undefined && !rule.optional) fail(field(at, name), "is missing");
        else rule(value[name], field(at, name));
    }
};
/** A record whose every key is an id and every value follows `rule`; at least one entry. */
const idMap = (rule) => (value, at) => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(at, "expected a record");
    if (!Object.keys(value).length) fail(at, "expected at least one entry");
    for (const [id, entry] of Object.entries(value)) rule(entry, field(at, id));
};
// a table's spelling: one, or a list when the table prints alternates (the first is the main form)
const spelling = (value, at) => (Array.isArray(value) ? list(text)(value, at) : text(value, at));

// The shape of a species' file; `lineageWord` knows the species' own words. Every id a name, table or translation
// cites must be in `sources` (checked apart, so a broken id names the record that cites it).
const shapeOf = (species) => {
    const lineages = optional(list(oneOf(...Object.keys(species.lineageWords))));
    // a table entry gives `text` when its female and male forms are the same, otherwise `female` and `male`
    const tableEntry = (value, at) =>
        record(
            value?.text === undefined
                ? { female: spelling, male: spelling, meaning: text }
                : { text: spelling, meaning: text }
        )(value, at);
    return record({
        schema: is(SCHEMA),
        // "creator": Ed Greenwood's own works, which the page credits to him
        sources: idMap(record({ title: text, authority: oneOf("official", "creator") })),
        names: list(
            record({
                text,
                type: oneOf(...Object.values(NAME_TYPE)),
                sex: optional(oneOf("female", "male", "unisex")),
                meaning: optional(text),
                meaningSource: optional(text),
                note: optional(text),
                form: oneOf("elvish", "common"),
                lineages,
                sources: list(text)
            })
        ),
        tables: list(
            record({
                type: oneOf(NAME_TYPE.GIVEN, NAME_TYPE.HOUSE),
                lineages,
                sources: list(text),
                prefixes: list(tableEntry),
                suffixes: list(tableEntry)
            })
        ),
        words: list(record({ text, use: oneOf("common-first", "common-second", "glossary", "forbidden"), lineages }))
    });
};

// Each source id a record cites must be one the file lists, or the page cannot name the book.
function checkSourceIds(data, at) {
    const known = new Set(Object.keys(data.sources ?? {}));
    if (!known.size) return; // reported once by the shape check, not again for every citation
    const cite = (id, where) => {
        if (typeof id === "string" && !known.has(id)) fail(where, `"${id}" is not an id in sources`);
    };
    const each = (listName, check) => {
        if (Array.isArray(data[listName]))
            data[listName].forEach((entry, index) => check(entry, entryOf({ ...at, path: listName }, index, entry)));
    };
    each("names", (name, where) => {
        if (Array.isArray(name?.sources)) name.sources.forEach((id) => cite(id, field(where, "sources")));
        cite(name?.meaningSource, field(where, "meaningSource"));
    });
    each("tables", (table, where) => {
        if (Array.isArray(table?.sources)) table.sources.forEach((id) => cite(id, field(where, "sources")));
    });
}

// The site publishes data/*.json as-is, so no text may carry a path on the building computer or cite the builder's
// working files. Generic shapes only: this file is public, so it names no one's folder.
const LOCAL_PATH = new RegExp(
    [
        String.raw`\b[A-Za-z]:[\\/]`,
        String.raw`[\\/](?:Users|home)[\\/]`,
        String.raw`\\\\[\w.-]+\\`,
        String.raw`\bv3[\\/](?:review|dataset)\b`
    ].join("|"),
    "i"
);

function checkNoLocalPaths(value, at) {
    if (typeof value === "string") {
        const found = value.match(LOCAL_PATH);
        if (found) fail(at, `contains a local path ("${found[0]}")`);
    } else if (Array.isArray(value)) {
        value.forEach((entry, index) => checkNoLocalPaths(entry, entryOf(at, index, entry)));
    } else if (typeof value === "object" && value !== null) {
        for (const [name, entry] of Object.entries(value)) checkNoLocalPaths(entry, field(at, name));
    }
}

// A source says only its name: never how the copy was acquired, a file's version tag or underscores. Whole words
// only, so a title that merely contains the letters ("Scandal", "Printworks") passes.
const ACQUISITION_LABEL = new RegExp(
    [
        String.raw`(?<![a-z])(?:ocr|pdf|print|scan(?:ned)?|rip|bookmarked|cropped|sanitized|watermarked|hq|oef)(?![a-z])`,
        String.raw`\bv\d+(?:\.\d+)*[a-z]?\b`,
        "_"
    ].join("|"),
    "i"
);
const SOURCE_FIELDS = new Set(["title", "authority"]);

function checkSourcesSayOnlyTheirNames(data, at) {
    const acquired = (text, where) => {
        const found = typeof text === "string" && text.match(ACQUISITION_LABEL);
        if (found) fail(where, `says how the copy was acquired ("${found[0]}"); a source says only its name`);
    };
    for (const [id, source] of Object.entries(data.sources ?? {})) {
        const where = field({ ...at, path: "sources" }, id);
        acquired(id, where);
        acquired(source?.title, field(where, "title"));
        for (const name of Object.keys(source ?? {}).filter((name) => !SOURCE_FIELDS.has(name)))
            fail(field(where, name), "a source carries only its title and authority");
    }
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
    shapeOf(SPECIES_OF_FILE.get(file))(data, at);
    checkSourceIds(data, at);
    checkSourcesSayOnlyTheirNames(data, at);
    checkNoLocalPaths(data, at);
    return at.problems;
}

function main() {
    const problems = NAME_DATA_FILES.flatMap((file) =>
        validateNameData(file, JSON.parse(readFileSync(path.join(repositoryRoot, file), "utf8")))
    );
    if (problems.length) {
        console.error(problems.join("\n"));
        console.error("Fix the generator and rebuild the data; do not edit data/*.json by hand.");
        process.exit(1);
    }
    console.log(`Name data: ${NAME_DATA_FILES.length} file(s) have the agreed shape and no local paths.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
