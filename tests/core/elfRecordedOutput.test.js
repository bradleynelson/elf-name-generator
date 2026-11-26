import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGeneratorFor } from "../../js/core/generators.js";
import { getLocks, KIND } from "../../js/core/nameStructure.js";
import { SPECIES } from "../../js/core/species.js";
import { loadHistory, saveHistory } from "../../js/favorites.js";
import { readSpeciesData } from "../helpers/nameData.js";
import { seededRandom } from "../helpers/random.js";
import { drowSavedBy415, drowSavedBy420, savedBy415, savedBy420 } from "../helpers/storedNames.js";

// What every elf lineage makes today, so a refactoring can prove it kept the output. A change meant to alter names
// re-records it: RECORD=1 npx vitest run tests/core/elfRecordedOutput.test.js
const FIXTURE = join(process.cwd(), "tests/core/elfRecordedOutput.json");
const SEED_BASE = 9000;
const SAMPLE = 200;
const BATCH = 50;
const STYLES = ["neutral", "feminine", "masculine"];
const LINEAGES = SPECIES.elf.lineages.map((lineage) => lineage.value);

const generatorFor = createGeneratorFor(readSpeciesData());

// key order and absent fields do not count; every value, sources included, does
const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (!value || typeof value !== "object") return value;
    const keys = Object.keys(value).filter((key) => value[key] !== undefined);
    return Object.fromEntries(keys.sort().map((key) => [key, canonical(value[key])]));
};
const option = (part) => canonical({ ...part, sources: part.sources?.map((s) => s.title) });
const attempt = (build) => {
    try {
        return canonical(build());
    } catch (error) {
        return { error: error.message };
    }
};

// A roll (styles cycled, Expanded Variety every other one), each part's picker list and an edit, re-rolls with about
// half the parts locked, every structure change offered and up to two surname switches.
function recordRoll(lineage, index) {
    const generator = generatorFor(lineage);
    const random = seededRandom(SEED_BASE + index);
    const settings = { style: STYLES[index % STYLES.length], expanded: index % 2 === 0, random };
    const roll = generator.generate(settings);
    const keys = roll.parts.filter((p) => p.kind !== KIND.JOINT).map((p) => p.key);
    const row = { roll: canonical(roll), options: {}, edits: {} };
    for (const key of keys) {
        const options = generator.optionsFor(roll, key);
        row.options[key] = options.map(option);
        const pick = options[Math.floor(random() * options.length)];
        if (pick) row.edits[key] = canonical(generator.generatePartChange(roll, key, pick));
    }
    const locked = new Set(keys.filter(() => random() < 0.5));
    const locks = getLocks(roll, locked);
    row.locked = attempt(() => generator.generate({ ...settings, locks }));
    row.reshaped = attempt(() => generator.generate({ ...settings, locks, reshape: true }));
    const changeOptions = { locked, expanded: settings.expanded, random };
    row.controls = generator.getStructureControls(roll, locked, changeOptions);
    row.changes = row.controls.map(({ control }) =>
        canonical(generator.generateStructureChange(roll, control, changeOptions))
    );
    const surnames = generator.getSurnameSwitchOptions(roll, locked, changeOptions);
    row.surnameKind = surnames.kind;
    row.surnameOptions = surnames.options.map(option);
    row.surnameChanges = surnames.options
        .slice(0, 2)
        .map((choice) => canonical(generator.generateSurnameChange(roll, choice, changeOptions)));
    const fingerprint = createHash("sha1").update(JSON.stringify(row)).digest("hex").slice(0, 16);
    return [roll.name, fingerprint];
}

const recordLineage = (lineage) => Array.from({ length: SAMPLE }, (_, index) => recordRoll(lineage, index));

// A saved name, read back as the app reads it, then each part's picker list and an edit, a re-roll with every part
// but one locked, and the structure and surname choices; an error is recorded as the outcome.
function recordSaved(saved) {
    saveHistory([saved]);
    const [result] = loadHistory();
    const generator = generatorFor(result.subrace);
    const random = seededRandom(SEED_BASE);
    const keys = result.parts.filter((p) => p.kind !== KIND.JOINT).map((p) => p.key);
    const none = new Set();
    const row = {
        options: keys.map((key) => attempt(() => generator.optionsFor(result, key).map(option))),
        edits: keys.map((key) =>
            attempt(() => {
                const own = result.parts.find((p) => p.key === key);
                const other = generator.optionsFor(result, key).find((o) => o.text !== own.text);
                return other && generator.generatePartChange(result, key, other);
            })
        ),
        rolls: keys.map((key) =>
            attempt(() => {
                const locks = getLocks(result, new Set(keys.filter((k) => k !== key)));
                return generator.generate({ reshape: true, locks, random });
            })
        ),
        controls: attempt(() => generator.getStructureControls(result, none, { random })),
        surnames: attempt(() => {
            const { kind, options } = generator.getSurnameSwitchOptions(result, none, { random });
            const changed = options[0] && generator.generateSurnameChange(result, options[0], { random });
            return { kind, options: options.map(option), changed };
        })
    };
    return [saved.name, createHash("sha1").update(JSON.stringify(row)).digest("hex").slice(0, 16)];
}
const SAVED = { savedBy415, drowSavedBy415, savedBy420, drowSavedBy420 };
const recordSavedNames = () => Object.fromEntries(Object.entries(SAVED).map(([by, saved]) => [by, recordSaved(saved)]));

if (process.env.RECORD) {
    const recorded = Object.fromEntries(LINEAGES.map((lineage) => [lineage, recordLineage(lineage)]));
    // one roll per line, so a re-recording's diff shows which names changed
    const group = ([name, rows]) => `"${name}": [\n${rows.map((row) => JSON.stringify(row)).join(",\n")}\n]`;
    const groups = Object.entries({ ...recorded, saved: Object.entries(recordSavedNames()) }).map(group);
    writeFileSync(FIXTURE, `{\n${groups.join(",\n")}\n}\n`);
}
const expected = existsSync(FIXTURE) ? JSON.parse(readFileSync(FIXTURE, "utf-8")) : {};

describe("elf names as recorded", () => {
    // in batches, so each test stays well inside the time limit when the whole suite runs at once
    const batches = LINEAGES.flatMap((lineage) =>
        Array.from({ length: SAMPLE / BATCH }, (_, batch) => [lineage, batch * BATCH])
    );
    it.each(batches)("%s gives the recorded names, parts, lists and changes from seed %i on", (lineage, first) => {
        const differences = Array.from({ length: BATCH }, (_, offset) => first + offset).flatMap((index) => {
            const [name, fingerprint] = recordRoll(lineage, index);
            const [recordedName, recordedFingerprint] = expected[lineage]?.[index] ?? [];
            return fingerprint === recordedFingerprint
                ? []
                : [`seed ${SEED_BASE + index}: "${name}" (recorded "${recordedName}")`];
        });
        expect(differences, "rolls that differ from the recording").toEqual([]);
    });

    it("names saved by 4.1.5 and 4.2.0 give the recorded lists, edits, re-rolls and surname choices", () => {
        expect(Object.entries(recordSavedNames())).toEqual(expected.saved);
    });
});
