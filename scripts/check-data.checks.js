// Node's test runner (`npm run test:release`), not Vitest: these checks read the data files directly.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { SPECIES } from "../js/core/species.js";
import { SCHEMA } from "../js/core/speciesData.js";
import { NAME_DATA_FILES, validateNameData } from "./check-data.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const ELF = "data/elfNames.json";

const load = (file) => JSON.parse(readFileSync(path.join(repositoryRoot, file), "utf8"));
const real = load(ELF);
const firstSource = Object.keys(real.sources)[0];
const translated = real.names.findIndex((n) => n.meaningSource);
const tied = real.names.findIndex((n) => n.lineages);
const family = real.names.findIndex((n) => n.type === "family");
const drowTable = real.tables.findIndex((t) => t.lineages?.includes("drow") && t.type === "given");
const record = (entry) => ` (record "${entry.text}")`;

test("every data file in the repository passes", () => {
    for (const file of NAME_DATA_FILES) assert.deepEqual(validateNameData(file, load(file)), [], file);
});

// Each case breaks a fresh copy of the real data in one way and names the message the validator must give.
const mistakes = [
    ["another schema (the old two-file shape)", (d) => (d.schema = 1), `${ELF}: schema: expected ${SCHEMA}`],
    ["a missing table list", (d) => delete d.tables[0].suffixes, `${ELF}: tables[0].suffixes: is missing`],
    ["an empty list", (d) => (d.tables[0].prefixes = []), `${ELF}: tables[0].prefixes: expected a non-empty list`],
    ["no sources", (d) => (d.sources = {}), `${ELF}: sources: expected at least one entry`],
    [
        "an empty meaning",
        (d) => (d.tables[0].prefixes[2].meaning = " "),
        `${ELF}: tables[0].prefixes[2].meaning: expected non-empty text${record(real.tables[0].prefixes[2])}`
    ],
    [
        "a spelling that is neither text nor a list of texts",
        (d) => (d.tables[0].suffixes[0].text = [""]),
        `${ELF}: tables[0].suffixes[0].text[0]: expected non-empty text`
    ],
    [
        "a drow table entry with no female form",
        (d) => (d.tables[drowTable].prefixes[5].female = ""),
        `${ELF}: tables[${drowTable}].prefixes[5].female: expected non-empty text`
    ],
    [
        "a name with no source",
        (d) => delete d.names[4].sources,
        `${ELF}: names[4].sources: is missing${record(real.names[4])}`
    ],
    [
        "a name citing a source the file does not list",
        (d) => (d.names[4].sources = ["no-such-book"]),
        `${ELF}: names[4].sources: "no-such-book" is not an id in sources${record(real.names[4])}`
    ],
    [
        "a translation citing a source the file does not list",
        (d) => (d.names[translated].meaningSource = "no-such-book"),
        `${ELF}: names[${translated}].meaningSource: "no-such-book" is not an id in sources${record(real.names[translated])}`
    ],
    [
        "a table citing a source the file does not list",
        (d) => (d.tables[0].sources = ["no-such-book"]),
        `${ELF}: tables[0].sources: "no-such-book" is not an id in sources`
    ],
    [
        "a source with no title",
        (d) => (d.sources[firstSource].title = ""),
        `${ELF}: sources.${firstSource}.title: expected non-empty text`
    ],
    [
        "a source with an unknown authority",
        (d) => (d.sources[firstSource].authority = "rumour"),
        `${ELF}: sources.${firstSource}.authority: expected one of "official", "creator"`
    ],
    [
        "a name with an unknown sex",
        (d) => (d.names[0].sex = "other"),
        `${ELF}: names[0].sex: expected one of "female", "male", "unisex"${record(real.names[0])}`
    ],
    [
        "a name of an unknown type",
        (d) => (d.names[0].type = "clan"),
        `${ELF}: names[0].type: expected one of "given", "family", "house"${record(real.names[0])}`
    ],
    [
        "a name with an unknown form",
        (d) => (d.names[family].form = "dwarvish"),
        `${ELF}: names[${family}].form: expected one of "elvish", "common"${record(real.names[family])}`
    ],
    ["a name with no form", (d) => delete d.names[0].form, `${ELF}: names[0].form: is missing${record(real.names[0])}`],
    [
        "a lineage word the species description does not know",
        (d) => (d.names[tied].lineages = ["sea-elf"]),
        `${ELF}: names[${tied}].lineages[0]: expected one of ${Object.keys(SPECIES.elf.lineageWords)
            .map((w) => `"${w}"`)
            .join(", ")}${record(real.names[tied])}`
    ],
    [
        "a word of unknown use",
        (d) => (d.words[0].use = "riddle"),
        `${ELF}: words[0].use: expected one of "common-first", "common-second", "glossary", "forbidden"${record(real.words[0])}`
    ]
];

for (const [name, breakIt, expected] of mistakes) {
    test(`${ELF} with ${name} fails naming the record and field`, () => {
        const data = load(ELF);
        breakIt(data);
        assert.deepEqual(validateNameData(ELF, data), [expected]);
    });
}

