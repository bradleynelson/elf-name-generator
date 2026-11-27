import { generateComponentChange, generateJoined } from "./joiningLetters.js?v=4.3.2";
import { RecentNames, selectRandom, selectWeighted, shuffle } from "./random.js?v=4.3.2";
import {
    createPublishedLookup,
    filterPartOptions,
    generateName,
    takesSplitComponent,
    weightByLineage
} from "./nameRolls.js?v=4.3.2";
import { hasTripleLetter, keepsEveryLength, keepsLengthOnRoll, validateSpelling } from "./spelling.js?v=4.3.2";
import { SplitComponents } from "./splitComponents.js?v=4.3.2";
import { SEX, SEX_BY_STYLE, UNISEX } from "./species.js?v=4.3.2";
import { NAME_TYPE } from "./speciesData.js?v=4.3.2";
import { filterEntriesFor, formsFor, readTable, tableTextsOf } from "./nameTables.js?v=4.3.2";
import {
    formatSectionText,
    generateWithPart,
    getAvailableControls,
    GIVEN_SLOT,
    KIND,
    METHOD,
    NAME_STRUCTURE_CONTROL,
    publishedPart,
    SECTION,
    slotKey,
    slotPart,
    structurePart,
    tablePart
} from "./nameStructure.js?v=4.3.2";

const GIVEN_KEY = "given";
const CLAN_KEY = "clan";
const SLOTS = "g";
const PREFIX_KEY = slotKey(SLOTS, 0);
const SUFFIX_KEY = slotKey(SLOTS, 1);
// Sourced: one prefix plus one suffix (Races of Stone pp26-27; Dragon #281 p46)
const BUILT_SHAPE = [KIND.PREFIX, KIND.SUFFIX];
// Inferred: published given names have 4-8 letters and 2 syllables mostly, 3 often for females, 4 rarely.
// Chosen: a roll keeps a four-syllable built name with this chance so they stay rare.
const SPELLING = { minLetters: 4, maxLetters: 8, minSyllables: 2, maxSyllables: 4, longSyllables: 4, longKeep: 0.3 };
// Chosen: fewer published names of one sex than this, and repeats come up often enough to explain.
const SMALL_POOL = 100;
// Sourced: an awkward join takes one of these letters (Races of Stone p26; PHBR6 lists the consonants only).
// Chosen: only where the consonants never meet inside a published name of the lineage's pool.
const JOINING_LETTERS = ["a", "b", "d", "f", "g", "i", "k", "m", "t", "v", "z"];
const JOINING_LETTER_BASIS = "Races of Stone";
// Chosen: with Expanded Variety, the share of rolls that build a new first name; the rest stay published (dwarves reuse names, 5e PHB p16).
const BUILT_NAME_SHARE = 0.5;
// Chosen: the share of rolls with a name phrase, as drow's two-part personal names (10 of 100).
const PHRASE_SHARE = 0.1;
// Chosen: when a lineage may carry more than one phrase form, the chance of each further one.
const EXTRA_PHRASE_SHARE = 0.5;

// Sourced forms (FR11 p2; Dragon #281 p46): `connector`, the words before the part; `use`, the kind of word the part is
// (none: a first name of the lineage).
const PHRASE_FORMS = {
    // Sourced: "Than" and the father's name (Dragon #281 p46). Chosen: `parentSex` rules out only names recorded with
    // the other sex, so a unisex name or one with no recorded sex may be a father's
    than: { key: "parent", role: "parent's name", connector: () => ["Than"], parentSex: SEX.MALE },
    qualifier: { key: "qualifier", role: "personal qualifier", connector: () => [], use: "qualifier" },
    parentage: {
        key: "parent",
        role: "parent's name",
        // Sourced: females usually say "daul of" (daughter of; FR11 p2)
        connector: (sex) => [",", sex === SEX.FEMALE ? "daul of" : "son of"]
    },
    blood: { key: "ancestor", role: "ancestor's name", connector: () => [",", "blood of"] },
    // Sourced: "of" a place or kingdom, last of the forms (FR11 p2: "of the Firecaverns of the Deep Realm")
    place: { key: "place", role: "place", connector: () => [",", "of"], use: "place" }
};
// a qualifier and "Than" come before the clan, the rest after it (FR11 p2's example)
const BEFORE_CLAN = ["than", "qualifier"];
const AFTER_CLAN = ["parentage", "blood", "place"];
const STRUCTURE_CONTROLS = {
    [NAME_STRUCTURE_CONTROL.PHRASE]: { isOn: (r) => r.parts.some((p) => p.phrase) }
};

