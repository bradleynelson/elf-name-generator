import { RecentNames, generateWithRetries, selectRandom, selectWeighted } from "./random.js?v=4.3.1";
import { generateComponentChange, generateJoined } from "./joiningLetters.js?v=4.3.1";
import {
    createPublishedLookup,
    filterPartOptions,
    generateName,
    takesPublishedFamily,
    takesSplitComponent,
    weightByLineage
} from "./nameRolls.js?v=4.3.1";
import {
    hasTripleLetter,
    isLongWord,
    keepsEveryLength,
    keepsLengthOnRoll,
    validateSpelling
} from "./spelling.js?v=4.3.1";
import { SplitComponents, VOWELS, sourcesInOrder } from "./splitComponents.js?v=4.3.1";
import { SEX, SEX_BY_STYLE } from "./species.js?v=4.3.1";
import { NAME_TYPE } from "./speciesData.js?v=4.3.1";
import {
    filterEntriesFor,
    formsFor,
    hasSameForms,
    mainSpelling,
    readTable,
    tableTextsOf
} from "./nameTables.js?v=4.3.1";
import {
    capitalize,
    formatSectionText,
    getAvailableControls,
    getChangedShape,
    getKeptParts,
    generateWithPart,
    includesSlotKey,
    jointKey,
    KIND,
    METHOD,
    NAME_STRUCTURE_CONTROL,
    publishedPart,
    SECTION,
    sectionsOf,
    selectRollShape,
    sameShape,
    slotKey,
    slotPart,
    structurePart,
    tablePart,
    wholeSection,
    wordsOf
} from "./nameStructure.js?v=4.3.1";

const PERSONAL = { section: SECTION.GIVEN, rolePrefix: "", shapeKey: "shape", splitsBySex: true };
const FAMILY = {
    section: SECTION.FAMILY,
    keyPrefix: "n",
    rolePrefix: "family ",
    shapeKey: "familyShape",
    splitsBySex: false // Chosen: the whole family bears a family name
};
const TABLE_OF = { [KIND.PREFIX]: "prefixes", [KIND.SUFFIX]: "suffixes" };
// Chosen: more than three vowels in a row at a join reads as a typo.
const VOWEL_PILE = new RegExp(`[${VOWELS}]{4}`);
// Inferred: none of the 520 published elf names has "yy" (doubled a, e, i and o do occur), so a join such as -cy + yth
// that would make one is rebuilt.
const DOUBLED_Y = /yy/i;
const LETTER_JOIN = {
    joined: generateJoined,
    changed: generateComponentChange,
    isAwkward: (text) => VOWEL_PILE.test(text) || DOUBLED_Y.test(text)
};
// a lineage without joining letters takes its components as they meet
const PLAIN_JOIN = {
    joined: (components, _rules, _orderLetters, spell) => {
        const text = spell(components);
        return text && { text, parts: components };
    },
    changed: (parts, key, choice, rules, spell) =>
        PLAIN_JOIN.joined(
            parts.map((p) => (p.key === key ? choice : p)),
            rules,
            null,
            spell
        ),
    isAwkward: () => false
};

// the surname a lineage builds, by the table its description says it is built from
const SURNAME_BUILDERS = {
    [NAME_TYPE.GIVEN]: (generator) => new TableSurname(generator),
    [NAME_TYPE.HOUSE]: (generator, data) => new HouseSurname(data, generator.rules.surname)
};

// The surface lineages read the same data share (generators.js), so what is built from it is built once and shared.
const NAMES_READ = new WeakMap();
const readNamesOnce = (data) => {
    if (!NAMES_READ.has(data)) NAMES_READ.set(data, readNames(data));
    return NAMES_READ.get(data);
};

