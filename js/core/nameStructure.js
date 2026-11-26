import { selectWeighted } from "./random.js?v=4.3.0";

const FIRST_WORD_SLOTS = 2;
const EXTRA_SUFFIX_SLOT = 2; // the third slot of the long shape, and the space of the two-word shape
const SECOND_WORD_FIRST_SLOT = 3;

// Stable ids; each one's analytics value is in STRUCTURE_CONTROLS.
export const NAME_STRUCTURE_CONTROL = Object.freeze({
    FIRST_NAME: "given",
    COMPOUND_NAME: "compound",
    SURNAME: "surname",
    PHRASE: "phrase"
});

/**
 * Each structure control's analytics value and what its + and - buttons say to screen readers.
 * @type {Readonly<Record<string, { analytics: string, addLabel: string, removeLabel: string }>>}
 */
export const STRUCTURE_CONTROLS = Object.freeze({
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: {
        analytics: "first_name_length",
        addLabel: "Add a suffix to the first name",
        removeLabel: "Remove the last suffix of the first name"
    },
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: {
        analytics: "compound_name",
        addLabel: "Add a compound name",
        removeLabel: "Remove the compound name"
    },
    [NAME_STRUCTURE_CONTROL.SURNAME]: {
        analytics: "surname_length",
        addLabel: "Add a suffix to the surname",
        removeLabel: "Remove the last suffix of the surname"
    },
    [NAME_STRUCTURE_CONTROL.PHRASE]: {
        analytics: "name_phrase",
        addLabel: "Add a name phrase",
        removeLabel: "Remove the name phrase"
    }
});

export const sameShape = (shapeA, shapeB) => shapeA?.join() === shapeB.join();

// Stored with every part and sent as controlled analytics values, so keep them stable.
export const SECTION = Object.freeze({ GIVEN: "given", FAMILY: "family", PHRASE: "phrase" });
export const SECTION_ANALYTICS = Object.freeze({
    [SECTION.GIVEN]: "first_name",
    [SECTION.FAMILY]: "family_name",
    [SECTION.PHRASE]: "name_phrase"
});
export const KIND = Object.freeze({ PREFIX: "prefix", SUFFIX: "suffix", WHOLE: "whole", JOINT: "joint" });
export const METHOD = Object.freeze({ PUBLISHED: "published", SPLIT: "split", COMPOSED: "composed" });

/**
 * A name as every lineage's generator returns it and saved names and history store it.
 * @typedef {Object} NameResult
 * @property {string} name
 * @property {string} sex - a SEX (species.js); dwarf names are always female or male
 * @property {string} subrace - the lineage; stored records keep the old field name
 * @property {Part[]} parts - in name order
 * @property {string[]} [shape] - the first name's shape, so locks keep their places; `familyShape` a built surname's
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
 * @property {string} [method] - a METHOD: split from a published name, published whole, or composed of Common words
 * @property {{ text: string, names?: string[], sources?: Object[] }[]} [words] - a composed name's words and evidence
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

/**
 * Where a slot sits: its section, and the words its role puts before the slot's kind ("family " makes "family prefix").
 * @typedef {{ section: string, rolePrefix: string }} SlotPlace
 */
export const GIVEN_SLOT = Object.freeze({ section: SECTION.GIVEN, rolePrefix: "" });

/** A component in a prefix or suffix slot, keeping its own fields (a split component's `method` and `from`). */
export const slotPart = (component, key, slot, { section, rolePrefix }) => ({
    ...component,
    key,
    role: `${rolePrefix}${slot}`,
    section,
    kind: slot
});

/** One spelling of a table entry in a slot, with the entry's meaning and sources. */
export const tablePart = (entry, text, key, slot, place) =>
    slotPart({ text, meaning: entry.meaning, sources: entry.sources }, key, slot, place);

/** A published name as one whole part; a species adds what else it shows (form, meaning). */
export const publishedPart = (entry, key, role, section) => ({
    key,
    role,
    text: entry.text,
    method: METHOD.PUBLISHED,
    sources: entry.sources,
    section,
    kind: KIND.WHOLE
});

export const isSurnamePart = (part) => part.section === SECTION.FAMILY;

// roles keep the short words they were stored with; a label says the whole name
const ROLE_LABELS = {
    "family prefix": "family name prefix",
    "family suffix": "family name suffix",
    house: "house name",
    "house prefix": "house name prefix",
    "house suffix": "house name suffix"
};

/** What a part is called on the page ("family name prefix"). */
export const formatPartLabel = (part) => ROLE_LABELS[part.role] ?? part.role;

export const isSlotComponent = (part) => part.kind === KIND.PREFIX || part.kind === KIND.SUFFIX;

/** A table component, a published translation, a built house's phrase or a Common-form compound. */
export const hasKnownMeaning = (part) =>
    (isSlotComponent(part) && part.method !== METHOD.SPLIT && Boolean(part.meaning)) ||
    Boolean(part.meaningSource || part.wordMeaning) ||
    part.method === METHOD.COMPOSED;

export const isSamePart = (a, b) => a.text === b.text && a.method === b.method && a.meaning === b.meaning;

export function generateWithPart(result, key, choice, rebuild) {
    const part = result.parts.find((p) => p.key === key);
    if (!part) return null;
    return isSamePart(part, choice) ? result : rebuild(part);
}

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

/**
 * The part indexes of each displayed word: a space ends a word, and the surname starts one at its first component (a
 * joining letter inside it does not), unless a space just opened it (4.1.5 saved one before every family name). A
 * word is empty when a space ends the name or follows another space; no generator makes one.
 */
export function groupWords(parts) {
    const words = [];
    const start = surnameStart(parts);
    parts.forEach((part, index) => {
        if (part.role === "space") return words.push([]);
        if (!words.length || (index === start && words.at(-1).length > 0)) words.push([]);
        words.at(-1).push(index);
    });
    return words;
}

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

/** A section's text: a whole part (always alone in its section) as published, else its words capitalized. */
export const formatSectionText = (parts) =>
    parts[0].kind === KIND.WHOLE ? parts[0].text : wordsOf(parts).map(capitalize).join(" ");

/** A first name and surname result as its two sections, split where the surname starts, each with its shape. */
export function sectionsOf(result) {
    const start = surnameStart(result.parts);
    // 4.1.5 and earlier saved a space part before the surname; the space between the sections is not a part
    const givenEnd = result.parts[start - 1]?.role === "space" ? start - 1 : start;
    const section = (parts, shape) => ({ text: formatSectionText(parts), parts, shape });
    return {
        given: section(result.parts.slice(0, givenEnd), result.shape),
        family: section(result.parts.slice(start), result.familyShape)
    };
}

/**
 * The shape for a roll, drawn by weight among the shapes in which every locked slot keeps its kind. Chosen: the
 * remaining shapes keep their relative weights.
 * @param {{ shape: string[], weight: number }[]} shapes
 * @param {Object} locks - locked parts by key; those whose key is `keyPrefix` and a number are slots
 */
export function selectRollShape(shapes, locks, keyPrefix, random) {
    const lockedSlots = Object.entries(locks).filter(([key]) => getSlotNumber(key, keyPrefix) !== undefined);
    const fits = shapes.filter(({ shape }) =>
        lockedSlots.every(([key, part]) => part.kind === shape[getSlotNumber(key, keyPrefix)])
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

/** Whether the visitor locked every part of a name (joints have no lock), so a roll has nothing to change. */
export const isEveryPartLocked = (result, keys) =>
    Boolean(result) && result.parts.every((p) => p.kind === KIND.JOINT || keys.has(p.key));

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
