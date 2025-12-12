export class HalflingNameGenerator {
    constructor(personalNames = [], familyNames = [], nicknames = []) {
        this.personalNames = Array.isArray(personalNames) ? personalNames : [];
        this.familyNames = Array.isArray(familyNames) ? familyNames : [];
        this.nicknames = Array.isArray(nicknames) ? nicknames : [];
    }

    generate(options = {}) {
        const { subrace = "lightfoot", nameType = "full", gender = "neutral" } = options;

        const includeNickname = nameType === "full" || nameType === "full_with_nickname";
        const personal = this._generatePersonalName(subrace, gender);
        const family = this._generateFamilyName(subrace);
        let nickname = includeNickname ? this._generateNickname() : null;

        let name = "";
        let meaning = "";
        const breakdown = {};

        if (nameType === "personal") {
            name = personal.text;
            meaning = personal.meaning || personal.text;
            breakdown.personal = personal;
        } else if (nameType === "family") {
            name = family.text;
            meaning = family.meaning || family.text;
            breakdown.family = family;
        } else if (nameType === "nickname") {
            if (!nickname) {
                nickname = this._generateNickname();
            }
            if (!nickname) {
                throw new Error("No nicknames available for generation");
            }
            name = `"${nickname.text}"`;
            meaning = nickname.meaning || nickname.text;
            breakdown.nickname = nickname;
        } else {
            name = `${personal.text} ${family.text}`;
            breakdown.personal = personal;
            breakdown.family = family;
            meaning = `${personal.meaning || personal.text} + ${family.meaning || family.text}`;

            if (nickname) {
                name = `${name} "${nickname.text}"`;
                meaning = `${meaning} + ${nickname.meaning || nickname.text}`;
                breakdown.nickname = nickname;
            }
        }

        return {
            name,
            meaning,
            breakdown
        };
    }

    _filterBySubrace(items, subrace) {
        if (!Array.isArray(items)) return [];
        const filtered = items.filter((item) => {
            if (!item.subrace) return true;
            return item.subrace.includes(subrace);
        });
        return filtered.length > 0 ? filtered : items;
    }

    _filterByGender(items, gender) {
        if (!Array.isArray(items)) return [];
        const filtered = items.filter((item) => {
            if (!item.gender || item.gender === "any" || item.gender === "neutral") return true;
            return item.gender === gender;
        });
        return filtered.length > 0 ? filtered : items;
    }

    _generatePersonalName(subrace, gender) {
        let pool = this._filterBySubrace(this.personalNames, subrace);
        pool = this._filterByGender(pool, gender);

        if (!pool.length) {
            pool = this.personalNames;
        }

        // Combine components like GnomishNameGenerator does
        const prefixPool = pool.filter((p) => p.can_be_prefix !== false && (p.prefix_text || p.text || p.root));
        const suffixPool = pool.filter((p) => p.can_be_suffix && (p.suffix_text || p.text || p.root));

        const prefix = this._randomElement(prefixPool.length ? prefixPool : pool);
        const suffix = this._randomElement(suffixPool.length ? suffixPool : pool);

        const parts = [];
        const meaningParts = [];

        // Check if both are complete names (prefix_text === suffix_text for both)
        const prefixIsComplete =
            prefix &&
            prefix.prefix_text &&
            prefix.suffix_text &&
            prefix.prefix_text.toLowerCase() === prefix.suffix_text.toLowerCase();
        const suffixIsComplete =
            suffix &&
            suffix.prefix_text &&
            suffix.suffix_text &&
            suffix.prefix_text.toLowerCase() === suffix.suffix_text.toLowerCase();

        if (prefix) {
            const prefixText = prefix.prefix_text || prefix.text || prefix.root;
            parts.push(prefixText);
            if (prefix.prefix_meaning || prefix.meaning) {
                meaningParts.push(prefix.prefix_meaning || prefix.meaning);
            }
        }
        if (suffix && suffix !== prefix) {
            // If both are complete names, only use one to avoid overly long names
            if (prefixIsComplete && suffixIsComplete) {
                // Use just the prefix (complete name), don't combine
                // Already added prefix above, so skip suffix
            } else {
                // Get suffix text - prefer suffix_text, fall back to text/root
                const suffixText = suffix.suffix_text || suffix.text || suffix.root;
                // Only add if different from prefix text
                if (suffixText && suffixText !== parts[0]) {
                    parts.push(suffixText);
                    if (suffix.suffix_meaning || suffix.meaning) {
                        meaningParts.push(suffix.suffix_meaning || suffix.meaning);
                    }
                }
            }
        }

        const text = parts.join("");

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
            text,
            meaning: combinedMeaning || text
        };
    }

    _generateFamilyName(subrace) {
        let pool = this._filterBySubrace(this.familyNames, subrace);

        if (!pool.length) {
            pool = this.familyNames;
        }

        const pick = this._randomElement(pool);
        const text = pick.text || pick.root;
        return {
            text,
            meaning: pick.meaning || text
        };
    }

    _generateNickname() {
        if (!this.nicknames.length) return null;
        const pick = this._randomElement(this.nicknames);
        return {
            text: pick.text,
            meaning: pick.meaning || pick.text
        };
    }

    _randomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