function readNames({ names, tables, words, split, sources }) {
    const table = tables.find((t) => t.type === NAME_TYPE.GIVEN);
    if (!table?.prefixes?.length || !table.suffixes?.length) {
        throw new Error("Elf name data is missing the name tables");
    }
    const read = readTable(table);
    const publishedNames = names.filter((n) => n.type === NAME_TYPE.GIVEN);
    const familyNames = names.filter((n) => n.type === NAME_TYPE.FAMILY);
    const tableTexts = tableTextsOf(read);
    const familyByText = new Map(familyNames.map((f) => [f.text, f]));
    const textsOf = (use) => words.filter((w) => w.use === use).map((w) => w.text);
    const wordsFor = (use, format) =>
        words
            .filter((w) => w.use === use)
            .map((w) => ({
                text: format(w.text),
                lineages: w.lineages,
                names: w.names.map((text) => familyByText.get(text))
            }));
    return {
        tables: read,
        familyNames,
        splits: {
            [SECTION.GIVEN]: new SplitComponents(split.given, { names: publishedNames, tableTexts, sources }),
            [SECTION.FAMILY]: new SplitComponents(split.family, { names: familyNames, tableTexts, sources })
        },
        commonWords: { first: wordsFor("common-first", capitalize), second: wordsFor("common-second", (t) => t) },
        // Sourced (FOR2 p97-98): no deity-like name or common word as a first name, for the lineages the data lists
        // them for. Chosen: apostrophes ignored
        forbidden: textsOf("forbidden"),
        glossary: new Set(textsOf("glossary").map(plain)),
        sourceOrder: new Map(sources.map((source, index) => [source, index])),
        findPublished: createPublishedLookup(publishedNames),
        houseNames: new Set(familyNames.map((f) => f.text.toLowerCase()))
    };
}

/**
 * Elf names (a NameGenerator, generators.js), one generator per lineage, built with its description (`rules`). Each
 * lineage reads its own name tables (its rule set's share of the data); meanings come only from those tables.
 */
export class ElfNameGenerator {
    /**
     * @param {Object} data - the lineage's share of the species data (generators.js)
     * @param {import("./elfLineages.js?v=4.3.1").ElfLineageRules} rules
     */
    constructor(data, rules) {
        Object.assign(this, readNamesOnce(data));
        this.rules = rules;
        this.personal = { ...PERSONAL, keyPrefix: rules.givenKeys };
        this.names = namesFor(rules.shapes, rules.compoundShape);
        this.join = rules.joins ? LETTER_JOIN : PLAIN_JOIN;
        this.surname = SURNAME_BUILDERS[rules.surname.builtFrom](this, data);
        // key order is the order the controls are shown in
        this.structureControls = { ...firstNameControlsOf(this), ...this.surname.structureControls };
        this.recent = new RecentNames();
    }

    generate({ style = "neutral", expanded = false, reshape = false, locks = {}, random = Math.random } = {}) {
        const { key } = this.surname;
        return generateName(
            () => {
                const sex = SEX_BY_STYLE[style];
                const personal = this._buildTable(sex, locks, random, { expanded, reshape });
                const family = locks[key]
                    ? wholeSection(locks[key])
                    : this.surname.generate(locks, random, { expanded, reshape });
                return personal && family ? this._assemble(personal, family, sex) : null;
            },
            this.recent,
            this.rules.nameLabel
        );
    }

    optionsFor(result, key) {
        const part = result.parts.find((p) => p.key === key);
        const hasOptions = this._isPersonalSlot(key) || this.surname.hasOptions(key);
        return part && hasOptions ? filterPartOptions(this, result, key, this._candidatesFor(part, result.sex)) : [];
    }

    generatePartChange(result, key, choice) {
        return generateWithPart(result, key, choice, () => {
            const { given, family } = sectionsOf(result);
            if (!this._isPersonalSlot(key)) {
                const changed = this.surname.generatePartChange(family, key, choice);
                return changed && this._assemble(given, changed, result.sex);
            }
            const changed = this._changeComponent(given, key, choice, this.personal);
            return changed && this._assemble(changed, family, result.sex);
        });
    }

