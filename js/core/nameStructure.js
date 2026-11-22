import { selectWeighted } from "./random.js?v=4.2.0";

const FIRST_WORD_SLOTS = 2;
const EXTRA_SUFFIX_SLOT = 2; // the third slot of the long shape, and the space of the two-word shape
const SECOND_WORD_FIRST_SLOT = 3;

// Stable ids; also sent as controlled analytics values.
export const NAME_STRUCTURE_CONTROL = Object.freeze({
    FIRST_NAME: "given",
    COMPOUND_NAME: "compound",
    SURNAME: "surname"
});

export const sameShape = (shapeA, shapeB) => shapeA?.join() === shapeB.join();

// Stored with every part and sent as controlled analytics values, so keep them stable.
export const SECTION = Object.freeze({ GIVEN: "given", FAMILY: "family" });
export const KIND = Object.freeze({ PREFIX: "prefix", SUFFIX: "suffix", WHOLE: "whole", JOINT: "joint" });

/**
 * A name as every lineage's generator returns it and saved names and history store it.
 * @typedef {Object} NameResult
 * @property {string} name
 * @property {string} sex - "female", "male" or "neutral" (drow names are always female or male)
 * @property {string} subrace - the lineage; stored records keep the old field name
 * @property {Part[]} parts - in name order
 * @property {string[]} [shape] - the first name's shape, so locked slots keep their places; `familyShape` likewise
 *   for a table-built surname
 * @property {{ sources: Object[] }} [published] - when the first name is itself a published name
 */

/**
 * @typedef {Object} Part
 * @property {string} key - stored with saved names, history and locks, so its format is fixed: a slot is its section's
 *   key prefix and position ("t0", "n1", drow "f2"), an apostrophe or space "s" and its position, a joining letter the
 *   prefix, "j" and its position ("tj1"), a whole name "family" or "house"
 * @property {string} role - "prefix", "family suffix", "house prefix", "joining letter", "family name"...
 * @property {string} section - a SECTION
 * @property {string} kind - a KIND: a table or split component fills a prefix or suffix slot, a published or
 *   Common-form name is whole, a joint is a joining letter, apostrophe or space
 * @property {string} text
 * @property {{ title: string, authority: string }[]} [sources] - in the order they are shown
 * @property {string} [meaning]
 * @property {string} [method] - "split", "published" or "composed"
 */

export const slotKey = (keyPrefix, index) => `${keyPrefix}${index}`;
export const jointKey = (keyPrefix, index) => `${keyPrefix}j${index}`;
const isJointKey = (key, keyPrefix) => key.startsWith(`${keyPrefix}j`);

/** The position in the shape of a slot's key ("t2" with prefix "t" is 2), or undefined if the key is not a slot. */
export function getSlotNumber(key, keyPrefix) {
    const digits = key.match(new RegExp(`^${keyPrefix}(\\d+)$`))?.[1];
    return digits === undefined ? undefined : Number(digits);
}

export const includesSlotKey = (keys, keyPrefix) =>
    [...keys].some((key) => getSlotNumber(key, keyPrefix) !== undefined);

const STRUCTURE = { "'": "apostrophe", " ": "space" };
const STRUCTURE_ROLES = new Set(Object.values(STRUCTURE));

/** The part for an apostrophe or space in a shape, keyed by position; null for a component slot. */
export const structurePart = (mark, index) =>
    mark in STRUCTURE
        ? { key: `s${index}`, role: STRUCTURE[mark], text: mark, section: SECTION.GIVEN, kind: KIND.JOINT }
        : null;
export const isStructurePart = (part) => STRUCTURE_ROLES.has(part.role);

export const joiningLetter = (keyPrefix, index, text, section) => ({
    key: jointKey(keyPrefix, index),
    role: "joining letter",
    text,
    section,
    kind: KIND.JOINT
});

export const isSurnamePart = (part) => part.section === SECTION.FAMILY;

const STORED_FAMILY_KEYS = new Set(["family", "house"]);

/** The section and kind of a part saved by 4.1.5 or earlier, read from its key and role as that version did. */
export function getStoredPlace({ key, role }) {
    const section = key.startsWith("n") || STORED_FAMILY_KEYS.has(key) ? SECTION.FAMILY : SECTION.GIVEN;
    const slot = [KIND.PREFIX, KIND.SUFFIX].find((kind) => role.endsWith(kind));
    const kind = isStructurePart({ role }) || role === "joining letter" ? KIND.JOINT : slot || KIND.WHOLE;
    return { section, kind };
}

