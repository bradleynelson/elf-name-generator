import {
    RecentNames,
    generateUnrepeated,
    generateWithRetries,
    selectRandom,
    selectWeighted
} from "./random.js?v=4.2.0";
import { SplitComponents, VOWELS, joinsCleanly, sourcesInOrder } from "./splitComponents.js?v=4.2.0";
import { ELF_SUBRACES, SEX_BY_STYLE } from "./species.js?v=4.2.0";
import { getSpellings, NAME_TYPE } from "./speciesData.js?v=4.2.0";
import {
    capitalize,
    getAvailableControls,
    getChangedShape,
    getKeptParts,
    includesSlotKey,
    isStructurePart,
    joiningLetter,
    jointKey,
    KIND,
    NAME_STRUCTURE_CONTROL,
    SECTION,
    selectRollShape,
    sameShape,
    slotKey,
    structurePart,
    surnameStart,
    wholeSection,
    wordsOf
} from "./nameStructure.js?v=4.2.0";

const PERSONAL = {
    name: "personal",
    section: SECTION.GIVEN,
    keyPrefix: "t",
    rolePrefix: "",
    shapeKey: "shape",
    splitsBySex: true
};
const FAMILY = {
    name: "family",
    section: SECTION.FAMILY,
    keyPrefix: "n",
    rolePrefix: "family ",
    shapeKey: "familyShape",
    splitsBySex: false // Chosen: the whole family bears a family name
};
// Inferred: published personal names have 4-11 letters and 2-4 syllables, about 10% with four. Chosen: keep
// four-syllable words with this probability so they stay uncommon (applied per word).
const MIN_LETTERS = 4;
const MAX_LETTERS = 11;
const FOUR_SYLLABLE_KEEP = 0.3;
// Sourced: Races of the Wild Table 1-1 / Dragon #251 Table 1 (40/30/20/10). Chosen: the apostrophe shape
// lowered to 5, since published Forgotten Realms elf names almost never have one (3 of about 1,050).
const NAME_SHAPES = [
    { shape: ["prefix", "suffix"], weight: 40 },
    { shape: ["prefix", "suffix", "suffix"], weight: 30 },
    { shape: ["prefix", "suffix", " ", "prefix", "suffix", "suffix"], weight: 20 },
    { shape: ["suffix", "'", "prefix", "suffix", "suffix"], weight: 5 }
];
// Chosen: table-built surnames take the first two shapes (a family name is one word).
const SURNAME_SHAPES = NAME_SHAPES.slice(0, 2);
// Sourced (Dragon #251): a join that sounds wrong may "add an a, e, i, l, r, s, sh, or an apostrophe". Chosen: only
// where the consonants never meet in a published elf name; apostrophes come only from the apostrophe shape.
const JOINING_LETTERS = ["a", "e", "i", "l", "r", "s", "sh"];
const JOINING_LETTER_BASIS = "Dragon #251";
// Chosen: more than three vowels in a row at a join reads as a typo.
const VOWEL_PILE = new RegExp(`[${VOWELS}]{4}`);
// Inferred: none of the 520 published elf names has "yy" (doubled a, e, i and o do occur), so a join such as -cy + yth
// that would make one is rebuilt.
const DOUBLED_Y = /yy/i;
// Chosen: with Expanded Variety, the chance that a prefix or suffix slot takes a component of a published name.
const SPLIT_COMPONENT_SHARE = 0.5;
// Chosen: share of Elvish-form family names taken from published family names (the rest are built).
const PUBLISHED_HOUSE_SHARE = 0.5;
// Inferred, small samples: words and houses seen with a subrace are this many times likelier (a preference).
const SUBRACE_WEIGHT = 3;
// the default lineage, which stands for any surface elf
const ANY_SUBRACE = ELF_SUBRACES[0];
const VOWEL_GROUP = new RegExp(`[${VOWELS}]+`, "g");

/**
 * Surface-elf names (a NameGenerator, generators.js). Sourced: the elven name tables of Races of the Wild (3.5e,
 * pp30-31), a reprint of "By Any Other Name" (Dragon #251).
 */