    getStructureControls(result, locked = new Set(), options = {}) {
        return getAvailableControls(this.structureControls, result, this, locked, options);
    }

    generateStructureChange(result, control, options = {}) {
        const { locked = new Set(), expanded = false, random = Math.random } = options;
        const spec = this.structureControls[control];
        if (!spec) return null;
        const { section } = spec;
        const shape = getChangedShape(control, result[section.shapeKey], locked, section.keyPrefix, this.names);
        if (!shape) return null;
        const kept = getKeptParts(result.parts, section.keyPrefix);
        const built = generateWithRetries(() => spec.rebuild(result.sex, kept, shape, { expanded, random }));
        if (!built) return null;
        const sections = { ...sectionsOf(result), [section.section]: { text: built.text, parts: built.parts, shape } };
        return this._assemble(sections.given, sections.family, result.sex);
    }

    getSurnameSwitchOptions(result, locked = new Set(), options = {}) {
        return this.surname.getSwitchOptions(result, locked, options);
    }

    generateSurnameChange(result, choice, options = {}) {
        const { given } = sectionsOf(result);
        const family =
            choice.key === this.surname.key ? wholeSection(choice) : this.surname.generateFromPrefix(choice, options);
        return family && this._assemble(given, family, result.sex);
    }

    _isPersonalSlot(key) {
        return includesSlotKey([key], this.personal.keyPrefix);
    }

    _candidatesFor(part, sex) {
        return this._isPersonalSlot(part.key)
            ? this._componentOptions(part, this.personal, sex)
            : this.surname.candidatesFor(part);
    }

    // every published spelling of a component is its own option, so the one in the name is always listed
    _componentOptions(part, section, sex) {
        const place = { key: part.key, slot: part.kind, section, sex };
        const options = this._tableOptions(place);
        if (part.method === METHOD.SPLIT) {
            const components = this._splitComponents(section, place.slot, sex);
            options.push(...components.map((component) => slotPart(component, place.key, place.slot, section)));
        }
        return options;
    }

    /** @param {{ key: string, slot: string, section: Object, sex: string }} place - where the component goes */
    _tableOptions(place) {
        const { entries, slotRules } = this._tableOf(place.slot);
        if (!slotRules.sexed) return entries.map((entry) => this._tablePart(place, entry));
        return filterEntriesFor(entries, place.sex).flatMap((entry) =>
            this._spellingsFor(entry, place.sex, slotRules).map((text) => this._tablePart(place, entry, text))
        );
    }

    // the spellings a roll can give: a female name's may take the male form (`femaleUsesMaleForm`)
    _spellingsFor(entry, sex, { drawsSpelling }) {
        const takesMale = sex === SEX.FEMALE && this.rules.femaleUsesMaleForm !== undefined;
        const lists = takesMale ? [entry.female, entry.male] : [formsFor(entry, sex)];
        return [...new Set(lists.flatMap((list) => (drawsSpelling ? list : list.slice(0, 1))))];
    }

    _drawComponent(place, random) {
        const { entries, slotRules } = this._tableOf(place.slot);
        if (!slotRules.sexed) return this._tablePart(place, selectRandom(entries, random));
        const takesMale = place.sex === SEX.FEMALE && this._takesMaleForm(random);
        const entry = selectRandom(filterEntriesFor(entries, place.sex), random);
        const forms = takesMale ? entry.male : formsFor(entry, place.sex);
        const text = slotRules.drawsSpelling ? selectRandom(forms, random) : forms[0];
        return this._tablePart(place, entry, text);
    }

    _tableOf(slot) {
        return { entries: this.tables[TABLE_OF[slot]], slotRules: this.rules.slots[slot] };
    }

    _tablePart({ key, slot, section, sex }, entry, text = mainSpelling(entry)) {
        const part = tablePart(entry, text, key, slot, section);
        return this.rules.slots[slot].splitsPairedMeaning ? { ...part, meaning: genderedMeaning(entry, sex) } : part;
    }

