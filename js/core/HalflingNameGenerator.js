export class HalflingNameGenerator {
    constructor(personalNames = [], familyNames = [], nicknames = []) {
        this.personalNames = Array.isArray(personalNames) ? personalNames : [];
        this.familyNames = Array.isArray(familyNames) ? familyNames : [];
        this.nicknames = Array.isArray(nicknames) ? nicknames : [];
    }

    generate(options = {}) {
        const {
            subrace = 'lightfoot',
            nameType = 'full',
            gender = 'neutral'
        } = options;

        const includeNickname = nameType === 'full' || nameType === 'full_with_nickname';
        const personal = this._generatePersonalName(subrace, gender);
        const family = this._generateFamilyName(subrace);
        let nickname = includeNickname ? this._generateNickname() : null;

        let name = '';
        let meaning = '';
        const breakdown = {};

        if (nameType === 'personal') {
            name = personal.text;
            meaning = personal.meaning || personal.text;
            breakdown.personal = personal;
        } else if (nameType === 'family') {
            name = family.text;
            meaning = family.meaning || family.text;
            breakdown.family = family;
        } else if (nameType === 'nickname') {
            if (!nickname) {
                nickname = this._generateNickname();
            }
            if (!nickname) {
                throw new Error('No nicknames available for generation');
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
            if (!item.gender || item.gender === 'any' || item.gender === 'neutral') return true;
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

        const pick = this._randomElement(pool);
        const text = pick.prefix_text || pick.text || pick.root;
        return {
            text,
            meaning: pick.prefix_meaning || pick.meaning || text,
            phonetic: pick.prefix_phonetic || pick.phonetic || text
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
            meaning: pick.meaning || text,
            phonetic: pick.phonetic || text
        };
    }

    _generateNickname() {
        if (!this.nicknames.length) return null;
        const pick = this._randomElement(this.nicknames);
        return {
            text: pick.text,
            meaning: pick.meaning || pick.text,
            phonetic: pick.phonetic || pick.text
        };
    }

    _randomElement(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }
}