export class ElfNameGenerator {
    constructor({ names = [], tables = [], words = [], split = {}, sources = [] } = {}) {
        const table = tables.find((t) => t.type === NAME_TYPE.GIVEN);
        if (!table?.prefixes?.length || !table.suffixes?.length) {
            throw new Error("Elf name data is missing the name tables");
        }
        const tableSources = table.sources;
        this.tables = {
            prefixes: table.prefixes.map((entry) => ({
                text: getSpellings(entry, "male")[0],
                meaning: entry.meaning,
                sources: tableSources
            })),
            suffixes: table.suffixes.map((entry) => ({
                male: getSpellings(entry, "male"),
                female: getSpellings(entry, "female"),
                meaning: entry.meaning,
                sources: tableSources
            }))
        };
        const publishedNames = names.filter((n) => n.type === NAME_TYPE.GIVEN);
        this.familyNames = names.filter((n) => n.type === NAME_TYPE.FAMILY);
        const tableTexts = {
            prefix: new Set(this.tables.prefixes.map((p) => p.text.toLowerCase())),
            suffix: new Set(this.tables.suffixes.flatMap((s) => [...s.male, ...s.female]).map((t) => t.toLowerCase()))
        };
        this.splits = {
            [PERSONAL.name]: new SplitComponents(split.given, { names: publishedNames, tableTexts, sources }),
            [FAMILY.name]: new SplitComponents(split.family, { names: this.familyNames, tableTexts, sources })
        };
        const wordsFor = (use, format) =>
            words.filter((w) => w.use === use).map((w) => ({ text: format(w.text), lineages: w.lineages }));
        this.commonWords = { first: wordsFor("common-first", capitalize), second: wordsFor("common-second", (t) => t) };
        this.sourceOrder = new Map(sources.map((source, index) => [source, index]));
        this.commonFormShare = measureCommonFormShare(this.familyNames);
        this.publishedByName = new Map(publishedNames.map((p) => [p.text.toLowerCase(), p]));
        this.houseNames = new Set(this.familyNames.map((f) => f.text.toLowerCase()));
        this.recent = new RecentNames();
    }

    generate({
        subrace = "high-elf",
        style = "neutral",
        expanded = false,
        reshape = false,
        locks = {},
        random = Math.random
    } = {}) {
        if (!ELF_SUBRACES.includes(subrace)) throw new Error(`Unknown elf subrace: ${subrace}`);
        const sex = SEX_BY_STYLE[style] || null;
        const result = generateUnrepeated(() => {
            const personal = this._buildTable(sex, locks, random, { expanded, reshape });
            const family = locks.family
                ? wholeSection(locks.family)
                : includesSlotKey(Object.keys(locks), FAMILY.keyPrefix)
                  ? this._buildTableFamily(locks, random, { expanded, reshape })
                  : this._buildFamily(subrace, expanded, random);
            return personal && family ? this._assemble(personal, family, sex, subrace) : null;
        }, this.recent);
        if (!result) throw new Error("Could not make an elf name with these choices. Try unlocking a part.");
        return result;
    }

    optionsFor(result, key) {
        if (key === "family") return this.familyNames.map((f) => publishedFamilyPart(f));
        const part = result.parts.find((p) => p.key === key);
        const section = [PERSONAL, FAMILY].find(({ keyPrefix }) => includesSlotKey([key], keyPrefix));
        if (!part || !section) return [];
        const isSurname = section === FAMILY;
        const sex = isSurname ? "neutral" : result.sex;
        const slot = part.kind;
        // every published spelling of a suffix is its own option, so the one in the name is always listed
        const options =
            slot === KIND.PREFIX
                ? this.tables.prefixes.map((entry) => tablePart(key, section, slot, entry))
                : this._suffixesFor(sex).flatMap((entry) =>
                      suffixForms(entry, sex).map((text) => suffixPart(key, section, entry, sex, text))
                  );
        if (part.method === "split") {
            const components = this._splitComponents(section, slot, result.sex);
            options.push(...components.map((component) => slotPart(component, key, section, slot)));
        }
        const kept = { ...Object.fromEntries(result.parts.map((p) => [p.key, p])), shape: result.shape };
        const fits = (option) => {
            const locks = { ...kept, familyShape: result.familyShape, [key]: option };
            const random = () => 0; // any joining letter that fits will do; this only tests whether one exists
            return isSurname ? this._buildTableFamily(locks, random) : this._buildTable(result.sex, locks, random);
        };
        return options.filter(fits);
    }

    getStructureControls(result, locked = new Set(), options = {}) {
        return getAvailableControls(STRUCTURE_CONTROLS, result, this, locked, options);
    }

