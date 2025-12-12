// Gnomish Name Generator following Forgotten Realms Gnim conventions
export class GnomishNameGenerator {
    constructor(personalNames, clanNames, nicknames) {
        this.personalNames = personalNames || [];
        this.clanNames = clanNames || [];
        this.nicknames = nicknames || [];
    }

    generate(options = {}) {
        const { subrace = "rock", nameType = "full", gender = "neutral", includeNickname = true } = options;

        if (nameType === "personal") {
            return this._generatePersonalName(gender, subrace);
        }
        if (nameType === "clan") {
            return this._generateClanName(subrace);
        }
        if (nameType === "nickname") {
            return this._generateNicknameOnly();
        }

        // full name: Personal "Nickname" Clan
        const personal = this._generatePersonalName(gender, subrace);
        const clan = this._generateClanName(subrace);
        const nickname = includeNickname ? this._generateNickname() : null;

        const name = nickname ? `${personal.name} "${nickname.text}" ${clan.name}` : `${personal.name} ${clan.name}`;
        const meaning = nickname
            ? `${personal.meaning} + "${nickname.meaning}" + ${clan.meaning}`
            : `${personal.meaning} + ${clan.meaning}`;
        const pronunciation = [personal.pronunciation, nickname?.phonetic, clan.phonetic].filter(Boolean).join(" · ");

        return {
            name,
            meaning,
            pronunciation,
            generatorType: "gnomish",
            breakdown: {
                personal,
                nickname,
                clan
            }
        };
    }

    _filterBySubrace(items, subrace) {
        return items.filter((item) => {
            if (!item.subrace) return true;
            return item.subrace.includes(subrace);
        });
    }

    _filterByGender(items, gender) {
        return items.filter((item) => {
            if (!item.gender) return true;
            if (item.gender === "neutral") return true;
            return item.gender === gender;
        });
    }

    _generatePersonalName(gender, subrace) {
        let pool = this._filterByGender(this._filterBySubrace(this.personalNames, subrace), gender);
        if (!pool.length) pool = this._filterByGender(this.personalNames, gender);
        if (!pool.length) pool = this.personalNames;

        const prefixPool = pool.filter((p) => p.can_be_prefix !== false);
        const suffixPool = pool.filter((p) => p.can_be_suffix);
        const prefix = this._randomElement(prefixPool.length ? prefixPool : pool);
        const suffix = this._randomElement(suffixPool.length ? suffixPool : pool);
        const parts = [];
        const meaningParts = [];
        const phonParts = [];

        if (prefix) {
            parts.push(prefix.prefix_text || prefix.root);
            if (prefix.prefix_meaning) meaningParts.push(prefix.prefix_meaning);
            if (prefix.prefix_phonetic) phonParts.push(prefix.prefix_phonetic);
        }
        if (suffix && suffix !== prefix) {
            // Check if both are complete names (prefix_text === suffix_text for both)
            const prefixIsComplete =
                prefix &&
                prefix.prefix_text &&
                prefix.suffix_text &&
                prefix.prefix_text.toLowerCase() === prefix.suffix_text.toLowerCase();
            const suffixIsComplete =
                suffix.prefix_text &&
                suffix.suffix_text &&
                suffix.prefix_text.toLowerCase() === suffix.suffix_text.toLowerCase();

            // If both are complete names, only use one to avoid overly long names
            if (prefixIsComplete && suffixIsComplete) {
                // Use just the prefix (complete name), don't combine
                // Already added prefix above, so skip suffix
            } else {
                // Normal combination
                parts.push(suffix.suffix_text || suffix.root);
                if (suffix.suffix_meaning) meaningParts.push(suffix.suffix_meaning);
                if (suffix.suffix_phonetic) phonParts.push(suffix.suffix_phonetic);
            }
        }

        const name = parts.join("");

        // Deduplicate identical meanings first
        const uniqueMeanings = [];
        const seenMeanings = new Set();
        for (const meaning of meaningParts) {
            if (meaning && !seenMeanings.has(meaning)) {
                uniqueMeanings.push(meaning);
                seenMeanings.add(meaning);
            }
        }

        // Combine meanings, but if both have "name from" pattern, combine sources properly
        let combinedMeaning = uniqueMeanings.join(", ");

        // Check if we have duplicate "name from" patterns that should be combined
        // Extract all sources from "Race name from Source" patterns
        const sources = new Set();
        let raceName = "";

        // Find all "Race name from Source" patterns - match everything until next "name from" or end
        const pattern =
            /(Halfling|Gnome) name from\s+((?:(?!\s+(?:Halfling|Gnome) name from).)+?)(?:\s*,\s*|\s*$|(?:\s+(?:Halfling|Gnome) name from))/gi;
        let match;
        while ((match = pattern.exec(combinedMeaning)) !== null) {
            raceName = match[1] || raceName;
            let source = match[2].trim();
            // Clean up - remove trailing commas, "and", etc.
            source = source
                .replace(/,\s*$/, "")
                .replace(/\s+and\s*$/, "")
                .trim();
            // Only add if it's a real source (more than 2 chars to avoid "M" or "V")
            if (source.length > 2) {
                sources.add(source);
            }
        }

        // If we found multiple sources, combine them properly
        if (sources.size > 1) {
            const sourceList = Array.from(sources);
            if (sourceList.length === 2) {
                combinedMeaning = `${raceName} name from ${sourceList[0]} and ${sourceList[1]}`;
            } else {
                combinedMeaning = `${raceName} name from ${sourceList.slice(0, -1).join(", ")}, and ${sourceList[sourceList.length - 1]}`;
            }
        } else if (sources.size === 1) {
            // Single source, just use it once
            combinedMeaning = `${raceName} name from ${Array.from(sources)[0]}`;
        }

        return {
            name,
            meaning: combinedMeaning,
            pronunciation: phonParts.join(" ")
        };
    }