    _takesMaleForm(random) {
        const share = this.rules.femaleUsesMaleForm;
        return share !== undefined && random() < share;
    }

    _keepsLengthOnRoll(sex, random) {
        const { longSyllables, longKeep } = this.rules.spelling;
        return keepsLengthOnRoll({ longSyllables, longKeep: longKeep[sex] }, random);
    }

    _splitComponents(section, slot, sex) {
        return this.splits[section.section].componentsFor(slot, section.splitsBySex ? sex : null);
    }

    _buildTable(
        sex,
        locks,
        random,
        {
            section = this.personal,
            shape: given = null,
            keepsLength = this._keepsLengthOnRoll(sex, random),
            expanded,
            reshape
        } = {}
    ) {
        const { keyPrefix } = section;
        const choseAny = includesSlotKey(Object.keys(locks), keyPrefix);
        const shape =
            given ||
            (choseAny && !reshape ? locks.shape : selectRollShape(this.rules.shapes, locks, keyPrefix, random));
        const mixes = expanded && this.splits[section.section].isAvailable;
        const components = shape.map((role, index) => {
            const structure = structurePart(role, index);
            if (structure) return structure;
            const key = slotKey(keyPrefix, index);
            if (locks[key]) return locks[key];
            if (mixes && takesSplitComponent(random)) {
                const component = selectRandom(this._splitComponents(section, role, sex), random);
                return slotPart(component, key, role, section);
            }
            return this._drawComponent({ key, slot: role, section, sex }, random);
        });
        // a locked joining letter is kept while it fits, so a structure change does not change the other joins
        const drawLetter = (letters, position) => {
            const kept = locks[jointKey(section.keyPrefix, position)]?.text;
            return letters.length ? [letters.includes(kept) ? kept : selectRandom(letters, random)] : [];
        };
        const built = this.join.joined(components, this._joinRules(section), drawLetter, (parts) =>
            this._spell(parts, section, keepsLength)
        );
        return built && { ...built, shape };
    }

    _changeComponent(own, key, choice, section) {
        const spell = (parts) => this._spell(parts, section, keepsEveryLength);
        const built = this.join.changed(own.parts, key, choice, this._joinRules(section), spell);
        return built && { ...built, shape: own.shape };
    }

    _joinRules(section) {
        const { clusters } = this.splits[section.section];
        const { keyPrefix } = section;
        return { ...this.rules.joins, clusters, keyPrefix, section: section.section };
    }

    // The section's text, or null when its spelling, length or (for a surname) a published house rules it out.
    _spell(parts, section, keepsLength) {
        const joined = parts.map((p) => p.text).join("");
        if (this.join.isAwkward(joined) || hasTripleLetter(joined)) return null;
        const words = wordsOf(parts);
        if (!words.every((word) => this._isAllowedWord(word))) return null;
        const isAcceptable = (word) => validateSpelling(word, this.rules.spelling) && keepsLength(word);
        if (!this._judgedWords(words).every(isAcceptable)) return null;
        const text = formatSectionText(parts);
        return section === FAMILY && this.houseNames.has(text.toLowerCase()) ? null : text;
    }

    // some components carry their own apostrophe (-mur'ss), so meeting another could make a second
    _isAllowedWord(word) {
        const bare = plain(word);
        return (
            word.indexOf("'") === word.lastIndexOf("'") && // one apostrophe at most (none, or the first is the last)
            !this.glossary.has(bare) &&
            !this.forbidden.some((forbidden) => bare.includes(forbidden))
        );
    }

    // Chosen: in the apostrophe shape the length rules apply to the part after the apostrophe (the part before is a
    // single suffix), so the shape keeps the share chosen for it
    _judgedWords(words) {
        const { spelling, judgesWholeName } = this.rules;
        if (judgesWholeName) return words.filter((word) => isLongWord(word, spelling)).slice(0, 1);
        return words.map((word) => word.split("'").at(-1));
    }

