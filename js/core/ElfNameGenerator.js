// Surface-elf names (design decisions, 2026-10-21). Personal names come from
// the elven name tables in Races of the Wild (3.5e, pp30-31), a reprint of "By Any Other Name" (Dragon #251): a
// prefix and one or more suffixes, each with a published meaning. A family name is a published family name (with its
// translation when a book gives one), a surname built from the same tables, or a Common-form name from words found in
// published family names. Expanded Variety lets any prefix or suffix slot take a component of a published name instead
// (its meaning unknown). Drow follow their own tables, so drow requests go to DrowNameGenerator.
//
// Result shape (shared with DrowNameGenerator): { name, sex, subrace, parts, published?, shape?, familyShape?,
// tables? }. Each part has a `key` (stable slot id), a `role`, its `text`, and its provenance. Parts passed in `locks`
// are kept; the rest are re-rolled. `shape` / `familyShape` let locked table parts keep their places; `tables` names
// the tables used.
import { RecentNames, selectRandom, selectWeighted } from "./random.js?v=4.1.2";
import { SplitComponents, VOWELS, joinsCleanly } from "./splitComponents.js?v=4.1.2";
import {
    getAvailableControls,
    getChangedShape,
    getKeptParts,
    NAME_STRUCTURE_CONTROL,
    selectRollShape,
    sameShape,
    getSlotNumber
} from "./nameStructure.js?v=4.1.2";

const MAX_ATTEMPTS = 300;
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
// Sourced (Dragon #251): if a combination does not sound right, "add an a, e, i, l, r, s, sh, or an apostrophe".
// Chosen: a join whose consonants never meet in a published elf name takes one of these letters, picked at random
// among those that make clean joins; apostrophes come only from the apostrophe shape.
const JOINING_LETTERS = ["a", "e", "i", "l", "r", "s", "sh"];
// Chosen: more than three vowels in a row at a join reads as a typo.
const VOWEL_PILE = new RegExp(`[${VOWELS}]{4}`);
// Inferred: none of the 520 published elf names has "yy" (doubled a, e, i and o do occur), so a join such as -cy + yth
// that would make one is rebuilt.
const DOUBLED_Y = /yy/i;
// Chosen: with Expanded Variety on, each prefix or suffix slot of a table name is filled with a
// component of a published name (an opening or an ending) with this probability, so one name can mix both kinds.
const SPLIT_COMPONENT_SHARE = 0.5;
// Chosen: share of Elvish-form family names taken from published family names (the rest are built).
const PUBLISHED_HOUSE_SHARE = 0.5;
// Inferred, small samples: words and houses seen with a subrace are this many times likelier (a preference).
const SUBRACE_WEIGHT = 3;
const VOWEL_GROUP = new RegExp(`[${VOWELS}]+`, "g");
const STRUCTURE = { "'": "apostrophe", " ": "space" };
export const ELF_SUBRACES = ["high-elf", "sun-elf", "moon-elf", "wood-elf"];
export const SEX_BY_STYLE = {
    feminine: "female",
    masculine: "male",
    neutral: "neutral",
    female: "female",
    male: "male"
};

export class ElfNameGenerator {
    /**
     * @param {Object} data - contents of data/elfNames.json
     * @param {Object} [drowGenerator] - DrowNameGenerator for subrace "drow"
     */
    constructor(data, drowGenerator = null) {
        if (!data?.tables?.prefixes?.length || !data.tables.suffixes?.length) {
            throw new Error("Elf name data is missing the name tables");
        }
        this.tables = data.tables;
        this.data = data;
        this.drowGenerator = drowGenerator;
        const tableTexts = {
            prefix: new Set(data.tables.prefixes.map((p) => p.text.toLowerCase())),
            suffix: new Set(data.tables.suffixes.flatMap((s) => [...s.male, ...s.female]).map((t) => t.toLowerCase()))
        };
        this.split = new SplitComponents(data, tableTexts, data.publishedNames);
        this.familySplit = new SplitComponents(
            {
                openings: data.familyOpenings,
                endings: data.familyEndings,
                joinClusters: data.familyJoinClusters
            },
            tableTexts,
            data.familyNames
        );
        this.publishedByName = new Map((data.publishedNames || []).map((p) => [p.text.toLowerCase(), p]));
        this.houseNames = new Set((data.familyNames || []).map((f) => f.text.toLowerCase()));
        this.recent = new RecentNames();
    }

