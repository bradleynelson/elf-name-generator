import { describe, expect, it } from "vitest";
import { createGeneratorFor } from "../../js/core/generators.js";
import { SUBRACES } from "../../js/core/species.js";
import { NAME_STRUCTURE_CONTROL } from "../../js/core/nameStructure.js";
import { seededRandom } from "../helpers/random.js";
import { readSpeciesData, stylesOf } from "../helpers/nameData.js";

// The + / - buttons are shown from one random build and clicked with another, so one could appear and then fail. No
// disagreement in 4,800 cases when measured (2026-10-27); this keeps watching every lineage.
const data = readSpeciesData();
const CONTROLS = Object.values(NAME_STRUCTURE_CONTROL);
const SAMPLE = 300;
const LOCK_SHARES = [0, 0.3, 0.6, 1]; // share of the parts locked, cycled through the sample
// wild dwarves have no clan and no name phrase, so nothing to add or take away
const WITHOUT_CONTROLS = new Set(["wild-dwarf"]);

describe.each(SUBRACES)("%s structure controls", (subrace) => {
    it("shows a + / - button exactly when pressing it works", () => {
        // a new generator, so no recent-name memory comes from another lineage's test
        const gen = createGeneratorFor(data)(subrace);
        const [style] = stylesOf(createGeneratorFor(data), subrace);
        const random = seededRandom(51);
        let shownCount = 0;
        let hiddenCount = 0;
        for (let i = 0; i < SAMPLE; i++) {
            const result = gen.generate({ subrace, style, random });
            const locked = new Set(
                result.parts.map((p) => p.key).filter(() => random() < LOCK_SHARES[i % LOCK_SHARES.length])
            );
            // the app shows with one draw and clicks with another
            const shown = gen.getStructureControls(result, locked, { random: seededRandom(i + 1) });
            for (const control of CONTROLS) {
                const isShown = shown.some((c) => c.control === control);
                const clicked = gen.generateStructureChange(result, control, {
                    locked,
                    random: seededRandom(i + 1000)
                });
                expect(Boolean(clicked), `${result.name}, ${control}, locked ${[...locked]}`).toBe(isShown);
                if (isShown) shownCount++;
                else hiddenCount++;
            }
        }
        // guard against a vacuous pass: both outcomes must be in the sample
        if (WITHOUT_CONTROLS.has(subrace)) expect(shownCount).toBe(0);
        else expect(shownCount).toBeGreaterThan(0);
        expect(hiddenCount).toBeGreaterThan(0);
    });
});
