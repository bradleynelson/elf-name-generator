// The app, page and storage read lineages only from here. Stored records call a lineage `subrace` (renaming it would
// break saved names).

// A result's sex: stored with saved names and sent as a controlled analytics value, so keep the values stable.
export const SEX = Object.freeze({ FEMALE: "female", MALE: "male", NEUTRAL: "neutral" });
// The sex the name data records for a name published as both female and male.
export const UNISEX = "unisex";

const ESPRUAR = { font: "espruar", label: "Written in Espruar, the elven alphabet" };
const HIGH_DROWIC = { font: "high-drowic", label: "Written in the High Drowic font" };

// high elf, the default, stands for any surface elf
export const ELF_SUBRACES = ["high-elf", "sun-elf", "moon-elf", "wood-elf"];
export const DROW = "drow";

const L = { HIGH: "high-elf", SUN: "sun-elf", MOON: "moon-elf", WOOD: "wood-elf" };
const DETHEK = { font: "dethek", label: "Written in Dethek, the dwarven runes" };
export const DWARF_LINEAGES = Object.freeze({
    SHIELD: "shield-dwarf",
    GOLD: "gold-dwarf",
    WILD: "wild-dwarf",
    DUERGAR: "duergar"
});
const D = DWARF_LINEAGES;

/**
 * Every species: `label` and `plural` (as the page words them), `analytics` (sent, see ANALYTICS.md), `generatorType`
 * (stored with saved names), `form` (its names' own language; the other is "common"), `sexes` it offers, `dataFile`,
 * `script` (the default), `lineages` in picker order, and `lineageWords`, mapping the lineage words the sources print
 * to the app's lineages (an empty list ties a name to no particular lineage). Optional: `captionsUnknownMeanings`
 * (false: a part's caption is shown only when its meaning is known) and `meaningsNote` (the sources panel's note when
 * no part of the name has a known meaning).
 * A lineage: `value` (stored), `label`, `analytics` (sent), and optionally `script`, `note` (shown on the name card
 * with every name of the lineage) and `retired` (no longer offered).
 */
export const SPECIES = {
    elf: {
        label: "elf",
        plural: "elves",
        analytics: "elf",
        generatorType: "elven",
        form: "elvish",
        sexes: [SEX.NEUTRAL, SEX.FEMALE, SEX.MALE],
        dataFile: "data/elfNames.json?v=4.3.0",
        script: ESPRUAR,
        lineages: [
            // Chosen (2026-11-23): no longer offered, so every name has a lineage; kept so names saved with it still show
            { value: L.HIGH, label: "any", analytics: "any", retired: true },
            { value: L.SUN, label: "sun", analytics: "sun_elf" },
            { value: L.MOON, label: "moon", analytics: "moon_elf" },
            { value: L.WOOD, label: "wood", analytics: "wood_elf" },
            { value: DROW, label: "drow", analytics: "drow", script: HIGH_DROWIC }
        ],
        lineageWords: {
            elf: [],
            sun: [L.SUN],
            moon: [L.MOON],
            wood: [L.WOOD],
            // Chosen: FR wild elves have no app option; their names inform the wood-elf choice.
            wild: [L.WOOD],
            // Chosen: sun and moon elves are the high elves, so "high" leans to both. Eladrin count as high elves (4e's
            // playable eladrin are its high elves); 5e's fey eladrin never reach the site data.
            high: [L.SUN, L.MOON],
            eladrin: [L.SUN, L.MOON],
            // Sourced: in the Realms, moon elves are "also called silver or gray elves" (FRCS 2e p11, 1e p44; PHB 5e p19).
            gray: [L.MOON],
            // Chosen: elven peoples the app does not offer count for any lineage, never for one they are not.
            sea: [],
            aquatic: [],
            star: [],
            avariel: [],
            lythari: [],
            fey_ri: [],
            llewyrr: [],
            drow: [DROW]
        }
    },
    dwarf: {
        label: "dwarf",
        plural: "dwarves",
        analytics: "dwarf",
        // saved records of the v3 site said "dwarven" too; they carry no result, so they stay listed only
        generatorType: "dwarven",
        form: "dwarvish",
        // Chosen: no unisex dwarf names; every dwarf name is female or male
        sexes: [SEX.FEMALE, SEX.MALE],
        // no source gives a dwarf name or clan a meaning, so "Meaning unknown" would cover every published name
        captionsUnknownMeanings: false,
        meaningsNote:
            "No book gives the meaning of a dwarf's first name or clan name. Only names built from the dwarven name tables (Expanded Variety) show meanings, part by part.",
        dataFile: "data/dwarfNames.json?v=4.3.0",
        script: DETHEK,
        lineages: [
            {
                value: D.SHIELD,
                label: "shield",
                analytics: "shield_dwarf"
            },
            {
                value: D.GOLD,
                label: "gold",
                analytics: "gold_dwarf"
            },
            {
                value: D.WILD,
                label: "wild",
                analytics: "wild_dwarf",
                // Sourced: FR11 Dwarves Deep p15
                note: "Wild dwarves have no clan names: they count themselves one family, dur Authalar, “the People”."
            },
            {
                value: D.DUERGAR,
                label: "duergar",
                analytics: "duergar"
            }
        ],
        // Chosen: mountain counts as shield, hill as gold; arctic, urdunnir and albino names are "any
        // dwarf". Sourced: FR11 calls shield and gold dwarves northern and southern, and wild dwarves jungle dwarves.
        lineageWords: {
            dwarf: [],
            shield: [D.SHIELD],
            mountain: [D.SHIELD],
            gold: [D.GOLD],
            hill: [D.GOLD],
            wild: [D.WILD],
            gray: [D.DUERGAR],
            arctic: [],
            urdunnir: [],
            albino: []
        }
    }
};

