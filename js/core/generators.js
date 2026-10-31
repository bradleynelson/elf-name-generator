// The one seam that picks the generator for a subrace (AGENTS.md, Ports and adapters). A species generator never
// knows another species exists; the app and the tests ask here instead.
import { DrowNameGenerator } from "./DrowNameGenerator.js?v=4.1.5";
import { ElfNameGenerator } from "./ElfNameGenerator.js?v=4.1.5";
import { DROW, ELF_SUBRACES } from "./species.js?v=4.1.5";

/**
 * Builds each species' generator once from its data.
 * @param {Object} elfNames - contents of data/elfNames.json
 * @param {Object} drowNames - contents of data/drowNames.json
 * @returns {function(string): Object} generatorFor(subrace): the generator that serves the subrace; throws for a
 *   subrace no species owns
 */
export function createGeneratorFor(elfNames, drowNames) {
    const elf = new ElfNameGenerator(elfNames);
    const generators = new Map([
        ...ELF_SUBRACES.map((subrace) => [subrace, elf]),
        [DROW, new DrowNameGenerator(drowNames)]
    ]);
    return (subrace) => {
        const generator = generators.get(subrace);
        if (!generator) throw new Error(`Unknown subrace: ${subrace}`);
        return generator;
    };
}
