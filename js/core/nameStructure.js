// Structure changes shared by the elf and drow generators: the visitor lengthens or shortens a first name, adds or
// removes a compound name, and a roll may change shape under locks. Each species supplies its own shapes and slot keys;
// the rules here are the same. They add no naming pattern: every target is one of the species' published shapes.
import { selectWeighted } from "./random.js?v=4.1.0";

// Slots of a first name's shapes (a slot's key is its key prefix plus its position in the shape):
const FIRST_WORD_SLOTS = 2; // prefix and suffix, which every change keeps
const EXTRA_SUFFIX_SLOT = 2; // the third slot of the long shape, and the space of the two-word shape
const SECOND_WORD_FIRST_SLOT = 3; // the two-word shape's second word starts after its space

export const sameShape = (shapeA, shapeB) => shapeA?.join() === shapeB.join();

/** The position in the shape of a slot's key ("t2" with prefix "t" is 2), or undefined if the key is not a slot. */
export function getSlotNumber(key, keyPrefix) {
    const digits = key.match(new RegExp(`^${keyPrefix}(\\d+)$`))?.[1];
    return digits === undefined ? undefined : Number(digits);
}

/**
 * The shape for a roll: weighted as usual, but only among the shapes in which every locked slot is still the same kind
 * of component (a locked prefix in the first slot suits every shape that starts with a prefix). Chosen: the weights
 * are kept relative to each other, so the shapes left share the whole draw.
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
 * if unavailable. Chosen: a slot keeps its position (the second slot is always the second slot), growth only appends,
 * and a change that would delete a locked slot is unavailable.
 * @param {Set<string>} locked - keys of the parts the visitor locked
 * @param {{ short: string[], long: string[], compound: string[] }} nameShapes - the species' short, long and two-word shapes
 */
export function getChangedShape(control, shape, locked, keyPrefix, { short, long, compound }) {
    const isLocked = (slot) => locked.has(`${keyPrefix}${slot}`);
    const is = (target) => sameShape(shape, target);
    if (control === "compound") {
        const secondWordSlots = Array.from(
            { length: compound.length - SECOND_WORD_FIRST_SLOT },
            (_, offset) => SECOND_WORD_FIRST_SLOT + offset
        );
        if (is(compound)) return secondWordSlots.some(isLocked) ? null : short;
        // a long first name gives up its extra suffix, unless that is locked
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
                const slot = getSlotNumber(part.key, keyPrefix);
                return part.key.startsWith(`${keyPrefix}j`) || (slot !== undefined && slot < FIRST_WORD_SLOTS);
            })
            .map((part) => [part.key, part])
    );

/**
 * The controls to offer on a result, as { control, on }: those whose change is available. `controls` maps each control
 * to `{ isOn(result) }`.
 */
export const getAvailableControls = (controls, result, isAvailable) =>
    Object.entries(controls)
        .filter(([control]) => isAvailable(control))
        .map(([control, { isOn }]) => ({ control, on: isOn(result) }));