    /**
     * @param {Object} [options]
     * @param {string} [options.subrace="high-elf"] - one of ELF_SUBRACES, or "drow"
     * @param {string} [options.style="neutral"] - "neutral", "feminine" or "masculine"
     * @param {boolean} [options.expanded=false] - Expanded Variety: slots may take components of published names
     * @param {boolean} [options.reshape=false] - a roll: locked slots keep their place, but the shape may change to any
     *   (weighted) shape in which every locked slot is still valid; otherwise `locks.shape` is kept
     * @param {Object} [options.locks] - parts to keep by key: first-name components "t0".. (with `shape`), surname components
     *   "n0".. (with `familyShape`), or a whole "family"
     * @param {Function} [options.random] - random number source, Math.random by default
     */
    generate({
        subrace = "high-elf",
        style = "neutral",
        expanded = false,
        reshape = false,
        locks = {},
        random = Math.random
    } = {}) {
        if (subrace === "drow") return this._drow().generate({ style, expanded, reshape, locks, random });
        if (!ELF_SUBRACES.includes(subrace)) throw new Error(`Unknown elf subrace: ${subrace}`);
        const sex = SEX_BY_STYLE[style] || null;
        let repeat = null;
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const personal = this._buildTable(sex, locks, random, { expanded, reshape });
            const family = locks.family
                ? whole(locks.family)
                : locksTableParts(locks, "n")
                  ? this._buildTableFamily(random, locks, expanded, reshape)
                  : this._buildFamily(subrace, expanded, random);
            if (!personal || !family) continue;
            const result = this._assemble(personal, family, sex, subrace);
            if (!this.recent.has(result.name)) return this._remember(result);
            repeat = repeat || result;
        }
        if (repeat) return this._remember(repeat);
        throw new Error("Could not make an elf name with these choices. Try unlocking a part.");
    }

    /**
     * Alternatives for one part of a result, for the part picker: only those that make a valid name with the rest of
     * the name kept as it is, so choosing one never fails.
     */
    optionsFor(result, key) {
        if (result.subrace === "drow") return this._drow().optionsFor(result, key);
        if (key === "family") return (this.data.familyNames || []).map((f) => publishedFamilyPart(f));
        const part = result.parts.find((p) => p.key === key);
        if (!part || !TABLE_KEY.test(key)) return [];
        // surname components use the suffix forms shared by both genders, as for building them
        const isSurname = part.role.startsWith("family");
        const sex = isSurname ? "neutral" : result.sex;
        const slot = part.role.endsWith("prefix") ? "prefix" : "suffix";
        // every published spelling of a suffix is its own option, so the one in the name is always listed
        const spellings = (entry) =>
            (sex === "female" ? entry.female : entry.male).map((_, i, forms) => i / forms.length);
        const options =
            slot === "prefix"
                ? this.tables.prefixes.map((entry) => tablePart(key, part.role, entry))
                : this._suffixesFor(sex).flatMap((entry) =>
                      spellings(entry).map((pick) => this._suffixPart(key, part.role, entry, sex, () => pick))
                  );
        // a component taken from a published name also offers the other components of that kind
        if (part.method === "split") {
            const source = isSurname ? this.familySplit : this.split;
            const components = source.componentsFor(slot, isSurname ? null : result.sex);
            options.push(...components.map((component) => ({ ...component, key, role: part.role })));
        }
        const kept = { ...Object.fromEntries(result.parts.map((p) => [p.key, p])), shape: result.shape };
        const fits = (option) => {
            const locks = { ...kept, familyShape: result.familyShape, [key]: option };
            const random = () => 0; // any joining letter that fits will do; this only tests whether one exists
            return isSurname ? this._buildTableFamily(random, locks) : this._buildTable(result.sex, locks, random);
        };
        return options.filter(fits);
    }

    /**
     * The structure controls that can be pressed on a result, as { control, on }: "given" (short or long first name),
     * "surname" (short or long, table-built surnames only) and "compound" (the second given name). A control is listed
     * only if the changed name builds with every part kept. Drow have their own shapes (DrowNameGenerator).
     */
    getStructureControls(result, locked = new Set(), options = {}) {
        if (result.subrace === "drow") return this._drow().getStructureControls(result, locked, options);
        return getAvailableControls(STRUCTURE_CONTROLS, result, (control) =>
            this.generateStructureChange(result, control, { ...options, locked })
        );
    }

    /**
     * Presses a structure control: the name with one section made longer or shorter, or the compound name added or removed.
     * Every current part is kept in its slot (the new slots are the only random ones), so locks stay valid; a change
     * that would delete a locked slot is unavailable. Does not count as a roll.
     * @param {Set<string>} [options.locked] - keys of the parts the visitor locked
     * @returns {Object|null} the new name, or null if the change is unavailable
     */
    generateStructureChange(result, control, options = {}) {
        if (result.subrace === "drow") return this._drow().generateStructureChange(result, control, options);
        const { locked = new Set(), expanded = false, random = Math.random } = options;
        const spec = STRUCTURE_CONTROLS[control];
        if (!spec) return null;
        const { prefix } = spec;
        const shape = getChangedShape(control, result[spec.shapeKey], locked, prefix, ELF_NAMES);
        if (!shape) return null;
        const kept = getKeptParts(result.parts, prefix);
        const sections = sectionsOf(result);
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const built =
                prefix === "t"
                    ? this._buildTable(result.sex, kept, random, { shape, expanded })
                    : this._buildTableFamily(random, { ...kept, familyShape: shape }, expanded);
            if (!built) continue;
            const changedName = { text: built.text, parts: built.parts, shape };
            const { personal, family } = sections;
            return this._assemble(
                ...(prefix === "t" ? [changedName, family] : [personal, changedName]),
                result.sex,
                result.subrace
            );
        }
        return null;
    }

    /**
     * For the surname picker: the other kind of surname to switch to, as { kind, options } ("published" family names, or
     * "constructed" from a chosen table prefix). No options if the switch would drop a locked part.
     */
    getSurnameSwitchOptions(result, locked = new Set(), options = {}) {
        if (result.subrace === "drow") return this._drow().getSurnameSwitchOptions(result, locked, options);
        if (result.familyShape) {
            const hasLock = [...locked].some((key) => getSlotNumber(key, "n") !== undefined);
            const published = (this.data.familyNames || []).map((f) => publishedFamilyPart(f));
            return { kind: "published", options: hasLock ? [] : published };
        }
        const prefixes = this.tables.prefixes.map((entry) => tablePart("n0", "family prefix", entry));
        const buildable = (prefix) => this.generateSurnameChange(result, prefix, options);
        return { kind: "constructed", options: locked.has("family") ? [] : prefixes.filter(buildable) };
    }

    /**
     * Replaces the surname with a published family name, or builds one from a chosen table prefix (its suffix and shape
     * follow the usual weights). The first name is kept. Does not count as a roll.
     * @param {Object} choice - a part from getSurnameSwitchOptions
     * @returns {Object|null} the new name, or null if no surname builds with that prefix
     */
    generateSurnameChange(result, choice, options = {}) {
        if (result.subrace === "drow") return this._drow().generateSurnameChange(result, choice, options);
        const { expanded = false, random = Math.random } = options;
        const { personal } = sectionsOf(result);
        if (choice.key === "family") return this._assemble(personal, whole(choice), result.sex, result.subrace);
        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            const family = this._buildTableFamily(random, { [choice.key]: choice }, expanded, true);
            if (family) return this._assemble(personal, family, result.sex, result.subrace);
        }
        return null;
    }

    _drow() {
        if (!this.drowGenerator) throw new Error("No drow generator configured");
        return this.drowGenerator;
    }

    _remember(result) {
        this.recent.add(result.name);
        return result;
    }

    /** Suffix table entries for a gender: neutral names use only the suffixes the tables give both genders. */
    _suffixesFor(sex) {
        const suffixes = this.tables.suffixes;
        return sex === "neutral" ? suffixes.filter((s) => sameForms(s)) : suffixes;
    }

    /** A suffix in the form for the gender; alternate spellings (Sourced: "alternate spellings") are picked at random. */
    _suffixPart(key, role, entry, sex, random) {
        const forms = sex === "female" ? entry.female : entry.male;
        const text = forms[Math.floor(random() * forms.length)];
        return { ...tablePart(key, role, entry), text, meaning: genderedMeaning(entry, sex) };
    }

    /**
     * A name from the tables in one of the published shapes (or the given one); locked parts keep their places. The
     * four-syllable preference applies only when nothing was chosen and `applyPreferences` is not false. A surname
     * uses keys "n0".. and roles "family prefix" / "family suffix", so its components can be locked like a first name's.
     */
    _buildTable(
        sex,
        locks,
        random,
        { shape: given = null, applyPreferences = true, surname = false, expanded = false, reshape = false } = {}
    ) {
        const keyPrefix = surname ? "n" : "t";
        const choseAny = locksTableParts(locks, keyPrefix);
        const shape =
            given || (choseAny && !reshape ? locks.shape : selectRollShape(NAME_SHAPES, locks, keyPrefix, random));
        const source = surname ? this.familySplit : this.split;
        const mixes = expanded && source.isAvailable;
        const components = shape.map((role, index) => {
            const key = `${role in STRUCTURE ? "s" : keyPrefix}${index}`;
            if (role in STRUCTURE) return { key, role: STRUCTURE[role], text: role };
            if (locks[key]) return locks[key];
            const componentRole = surname ? `family ${role}` : role;
            if (mixes && random() < SPLIT_COMPONENT_SHARE) {
                const component = selectRandom(source.componentsFor(role, surname ? null : sex), random);
                return { ...component, key, role: componentRole };
            }
            if (role === "prefix") return tablePart(key, componentRole, selectRandom(this.tables.prefixes, random));
            return this._suffixPart(key, componentRole, selectRandom(this._suffixesFor(sex), random), sex, random);
        });
        const parts = this._join(components, random, keyPrefix, source.clusters, locks);
        if (!parts) return null;
        const words = parts
            .map((p) => p.text)
            .join("")
            .split(" ");
        const prefer = applyPreferences && !choseAny;
        // Chosen: in the apostrophe shape the length rules apply to the part after the apostrophe (the part before is
        // a single suffix), so the shape keeps the share chosen for it
        if (!words.every((word) => this._acceptable(word.split("'").at(-1), prefer, random))) return null;
        return { text: words.map(capitalize).join(" "), parts, shape };
    }

    /**
     * Joins table parts, adding a joining letter (Dragon #251) where the consonants would not meet cleanly. `clusters`
     * are those found inside published personal names, or published family names for a surname. A locked joining
     * letter is kept while it still fits, so choosing one component does not change the joins elsewhere.
     */
    _join(components, random, keyPrefix, clusters, locks) {
        const out = [];
        for (const part of components) {
            const previous = out.at(-1);
            if (previous && !(previous.role in REVERSE_STRUCTURE) && !(part.role in REVERSE_STRUCTURE)) {
                const before = previous.text;
                if (!joinsCleanly(before, part.text, clusters)) {
                    const letters = JOINING_LETTERS.filter(
                        (l) => joinsCleanly(before, l, clusters) && joinsCleanly(before + l, part.text, clusters)
                    );
                    if (!letters.length) return null;
                    const key = `${keyPrefix}j${out.length}`;
                    const kept = locks[key]?.text;
                    const text = letters.includes(kept) ? kept : selectRandom(letters, random);
                    out.push({ key, role: "joining letter", text });
                }
            }
            out.push(part);
        }
        const text = out.map((p) => p.text).join("");
        return VOWEL_PILE.test(text) || DOUBLED_Y.test(text) || /(.)\1\1/.test(text) ? null : out;
    }

    /** A family name: { text, parts, shape? } (table-built surnames are several lockable components). */
    _buildFamily(subrace, expanded, random) {
        if (random() < (this.data.commonFormShare?.[subrace] ?? 0)) {
            return whole(this._buildCommonFamily(subrace, random));
        }
        if (random() < PUBLISHED_HOUSE_SHARE) {
            const houses = (this.data.familyNames || []).filter((f) => f.form === "elvish");
            const weight = (f) => (f.subraces?.includes(subrace) ? SUBRACE_WEIGHT : 1);
            return whole(publishedFamilyPart(selectWeighted(houses, weight, random)));
        }
        return this._buildTableFamily(random, {}, expanded);
    }

    /**
     * A surname from the tables, in components that can be locked. Chosen: it uses the suffix forms shared by both
     * genders, as the whole family bears it.
     */
    _buildTableFamily(random, locks = {}, expanded = false, reshape = false) {
        const keepsShape = locksTableParts(locks, "n") && !reshape;
        const shape = keepsShape ? locks.familyShape : selectRollShape(SURNAME_SHAPES, locks, "n", random);
        const built = this._buildTable("neutral", locks, random, { shape, surname: true, expanded });
        if (!built || this.houseNames.has(built.text.toLowerCase())) return null;
        return { text: built.text, parts: built.parts, shape };
    }

    /** Sourced-word family name (S2): a first and second word, each found in a published elf family name. */
    _buildCommonFamily(subrace, random) {
        const weight = (w) => (w.subraces?.includes(subrace) ? SUBRACE_WEIGHT : 1);
        const { first = [], second = [] } = this.data.approvedWords || {};
        const a = selectWeighted(first, weight, random);
        const b = selectWeighted(second, weight, random);
        if (!a || !b || a.text.toLowerCase() === b.text.toLowerCase()) return null;
        const text = a.text + b.text;
        const published = (this.data.familyNames || []).find((f) => f.text.toLowerCase() === text.toLowerCase());
        if (published) return publishedFamilyPart(published);
        return { key: "family", role: "family name", text, method: "composed", words: [a.text, b.text] };
    }

    /** Length rules; the four-syllable preference applies only when nothing was chosen by the user. */
    _acceptable(text, applyPreferences, random) {
        if (/(.)\1\1/.test(text) || text.length < MIN_LETTERS || text.length > MAX_LETTERS) return false;
        const syllables = (text.match(VOWEL_GROUP) || []).length;
        if (syllables < 2 || syllables > 4) return false;
        return !(applyPreferences && syllables === 4 && random() >= FOUR_SYLLABLE_KEEP);
    }

    _assemble(personal, family, sex, subrace) {
        const published = this.publishedByName.get(personal.text.toLowerCase());
        const usesTables = Boolean(personal.shape || family.shape);
        return {
            name: `${personal.text} ${family.text}`,
            sex,
            subrace,
            ...(personal.shape ? { shape: personal.shape } : {}),
            ...(family.shape ? { familyShape: family.shape } : {}),
            parts: [...personal.parts, ...family.parts],
            ...(usesTables ? { tables: `${this.tables.title}, first published in ${this.tables.origin}` } : {}),
            ...(published ? { published: { source: published.source } } : {})
        };
    }
}

