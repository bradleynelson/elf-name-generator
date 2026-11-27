// The spelling checks every generator applies to the words it builds. Each lineage gives its own limits and keep chance
// (`SpellingRules`); the checks themselves live only here.
import { VOWELS } from "./splitComponents.js?v=4.3.2";

const VOWEL_GROUP = new RegExp(`[${VOWELS}]+`, "g");
// Inferred: doubled letters are published (Barendd, Torunn), a letter three times in a row never is.
const TRIPLE_LETTER = /(.)\1\1/;

/**
 * A lineage's spelling rules. The limits are required; the keep chance is a preference, applied only to rolls.
 * @typedef {Object} SpellingRules
 * @property {number} [minLetters] - a limit left out holds a word to nothing
 * @property {number} [maxLetters]
 * @property {number} [minSyllables]
 * @property {number} [maxSyllables]
 * @property {number} [longSyllables] - a word with this many syllables or more is long
 * @property {number} [longKeep] - the chance a roll keeps a long word
 */

export const countSyllables = (word) => word.match(VOWEL_GROUP)?.length ?? 0;

export const hasTripleLetter = (text) => TRIPLE_LETTER.test(text);

/** Whether a word is within the rules' letter and syllable limits. */
export function validateSpelling(word, rules) {
    const { minLetters = 0, maxLetters = Infinity, minSyllables = 0, maxSyllables = Infinity } = rules;
    const syllables = countSyllables(word);
    return (
        word.length >= minLetters && word.length <= maxLetters && syllables >= minSyllables && syllables <= maxSyllables
    );
}

export const isLongWord = (word, { longSyllables }) => countSyllables(word) >= longSyllables;

/** A roll's length preference: a long word is kept with the rules' chance (one draw per long word judged). */
export const keepsLengthOnRoll = (rules, random) => (word) => !isLongWord(word, rules) || random() < rules.longKeep;

/** The length preference of an edit or structure change, which is not a roll: every length is kept. */
export const keepsEveryLength = () => true;
