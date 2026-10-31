// Drow names (design decisions, 2026-10-20). Personal and house names come
// from the tables in "By Any Other Name: The Drow" (Dragon #267), whose components rebuild about 55% of published
// Forgotten Realms drow names. Meanings come from those tables only: another published drow table gives the same
// components different meanings. Published FR houses are used alongside generated ones. Same result shape as
// ElfNameGenerator; a result also carries its `shape` so locked components keep their places. Expanded Variety lets a
// slot take a component of a published drow name instead (meaning unknown).
import { RecentNames, selectRandom } from "./random.js?v=4.1.5";
import { SplitComponents, VOWELS } from "./splitComponents.js?v=4.1.5";
import { SEX_BY_STYLE } from "./species.js?v=4.1.5";
import {
    getAvailableControls,
    getChangedShape,
    getKeptParts,
    NAME_STRUCTURE_CONTROL,
    selectRollShape,
    sameShape
} from "./nameStructure.js?v=4.1.5";

const MAX_ATTEMPTS = 300;
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
// these probabilities, a preference that applies to every roll, with or without locks (BMN-56).
const LONG_NAME_KEEP = { male: 0.15, female: 0.2, neutral: 0.2 };
// Sourced: "Rarely, a female drow might take part of a purely masculine name"; a male with a feminine component
// would be a rogue (Dragon #267). Chosen: rate of the female exception.
const FEMALE_USES_MALE_FORM = 0.05;
// Chosen: share of published FR houses (the rest are built from Dragon #267 Tables 4 and 5).
const PUBLISHED_HOUSE_SHARE = 0.5;
// Chosen (Expanded Variety): with the option on, each prefix or suffix slot is filled with a component of a
// published drow name with this probability, so one name can mix table entries and published components.
const SPLIT_COMPONENT_SHARE = 0.5;
// The structure controls reuse the shapes above (see ElfNameGenerator); the compound name is the two-word shape's second word.
const DROW_NAMES = { short: NAME_SHAPES[0].shape, long: NAME_SHAPES[1].shape, compound: NAME_SHAPES[3].shape };
const STRUCTURE_CONTROLS = {
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: { isOn: (r) => sameShape(r.shape, DROW_NAMES.long) },
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: { isOn: (r) => sameShape(r.shape, DROW_NAMES.compound) }
};
const VOWEL_GROUP = new RegExp(`[${VOWELS}]+`, "g");
const TABLES_TITLE = "By Any Other Name: The Drow (Dragon #267)";
const STRUCTURE = { "'": "apostrophe", " ": "space" };

export class DrowNameGenerator {
    /** @param {Object} data - contents of data/drowNames.json */
    constructor(data) {
        if (!data?.prefixes?.length || !data.suffixes?.length) {
            throw new Error("Drow name data is missing prefixes or suffixes");
        }
        this.data = data;
        // Sourced (FOR2 p97-98): no name resembling a drow deity; no noble first name that is a common drow word
        this.forbidden = data.forbiddenNames;
        this.commonWords = new Set(data.commonWords);
        this.publishedByName = new Map((data.publishedNames || []).map((p) => [plain(p.text), p]));
        const forms = (entries) => new Set(entries.flatMap((e) => [e.female, e.male]).map((t) => t.toLowerCase()));
        this.split = new SplitComponents(
            data,
            { prefix: forms(data.prefixes), suffix: forms(data.suffixes) },
            data.publishedNames
        );
        this.recent = new RecentNames();
    }