// The structure controls reuse the shapes above, so they add no new naming pattern. "Compound Name" is the second word
// of the two-word shape (Chosen: it is added or removed as a whole).
const ELF_NAMES = { short: NAME_SHAPES[0].shape, long: NAME_SHAPES[1].shape, compound: NAME_SHAPES[2].shape };
// the order the toggles appear in: first name, the compound name between the names, then the surname
const STRUCTURE_CONTROLS = {
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: {
        prefix: "t",
        shapeKey: "shape",
        isOn: (r) => sameShape(r.shape, ELF_NAMES.long)
    },
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: {
        prefix: "t",
        shapeKey: "shape",
        isOn: (r) => sameShape(r.shape, ELF_NAMES.compound)
    },
    [NAME_STRUCTURE_CONTROL.SURNAME]: {
        prefix: "n",
        shapeKey: "familyShape",
        isOn: (r) => sameShape(r.familyShape, ELF_NAMES.long)
    }
};

/**
 * The first name and surname of a result as sections ({ text, parts, shape }), for rebuilding one of them. The surname
 * is one word, so the name splits at its last space.
 */
function sectionsOf(result) {
    const cut = result.name.lastIndexOf(" ");
    return {
        personal: {
            text: result.name.slice(0, cut),
            parts: result.parts.filter((p) => /^[ts]/.test(p.key)),
            shape: result.shape
        },
        family: {
            text: result.name.slice(cut + 1),
            parts: result.parts.filter((p) => /^(n|family)/.test(p.key)),
            shape: result.familyShape
        }
    };
}