    generateStructureChange(result, control, options = {}) {
        const { locked = new Set(), expanded = false, random = Math.random } = options;
        const spec = STRUCTURE_CONTROLS[control];
        if (!spec) return null;
        const { section } = spec;
        const shape = getChangedShape(control, result[section.shapeKey], locked, section.keyPrefix, ELF_NAMES);
        if (!shape) return null;
        const kept = getKeptParts(result.parts, section.keyPrefix);
        const built = generateWithRetries(() => spec.rebuild(this, result.sex, kept, shape, { expanded, random }));
        if (!built) return null;
        const sections = { ...sectionsOf(result), [section.name]: { text: built.text, parts: built.parts, shape } };
        return this._assemble(sections.personal, sections.family, result.sex, result.subrace);
    }

    getSurnameSwitchOptions(result, locked = new Set(), options = {}) {
        if (result.familyShape) {
            const hasLock = includesSlotKey(locked, FAMILY.keyPrefix);
            const published = this.familyNames.map((f) => publishedFamilyPart(f));
            return { kind: "published", options: hasLock ? [] : published };
        }
        const prefixes = this.tables.prefixes.map((entry) =>
            tablePart(slotKey(FAMILY.keyPrefix, 0), FAMILY, KIND.PREFIX, entry)
        );
        const buildable = (prefix) => this.generateSurnameChange(result, prefix, options);
        return { kind: "constructed", options: locked.has("family") ? [] : prefixes.filter(buildable) };
    }

    generateSurnameChange(result, choice, options = {}) {
        const { expanded = false, random = Math.random } = options;
        const { personal } = sectionsOf(result);
        if (choice.key === "family") return this._assemble(personal, wholeSection(choice), result.sex, result.subrace);
        const family = generateWithRetries(() =>
            this._buildTableFamily({ [choice.key]: choice }, random, { expanded, reshape: true })
        );
        return family && this._assemble(personal, family, result.sex, result.subrace);
    }

    // Chosen: a neutral name uses only the suffixes the tables give both genders.
    _suffixesFor(sex) {
        const suffixes = this.tables.suffixes;
        return sex === "neutral" ? suffixes.filter((s) => sameForms(s)) : suffixes;
    }

    _splitComponents(section, slot, sex) {
        return this.splits[section.name].componentsFor(slot, section.splitsBySex ? sex : null);
    }

    // The picker omits `reshape`, locks every slot and draws 0, so a rolled shape is the shortest that keeps every
    // slot: the name's own.
    _buildTable(
        sex,
        locks,
        random,
        { section = PERSONAL, shape: given = null, applyPreferences = true, expanded, reshape } = {}
    ) {
        const { keyPrefix } = section;
        const choseAny = includesSlotKey(Object.keys(locks), keyPrefix);
        const shape =
            given || (choseAny && !reshape ? locks.shape : selectRollShape(NAME_SHAPES, locks, keyPrefix, random));
        const mixes = expanded && this.splits[section.name].isAvailable;
        const components = shape.map((role, index) => {
            const structure = structurePart(role, index);
            if (structure) return structure;
            const key = slotKey(keyPrefix, index);
            if (locks[key]) return locks[key];
            // Stryker disable next-line EqualityOperator: "<=" differs only on a draw equal to the share
            if (mixes && random() < SPLIT_COMPONENT_SHARE) {
                const component = selectRandom(this._splitComponents(section, role, sex), random);
                return slotPart(component, key, section, role);
            }
            if (role === KIND.PREFIX) return tablePart(key, section, role, selectRandom(this.tables.prefixes, random));
            const entry = selectRandom(this._suffixesFor(sex), random);
            // Sourced: the tables give "alternate spellings"; one is picked at random
            return suffixPart(key, section, entry, sex, selectRandom(suffixForms(entry, sex), random));
        });
        const parts = this._join(components, locks, random, section);
        if (!parts) return null;
        const words = wordsOf(parts);
        // Chosen: in the apostrophe shape the length rules apply to the part after the apostrophe (the part before is
        // a single suffix), so the shape keeps the share chosen for it
        if (!words.every((word) => this._acceptable(word.split("'").at(-1), applyPreferences, random))) return null;
        return { text: words.map(capitalize).join(" "), parts, shape };
    }

