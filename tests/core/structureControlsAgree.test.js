import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { DrowNameGenerator } from "../../js/core/DrowNameGenerator.js";
import { ELF_SUBRACES, ElfNameGenerator } from "../../js/core/ElfNameGenerator.js";
import { NAME_STRUCTURE_CONTROL } from "../../js/core/nameStructure.js";
import { seededRandom } from "../helpers/random.js";

// BMN-51: the + / - buttons are shown from one random build and clicked with another, so a button could in principle
// appear and then fail (or be hidden when it would work). Measured on 2026-10-27 with no disagreement in 4,800 cases;
// this keeps watching every lineage, including any added to ELF_SUBRACES or other species wired in here later.
const load = (file) => JSON.parse(readFileSync(join(process.cwd(), "data", file), "utf-8"));
const gen = new ElfNameGenerator(load("elfNames.json"), new DrowNameGenerator(load("drowNames.json")));
const LINEAGES = [...ELF_SUBRACES, "drow"];
const CONTROLS = Object.values(NAME_STRUCTURE_CONTROL);
const SAMPLE = 300;
const LOCK_SHARES = [0, 0.3, 0.6, 1]; // share of the parts locked, cycled through the sample

describe.each(LINEAGES)("%s structure controls", (subrace) => {
    it("shows a + / - button exactly when pressing it works", () => {
        const random = seededRandom(51);
        let shownCount = 0;
        let hiddenCount = 0;
        for (let i = 0; i < SAMPLE; i++) {
            const result = gen.generate({ subrace, random });
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
        expect(shownCount).toBeGreaterThan(0);
        expect(hiddenCount).toBeGreaterThan(0);
    });
});