    _generateClanName(subrace) {
        let pool = this._filterBySubrace(this.clanNames, subrace);
        if (!pool.length) pool = this.clanNames;

        // For clan names, use a single component (not combined)
        // Many clan names are already complete (like "Tinkertop", "Cogwhistle")
        // Pick either a prefix-only, suffix-only, or complete component
        const prefixOnly = pool.filter((p) => p.can_be_prefix && !p.can_be_suffix);
        const suffixOnly = pool.filter((p) => p.can_be_suffix && !p.can_be_prefix);
        const complete = pool.filter((p) => p.can_be_prefix && p.can_be_suffix);

        // Prefer complete names, then prefix-only, then suffix-only, then any
        let selected = null;
        if (complete.length > 0 && Math.random() < 0.5) {
            selected = this._randomElement(complete);
        } else if (prefixOnly.length > 0 && Math.random() < 0.5) {
            selected = this._randomElement(prefixOnly);
        } else if (suffixOnly.length > 0) {
            selected = this._randomElement(suffixOnly);
        } else {
            selected = this._randomElement(pool);
        }

        // Use the component as a complete name
        // Capitalize the first letter for clan names
        let name = selected.prefix_text || selected.suffix_text || selected.text || selected.root;
        if (name && name.length > 0) {
            // Capitalize first letter if it's lowercase
            name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        const meaning = selected.prefix_meaning || selected.suffix_meaning || selected.meaning || name;
        const phonetic =
            selected.phonetic || selected.prefix_phonetic || selected.suffix_phonetic || name.toUpperCase();

        return {
            name,
            meaning,
            phonetic
        };
    }

    _generateNickname() {
        if (!this.nicknames || !this.nicknames.length) {
            return null;
        }
        return this._randomElement(this.nicknames);
    }

    _generateNicknameOnly() {
        const nickname = this._generateNickname() || { text: "", meaning: "", phonetic: "" };
        return {
            name: `"${nickname.text}"`,
            meaning: nickname.meaning,
            pronunciation: nickname.phonetic
        };
    }

    _randomElement(arr) {
        if (!arr || arr.length === 0) {
            throw new Error("No components available for generation");
        }
        const idx = Math.floor(Math.random() * arr.length);
        return arr[idx];
    }
}
