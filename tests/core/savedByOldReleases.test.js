import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGeneratorFor } from "../../js/core/generators.js";
import { KIND, sectionsOf } from "../../js/core/nameStructure.js";
import { canLoadFavorite, loadFavorites, loadHistory, saveHistory } from "../../js/favorites.js";
import { readSpeciesData } from "../helpers/nameData.js";

// Names the released 4.1.5 and 4.2.0 code rolled, as that release stored them: today's code must still read them.
// Never re-record them (how they were picked is in DECISIONS).
const saved = JSON.parse(readFileSync(join(process.cwd(), "tests/core/savedByOldReleases.json"), "utf-8"));
const generatorFor = createGeneratorFor(readSpeciesData());

function readBack(stored) {
    saveHistory([stored]);
    localStorage.setItem(
        "faerunNameFavorites",
        JSON.stringify([
            { name: stored.name, generatorType: "elven", subrace: stored.subrace, savedAt: 1, result: stored }
        ])
    );
    return { result: loadHistory()[0], record: loadFavorites()[0] };
}

const drawn = (result) =>
    Object.values(sectionsOf(result))
        .map((section) => section.text)
        .filter(Boolean)
        .join(" ");

describe.each(Object.entries(saved))("names saved by %s", (_, records) => {
    it.each(records.map(({ how, result }) => [`${result.name} (${result.subrace}, ${how})`, result]))(
        "%s loads, draws as it was saved, and offers pickers that keep their choice",
        (_, stored) => {
            const { result, record } = readBack(stored);
            expect(canLoadFavorite(record)).toBe(true);
            expect(result.name).toBe(stored.name);
            expect(drawn(result)).toBe(stored.name);
            const generator = generatorFor(result.subrace);
            for (const { key, text } of result.parts.filter((part) => part.kind !== KIND.JOINT)) {
                const options = generator.optionsFor(result, key);
                expect(options.length, `${key} lists no choices`).toBeGreaterThan(0);
                const other = options.find((option) => option.text !== text);
                if (!other) continue;
                const changed = generator.generatePartChange(result, key, other);
                expect(changed?.parts.find((part) => part.key === key)?.text, `${key} not kept`).toBe(other.text);
            }
        }
    );
});
