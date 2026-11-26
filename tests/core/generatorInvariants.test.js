import { beforeEach, describe, expect, it } from "vitest";
import { createGeneratorFor } from "../../js/core/generators.js";
import { selectRandom } from "../../js/core/random.js";
import { SUBRACES } from "../../js/core/species.js";
import { seededRandom } from "../helpers/random.js";
import { getLocks, isSamePart, KIND, SECTION } from "../../js/core/nameStructure.js";
import { readSpeciesData, stylesOf } from "../helpers/nameData.js";

// Sampling: per lineage, SAMPLE rolls (seeds from SEED_BASE, styles cycled), each re-rolled under LOCK_SHARES, pressed
// through every offered structure control, and rebuilt with one part swapped for another picker option.
const data = readSpeciesData();
const STYLES = ["neutral", "feminine", "masculine"];
const LOCK_SHARES = [0.3, 0.6, 1]; // share of the lockable parts kept; 1 is the "everything locked" extreme
const SEED_BASE = 61000;
const SAMPLE = 200;
const PICKER_SAMPLE = 40; // rolls that also get the (slower) part-picker swap
const OFFERED_SAMPLE = 12; // offered parts tried per slot, drawn from the picker's list
// wild dwarves have no clan and no name phrase, so nothing to add or take away
const WITHOUT_CONTROLS = new Set(["wild-dwarf"]);

// the parts a visitor can lock: name components, a whole surname or house; never the joins between them
const isLockable = (part) => /^([tnfg]\d+|family|house|given|clan|qualifier|parent|ancestor|place)$/.test(part.key);
const letters = (text) => text.toLowerCase().replace(/\s/g, "");
const joined = (result) => result.parts.map((p) => p.text).join("");

/** Rule 1 and 3: the name is its parts, and every part carries what the UI reads. */
function expectWellFormed(result, label) {
    expect(letters(result.name), `${label}: name "${result.name}" vs parts "${joined(result)}"`).toBe(
        letters(joined(result))
    );
    const keys = result.parts.map((p) => p.key);
    expect(new Set(keys).size, `${label}: duplicate part keys ${keys}`).toBe(keys.length);
    for (const part of result.parts) {
        const where = `${label}: ${result.name}, part ${part.key} (${part.role})`;
        expect(typeof part.key === "string" && part.key !== "", where).toBe(true);
        expect(typeof part.role === "string" && part.role !== "", where).toBe(true);
        expect(typeof part.text === "string" && part.text !== "", where).toBe(true);
        // where it sits and what it is: the app and the page read these, never the key or role
        expect(Object.values(SECTION), where).toContain(part.section);
        expect(Object.values(KIND), where).toContain(part.kind);
        expect(part.kind === KIND.JOINT, `${where}: a joint is not lockable and nothing else is a joint`).toBe(
            !isLockable(part)
        );
        if (!isLockable(part)) continue; // joins and structure carry no source
        // provenance: a published or table part names its sources, a split one its names and their books, a composed
        // one its words; a table part also its meaning
        const hasSources = part.sources?.length > 0 && part.sources.every((s) => typeof s.title === "string");
        const hasProvenance =
            (part.method === "published" && hasSources) ||
            (part.method === "split" && part.from?.length > 0 && hasSources) ||
            (part.method === "composed" && part.words?.length === 2) ||
            (part.method === undefined && hasSources && typeof part.meaning === "string" && part.meaning !== "");
        expect(hasProvenance, `${where}: no provenance ${JSON.stringify(part)}`).toBe(true);
    }
}

/** Rule 2: every locked part ({ key: text }) is still in the result, in its place, with the same text. */
function expectLocksKept(result, expected, label) {
    for (const [key, text] of expected) {
        const kept = result.parts.find((p) => p.key === key);
        expect(kept?.text, `${label}: ${result.name} lost locked ${key}`).toBe(text);
    }
}

const lockedTexts = (result, keys) => new Map(result.parts.filter((p) => keys.has(p.key)).map((p) => [p.key, p.text]));