/**
 * Dwarf names (a NameGenerator, generators.js) for one lineage. Everything that differs between lineages comes from
 * `rules` (dwarfLineages.js) and the data the rule set reads; this class never asks which lineage it serves.
 * A name is one first name, a clan unless the lineage has none, and sometimes a name phrase.
 */
export class DwarfNameGenerator {
    /** @param {import("./dwarfLineages.js?v=4.3.2").LineageRules} rules */
    constructor({ names, tables, words, split, sources }, rules) {
        if (!rules) throw new Error("A dwarf generator needs its lineage description");
        this.rules = rules;
        this.given = names.filter((n) => n.type === NAME_TYPE.GIVEN);
        this.clans = names.filter((n) => n.type === NAME_TYPE.FAMILY);
        const table = tables.find((t) => t.type === NAME_TYPE.GIVEN);
        this.table = table ? readTable(table) : { prefixes: [], suffixes: [] };
        this.words = words;
        const tableTexts = tableTextsOf(this.table);
        this.split = new SplitComponents(split.given, { names: this.given, tableTexts, sources });
        this.joinRules = {
            letters: JOINING_LETTERS,
            basis: JOINING_LETTER_BASIS,
            clusters: this.split.clusters,
            keyPrefix: SLOTS,
            section: SECTION.GIVEN
        };
        this.findPublished = createPublishedLookup(this.given);
        this.weightOf = weightByLineage(rules.lineage, rules.ownWeight);
        this.recent = new RecentNames();
    }

    /** Whether the published names for this style are few enough that they repeat often. */
    hasSmallPool(style) {
        return this._givenPool(SEX_BY_STYLE[style]).length < SMALL_POOL;
    }

    generate({ style, expanded = false, locks = {}, random = Math.random } = {}) {
        const sex = SEX_BY_STYLE[style];
        this._checkLocks(sex, locks);
        return generateName(
            () => {
                const given = this._rollGiven(sex, locks, expanded, random);
                if (!given) return null;
                const clan = this.rules.hasFamily ? locks[CLAN_KEY] || this._clanPart(random) : null;
                const phrases = this._rollPhrases(locks, random);
                return phrases && this._assemble({ given, clan, phrases, sex });
            },
            this.recent,
            "a dwarf name"
        );
    }

    generatePartChange(result, key, choice) {
        return generateWithPart(result, key, choice, () => {
            const sections = sectionsOf(result);
            if (key === CLAN_KEY) return sections.clan ? this._assemble({ ...sections, clan: choice }) : null;
            if (key === GIVEN_KEY) return this._assemble({ ...sections, given: [choice] });
            if (key === PREFIX_KEY || key === SUFFIX_KEY) {
                const spell = (parts) => this._spell(parts, keepsEveryLength);
                const built = generateComponentChange(sections.given, key, choice, this.joinRules, spell);
                return built && this._assemble({ ...sections, given: built.parts });
            }
            const phrases = sections.phrases.map((p) => (p.key === key ? { ...choice, phrase: p.phrase } : p));
            return this._assemble({ ...sections, phrases });
        });
    }

    optionsFor(result, key) {
        return filterPartOptions(this, result, key, this._candidatesFor(result, key));
    }

    getStructureControls(result, locked = new Set(), options = {}) {
        return getAvailableControls(STRUCTURE_CONTROLS, result, this, locked, options);
    }

    // the phrase control adds a phrase or takes it away; a locked phrase part keeps it
    generateStructureChange(result, control, { locked = new Set(), random = Math.random } = {}) {
        if (!(control in STRUCTURE_CONTROLS)) return null;
        const sections = sectionsOf(result);
        if (sections.phrases.length) {
            const kept = sections.phrases.filter((p) => locked.has(p.key));
            return kept.length ? null : this._assemble({ ...sections, phrases: kept });
        }
        const phrases = this._drawPhrases(random);
        return phrases.length ? this._assemble({ ...sections, phrases }) : null;
    }

