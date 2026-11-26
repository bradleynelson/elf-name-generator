// Joining letters, shared by every generator that builds names from components: a roll and a picker edit join by the
// same rule, so an edit makes only names a roll would make.
import { isStructurePart, joiningLetter, KIND } from "./nameStructure.js?v=4.3.0";
import { joinsCleanly } from "./splitComponents.js?v=4.3.0";

/**
 * @typedef {Object} JoinRules
 * @property {string[]} letters - the letters the source allows at an awkward join
 * @property {string} basis - that source, shown with the letter
 * @property {Set<string>} clusters - consonant runs found inside the pool's published names (they join cleanly)
 * @property {string} keyPrefix - the section's slot key prefix, for the letter's key
 * @property {string} section - the section the letter sits in
 */

/**
 * The components joined: where two meet uncleanly, one of the rules' letters that meets both cleanly, tried in the
 * order `orderLetters(letters, position, next)` gives; the first completion `spell` accepts wins.
 * @param {Object[]} components - parts in order; a space or apostrophe joins plainly
 * @param {JoinRules} rules
 * @param {function(string[], number, Object): string[]} orderLetters - the letters that fit, the letter's position
 *   among the parts and the component after it; returns the letters to try, in order
 * @param {function(Object[]): (string|null)} spell - the section's text, or null when its spelling rules it out
 * @returns {{ text: string, parts: Object[] } | null}
 */
export function generateJoined(components, rules, orderLetters, spell) {
    const { letters, basis, clusters, keyPrefix, section } = rules;
    const complete = (index, out) => {
        if (index === components.length) {
            const text = spell(out);
            return text && { text, parts: out };
        }
        const part = components[index];
        const previous = out.at(-1);
        const isPlain =
            !previous ||
            isStructurePart(previous) ||
            isStructurePart(part) ||
            joinsCleanly(previous.text, part.text, clusters);
        if (isPlain) return complete(index + 1, [...out, part]);
        const fitting = letters.filter(
            (l) => joinsCleanly(previous.text, l, clusters) && joinsCleanly(previous.text + l, part.text, clusters)
        );
        for (const letter of orderLetters(fitting, out.length, part)) {
            const joint = { ...joiningLetter(keyPrefix, out.length, letter, section), basis };
            const found = complete(index + 1, [...out, joint, part]);
            if (found) return found;
        }
        return null;
    };
    return complete(0, []);
}

/**
 * `parts` with `choice` in the place of the component keyed `key`, joined again. An edit draws nothing: a joining
 * letter still needed is kept while it fits, else the first in the rules' order that completes a name.
 * @returns {{ text: string, parts: Object[] } | null}
 */
export function generateComponentChange(parts, key, choice, rules, spell) {
    const keptLetters = new Map();
    parts.forEach((p, i) => {
        if (isJoiningLetter(p)) keptLetters.set(parts[i + 1].key, p.text);
    });
    const components = parts.filter((p) => !isJoiningLetter(p)).map((p) => (p.key === key ? choice : p));
    const keptFirst = (letters, _position, next) => {
        const kept = keptLetters.get(next.key);
        return letters.includes(kept) ? [kept, ...letters.filter((l) => l !== kept)] : letters;
    };
    return generateJoined(components, rules, keptFirst, spell);
}

const isJoiningLetter = (part) => part.kind === KIND.JOINT && !isStructurePart(part);