describe.each(SUBRACES)("%s generator invariants", (subrace) => {
    // A new generator for every test: generators remember recent names, and one elf generator serves all four
    // elf lineages, so a shared one would let a test's sample depend on which tests ran before it.
    let gen;
    const styles = stylesOf(createGeneratorFor(data), subrace).filter((style) => STYLES.includes(style));
    beforeEach(() => {
        gen = createGeneratorFor(data)(subrace);
    });
    // rolls and locks stay in step with this lineage's seeds
    const options = (i, random) => ({ subrace, style: styles[i % styles.length], random });
    // a picker test's roll, every other one with Expanded Variety, and the keys of its lockable parts
    const pickerRoll = (i) => {
        const random = seededRandom(SEED_BASE + i);
        const start = gen.generate({ ...options(i, random), expanded: i % 2 === 0 });
        return { random, start, all: new Set(start.parts.filter(isLockable).map((p) => p.key)) };
    };

    it("builds well-formed names from plain rolls", () => {
        for (let i = 0; i < SAMPLE; i++) {
            const result = gen.generate(options(i, seededRandom(SEED_BASE + i)));
            expectWellFormed(result, `${subrace} seed ${SEED_BASE + i}`);
        }
    });

    it("keeps locked parts through rolls and finishes, whatever is locked", () => {
        for (let i = 0; i < SAMPLE; i++) {
            const random = seededRandom(SEED_BASE + i);
            const start = gen.generate(options(i, random));
            const share = LOCK_SHARES[i % LOCK_SHARES.length];
            const keys = new Set(start.parts.filter((p) => isLockable(p) && random() < share).map((p) => p.key));
            if (share === 1) start.parts.filter(isLockable).forEach((p) => keys.add(p.key));
            const label = `${subrace} seed ${SEED_BASE + i}, locked ${[...keys]}`;
            const expected = lockedTexts(start, keys);
            const locks = getLocks(start, keys);
            // a roll may reshape the name; an edit through the picker keeps the shape. Neither may throw (rule 4: the
            // retry limit is not exhausted) or lose a locked part.
            for (const reshape of [true, false]) {
                const result = gen.generate({ ...options(i, random), reshape, locks });
                expectWellFormed(result, label);
                expectLocksKept(result, expected, label);
            }
        }
    });

    it("keeps locked parts through every offered + / - change, repeatedly", () => {
        let pressed = 0;
        for (let i = 0; i < SAMPLE; i++) {
            const random = seededRandom(SEED_BASE + i);
            let result = gen.generate(options(i, random));
            const share = LOCK_SHARES[i % LOCK_SHARES.length];
            const keys = new Set(result.parts.filter((p) => isLockable(p) && random() < share).map((p) => p.key));
            const expected = lockedTexts(result, keys);
            const label = `${subrace} seed ${SEED_BASE + i}, locked ${[...keys]}`;
            // press up to four offered controls in a row, so a change is also made on an already changed name
            for (let step = 0; step < 4; step++) {
                const offered = gen.getStructureControls(result, keys, { random });
                if (!offered.length) break;
                const { control } = offered[Math.floor(random() * offered.length)];
                const changed = gen.generateStructureChange(result, control, { locked: keys, random });
                expect(changed, `${label}: ${control} was offered but failed on ${result.name}`).not.toBeNull();
                expectWellFormed(changed, `${label}, ${control}`);
                expectLocksKept(changed, expected, `${label}, ${control}`);
                result = changed;
                pressed++;
            }
        }
        if (WITHOUT_CONTROLS.has(subrace)) expect(pressed).toBe(0);
        else expect(pressed, "the sample must press controls, or this proves nothing").toBeGreaterThan(SAMPLE);
    });

    it("builds a name when one part is swapped for a picker option with the rest locked", () => {
        let swapped = 0;
        for (let i = 0; i < PICKER_SAMPLE; i++) {
            const random = seededRandom(SEED_BASE + i);
            const start = gen.generate(options(i, random));
            const all = new Set(start.parts.filter(isLockable).map((p) => p.key));
            const key = [...all][Math.floor(random() * all.size)];
            const choices = gen.optionsFor(start, key);
            const choice = choices[Math.floor(random() * choices.length)];
            if (!choice) continue;
            const label = `${subrace} seed ${SEED_BASE + i}, swap ${key} to ${choice.text}`;
            const keep = new Set([...all].filter((k) => k !== key));
            const result = gen.generatePartChange(start, key, choice);
            expect(result, label).not.toBeNull();
            expectWellFormed(result, label);
            expectLocksKept(result, lockedTexts(start, keep), label);
            expect(result.parts.find((p) => p.key === key)?.text, label).toBe(choice.text);
            swapped++;
        }
        expect(swapped, "the sample must swap parts, or this proves nothing").toBeGreaterThan(PICKER_SAMPLE / 2);
    });

    it("offers every part another roll put in the slot that a roll keeping the rest accepts, and the current one", () => {
        let checked = 0;
        for (let i = 0; i < PICKER_SAMPLE; i++) {
            const { random, start, all } = pickerRoll(i);
            const donor = gen.generate({ ...options(i, random), expanded: i % 2 === 0 });
            for (const key of all) {
                const current = start.parts.find((p) => p.key === key);
                const offered = gen.optionsFor(start, key);
                const label = `${subrace} seed ${SEED_BASE + i}, ${start.name}, ${key}`;
                if (current.method !== "composed") {
                    expect(
                        offered.filter((o) => isSamePart(o, current)),
                        `${label}: current part`
                    ).toHaveLength(1);
                }
                const other = donor.parts.find((p) => p.key === key);
                const isComparable = other?.role === current.role && other.method === current.method;
                if (!isComparable || other.method === "composed") continue;
                let accepted;
                try {
                    accepted = gen.generate({
                        ...options(i, random),
                        locks: { ...getLocks(start, all), [key]: other }
                    });
                } catch {
                    continue;
                }
                expect(accepted.parts.find((p) => p.key === key)?.text).toBe(other.text);
                const listed = offered.some((o) => isSamePart(o, other));
                expect(listed, `${label}: ${other.text} builds ${accepted.name} but is not offered`).toBe(true);
                checked++;
            }
        }
        // a wild dwarf name has a single part (no clan), so at least one comparison per two rolls
        expect(checked, "the sample must compare parts, or this proves nothing").toBeGreaterThan(PICKER_SAMPLE / 2);
    });

    it("offers only parts that a roll keeping the rest accepts in the slot", () => {
        let checked = 0;
        for (let i = 0; i < PICKER_SAMPLE; i++) {
            const { random, start, all } = pickerRoll(i);
            for (const key of all) {
                const offered = gen.optionsFor(start, key);
                const tried = Array.from({ length: OFFERED_SAMPLE }, () => selectRandom(offered, random));
                for (const choice of new Set(tried.filter(Boolean))) {
                    const label = `${subrace} seed ${SEED_BASE + i}, ${start.name}, ${key} offered ${choice.text}`;
                    let accepted;
                    try {
                        accepted = gen.generate({
                            ...options(i, random),
                            locks: { ...getLocks(start, all), [key]: choice }
                        });
                    } catch (error) {
                        expect.fail(`${label}: a roll refuses it (${error.message})`);
                    }
                    expect(accepted.parts.find((p) => p.key === key)?.text, label).toBe(choice.text);
                    checked++;
                }
            }
        }
        expect(checked, "the sample must try offered parts, or this proves nothing").toBeGreaterThan(PICKER_SAMPLE);
    });
});