    _assemble(personal, family, sex) {
        const parts = [...personal.parts, ...family.parts];
        return {
            name: `${personal.text} ${family.text}`,
            sex,
            subrace: this.rules.lineage,
            ...(personal.shape ? { shape: personal.shape } : {}),
            ...(family.shape ? { familyShape: family.shape } : {}),
            parts,
            ...this.findPublished(personal.text)
        };
    }
}

// A family name: published (weighted by lineage), composed of Common words, or built by the generator from the
// first-name table with a family's shapes and joins.
class TableSurname {
    constructor(generator) {
        this.generator = generator;
        this.key = WHOLE_FAMILY.key;
        // Chosen: table-built surnames take the first two shapes (a family name is one word).
        this.shapes = generator.rules.shapes.slice(0, 2);
        this.commonFormShare = measureCommonFormShare(generator.familyNames, generator.rules);
        // preferences apply only to rolls, and a structure change is not one
        const rebuild = (_sex, kept, shape, { expanded, random }) =>
            this._buildTable({ ...kept, familyShape: shape }, random, { expanded, keepsLength: keepsEveryLength });
        this.structureControls = {
            [NAME_STRUCTURE_CONTROL.SURNAME]: {
                section: FAMILY,
                rebuild,
                isOn: (r) => sameShape(r.familyShape, generator.names.long)
            }
        };
    }

    generate(locks, random, { expanded, reshape }) {
        return includesSlotKey(Object.keys(locks), FAMILY.keyPrefix)
            ? this._buildTable(locks, random, { expanded, reshape })
            : this._build(expanded, random);
    }

    hasOptions(key) {
        return key === this.key || includesSlotKey([key], FAMILY.keyPrefix);
    }

    candidatesFor(part) {
        if (part.key === this.key) return this.generator.familyNames.map((f) => publishedFamilyPart(f));
        return this.generator._componentOptions(part, FAMILY, SEX.NEUTRAL);
    }

    generatePartChange(family, key, choice) {
        if (key === this.key) return wholeSection(choice);
        return includesSlotKey([key], FAMILY.keyPrefix)
            ? this.generator._changeComponent(family, key, choice, FAMILY)
            : null;
    }

    getSwitchOptions(result, locked, options) {
        const { generator } = this;
        if (result.familyShape) {
            const hasLock = includesSlotKey(locked, FAMILY.keyPrefix);
            const published = generator.familyNames.map((f) => publishedFamilyPart(f));
            return { kind: "published", options: hasLock ? [] : published };
        }
        const place = { key: slotKey(FAMILY.keyPrefix, 0), slot: KIND.PREFIX, section: FAMILY, sex: SEX.NEUTRAL };
        const prefixes = generator._tableOptions(place);
        const buildable = (prefix) => generator.generateSurnameChange(result, prefix, options);
        return { kind: "constructed", options: locked.has(this.key) ? [] : prefixes.filter(buildable) };
    }

    generateFromPrefix(choice, { expanded = false, random = Math.random }) {
        return generateWithRetries(() =>
            this._buildTable({ [choice.key]: choice }, random, { expanded, reshape: true })
        );
    }

    _build(expanded, random) {
        if (random() < this.commonFormShare) return wholeSection(this._buildCommon(random));
        if (takesPublishedFamily(random)) {
            const houses = this.generator.familyNames.filter((f) => f.form === "elvish");
            return wholeSection(publishedFamilyPart(selectWeighted(houses, this._weightByLineage(), random)));
        }
        return this._buildTable({}, random, { expanded });
    }

