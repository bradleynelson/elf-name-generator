export class OrcNameGenerator {
    constructor(personalNames = [], clanNames = [], epithets = []) {
        this.personalNames = Array.isArray(personalNames) ? personalNames : [];
        // clanNames retained for potential tribe/warband references, but not used in formal name now
        this.clanNames = Array.isArray(clanNames) ? clanNames : [];
        this.epithets = Array.isArray(epithets) ? epithets : [];
    }

    generate(options = {}) {
        const {
            // subrace/gender kept for compatibility but ignored (shared pool)
            nameType = 'full'
        } = options;

        const includeEpithet = nameType === 'full' || nameType === 'full-with-epithet';
        const personal = this._generatePersonal();
        const epithet = includeEpithet ? this._generateEpithet() : null;
        const formattedEpithetText = epithet ? this._formatEpithetText(epithet.text) : null;

        let name = '';
        let meaning = '';
        const breakdown = {};

        if (nameType === 'personal') {
            name = personal.text;
            meaning = personal.meaning || personal.text;
            breakdown.personal = personal;
        } else if (nameType === 'epithet') {
            if (!epithet) throw new Error('No epithets available');
            name = formattedEpithetText;
            meaning = epithet.meaning || epithet.text;
            breakdown.epithet = { ...epithet, displayText: formattedEpithetText };
        } else {
            name = personal.text;
            meaning = personal.meaning || personal.text;
            breakdown.personal = personal;
            if (epithet) {
                name = `${name} ${formattedEpithetText}`;
                meaning = `${meaning} + ${epithet.meaning || epithet.text}`;
                breakdown.epithet = { ...epithet, displayText: formattedEpithetText };
            }
        }

        return { name, meaning, breakdown };
    }

    _filterBySubrace(items) {
        if (!Array.isArray(items)) return [];
        return items;
    }

    _generatePersonal() {
        let pool = this._filterBySubrace(this.personalNames);
        if (!pool.length) pool = this.personalNames;
        const pick = this._randomElement(pool);
        const text = pick.text || pick.root;
        return { text, meaning: pick.meaning || text, phonetic: pick.phonetic || text, gender: pick.gender };
    }

    _generateEpithet() {
        if (!this.epithets.length) return null;
        const pick = this._randomElement(this.epithets);
        return { text: pick.text, meaning: pick.meaning || pick.text, phonetic: pick.phonetic || pick.text };
    }

    _formatEpithetText(text) {
        if (!text) return text;
        const lower = text.toLowerCase();
        if (lower.startsWith('the ')) return text;
        return `the ${text}`;
    }

    _randomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