    // Clean joins are clusters found inside the section's published names. A locked joining letter is kept while it
    // fits, so choosing one component does not change the other joins.
    _join(components, locks, random, section) {
        const { clusters } = this.splits[section.name];
        const out = [];
        for (const part of components) {
            const previous = out.at(-1);
            if (previous && !isStructurePart(previous) && !isStructurePart(part)) {
                const before = previous.text;
                if (!joinsCleanly(before, part.text, clusters)) {
                    const letters = JOINING_LETTERS.filter(
                        (l) => joinsCleanly(before, l, clusters) && joinsCleanly(before + l, part.text, clusters)
                    );
                    if (!letters.length) return null;
                    const kept = locks[jointKey(section.keyPrefix, out.length)]?.text;
                    const text = letters.includes(kept) ? kept : selectRandom(letters, random);
                    out.push({
                        ...joiningLetter(section.keyPrefix, out.length, text, section.section),
                        basis: JOINING_LETTER_BASIS
                    });
                }
            }
            out.push(part);
        }
        const text = out.map((p) => p.text).join("");
        return VOWEL_PILE.test(text) || DOUBLED_Y.test(text) || /(.)\1\1/.test(text) ? null : out;
    }

    _buildFamily(subrace, expanded, random) {
        if (random() < (this.commonFormShare[subrace] ?? 0)) {
            return wholeSection(this._buildCommonFamily(subrace, random));
        }
        if (random() < PUBLISHED_HOUSE_SHARE) {
            // Stryker disable next-line ArrayDeclaration: the stand-in has no `form`, so the filter drops it
            const houses = this.familyNames.filter((f) => f.form === "elvish");
            const weight = (f) => (f.lineages.includes(subrace) ? SUBRACE_WEIGHT : 1);
            return wholeSection(publishedFamilyPart(selectWeighted(houses, weight, random)));
        }
        return this._buildTableFamily({}, random, { expanded });
    }

    // Chosen: a surname uses the suffix forms both genders share, as the whole family bears it.
    _buildTableFamily(locks, random, { expanded, reshape, applyPreferences = true } = {}) {
        const keepsShape = includesSlotKey(Object.keys(locks), FAMILY.keyPrefix) && !reshape;
        const shape = keepsShape ? locks.familyShape : selectRollShape(SURNAME_SHAPES, locks, FAMILY.keyPrefix, random);
        const built = this._buildTable("neutral", locks, random, {
            section: FAMILY,
            shape,
            applyPreferences,
            expanded
        });
        if (!built || this.houseNames.has(built.text.toLowerCase())) return null;
        return { text: built.text, parts: built.parts, shape };
    }

    // Sourced words: a Common-form family name joins two words, each found in a published elf family name.
    _buildCommonFamily(subrace, random) {
        const weight = (w) => (w.lineages.includes(subrace) ? SUBRACE_WEIGHT : 1);
        const { first, second } = this.commonWords;
        const a = selectWeighted(first, weight, random);
        const b = selectWeighted(second, weight, random);
        if (!a || !b || a.text.toLowerCase() === b.text.toLowerCase()) return null;
        const text = a.text + b.text;
        const published = this.familyNames.find((f) => f.text.toLowerCase() === text.toLowerCase());
        if (published) return publishedFamilyPart(published);
        const commonFormNames = this.familyNames.filter((f) => f.form === "common");
        const opens = (f) => f.text.toLowerCase().startsWith(a.text.toLowerCase());
        const closes = (f) => f.text.toLowerCase().endsWith(b.text.toLowerCase());
        const found = [commonFormNames.filter(opens), commonFormNames.filter(closes)];
        return {
            ...WHOLE_FAMILY,
            text,
            method: "composed",
            words: [a.text, b.text],
            wordNames: found.map((names) => names.map((f) => f.text)),
            wordSources: found.map((names) => sourcesInOrder(names, this.sourceOrder))
        };
    }

    _acceptable(text, applyPreferences, random) {
        if (text.length < MIN_LETTERS || text.length > MAX_LETTERS) return false;
        const syllables = text.match(VOWEL_GROUP)?.length ?? 0;
        if (syllables < 2 || syllables > 4) return false;
        return !(applyPreferences && syllables === 4 && random() >= FOUR_SYLLABLE_KEEP);
    }