const REVERSE_STRUCTURE = { apostrophe: true, space: true };
const TABLE_KEY = /^[tn]\d/;
const locksTableParts = (locks, keyPrefix = "t") =>
    Object.keys(locks).some((key) => new RegExp(`^${keyPrefix}\\d`).test(key));
// a family name made of one part (published or Common-form)
const whole = (part) => part && { text: part.text, parts: [part] };
const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const sameForms = (entry) => entry.male.join() === entry.female.join();
const tablePart = (key, role, entry) => ({ key, role, text: entry.text, meaning: entry.meaning });

/** "Lord/Lady" reads "Lord" on a male name and "Lady" on a female one (paired suffixes only). */
function genderedMeaning(entry, sex) {
    if (sameForms(entry)) return entry.meaning;
    const side = sex === "female" ? 1 : 0;
    return entry.meaning
        .split(", ")
        .map((item) => (item.includes("/") ? item.split("/")[side] : item))
        .join(", ");
}

const publishedFamilyPart = (f) =>
    f && {
        key: "family",
        role: "family name",
        text: f.text,
        method: "published",
        // "elvish" or "common" (already English, like Morninglight)
        form: f.form,
        source: f.source,
        // Sourced: a translation published with the name (PHB: Galanodel = Moonwhisper); other names have none
        ...(f.translation ? { meaning: f.translation.text, meaningSource: f.translation.title } : {}),
        ...(f.note ? { note: f.note } : {})
    };