    _checkLocks(sex, locks) {
        if (!this.rules.sexes.includes(sex)) {
            throw new Error("No published names of this lineage fit that gender. Choose female or male.");
        }
        if (locks[CLAN_KEY] && !this.rules.hasFamily)
            throw new Error("This lineage has no clan names. Unlock the clan.");
        const forms = new Set(this.rules.phrases.map((p) => p.form));
        if (lockedPhrases(locks).some((part) => !forms.has(part.phrase)))
            throw new Error("This lineage does not use that name phrase. Unlock it.");
        const slot = [locks[PREFIX_KEY], locks[SUFFIX_KEY]].find((p) => p && !p.method && !this.table.prefixes.length);
        if (slot) throw new Error("This lineage has no name table. Unlock the part.");
    }

    _rollGiven(sex, locks, expanded, random) {
        if (locks[GIVEN_KEY]) return [locks[GIVEN_KEY]];
        const keepsSlot = locks[PREFIX_KEY] || locks[SUFFIX_KEY];
        if (keepsSlot || (expanded && random() < BUILT_NAME_SHARE)) {
            const built = this._build(sex, locks, expanded, random);
            if (built || keepsSlot) return built;
        }
        const pool = this._givenPool(sex);
        return pool.length ? [publishedGiven(selectWeighted(pool, this.weightOf, random))] : null;
    }

    // Chosen: a female or male name draws names recorded with that sex or with both.
    _givenPool(sex) {
        return this.given.filter((n) => n.sex === sex || n.sex === UNISEX);
    }

    _clanPart(random) {
        return this.clans.length ? publishedClan(selectWeighted(this.clans, this.weightOf, random)) : null;
    }

    _build(sex, locks, expanded, random) {
        const components = BUILT_SHAPE.map((slot, index) => {
            const key = slotKey(SLOTS, index);
            if (locks[key]) return locks[key];
            const entries = this._entriesFor(slot, sex);
            const canSplit = expanded && this.split.isAvailable && this._splitFor(slot, sex).length;
            if (canSplit && (!entries.length || takesSplitComponent(random))) {
                return slotPart(selectRandom(this._splitFor(slot, sex), random), key, slot, GIVEN_SLOT);
            }
            if (!entries.length) return null;
            const entry = selectRandom(entries, random);
            // Sourced: alternate spellings in one row are the same part (Races of Stone pp26-27); one is picked at random
            return tablePart(entry, selectRandom(formsFor(entry, sex), random), key, slot, GIVEN_SLOT);
        });
        if (components.includes(null)) return null;
        const spell = (parts) => this._spell(parts, keepsLengthOnRoll(SPELLING, random));
        const built = generateJoined(components, this.joinRules, (letters) => shuffle(letters, random), spell);
        return built && built.parts;
    }

    _splitFor(slot, sex) {
        return this.split.hasComponentsFor(slot, sex) ? this.split.componentsFor(slot, sex) : [];
    }

    // Sourced: the suffix gives the sex (Races of Stone Tables 1-2, 1-3); the gray dwarf table prints none, so every
    // suffix serves both (Dragon #281 p46)
    _entriesFor(slot, sex) {
        return filterEntriesFor(slot === KIND.PREFIX ? this.table.prefixes : this.table.suffixes, sex);
    }

    _spell(parts, keepsLength) {
        const text = parts.map((p) => p.text).join("");
        const isAcceptable =
            !text.includes("'") && !hasTripleLetter(text) && validateSpelling(text, SPELLING) && keepsLength(text);
        return isAcceptable ? text : null;
    }

    _rollPhrases(locks, random) {
        const kept = lockedPhrases(locks);
        if (kept.length) return kept;
        if (random() >= PHRASE_SHARE) return [];
        return this._drawPhrases(random);
    }

    _drawPhrases(random) {
        let available = this.rules.phrases.filter(({ form }) => this._phraseOptions(form).length);
        const drawn = [];
        while (available.length && drawn.length < this.rules.phraseCount) {
            if (drawn.length && random() >= EXTRA_PHRASE_SHARE) break;
            const { form } = selectWeighted(available, (p) => p.weight, random);
            // a form shares its own key, so this also drops the form drawn
            available = available.filter((p) => PHRASE_FORMS[p.form].key !== PHRASE_FORMS[form].key);
            drawn.push({ ...selectRandom(this._phraseOptions(form), random), phrase: form });
        }
        return drawn;
    }

