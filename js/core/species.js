// The app, page and storage read lineages only from here. Stored records call a lineage `subrace` (renaming it would
// break saved names).

const ESPRUAR = { font: "espruar", label: "Written in Espruar, the elven alphabet" };
const HIGH_DROWIC = { font: "high-drowic", label: "Written in the High Drowic font" };

// high elf, the default, stands for any surface elf
export const ELF_SUBRACES = ["high-elf", "sun-elf", "moon-elf", "wood-elf"];
export const DROW = "drow";

const L = { HIGH: "high-elf", SUN: "sun-elf", MOON: "moon-elf", WOOD: "wood-elf" };

/**
 * Every species: `dataFile`, `script` (the default), `lineages` in picker order ({ value, label, analytics, script? };
 * `value` is stored, `analytics` is sent, see ANALYTICS.md), and `lineageWords`, mapping the lineage words the sources
 * print to the app's lineages (an empty list ties a name to no particular lineage).
 */
export const SPECIES = {
    elf: {
        analytics: "elf",
        dataFile: "data/elfNames.json?v=4.2.0",
        script: ESPRUAR,
        lineages: [
            { value: L.HIGH, label: "any lineage", analytics: "any" },
            { value: L.SUN, label: "sun elf", analytics: "sun_elf" },
            { value: L.MOON, label: "moon elf", analytics: "moon_elf" },
            { value: L.WOOD, label: "wood elf", analytics: "wood_elf" },
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

// The sex each name style implies; a style with no entry leaves it to the generator.
export const SEX_BY_STYLE = {
    feminine: "female",
    masculine: "male",
    neutral: "neutral",
    female: "female",
    male: "male"
};

const SEXED_STYLES = ["feminine", "masculine"];

/** The page's style for a result's sex (a restored name sets the picker back to it); "neutral" for any other sex. */
export const getStyleForSex = (sex) => SEXED_STYLES.find((style) => SEX_BY_STYLE[style] === sex) || "neutral";