    // Chosen: a surname uses the suffix forms both genders share, as the whole family bears it.
    _buildTable(
        locks,
        random,
        { expanded, reshape, keepsLength = this.generator._keepsLengthOnRoll(SEX.NEUTRAL, random) } = {}
    ) {
        const keepsShape = includesSlotKey(Object.keys(locks), FAMILY.keyPrefix) && !reshape;
        const shape = keepsShape ? locks.familyShape : selectRollShape(this.shapes, locks, FAMILY.keyPrefix, random);
        const built = this.generator._buildTable(SEX.NEUTRAL, locks, random, {
            section: FAMILY,
            shape,
            keepsLength,
            expanded
        });
        return built && { text: built.text, parts: built.parts, shape };
    }

    // Sourced words: each is the first or last word of the published family names the data lists for it.
    _buildCommon(random) {
        const weight = this._weightByLineage();
        const { familyNames, commonWords, sourceOrder } = this.generator;
        const a = selectWeighted(commonWords.first, weight, random);
        const b = selectWeighted(commonWords.second, weight, random);
        if (!a || !b || a.text.toLowerCase() === b.text.toLowerCase()) return null;
        const text = a.text + b.text;
        const published = familyNames.find((f) => f.text.toLowerCase() === text.toLowerCase());
        if (published) return publishedFamilyPart(published);
        const evidence = ({ text, names }) => ({
            text,
            names: names.map((f) => f.text),
            sources: sourcesInOrder(names, sourceOrder)
        });
        return { ...WHOLE_FAMILY, text, method: METHOD.COMPOSED, words: [evidence(a), evidence(b)] };
    }

    _weightByLineage() {
        const { lineage, ownWeight } = this.generator.rules;
        return weightByLineage(lineage, ownWeight);
    }
}

const HOUSE_KEYS = { prefix: slotKey(FAMILY.keyPrefix, 0), suffix: slotKey(FAMILY.keyPrefix, 1) };
const HOUSE_SLOT = { section: SECTION.FAMILY, rolePrefix: "house " };

/** A house: published, or a house-table prefix and suffix whose meaning reads as one phrase. */
class HouseSurname {
    constructor({ names, tables }, { refusedPrefixStart }) {
        this.key = "house";
        const read = readTable(tables.find((t) => t.type === NAME_TYPE.HOUSE));
        this.prefixes = read.prefixes.filter((entry) => !refusedPrefixStart.test(mainSpelling(entry)));
        this.suffixes = read.suffixes;
        this.published = names.filter((n) => n.type === NAME_TYPE.HOUSE);
        // a house is always a prefix and a suffix, so it has no length control
        this.structureControls = {};
    }

    generate(locks, random) {
        return this._build(locks, random);
    }

    hasOptions(key) {
        return [this.key, HOUSE_KEYS.prefix, HOUSE_KEYS.suffix].includes(key);
    }

    candidatesFor({ key }) {
        if (key === this.key) return this.published.map((h) => publishedHouse(h));
        if (key === HOUSE_KEYS.prefix) return this.prefixes.map((entry) => housePrefix(entry));
        return this.suffixes.map((entry) => houseSuffix(entry));
    }

    generatePartChange(house, key, choice) {
        if (key === this.key) return wholeSection(choice);
        return this._build({ ...Object.fromEntries(house.parts.map((p) => [p.key, p])), [key]: choice });
    }

    getSwitchOptions(result, locked) {
        if (result.parts.some((p) => p.key === this.key)) {
            const prefixes = this.prefixes.map((entry) => housePrefix(entry));
            return { kind: "constructed", options: locked.has(this.key) ? [] : prefixes };
        }
        const published = this.published.map((h) => publishedHouse(h));
        const hasLock = locked.has(HOUSE_KEYS.prefix) || locked.has(HOUSE_KEYS.suffix);
        return { kind: "published", options: hasLock ? [] : published };
    }

    generateFromPrefix(choice, { random = Math.random }) {
        return this._build({ [HOUSE_KEYS.prefix]: choice }, random);
    }