    /**
     * @param {Object} [options] - style ("neutral", "feminine", "masculine"); expanded: Expanded Variety (slots may
     *   take components of published drow names); reshape: a roll, so locked slots keep their place but the shape may
     *   change to any (weighted) shape in which they are still valid; locks: parts to keep by key (first-name
     *   components "f0".."f4" with `shape` and `sex`; house components "n0", "n1", or a whole "house"); random: number
     *   source
     */
    generate({ style = "neutral", expanded = false, reshape = false, locks = {}, random = Math.random } = {}) {
        // Lock keys are "f0".., "s…", "n0", "n1", "house", "shape" and "sex"; only a first-name slot starts with "f"
        const keepsComponents = Object.keys(locks).some((key) => key.startsWith("f"));
        let repeat = null;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const sex = SEX_BY_STYLE[style] || (keepsComponents && locks.sex) || (random() < 0.5 ? "female" : "male");
            const shape = keepsComponents && !reshape ? locks.shape : selectRollShape(NAME_SHAPES, locks, "f", random);
            const personal = this._buildPersonal(shape, sex, locks, true, random, expanded);
            const house = locks.house
                ? { text: locks.house.text, parts: [locks.house] }
                : this._buildHouse(locks, random);
            if (!personal || !house) continue;
            const result = this._assemble(personal, house, sex, shape);
            if (!this.recent.has(result.name)) return this._remember(result);
            repeat = repeat || result;
        }
        if (repeat) return this._remember(repeat);
        throw new Error("Could not make a drow name with these choices. Try unlocking a part.");
    }

    /**
     * Alternatives for one part, for the part picker: the other entries of the same table (only those that keep the
     * name within the taboos and rules, with the rest kept as it is), or published houses.
     */
    optionsFor(result, key) {
        if (key === "house") return (this.data.publishedHouses || []).map((h) => publishedHouse(h));
        if (key === "n0") return this._housePrefixes().map((entry) => houseComponent("n0", "house prefix", entry));
        if (key === "n1") return this.data.houseSuffixes.map((entry) => houseComponent("n1", "house suffix", entry));
        const part = result.parts.find((p) => p.key === key);
        if (!part || !(part.role in TABLE_OF)) return [];
        const form = result.sex === "female" ? "female" : "male";
        const options = this._entriesFor(part.role, result.sex).map((entry) =>
            tableComponent(key, part.role, entry, form)
        );
        // a component taken from a published name also offers the other components of that kind
        if (part.method === "split") {
            const components = this.split.componentsFor(part.role, result.sex);
            options.push(...components.map((component) => ({ ...component, key, role: part.role })));
        }
        const kept = Object.fromEntries(result.parts.map((p) => [p.key, p]));
        const fits = (option) =>
            // `kept` locks every slot, so the preferences flag and the random source are never read and are left out
            this._buildPersonal(result.shape, result.sex, { ...kept, [key]: option });
        return options.filter(fits);
    }

    /**
     * The structure controls that can be pressed on a result, as { control, on }: "given" (short or long first name) and
     * "compound" (the second given name). A house is always a prefix and a suffix, so it has no length control. A control
     * is listed only if the changed name builds with every part kept.
     */
    getStructureControls(result, locked = new Set(), options = {}) {
        return getAvailableControls(STRUCTURE_CONTROLS, result, this, locked, options);
    }

    /**
     * Presses a structure control; as for elves, every current part stays in its slot (only the new slots are random)
     * and a change that would delete a locked slot is unavailable. Does not count as a roll.
     * @returns {Object|null} the new name, or null if the change is unavailable
     */
    generateStructureChange(result, control, { locked = new Set(), expanded = false, random = Math.random } = {}) {
        if (!(control in STRUCTURE_CONTROLS)) return null;
        const shape = getChangedShape(control, result.shape, locked, "f", DROW_NAMES);
        if (!shape) return null;
        const kept = getKeptParts(result.parts, "f");
        const { house } = sectionsOf(result);
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const personal = this._buildPersonal(shape, result.sex, kept, false, random, expanded);
            if (personal) return this._assemble(personal, house, result.sex, shape);
        }
        return null;
    }

    /**
     * For the house picker: the other kind of house to switch to, as { kind, options } ("published" houses, or
     * "constructed" from a chosen prefix). No options if the switch would drop a locked part.
     */
    getSurnameSwitchOptions(result, locked = new Set()) {
        if (result.parts.some((p) => p.key === "house")) {
            const prefixes = this._housePrefixes().map((entry) => houseComponent("n0", "house prefix", entry));
            return { kind: "constructed", options: locked.has("house") ? [] : prefixes };
        }
        const published = (this.data.publishedHouses || []).map((h) => publishedHouse(h));
        return { kind: "published", options: locked.has("n0") || locked.has("n1") ? [] : published };
    }

    /**
     * Replaces the house with a published one, or builds one from a chosen prefix (its suffix is random). The first
     * name is kept. Does not count as a roll.
     * @param {Object} choice - a part from getSurnameSwitchOptions
     */
    generateSurnameChange(result, choice, { random = Math.random } = {}) {
        const { personal } = sectionsOf(result);
        const house =
            choice.key === "house" ? { text: choice.text, parts: [choice] } : this._buildHouse({ n0: choice }, random);
        return this._assemble(personal, house, result.sex, result.shape);
    }

    /** The result for a first name and a house. */
    _assemble(personal, house, sex, shape) {
        const published = this.publishedByName.get(plain(personal.text));
        const parts = [...personal.parts, ...house.parts];
        return {
            name: `${personal.text} ${house.text}`,
            sex,
            subrace: "drow",
            shape,
            parts,
            ...(parts.some((p) => p.meaning) ? { tables: TABLES_TITLE } : {}),
            ...(published ? { published: { source: published.source } } : {})
        };
    }

    /** Chosen: a neutral name uses only table entries whose female and male forms are the same. */
    _entriesFor(role, sex) {
        const entries = this.data[TABLE_OF[role]];
        return sex === "neutral" ? entries.filter((e) => e.female === e.male) : entries;
    }

    _remember(result) {
        this.recent.add(result.name);
        return result;
    }

    _buildPersonal(shape, sex, locks, applyPreferences, random, expanded) {
        const mixes = expanded && this.split.isAvailable;
        const parts = shape.map((role, index) => {
            const key = `${role in STRUCTURE ? "s" : "f"}${index}`;
            if (role in STRUCTURE) return { key, role: STRUCTURE[role], text: role };
            if (locks[key]) return locks[key];
            // a test catches ">="; "<=" cannot be caught, since the rule is a probability
            // Stryker disable next-line EqualityOperator: "<=" differs only on a draw equal to the share
            if (mixes && random() < SPLIT_COMPONENT_SHARE) {
                return { ...selectRandom(this.split.componentsFor(role, sex), random), key, role };
            }
            const isFemale = sex === "female";
            // a test catches "<"; ">" cannot be caught, since the rule is a probability
            // Stryker disable next-line EqualityOperator: ">" differs only on a draw equal to the share
            const useForm = isFemale && random() >= FEMALE_USES_MALE_FORM ? "female" : "male";
            return tableComponent(key, role, selectRandom(this._entriesFor(role, sex), random), useForm);
        });
        const words = parts
            .map((p) => p.text)
            .join("")
            .split(" ");
        if (!words.every((word) => this._allowed(word))) return null;
        const syllables = Math.max(...words.map((w) => w.match(VOWEL_GROUP)?.length ?? 0));
        const isLong = syllables >= 4;
        // a test catches "<"; ">" cannot be caught, since the rule is a probability
        // Stryker disable next-line EqualityOperator: ">" differs only on a draw equal to the keep share
        if (applyPreferences && isLong && random() >= LONG_NAME_KEEP[sex]) return null;
        return { text: words.map(capitalize).join(" "), parts };
    }

    /** One apostrophe at most (some components carry their own, like -mur'ss); FOR2 taboos; no triple letters. */
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
        return this.data.housePrefixes.filter((p) => !/^l/i.test(p.text));
    }

    /**
     * A house: { text, parts }. A published house is one part; a built house is a prefix and a suffix from Tables 4
     * and 5, each lockable, with the whole house's meaning read as one phrase on the suffix (`wordMeaning`).
     */
    _buildHouse(locks, random) {
        const keepsComponents = Boolean(locks.n0 || locks.n1);
        if (!keepsComponents && random() < PUBLISHED_HOUSE_SHARE && this.data.publishedHouses?.length) {
            const house = publishedHouse(selectRandom(this.data.publishedHouses, random));
            return { text: house.text, parts: [house] };
        }
        const prefix = locks.n0 || houseComponent("n0", "house prefix", selectRandom(this._housePrefixes(), random));
        const suffix = locks.n1 || houseComponent("n1", "house suffix", selectRandom(this.data.houseSuffixes, random));
        return {
            text: capitalize(prefix.text + suffix.text),
            parts: [
                { ...prefix, wordMeaning: undefined },
                { ...suffix, wordMeaning: joinHouseMeaning(prefix.meaning, suffix.meaning) }
            ]
        };
    }
}