    // the whole parts a phrase form can carry: words of its use, or for a parent or ancestor a first name of the
    // lineage. Chosen: the parent may bear the bearer's own name, as dwarves reuse names (5e PHB p16).
    _phraseOptions(form) {
        const spec = PHRASE_FORMS[form];
        const entries = spec.use
            ? this.words.filter((w) => w.use === spec.use)
            : this.given.filter((n) => !spec.parentSex || !n.sex || n.sex === UNISEX || n.sex === spec.parentSex);
        return entries.map((entry) => phrasePart(entry, spec));
    }

    _candidatesFor(result, key) {
        if (key === GIVEN_KEY) return this._givenPool(result.sex).map(publishedGiven);
        if (key === CLAN_KEY) return this.clans.map(publishedClan);
        const part = result.parts.find((p) => p.key === key);
        if (part?.phrase) return this._phraseOptions(part.phrase).map((p) => ({ ...p, phrase: part.phrase }));
        if (part?.kind !== KIND.PREFIX && part?.kind !== KIND.SUFFIX) return [];
        const options = this._entriesFor(part.kind, result.sex).flatMap((entry) =>
            formsFor(entry, result.sex).map((form) => tablePart(entry, form, key, part.kind, GIVEN_SLOT))
        );
        if (part.method === METHOD.SPLIT)
            options.push(...this._splitFor(part.kind, result.sex).map((c) => slotPart(c, key, part.kind, GIVEN_SLOT)));
        return options;
    }

    // first name, "Than" and a qualifier, clan, then the phrases after the clan (FR11 p2's order)
    _assemble({ given, clan, phrases, sex }) {
        const phraseOf = (forms) => forms.flatMap((form) => phrases.filter((p) => p.phrase === form));
        const parts = [...given];
        // punctuation sticks to the word before it; every other word, and the part, follows a space
        const add = (part, connector) => {
            for (const word of connector) {
                if (/\w/.test(word)) parts.push(structurePart(" ", parts.length));
                parts.push(connectorPart(word, parts.length));
            }
            parts.push(structurePart(" ", parts.length), part);
        };
        for (const part of phraseOf(BEFORE_CLAN)) add(part, PHRASE_FORMS[part.phrase].connector(sex));
        if (clan) parts.push(structurePart(" ", parts.length), clan);
        for (const part of phraseOf(AFTER_CLAN)) add(part, PHRASE_FORMS[part.phrase].connector(sex));
        const givenText = formatSectionText(given);
        const isBuilt = given[0].key !== GIVEN_KEY;
        const name =
            givenText +
            parts
                .slice(given.length)
                .map((p) => p.text)
                .join("");
        return {
            name,
            sex,
            subrace: this.rules.lineage,
            ...(isBuilt ? { shape: BUILT_SHAPE } : {}),
            parts,
            ...(isBuilt ? this.findPublished(givenText) : {})
        };
    }
}

// the locks also carry the result's `shape` and `sex`, which are not parts and have no phrase
const lockedPhrases = (locks) => Object.values(locks).filter((part) => part.phrase);

function sectionsOf(result) {
    const given = result.parts.filter((p) => p.section === SECTION.GIVEN && p.role !== "space");
    const clan = result.parts.find((p) => p.key === CLAN_KEY) || null;
    const phrases = result.parts.filter((p) => p.phrase);
    return { given, clan, phrases, sex: result.sex };
}

const publishedGiven = (n) => ({ ...publishedPart(n, GIVEN_KEY, "first name", SECTION.GIVEN), form: n.form });
const publishedClan = (c) => ({ ...publishedPart(c, CLAN_KEY, "clan name", SECTION.FAMILY), form: c.form });
// Chosen: a qualifier or a place shows no "Meaning unknown": a qualifier is English ("the Grim"), and a place is named,
// not translated; `form: "common"` is what tells the page so
const phrasePart = (entry, spec) => ({
    ...publishedPart(entry, spec.key, spec.role, SECTION.PHRASE),
    ...(spec.use ? { form: "common" } : {})
});
// the wording joining a phrase to the name, as a joint (it has no lock and no picker)
const connectorPart = (text, index) => ({
    key: `p${index}`,
    role: "phrase word",
    text,
    section: SECTION.PHRASE,
    kind: KIND.JOINT
});
