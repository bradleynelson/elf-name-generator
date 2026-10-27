import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { DrowNameGenerator } from "../../js/core/DrowNameGenerator.js";
import { ELF_SUBRACES, ElfNameGenerator } from "../../js/core/ElfNameGenerator.js";
import { seededRandom } from "../helpers/random.js";

// BMN-61 (split from BMN-13): rules every generated name must follow, checked over many seeded rolls instead of a few
// hand-picked examples. They catch mistakes that no single example test would notice. Behaviour that is already pinned
// by an example lives in ElfNameGenerator.test.js, DrowNameGenerator.test.js and structureControlsAgree.test.js; this
// file only adds the "always" checks. A new species or lineage must be added to the generator list below.
//
// Sampling: for each lineage, SAMPLE rolls with seeds SEED_BASE + 0..SAMPLE-1, cycling through the three styles. Each
// roll is then re-rolled under locks of increasing share (LOCK_SHARES, cycled), pressed through every structure control
// that is offered, and re-built with one part swapped for another picker option.
const load = (file) => JSON.parse(readFileSync(join(process.cwd(), "data", file), "utf-8"));
const gen = new ElfNameGenerator(load("elfNames.json"), new DrowNameGenerator(load("drowNames.json")));
const LINEAGES = [...ELF_SUBRACES, "drow"];
const STYLES = ["neutral", "feminine", "masculine"];
const LOCK_SHARES = [0.3, 0.6, 1]; // share of the lockable parts kept; 1 is the "everything locked" extreme
const SEED_BASE = 61000;
const SAMPLE = 200;
const PICKER_SAMPLE = 40; // rolls that also get the (slower) part-picker swap

// the parts a visitor can lock: name components, a whole surname or house; never the joins between them
const isLockable = (part) => /^([tnf]\d+|family|house)$/.test(part.key);
const letters = (text) => text.toLowerCase().replace(/\s/g, "");
const joined = (result) => result.parts.map((p) => p.text).join("");

/** The locks the app builds from a result and the keys the visitor locked (js/app.js locksFor, which is not exported). */
function locksFor(result, keys) {
    const locks = Object.fromEntries(result.parts.filter((p) => keys.has(p.key)).map((p) => [p.key, p]));
    return {
        ...locks,
        ...(result.shape ? { shape: result.shape, sex: result.sex } : {}),
        ...(result.familyShape ? { familyShape: result.familyShape } : {})
    };
}

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
        if (!isLockable(part)) continue; // joins and structure carry no source
        // provenance: a published or split part names its source, a composed one its words, a table part its meaning
        const hasProvenance =
            (part.method === "published" && Boolean(part.source)) ||
            (part.method === "split" && Boolean(part.from)) ||
            (part.method === "composed" && part.words?.length === 2) ||
            (part.method === undefined && typeof part.meaning === "string" && part.meaning !== "");
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

describe.each(LINEAGES)("%s generator invariants", (subrace) => {
    // rolls and locks stay in step with this lineage's seeds; the generator is shared, its repeat memory only avoids repeats
    const options = (i, random) => ({ subrace, style: STYLES[i % STYLES.length], random });

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
            const locks = locksFor(start, keys);
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
        expect(pressed, "the sample must press controls, or this proves nothing").toBeGreaterThan(SAMPLE);
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
            const locks = { ...locksFor(start, all), [key]: choice };
            const result = gen.generate({ ...options(i, random), locks });
            expectWellFormed(result, label);
            expectLocksKept(result, lockedTexts(start, keep), label);
            expect(result.parts.find((p) => p.key === key)?.text, label).toBe(choice.text);
            swapped++;
        }
        expect(swapped, "the sample must swap parts, or this proves nothing").toBeGreaterThan(PICKER_SAMPLE / 2);
    });
});