/** The first name and house of a result as sections ({ text, parts }), for rebuilding one of them. */
function sectionsOf(result) {
    const parts = (...prefixes) => result.parts.filter((p) => prefixes.some((prefix) => p.key.startsWith(prefix)));
    const houseParts = parts("n", "house");
    const houseText =
        houseParts[0].key === "house" ? houseParts[0].text : capitalize(houseParts.map((p) => p.text).join(""));
    return {
        personal: { text: result.name.slice(0, result.name.length - houseText.length - 1), parts: parts("f", "s") },
        house: { text: houseText, parts: houseParts }
    };
}

const houseComponent = (key, role, entry) => ({ key, role, text: entry.text, meaning: entry.meaning });

const TABLE_OF = { prefix: "prefixes", suffix: "suffixes" };
// "Blood of the" + "The forgotten ways" reads "Blood of the forgotten ways"
const joinHouseMeaning = (prefix, suffix) => {
    const rest = /\bthe$/i.test(prefix) ? suffix.replace(/^the\s+/i, "") : suffix;
    return `${prefix} ${rest.charAt(0).toLowerCase()}${rest.slice(1)}`;
};
const plain = (text) => text.toLowerCase().replace(/'/g, "");
// Published names keep lower case after an apostrophe (Berg'inyon), so only the first letter is capitalized
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const tableComponent = (key, role, entry, form) => ({ key, role, text: entry[form], meaning: entry.meaning });
const publishedHouse = (h) => ({ key: "house", role: "house", text: h.text, method: "published", source: h.source });
