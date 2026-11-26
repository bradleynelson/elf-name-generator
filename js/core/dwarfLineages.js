// What makes each dwarf lineage's names differ, as data the dwarf generator reads in place of knowing the lineage.
// Which records a lineage gets is its rule set's `reads` in generators.js, not repeated here.
import { OWN_LINEAGE_WEIGHT } from "./nameRolls.js?v=4.3.0";
import { DWARF_LINEAGES as D, SPECIES } from "./species.js?v=4.3.0";

/**
 * @typedef {Object} LineageRules
 * @property {string} lineage - the stored lineage value, used only to tell a lineage's own records from untagged ones
 * @property {number} ownWeight - how much likelier names and clans tied to this lineage are than untagged ones
 * @property {string[]} sexes - the sexes its names can be asked for
 * @property {boolean} hasFamily - false: no clan name
 * @property {{ form: string, weight: number }[]} phrases - the phrase forms it may take (the forms are in the generator)
 * @property {number} phraseCount - the most phrase forms one name may carry
 */

const SEXES = SPECIES.dwarf.sexes;
// Sourced forms (FR11 p2). Inferred weights from published dwarf names: ~10 qualifiers, ~5 places, 3 "blood
// of" (FR11 p2: only the most famous); chosen: parentage kept with qualifiers, the formal self-introduction rarely printed.
const CLAN_DWARF_PHRASES = [
    { form: "qualifier", weight: 4 },
    { form: "parentage", weight: 4 },
    { form: "place", weight: 3 },
    { form: "blood", weight: 1 }
];

/** @type {Object<string, LineageRules>} */
export const DWARF_LINEAGE_RULES = {
    [D.SHIELD]: {
        lineage: D.SHIELD,
        ownWeight: OWN_LINEAGE_WEIGHT,
        sexes: SEXES,
        hasFamily: true,
        phrases: CLAN_DWARF_PHRASES,
        phraseCount: 1
    },
    [D.GOLD]: {
        lineage: D.GOLD,
        ownWeight: OWN_LINEAGE_WEIGHT,
        sexes: SEXES,
        hasFamily: true,
        phrases: CLAN_DWARF_PHRASES,
        // Sourced: gold dwarves' full names are longer and more elaborate (FR11 p10). Chosen: up to two forms
        phraseCount: 2
    },
    [D.WILD]: {
        lineage: D.WILD,
        ownWeight: 1,
        sexes: SEXES,
        // Sourced: wild dwarves have no clans (FR11 p15)
        hasFamily: false,
        // Chosen: no source gives wild-dwarf phrases, and with no clan a phrase reads wrong, so none
        phrases: [],
        phraseCount: 0
    },
    [D.DUERGAR]: {
        lineage: D.DUERGAR,
        ownWeight: 1,
        sexes: SEXES,
        hasFamily: true,
        // Sourced: "Than" (child of) and the father's name (Dragon #281 p46)
        phrases: [{ form: "than", weight: 1 }],
        phraseCount: 1
    }
};