const official = (title) => ({ title, authority: "official" });
const STORED_TABLE_CREDITS = {
    'Races of the Wild (3.5e), first published in Dragon #251 (1998), "By Any Other Name"': [
        official("Races of the Wild (3.5e)"),
        official("Dragon #251")
    ],
    "By Any Other Name: The Drow (Dragon #267)": [official("Dragon #267")]
};
export const getStoredTableSources = (storedTablesLine) => STORED_TABLE_CREDITS[storedTablesLine];

/** The index of the surname's first part (a joining letter inside the surname comes later), or -1 if there is none. */
export const surnameStart = (parts) => parts.findIndex(isSurnamePart);

/** The text of joined parts, as words split at each space (still in lower case). */
export const wordsOf = (parts) =>
    parts
        .map((p) => p.text)
        .join("")
        .split(" ");
// Published names keep lower case after an apostrophe (Berg'inyon), so only the first letter is capitalized
export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
/** A section ({ text, parts }) made of one whole part: a published or Common-form family name, or a published house. */
export const wholeSection = (part) => part && { text: part.text, parts: [part] };

/**
 * The shape for a roll, drawn by weight among the shapes in which every locked slot keeps its kind. Chosen: the
 * remaining shapes keep their relative weights.
 * @param {{ shape: string[], weight: number }[]} shapes
 * @param {Object} locks - locked parts by key; those whose key is `keyPrefix` and a number are slots
 */
export function selectRollShape(shapes, locks, keyPrefix, random) {
    const lockedSlots = Object.entries(locks).filter(([key]) => getSlotNumber(key, keyPrefix) !== undefined);
    const fits = shapes.filter(({ shape }) =>
        // a role like "family prefix" still ends with the kind of slot it fills
        lockedSlots.every(([key, part]) => part.role.endsWith(shape[getSlotNumber(key, keyPrefix)]))
    );
    if (!fits.length) throw new Error("No name shape keeps the locked parts where they are. Try unlocking a part.");
    return selectWeighted(fits, (candidate) => candidate.weight, random).shape;
}

/**
 * The shape a control ("given" or "surname" for short or long, "compound" for the second given name) moves to, or null
 * if unavailable. Chosen: every target is one of the lineage's published shapes, a slot keeps its position, growth only
 * appends, and a change that would delete a locked slot is unavailable.
 * @param {Set<string>} locked - keys of the parts the visitor locked
 * @param {{ short: string[], long: string[], compound: string[] }} nameShapes - the species' short, long and two-word shapes
 */
export function getChangedShape(control, shape, locked, keyPrefix, { short, long, compound }) {
    const isLocked = (slot) => locked.has(`${keyPrefix}${slot}`);
    const is = (target) => sameShape(shape, target);
    if (control === NAME_STRUCTURE_CONTROL.COMPOUND_NAME) {
        const isSecondWordLocked = compound.some((_, slot) => slot >= SECOND_WORD_FIRST_SLOT && isLocked(slot));
        if (is(compound)) return isSecondWordLocked ? null : short;
        return is(short) || (is(long) && !isLocked(EXTRA_SUFFIX_SLOT)) ? compound : null;
    }
    if (is(short)) return long;
    return is(long) && !isLocked(EXTRA_SUFFIX_SLOT) ? short : null;
}

/** The parts every change keeps, by key: the first word's prefix and suffix, and any joining letters between them. */
export const getKeptParts = (parts, keyPrefix) =>
    Object.fromEntries(
        parts
            .filter((part) => {
                // a key that is not a slot has no number, and `undefined < FIRST_WORD_SLOTS` is false
                return isJointKey(part.key, keyPrefix) || getSlotNumber(part.key, keyPrefix) < FIRST_WORD_SLOTS;
            })
            .map((part) => [part.key, part])
    );

/**
 * The locks for generating from a result: the locked parts by key, plus the shapes and sex they came in.
 * @param {Set<string>} keys - keys of the locked parts
 */
export function getLocks(result, keys) {
    if (!result || !keys.size) return {};
    const locks = Object.fromEntries(result.parts.filter((p) => keys.has(p.key)).map((p) => [p.key, p]));
    return {
        ...locks,
        ...(result.shape ? { shape: result.shape, sex: result.sex } : {}),
        ...(result.familyShape ? { familyShape: result.familyShape } : {})
    };
}

/**
 * The controls to offer on a result, as { control, on }: those whose change builds with every part kept, found by trying
 * `generator.generateStructureChange`. `controls` maps each control to `{ isOn(result) }`.
 * @param {Set<string>} locked - keys of the parts the visitor locked
 */
export const getAvailableControls = (controls, result, generator, locked, options) =>
    Object.entries(controls)
        .filter(([control]) => generator.generateStructureChange(result, control, { ...options, locked }))
        .map(([control, { isOn }]) => ({ control, on: isOn(result) }));
