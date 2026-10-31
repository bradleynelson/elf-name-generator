// Run with Node's test runner like release-site.checks.js (`npm run test:release`); these checks read the data files
// directly and do not use Vitest/jsdom.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { NAME_DATA_FILES, validateNameData } from "./check-data.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const ELF = "data/elfNames.json";
const DROW = "data/drowNames.json";

const load = (file) => JSON.parse(readFileSync(path.join(repositoryRoot, file), "utf8"));

test("both data files in the repository pass", () => {
    for (const file of NAME_DATA_FILES) assert.deepEqual(validateNameData(file, load(file)), [], file);
});

// Each case breaks a fresh copy of the real data in one way and names the message the validator must give: the file,
// the record's place in its list and the field, with the record's text so the pipeline row is easy to find.
const mistakes = [
    ["a missing table", ELF, (d) => delete d.tables.suffixes, `${ELF}: tables.suffixes: is missing`],
    ["an empty list", ELF, (d) => (d.openings = []), `${ELF}: openings: expected a non-empty list`],
    [
        "an empty meaning",
        ELF,
        (d) => (d.tables.prefixes[2].meaning = " "),
        `${ELF}: tables.prefixes[2].meaning: expected non-empty text (record "${load(ELF).tables.prefixes[2].text}")`
    ],
    [
        "a suffix whose forms are not a list",
        ELF,
        (d) => (d.tables.suffixes[0].male = "ae"),
        `${ELF}: tables.suffixes[0].male: expected a list`
    ],
    [
        "a split component with no published names behind it",
        ELF,
        (d) => delete d.openings[3].from,
        `${ELF}: openings[3].from: is missing (record "${load(ELF).openings[3].text}")`
    ],
    [
        "a split component cut from a name that is not published",
        ELF,
        (d) => (d.endings[1].from = ["Nobody"]),
        `${ELF}: endings[1].from: "Nobody" is not a text in publishedNames (record "${load(ELF).endings[1].text}")`
    ],
    [
        "a surname component cut from a name that is not a family name",
        ELF,
        (d) => (d.familyOpenings[0].from = ["Nobody"]),
        `${ELF}: familyOpenings[0].from: "Nobody" is not a text in familyNames (record "${load(ELF).familyOpenings[0].text}")`
    ],
    [
        "a published name with no source",
        ELF,
        (d) => delete d.publishedNames[4].source,
        `${ELF}: publishedNames[4].source: is missing (record "${load(ELF).publishedNames[4].text}")`
    ],
    [
        "a source with no book title",
        ELF,
        (d) => (d.familyNames[1].source.title = ""),
        `${ELF}: familyNames[1].source.title: expected non-empty text (record "${load(ELF).familyNames[1].text}")`
    ],
    [
        "a source with no page",
        ELF,
        (d) => (d.publishedNames[0].source.pdfPages = [0]),
        `${ELF}: publishedNames[0].source.pdfPages[0]: expected a positive whole number (record "${load(ELF).publishedNames[0].text}")`
    ],
    [
        "a creator flag that is not true",
        ELF,
        (d) => (d.publishedNames.find((p) => p.source.creator).source.creator = "Ed"),
        `${ELF}: publishedNames[${load(ELF).publishedNames.findIndex((p) => p.source.creator)}].source.creator: expected true (record "${load(ELF).publishedNames.find((p) => p.source.creator).text}")`
    ],
    [
        "an ending with an unknown sex",
        ELF,
        (d) => (d.endings[0].sex = "other"),
        `${ELF}: endings[0].sex: expected one of "female", "male", "unstated" (record "${load(ELF).endings[0].text}")`
    ],
    [
        "a family name with an unknown form",
        ELF,
        (d) => (d.familyNames[0].form = "dwarvish"),
        `${ELF}: familyNames[0].form: expected one of "elvish", "common" (record "${load(ELF).familyNames[0].text}")`
    ],
    [
        "a family name for a subrace that does not exist",
        ELF,
        (d) => (d.familyNames[0].subraces = ["sea-elf"]),
        `${ELF}: familyNames[0].subraces[0]: expected one of "high-elf", "sun-elf", "moon-elf", "wood-elf" (record "${load(ELF).familyNames[0].text}")`
    ],
    [
        "a translation with no title",
        ELF,
        (d) => (d.familyNames.find((f) => f.translation).translation.title = ""),
        `${ELF}: familyNames[${load(ELF).familyNames.findIndex((f) => f.translation)}].translation.title: expected non-empty text (record "${load(ELF).familyNames.find((f) => f.translation).text}")`
    ],
    [
        "a common-form share outside zero to one",
        ELF,
        (d) => (d.commonFormShare["moon-elf"] = 1.5),
        `${ELF}: commonFormShare.moon-elf: expected a number from 0 to 1`
    ],
    [
        "a subrace missing from the common-form shares",
        ELF,
        (d) => delete d.commonFormShare["wood-elf"],
        `${ELF}: commonFormShare.wood-elf: is missing`
    ],
    [
        "an approved word with no subrace list",
        ELF,
        (d) => delete d.approvedWords.first[0].subraces,
        `${ELF}: approvedWords.first[0].subraces: is missing (record "${load(ELF).approvedWords.first[0].text}")`
    ],
    ["a missing table", DROW, (d) => delete d.suffixes, `${DROW}: suffixes: is missing`],
    [
        "a drow prefix with no female form",
        DROW,
        (d) => (d.prefixes[5].female = ""),
        `${DROW}: prefixes[5].female: expected non-empty text`
    ],
    [
        "a house suffix with no meaning",
        DROW,
        (d) => delete d.houseSuffixes[0].meaning,
        `${DROW}: houseSuffixes[0].meaning: is missing (record "${load(DROW).houseSuffixes[0].text}")`
    ],
    [
        "a published house with no source",
        DROW,
        (d) => delete d.publishedHouses[2].source,
        `${DROW}: publishedHouses[2].source: is missing (record "${load(DROW).publishedHouses[2].text}")`
    ],
    [
        "a drow opening cut from a name that is not published",
        DROW,
        (d) => (d.openings[0].from = ["Nobody"]),
        `${DROW}: openings[0].from: "Nobody" is not a text in publishedNames (record "${load(DROW).openings[0].text}")`
    ],
    ["no forbidden names", DROW, (d) => (d.forbiddenNames = []), `${DROW}: forbiddenNames: expected a non-empty list`],
    ["a missing table source", DROW, (d) => delete d.tableSource.title, `${DROW}: tableSource.title: is missing`]
];

for (const [name, file, breakIt, expected] of mistakes) {
    test(`${file} with ${name} fails naming the record and field`, () => {
        const data = load(file);
        breakIt(data);
        assert.deepEqual(validateNameData(file, data), [expected]);
    });
}

test("every problem in a file is reported, not only the first", () => {
    const data = load(ELF);
    data.tables.prefixes[0].meaning = "";
    data.joinClusters = [];
    assert.equal(validateNameData(ELF, data).length, 2);
});