export const SUBRACES = Object.values(SPECIES).flatMap((species) => species.lineages.map((lineage) => lineage.value));

/**
 * A lineage's description with its species and script (the species' own when it has none). Read live, so a species
 * registered in a test is found too.
 * @returns {{ value: string, label: string, analytics: string, script: { font: string, label: string },
 *   species: Object } | undefined} undefined for a value no species offers
 */
export function getLineage(value) {
    for (const species of Object.values(SPECIES)) {
        const lineage = species.lineages.find((l) => l.value === value);
        if (lineage) return { ...lineage, species, script: lineage.script || species.script };
    }
    return undefined;
}

/** The lineages the picker offers for a species: all but the retired ones, unless one is the lineage shown now. */
export const getOfferedLineages = (speciesName, current) =>
    SPECIES[speciesName].lineages.filter((lineage) => !lineage.retired || lineage.value === current);

/** The name of the species that offers a lineage ("elf", "dwarf"), or undefined. */
export const getSpeciesName = (subrace) =>
    Object.keys(SPECIES).find((name) => SPECIES[name].lineages.some((lineage) => lineage.value === subrace));

// The sex each name style implies; a style with no entry leaves it to the generator.
export const SEX_BY_STYLE = {
    feminine: SEX.FEMALE,
    masculine: SEX.MALE,
    neutral: SEX.NEUTRAL,
    female: SEX.FEMALE,
    male: SEX.MALE
};

const SEXES = new Set(Object.values(SEX_BY_STYLE));

// The word people see for a sex whose stored value reads differently; the stored value is kept for saved names and analytics.
const SEX_LABELS = { [SEX.NEUTRAL]: "unisex" };

/**
 * The words that say what a name is, in the picker's order and words: "female elf · sun lineage". Leaves out a part it does not know
 * (older records, other races from the previous site), so the line can be empty.
 * @param {{ sex?: string, subrace?: string }} kind - a result's sex and lineage
 */
export function formatNameKind({ sex, subrace }) {
    const lineage = getLineage(subrace);
    const gender = SEXES.has(sex) ? SEX_LABELS[sex] || sex : undefined;
    const species = [gender, lineage?.species.label].filter(Boolean).join(" ");
    return [species, lineage && `${lineage.label} lineage`].filter(Boolean).join(" · ");
}

/** A name with what it is after it in parentheses ("Aelar (male elf · moon lineage)"); the bare name if nothing is known. */
export function formatNameWithKind(name, kind) {
    const words = formatNameKind(kind);
    return words ? `${name} (${words})` : name;
}

const SEXED_STYLES = ["feminine", "masculine"];
const PICKER_STYLES = ["neutral", ...SEXED_STYLES];

/** The picker's styles a species offers, in picker order (dwarves: female and male only). */
export const getStylesFor = (speciesName) =>
    PICKER_STYLES.filter((style) => SPECIES[speciesName].sexes.includes(SEX_BY_STYLE[style]));

/** The page's style for a result's sex (a restored name sets the picker back to it); "neutral" for any other sex. */
export const getStyleForSex = (sex) => SEXED_STYLES.find((style) => SEX_BY_STYLE[style] === sex) || "neutral";