// Each case hides a path on the building computer (drive, user or home folder, network share, the builder's citation
// form) in a text the shape check accepts.
const localPaths = [
    ["a drive path", (d) => (d.sources[firstSource].title = "C:\\Corpus\\Cormanthyr"), "C:\\"],
    ["a drive path with forward slashes", (d) => (d.names[0].note = "see d:/scans/book"), "d:/"],
    ["a user folder", (d) => (d.names[1].meaning = "notes in /Users/someone/notes"), "/Users/"],
    ["a home folder", (d) => (d.tables[0].prefixes[0].meaning = "/home/someone/tables"), "/home/"],
    ["a network share", (d) => (d.sources[firstSource].title = "\\\\fileserver\\books\\Dragon"), "\\\\fileserver\\"],
    ["a review image path", (d) => (d.names[2].note = "v3/review/img/page.png"), "v3/review"],
    ["the dataset folder", (d) => (d.tables[0].prefixes[0].meaning = "v3\\dataset\\attestations.jsonl"), "v3\\dataset"]
];

for (const [name, breakIt, found] of localPaths) {
    test(`${ELF} with ${name} in a text fails naming the field and what was found`, () => {
        const data = load(ELF);
        breakIt(data);
        const problems = validateNameData(ELF, data);
        assert.equal(problems.length, 1, problems.join("\n"));
        assert.match(problems[0], new RegExp(`^${ELF}: \\S+: contains a local path`));
        assert.ok(problems[0].includes(`"${found}`), problems[0]);
    });
}

// A source says only its name: never how the copy was acquired, in its title or the id made from it,
// and no field beyond its title and authority (the old data's `file` named the PDF).
const acquisitionLabels = [
    ["an OCR label", (d) => (d.sources[firstSource].title = "Out of the Abyss (OCR)"), "OCR"],
    ["a scan label", (d) => (d.sources[firstSource].title = "Campaign Set, combined scan"), "scan"],
    ["a rip label", (d) => (d.sources[firstSource].title = "Xanathar's Guide (DDB Rip)"), "Rip"],
    ["a PDF file name", (d) => (d.sources[firstSource].title = "Cormanthyr.pdf"), "pdf"],
    ["a print label", (d) => (d.sources[firstSource].title = "Cormanthyr (print)"), "print"],
    ["a sanitized label", (d) => (d.sources[firstSource].title = "Guard Duty (Sanitized)"), "Sanitized"],
    [
        "bookmarked and cropped labels",
        (d) => (d.sources[firstSource].title = "Book (Bookmarked, Cropped)"),
        "Bookmarked"
    ],
    ["a file version tag", (d) => (d.sources[firstSource].title = "Once in Waterdeep v1.2a"), "v1.2a"],
    ["a file name's underscores", (d) => (d.sources[firstSource].title = "Old_Bones_and_Older_Tomes"), "_"]
];

for (const [name, breakIt, found] of acquisitionLabels) {
    test(`${ELF} with ${name} in a source fails naming the source and the label`, () => {
        const data = load(ELF);
        breakIt(data);
        assert.deepEqual(validateNameData(ELF, data), [
            `${ELF}: sources.${firstSource}.title: says how the copy was acquired ("${found}"); a source says only its name`
        ]);
    });
}

test("a source id that says how the copy was acquired fails", () => {
    const data = load(ELF);
    data.sources["out-of-the-abyss-ocr"] = { title: "Out of the Abyss (5e)", authority: "official" };
    assert.deepEqual(validateNameData(ELF, data), [
        `${ELF}: sources.out-of-the-abyss-ocr: says how the copy was acquired ("ocr"); a source says only its name`
    ]);
});

test("a source with a field beyond its name and authority fails", () => {
    const data = load(ELF);
    data.sources[firstSource].file = "Cormanthyr";
    assert.deepEqual(validateNameData(ELF, data), [
        `${ELF}: sources.${firstSource}.file: a source carries only its title and authority`
    ]);
});

test("titles with words that only contain a label pass", () => {
    const data = load(ELF);
    const [first, second, third] = Object.keys(data.sources);
    data.sources[first].title = "Scandal in Ripley's Printworks";
    data.sources[second].title = "Volume IV: The Sea Devils";
    data.sources[third].title = "Encyclopedia Magica, Volume 1 (2e)";
    assert.deepEqual(validateNameData(ELF, data), []);
});

test("a local path is named by its place in the data", () => {
    const data = load(ELF);
    data.names[3].note = "C:\\x";
    assert.equal(
        validateNameData(ELF, data)[0],
        `${ELF}: names[3].note: contains a local path ("C:\\") (record "${data.names[3].text}")`
    );
});

test("names and titles that only look like paths pass", () => {
    const data = load(ELF);
    const [first, second] = Object.keys(data.sources);
    data.sources[first].title = "Volo's Guide: Part 3/4 (3.5e)";
    data.sources[second].title = "Users' Guide to the Home Realms";
    data.names[0].note = "as in the v3.5 rules"; // a version tag is refused only in a source
    assert.deepEqual(validateNameData(ELF, data), []);
});

test("every problem in a file is reported, not only the first", () => {
    const data = load(ELF);
    data.tables[0].prefixes[0].meaning = "";
    delete data.names[0].sources;
    assert.equal(validateNameData(ELF, data).length, 2);
});