    // a built house's meaning reads as one phrase, carried on its suffix (`wordMeaning`)
    _build(locks, random) {
        const lockedPrefix = locks[HOUSE_KEYS.prefix];
        const lockedSuffix = locks[HOUSE_KEYS.suffix];
        if (!lockedPrefix && !lockedSuffix && takesPublishedFamily(random) && this.published.length) {
            return wholeSection(publishedHouse(selectRandom(this.published, random)));
        }
        const prefix = lockedPrefix || housePrefix(selectRandom(this.prefixes, random));
        const suffix = lockedSuffix || houseSuffix(selectRandom(this.suffixes, random));
        const parts = [
            { ...prefix, wordMeaning: undefined },
            { ...suffix, wordMeaning: joinHouseMeaning(prefix.meaning, suffix.meaning) }
        ];
        return { text: formatSectionText(parts), parts };
    }
}

const houseComponent = (key, kind, entry) => tablePart(entry, mainSpelling(entry), key, kind, HOUSE_SLOT);
const housePrefix = (entry) => houseComponent(HOUSE_KEYS.prefix, KIND.PREFIX, entry);
const houseSuffix = (entry) => houseComponent(HOUSE_KEYS.suffix, KIND.SUFFIX, entry);
const publishedHouse = (h) => publishedPart(h, "house", "house", SECTION.FAMILY);
// "Blood of the" + "The forgotten ways" reads "Blood of the forgotten ways"
const joinHouseMeaning = (prefix, suffix) => {
    const rest = /\bthe$/i.test(prefix) ? suffix.replace(/^the\s+/i, "") : suffix;
    return `${prefix} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
};
const plain = (text) => text.toLowerCase().replace(/'/g, "");

const namesFor = (shapes, compound) => ({
    short: shapes[0].shape,
    long: shapes[1].shape,
    compound: shapes[compound].shape
});
// preferences apply only to rolls, and a structure change is not one
const firstNameControlsOf = (generator) => {
    const { personal, names } = generator;
    const rebuild = (sex, kept, shape, { expanded, random }) =>
        generator._buildTable(sex, kept, random, { shape, expanded, keepsLength: keepsEveryLength });
    return {
        [NAME_STRUCTURE_CONTROL.FIRST_NAME]: {
            section: personal,
            rebuild,
            isOn: (r) => sameShape(r.shape, names.long)
        },
        [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: {
            section: personal,
            rebuild,
            isOn: (r) => sameShape(r.shape, names.compound)
        }
    };
};

/** "Lord/Lady" reads "Lord" on a male name and "Lady" on a female one (paired suffixes only). */
function genderedMeaning(entry, sex) {
    if (hasSameForms(entry)) return entry.meaning;
    const side = sex === SEX.FEMALE ? 1 : 0;
    return entry.meaning
        .split(", ")
        .map((item) => (item.includes("/") ? item.split("/")[side] : item))
        .join(", ");
}

const WHOLE_FAMILY = { key: "family", role: "family name", section: SECTION.FAMILY, kind: KIND.WHOLE };
const publishedFamilyPart = (f) =>
    f && {
        ...publishedPart(f, WHOLE_FAMILY.key, WHOLE_FAMILY.role, SECTION.FAMILY),
        // "elvish" or "common" (already English, like Morninglight)
        form: f.form,
        // Sourced: a translation published with the name (PHB: Galanodel = Moonwhisper); other names have none
        ...(f.meaning ? { meaning: f.meaning, meaningSource: f.meaningSource } : {}),
        ...(f.note ? { note: f.note } : {})
    };

// Inferred from the published family names: the lineage's share of Common-form names (all of them for any surface
// elf). Chosen: rounded to two places, as first measured; a lineage no family name is tied to gets none.
function measureCommonFormShare(familyNames, { lineage, standsForAny }) {
    const names = standsForAny ? familyNames : familyNames.filter((f) => f.lineages.includes(lineage));
    return names.length ? Math.round((names.filter((f) => f.form === "common").length / names.length) * 100) / 100 : 0;
}