    _assemble(personal, family, sex, subrace) {
        const published = this.publishedByName.get(personal.text.toLowerCase());
        const parts = [...personal.parts, ...family.parts];
        return {
            name: `${personal.text} ${family.text}`,
            sex,
            subrace,
            ...(personal.shape ? { shape: personal.shape } : {}),
            ...(family.shape ? { familyShape: family.shape } : {}),
            parts,
            ...(published ? { published: { sources: published.sources } } : {})
        };
    }
}

// Chosen: the compound name, the two-word shape's second word, is added or removed whole.
const ELF_NAMES = { short: NAME_SHAPES[0].shape, long: NAME_SHAPES[1].shape, compound: NAME_SHAPES[2].shape };
// preferences apply only to rolls, and a structure change is not one
const rebuildFirstName = (generator, sex, kept, shape, { expanded, random }) =>
    generator._buildTable(sex, kept, random, { shape, expanded, applyPreferences: false });
const rebuildSurname = (generator, _sex, kept, shape, { expanded, random }) =>
    generator._buildTableFamily({ ...kept, familyShape: shape }, random, { expanded, applyPreferences: false });
// key order is the order the controls are shown in
const STRUCTURE_CONTROLS = {
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: {
        section: PERSONAL,
        rebuild: rebuildFirstName,
        isOn: (r) => sameShape(r.shape, ELF_NAMES.long)
    },
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: {
        section: PERSONAL,
        rebuild: rebuildFirstName,
        isOn: (r) => sameShape(r.shape, ELF_NAMES.compound)
    },
    [NAME_STRUCTURE_CONTROL.SURNAME]: {
        section: FAMILY,
        rebuild: rebuildSurname,
        isOn: (r) => sameShape(r.familyShape, ELF_NAMES.long)
    }
};

// a surname is one word, so the name splits at its last space
function sectionsOf(result) {
    const cut = result.name.lastIndexOf(" ");
    const start = surnameStart(result.parts);
    return {
        personal: { text: result.name.slice(0, cut), parts: result.parts.slice(0, start), shape: result.shape },
        family: { text: result.name.slice(cut + 1), parts: result.parts.slice(start), shape: result.familyShape }
    };
}

const sameForms = (entry) => entry.male.join() === entry.female.join();
const slotPart = (component, key, section, slot) => ({
    ...component,
    key,
    role: `${section.rolePrefix}${slot}`,
    section: section.section,
    kind: slot
});
const tablePart = (key, section, slot, entry) =>
    slotPart({ text: entry.text, meaning: entry.meaning, sources: entry.sources }, key, section, slot);
const suffixForms = (entry, sex) => (sex === "female" ? entry.female : entry.male);
const suffixPart = (key, section, entry, sex, text) => ({
    ...tablePart(key, section, KIND.SUFFIX, entry),
    text,
    meaning: genderedMeaning(entry, sex)
});

/** "Lord/Lady" reads "Lord" on a male name and "Lady" on a female one (paired suffixes only). */
function genderedMeaning(entry, sex) {
    if (sameForms(entry)) return entry.meaning;
    const side = sex === "female" ? 1 : 0;
    return entry.meaning
        .split(", ")
        .map((item) => (item.includes("/") ? item.split("/")[side] : item))
        .join(", ");
}

const WHOLE_FAMILY = { key: "family", role: "family name", section: SECTION.FAMILY, kind: KIND.WHOLE };
const publishedFamilyPart = (f) =>
    f && {
        ...WHOLE_FAMILY,
        text: f.text,
        method: "published",
        // "elvish" or "common" (already English, like Morninglight)
        form: f.form,
        sources: f.sources,
        // Sourced: a translation published with the name (PHB: Galanodel = Moonwhisper); other names have none
        ...(f.meaning ? { meaning: f.meaning, meaningSource: f.meaningSource } : {}),
        ...(f.note ? { note: f.note } : {})
    };

// Inferred from the published family names: each subrace's share of Common-form names (all of them for any surface
// elf). Chosen: rounded to two places, as first measured; a subrace no family name is tied to gets none.
function measureCommonFormShare(familyNames) {
    const share = (names) =>
        names.length ? Math.round((names.filter((f) => f.form === "common").length / names.length) * 100) / 100 : null;
    return Object.fromEntries(
        ELF_SUBRACES.map((subrace) => [
            subrace,
            share(subrace === ANY_SUBRACE ? familyNames : familyNames.filter((f) => f.lineages.includes(subrace)))
        ])
    );
}
