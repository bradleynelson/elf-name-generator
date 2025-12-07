// Gnomish Name Generator following Forgotten Realms Gnim conventions
export class GnomishNameGenerator {
    constructor(personalNames, clanNames, nicknames) {
        this.personalNames = personalNames || [];
        this.clanNames = clanNames || [];
        this.nicknames = nicknames || [];
    }

    generate(options = {}) {
        const {
            subrace = 'rock',
            nameType = 'full',
            gender = 'neutral',
            includeNickname = true
        } = options;

        if (nameType === 'personal') {
            return this._generatePersonalName(gender, subrace);
        }
        if (nameType === 'clan') {
            return this._generateClanName(subrace);
        }
        if (nameType === 'nickname') {
            return this._generateNicknameOnly();
        }

        // full name: Personal "Nickname" Clan
        const personal = this._generatePersonalName(gender, subrace);
        const clan = this._generateClanName(subrace);
        const nickname = includeNickname ? this._generateNickname() : null;

        const name = nickname
            ? `${personal.name} "${nickname.text}" ${clan.name}`
            : `${personal.name} ${clan.name}`;
        const meaning = nickname
            ? `${personal.meaning} + "${nickname.meaning}" + ${clan.meaning}`
            : `${personal.meaning} + ${clan.meaning}`;
        const pronunciation = [personal.pronunciation, nickname?.phonetic, clan.phonetic]
            .filter(Boolean)
            .join(' · ');

        return {
            name,
            meaning,
            pronunciation,
            generatorType: 'gnomish',
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
            if (item.gender === 'neutral') return true;
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
        if (suffix) {
            parts.push(suffix.suffix_text || suffix.root);
            if (suffix.suffix_meaning) meaningParts.push(suffix.suffix_meaning);
            if (suffix.suffix_phonetic) phonParts.push(suffix.suffix_phonetic);
        }

        const name = parts.join('');
        return {
            name,
            meaning: meaningParts.join(', '),
            pronunciation: phonParts.join(' ')
        };
    }

    _generateClanName(subrace) {
        let pool = this._filterBySubrace(this.clanNames, subrace);
        if (!pool.length) pool = this.clanNames;
        
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
            if (prefix.phonetic) phonParts.push(prefix.phonetic);
        }
        if (suffix) {
            parts.push(suffix.suffix_text || suffix.root);
            if (suffix.suffix_meaning) meaningParts.push(suffix.suffix_meaning);
            if (suffix.phonetic) phonParts.push(suffix.phonetic);
        }

        return {
            name: parts.join(''),
            meaning: meaningParts.join(', '),
            phonetic: phonParts.join(' ')
        };
    }

    _generateNickname() {
        if (!this.nicknames || !this.nicknames.length) {
            return null;
        }
        return this._randomElement(this.nicknames);
    }

    _generateNicknameOnly() {
        const nickname = this._generateNickname() || { text: '', meaning: '', phonetic: '' };
        return {
            name: `"${nickname.text}"`,
            meaning: nickname.meaning,
            pronunciation: nickname.phonetic
        };
    }

    _randomElement(arr) {
        if (!arr || arr.length === 0) {
            throw new Error('No components available for generation');
        }
        const idx = Math.floor(Math.random() * arr.length);
        return arr[idx];
    }
}
