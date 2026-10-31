// Constants shared by the species generators, storage and tests. They live apart from any generator so that no species
// (and not the storage module) has to import another species' class just to read them (AGENTS.md, Boundaries).

// The surface-elf subraces; drow have their own generator and are not listed here.
export const ELF_SUBRACES = ["high-elf", "sun-elf", "moon-elf", "wood-elf"];
export const DROW = "drow";

// Every lineage the app offers, the one list that storage validation, the generator seam and the tests read.
export const SUBRACES = [...ELF_SUBRACES, DROW];

// The sex a name style implies; a style with no entry leaves the sex to the generator.
export const SEX_BY_STYLE = {
    feminine: "female",
    masculine: "male",
    neutral: "neutral",
    female: "female",
    male: "male"
};
