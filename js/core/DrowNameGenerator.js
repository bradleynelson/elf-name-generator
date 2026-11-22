import { RecentNames, generateUnrepeated, generateWithRetries, selectRandom } from "./random.js?v=4.2.0";
import { SplitComponents, VOWELS } from "./splitComponents.js?v=4.2.0";
import { SEX_BY_STYLE } from "./species.js?v=4.2.0";
import { getSpellings, NAME_TYPE } from "./speciesData.js?v=4.2.0";
import {
    capitalize,
    getAvailableControls,
    getChangedShape,
    getKeptParts,
    includesSlotKey,
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

const FIRST_NAME_KEYS = "f";
const HOUSE_KEYS = { prefix: slotKey("n", 0), suffix: slotKey("n", 1) };
// Sourced: Dragon #267 Table 1 name shapes (weights 30/20/20/20/10). Chosen: apostrophe shapes halved to
// about 15% (published names: ~5%) and the long two-name shape halved, favouring short names.
const NAME_SHAPES = [
    { shape: ["prefix", "suffix"], weight: 50 },
    { shape: ["prefix", "suffix", "suffix"], weight: 25 },
    { shape: ["prefix", "suffix", "'", "suffix"], weight: 10 },
    { shape: ["prefix", "suffix", " ", "prefix", "suffix"], weight: 10 },
    { shape: ["suffix", "'", "prefix", "suffix"], weight: 5 }
];
// Inferred: published male names are shorter (4+ syllables: 4% male, 14% female). Chosen: keep long results with
// these probabilities, a preference that applies to every roll, with or without locks.
const LONG_NAME_KEEP = { male: 0.15, female: 0.2, neutral: 0.2 };
// Sourced: "Rarely, a female drow might take part of a purely masculine name"; a male with a feminine component
// would be a rogue (Dragon #267). Chosen: rate of the female exception.
const FEMALE_USES_MALE_FORM = 0.05;
// Chosen: when the style names no sex and no locked component keeps one, female and male are equally likely.
const FEMALE_SHARE = 0.5;
// Chosen: share of published FR houses (the rest are built from Dragon #267 Tables 4 and 5).
const PUBLISHED_HOUSE_SHARE = 0.5;
// Chosen: with Expanded Variety, the chance that a prefix or suffix slot takes a component of a published name.
const SPLIT_COMPONENT_SHARE = 0.5;
const DROW_NAMES = { short: NAME_SHAPES[0].shape, long: NAME_SHAPES[1].shape, compound: NAME_SHAPES[3].shape };
const STRUCTURE_CONTROLS = {
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: { isOn: (r) => sameShape(r.shape, DROW_NAMES.long) },
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: { isOn: (r) => sameShape(r.shape, DROW_NAMES.compound) }
};
const VOWEL_GROUP = new RegExp(`[${VOWELS}]+`, "g");

/**
 * Drow names (a NameGenerator, generators.js). Sourced: the tables of "By Any Other Name: The Drow" (Dragon #267), whose
 * components rebuild about 55% of published Forgotten Realms drow names. Meanings come only from these tables: another
 * published drow table gives the same components different meanings.
 */
export class DrowNameGenerator {
    constructor({ names = [], tables = [], words = [], split = {}, sources = [] } = {}) {
        const given = tables.find((t) => t.type === NAME_TYPE.GIVEN);
        const house = tables.find((t) => t.type === NAME_TYPE.HOUSE);
        if (!given?.prefixes?.length || !given.suffixes?.length) {
            throw new Error("Drow name data is missing prefixes or suffixes");
        }
        // Dragon #267 prints one spelling per sex for each entry
        const sexed = (entry) => ({
            female: getSpellings(entry, "female")[0],
            male: getSpellings(entry, "male")[0],
            meaning: entry.meaning,
            sources: given.sources
        });
        this.tables = { prefixes: given.prefixes.map(sexed), suffixes: given.suffixes.map(sexed) };
        const houseEntry = (entry) => ({ text: entry.text, meaning: entry.meaning, sources: house.sources });
        this.houseTables = { prefixes: house.prefixes.map(houseEntry), suffixes: house.suffixes.map(houseEntry) };
        const publishedNames = names.filter((n) => n.type === NAME_TYPE.GIVEN);
        this.publishedHouses = names.filter((n) => n.type === NAME_TYPE.HOUSE);
        const wordsOf = (use) => words.filter((w) => w.use === use).map((w) => w.text);
        // Sourced (FOR2 p97-98): no name resembling a drow deity; no noble first name that is a common drow word
        this.forbidden = wordsOf("forbidden");
        this.commonWords = new Set(wordsOf("glossary"));
        this.publishedByName = new Map(publishedNames.map((p) => [plain(p.text), p]));
        const forms = (entries) => new Set(entries.flatMap((e) => [e.female, e.male]).map((t) => t.toLowerCase()));
        this.split = new SplitComponents(split.given, {
            names: publishedNames,
            tableTexts: { prefix: forms(this.tables.prefixes), suffix: forms(this.tables.suffixes) },
            sources
        });
        this.recent = new RecentNames();
    }

    generate({ style = "neutral", expanded = false, reshape = false, locks = {}, random = Math.random } = {}) {
        const keepsComponents = includesSlotKey(Object.keys(locks), FIRST_NAME_KEYS);
        const result = generateUnrepeated(() => {
            const sex = SEX_BY_STYLE[style] || (keepsComponents && locks.sex) || selectSex(random);
            const shape =
                keepsComponents && !reshape
                    ? locks.shape
                    : selectRollShape(NAME_SHAPES, locks, FIRST_NAME_KEYS, random);
            const personal = this._buildPersonal(shape, sex, locks, { random, expanded, applyPreferences: true });
            const house = locks.house ? wholeSection(locks.house) : this._buildHouse(locks, random);
            return personal && house ? this._assemble(personal, house, sex, shape) : null;
        }, this.recent);
        if (!result) throw new Error("Could not make a drow name with these choices. Try unlocking a part.");
        return result;
    }

    optionsFor(result, key) {
        if (key === "house") return this.publishedHouses.map((h) => publishedHouse(h));
        if (key === HOUSE_KEYS.prefix) return this._housePrefixes().map((entry) => housePrefix(entry));
        if (key === HOUSE_KEYS.suffix) return this.houseTables.suffixes.map((entry) => houseSuffix(entry));
        const part = result.parts.find((p) => p.key === key);
        if (!part || !(part.role in TABLE_OF)) return [];
        const form = result.sex === "female" ? "female" : "male";
        const options = this._entriesFor(part.role, result.sex).map((entry) =>
            tableComponent(key, part.role, entry, form)
        );
        if (part.method === "split") {
            const components = this.split.componentsFor(part.kind, result.sex);
            options.push(...components.map((component) => givenPart(component, key, part.kind)));
        }
        const kept = Object.fromEntries(result.parts.map((p) => [p.key, p]));
        // `kept` locks every slot, so no random source is needed, and preferences (which apply to rolls) are off
        const fits = (option) => this._buildPersonal(result.shape, result.sex, { ...kept, [key]: option });
        return options.filter(fits);
    }

    // a house is always a prefix and a suffix, so it has no length control
    getStructureControls(result, locked = new Set(), options = {}) {
        return getAvailableControls(STRUCTURE_CONTROLS, result, this, locked, options);
    }

    generateStructureChange(result, control, { locked = new Set(), expanded = false, random = Math.random } = {}) {
        if (!(control in STRUCTURE_CONTROLS)) return null;
        const shape = getChangedShape(control, result.shape, locked, FIRST_NAME_KEYS, DROW_NAMES);
        if (!shape) return null;
        const kept = getKeptParts(result.parts, FIRST_NAME_KEYS);
        const { house } = sectionsOf(result);
        const personal = generateWithRetries(() => this._buildPersonal(shape, result.sex, kept, { random, expanded }));
        return personal && this._assemble(personal, house, result.sex, shape);
    }

    getSurnameSwitchOptions(result, locked = new Set()) {
        if (result.parts.some((p) => p.key === "house")) {
            const prefixes = this._housePrefixes().map((entry) => housePrefix(entry));
            return { kind: "constructed", options: locked.has("house") ? [] : prefixes };
        }
        const published = this.publishedHouses.map((h) => publishedHouse(h));
        const hasLock = locked.has(HOUSE_KEYS.prefix) || locked.has(HOUSE_KEYS.suffix);
        return { kind: "published", options: hasLock ? [] : published };
    }

    generateSurnameChange(result, choice, { random = Math.random } = {}) {
        const { personal } = sectionsOf(result);
        const house =
            choice.key === "house" ? wholeSection(choice) : this._buildHouse({ [HOUSE_KEYS.prefix]: choice }, random);
        return this._assemble(personal, house, result.sex, result.shape);
    }

    _assemble(personal, house, sex, shape) {
        const published = this.publishedByName.get(plain(personal.text));
        const parts = [...personal.parts, ...house.parts];
        return {
            name: `${personal.text} ${house.text}`,
            sex,
            subrace: "drow",
            shape,
            parts,
            ...(published ? { published: { sources: published.sources } } : {})
        };
    }

    // Chosen: a neutral name uses only table entries whose female and male forms are the same.
    _entriesFor(role, sex) {
        const entries = this.tables[TABLE_OF[role]];
        return sex === "neutral" ? entries.filter((e) => e.female === e.male) : entries;
    }

    _buildPersonal(shape, sex, locks, { random, expanded = false, applyPreferences = false } = {}) {
        const mixes = expanded && this.split.isAvailable;
        const parts = shape.map((role, index) => {
            const structure = structurePart(role, index);
            if (structure) return structure;
            const key = slotKey(FIRST_NAME_KEYS, index);
            if (locks[key]) return locks[key];
            // Stryker disable next-line EqualityOperator: "<=" differs only on a draw equal to the share
            if (mixes && random() < SPLIT_COMPONENT_SHARE) {
                return givenPart(selectRandom(this.split.componentsFor(role, sex), random), key, role);
            }
            const isFemale = sex === "female";
            // Stryker disable next-line EqualityOperator: ">" differs only on a draw equal to the share
            const useForm = isFemale && random() >= FEMALE_USES_MALE_FORM ? "female" : "male";
            return tableComponent(key, role, selectRandom(this._entriesFor(role, sex), random), useForm);
        });
        const words = wordsOf(parts);
        if (!words.every((word) => this._allowed(word))) return null;
        const syllables = Math.max(...words.map((w) => w.match(VOWEL_GROUP)?.length ?? 0));
        const isLong = syllables >= 4;
        // Stryker disable next-line EqualityOperator: ">" differs only on a draw equal to the keep share
        if (applyPreferences && isLong && random() >= LONG_NAME_KEEP[sex]) return null;
        return { text: words.map(capitalize).join(" "), parts };
    }

    // some components carry their own apostrophe (-mur'ss), so joining can make a second
    _allowed(word) {
        const bare = plain(word);
        return (
            word.indexOf("'") === word.lastIndexOf("'") && // one apostrophe at most (none, or the first is the last)
            !/(.)\1\1/.test(word) &&
            !this.commonWords.has(bare) &&
            !this.forbidden?.some((deity) => bare.includes(deity))
        );
    }

    // Sourced (FOR2 p98): by tradition no house name begins with the "L" sound of Lolth
    _housePrefixes() {
        return this.houseTables.prefixes.filter((p) => !/^l/i.test(p.text));
    }

    // a built house's meaning reads as one phrase, carried on its suffix (`wordMeaning`)
    _buildHouse(locks, random) {
        const lockedPrefix = locks[HOUSE_KEYS.prefix];
        const lockedSuffix = locks[HOUSE_KEYS.suffix];
        if (!lockedPrefix && !lockedSuffix && random() < PUBLISHED_HOUSE_SHARE && this.publishedHouses.length) {
            return wholeSection(publishedHouse(selectRandom(this.publishedHouses, random)));
        }
        const prefix = lockedPrefix || housePrefix(selectRandom(this._housePrefixes(), random));
        const suffix = lockedSuffix || houseSuffix(selectRandom(this.houseTables.suffixes, random));
        return {
            text: capitalize(prefix.text + suffix.text),
            parts: [
                { ...prefix, wordMeaning: undefined },
                { ...suffix, wordMeaning: joinHouseMeaning(prefix.meaning, suffix.meaning) }
            ]
        };
    }
}

function sectionsOf(result) {
    const start = surnameStart(result.parts);
    const houseParts = result.parts.slice(start);
    const houseText =
        houseParts[0].key === "house" ? houseParts[0].text : capitalize(houseParts.map((p) => p.text).join(""));
    return {
        personal: {
            text: result.name.slice(0, result.name.length - houseText.length - 1),
            parts: result.parts.slice(0, start)
        },
        house: { text: houseText, parts: houseParts }
    };
}

const houseComponent = (key, kind, entry) => ({
    key,
    role: `house ${kind}`,
    text: entry.text,
    meaning: entry.meaning,
    sources: entry.sources,
    section: SECTION.FAMILY,
    kind
});
const housePrefix = (entry) => houseComponent(HOUSE_KEYS.prefix, KIND.PREFIX, entry);
const houseSuffix = (entry) => houseComponent(HOUSE_KEYS.suffix, KIND.SUFFIX, entry);
const selectSex = (random) => (random() < FEMALE_SHARE ? "female" : "male");

const TABLE_OF = { prefix: "prefixes", suffix: "suffixes" };
// "Blood of the" + "The forgotten ways" reads "Blood of the forgotten ways"
const joinHouseMeaning = (prefix, suffix) => {
    const rest = /\bthe$/i.test(prefix) ? suffix.replace(/^the\s+/i, "") : suffix;
    return `${prefix} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
};
const plain = (text) => text.toLowerCase().replace(/'/g, "");
const givenPart = (component, key, slot) => ({ ...component, key, role: slot, section: SECTION.GIVEN, kind: slot });
const tableComponent = (key, role, entry, form) =>
    givenPart({ text: entry[form], meaning: entry.meaning, sources: entry.sources }, key, role);
const publishedHouse = (h) => ({
    key: "house",
    role: "house",
    text: h.text,
    method: "published",
    sources: h.sources,
    section: SECTION.FAMILY,
    kind: KIND.WHOLE
});
