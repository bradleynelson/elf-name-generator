// Name data for the generator tests, in the form loadSpeciesData gives it and generators.js hands each rule set: the
// real data as a lineage's rule set reads it, and builders for small fixtures in the same shape.
import { expect } from "vitest";
import { RULE_SETS } from "../../js/core/generators.js";
import { SPECIES } from "../../js/core/species.js";
import { loadSpeciesData } from "../../js/core/speciesData.js";
import { readJson } from "./files.js";

/** Every species' data from the project folder, by species name (what the app gives createGeneratorFor). */
export const readSpeciesData = () =>
    Object.fromEntries(
        Object.entries(SPECIES).map(([name, species]) => [
            name,
            loadSpeciesData(readJson(species.dataFile.split("?")[0]), species)
        ])
    );

/** The real data as the rule set that serves `lineage` reads it (what generators.js gives that generator). */
export function readLineageData(lineage) {
    const { species, reads } = RULE_SETS.find((ruleSet) => ruleSet.lineages.includes(lineage));
    const data = readSpeciesData()[species];
    return {
        ...data,
        names: data.names.filter(reads),
        tables: data.tables.filter(reads),
        words: data.words.filter(reads)
    };
}

export const source = (title, authority = "official") => ({ title, authority });

/** A published name; `lineages` are the app's lineages its sources tie it to (none: no particular one). */
export const publishedName = (
    text,
    type,
    { sex, form = "elvish", lineages = [], sources = [source("Test book")], ...more } = {}
) => ({
    text,
    type,
    form,
    ...(sex ? { sex } : {}),
    ...more,
    lineages,
    generic: !lineages.length,
    sources
});

export const nameTable = (type, { prefixes, suffixes, sources = [source("Test tables")] }) => ({
    type,
    sources,
    prefixes,
    suffixes,
    lineages: [],
    generic: true
});

export const word = (text, use, lineages = []) => ({ text, use, lineages, generic: !lineages.length });

/**
 * Split components `{ openings, endings, joins }` and the published names they were cut from. An ending's `sex` is
 * that of its names, as in the data; a join cluster is given a name that holds it. Names already published are kept.
 */
export function cutFrom({ openings = [], endings = [], joins = [] }, published = []) {
    const known = new Set(published.map((n) => n.text));
    const names = new Map();
    const add = (text, sex) => {
        if (known.has(text)) return;
        const name = names.get(text) || publishedName(text, "given");
        const sexes = new Set([name.sex, sex].filter(Boolean));
        names.set(text, { ...name, ...(sexes.size ? { sex: sexes.size > 1 ? "unisex" : sex || name.sex } : {}) });
    };
    for (const opening of openings) opening.from.forEach((text) => add(text));
    for (const ending of endings) ending.from.forEach((text) => add(text, ending.sex));
    const joinItems = joins.map((cluster) => {
        const text = `Qu${cluster}uq`;
        add(text);
        return { text: cluster, from: [text] };
    });
    // one item per spelling, every name it was cut from, as the data gives them
    const merged = (items) => {
        const byText = new Map();
        for (const { text, from } of items) byText.set(text, [...new Set([...(byText.get(text) || []), ...from])]);
        return [...byText].map(([text, from]) => ({ text, from }));
    };
    return {
        split: { openings: merged(openings), endings: merged(endings), joins: joinItems },
        names: [...names.values()]
    };
}

/**
 * Every split component cites each book of the names it was cut from, once. `namesOf(part)` gives the published names
 * of the part's pool (its section's names).
 */
export function expectBooksOfItsNames(splits, namesOf) {
    expect(splits.length).toBeGreaterThan(0);
    for (const part of splits) {
        const booksOf = new Map(namesOf(part).map((n) => [n.text, n.sources]));
        expect(new Set(part.sources)).toEqual(new Set(part.from.flatMap((name) => booksOf.get(name))));
        expect(new Set(part.sources).size).toBe(part.sources.length);
    }
}

const STYLES = ["neutral", "feminine", "masculine"];

/** The styles a lineage's generator accepts (wild dwarves have no unisex names), asked of a throwaway generator. */
export function stylesOf(generatorFor, subrace) {
    const probe = generatorFor(subrace);
    return STYLES.filter((style) => {
        try {
            return Boolean(probe.generate({ subrace, style, random: () => 0.5 }));
        } catch {
            return false;
        }
    });
}
