// Name results as generators return them, built by hand so each test shows only the parts it is about.
export const book = (title, authority = "official") => ({ title, authority });
// a part in its place: its section and its kind, which the page reads instead of the key or role
const placed = (section, kind) => ({ section, kind });
export const split = (key, role, text, section = "given", sources = []) => ({
    key,
    role,
    text,
    method: "split",
    from: ["Alarra"],
    sources,
    ...placed(section, role.split(" ").at(-1))
});
export const published = (text, sources, more = {}) => ({
    key: "family",
    role: "family name",
    text,
    method: "published",
    sources,
    ...placed("family", "whole"),
    ...more
});
export const elf = {
    name: "Alra Starym",
    sex: "neutral",
    subrace: "sun-elf",
    parts: [
        split("t0", "prefix", "al", "given", [book("Cormanthyr")]),
        { ...split("t1", "suffix", "ra"), from: ["Amra"] },
        published("Starym", [book("Cormanthyr")])
    ]
};
export const meaning = (key, role, text, value, section = "given") => ({
    key,
    role,
    text,
    meaning: value,
    ...placed(section, role.split(" ").at(-1))
});
export const joint = (key, role, text, section = "given") => ({ key, role, text, ...placed(section, "joint") });
export const drow = {
    name: "Vic'ril Quarlin Baenre",
    sex: "neutral",
    subrace: "drow",
    parts: [
        meaning("f0", "prefix", "vic", "Dagger, knife"),
        joint("s1", "apostrophe", "'"),
        meaning("f2", "suffix", "ril", "Bandit"),
        joint("s3", "space", " "),
        meaning("f4", "prefix", "quar", "Aged"),
        meaning("f5", "suffix", "lin", "Shadow"),
        meaning("n0", "house prefix", "baen", "Blessed by", "family"),
        { ...meaning("n1", "house suffix", "re", "Fell powers", "family"), wordMeaning: "Blessed by fell powers" }
    ]
};
export const DRAGON_267 = [book("Dragon #267")];

export const withFamily = (part, name = elf.name) => ({ ...elf, name, parts: [...elf.parts.slice(0, 2), part] });
/** A built family name joined by a joining letter whose rule cites Dragon #251. */
export const joinedSurname = {
    name: "Lamath Kerelar",
    sex: "neutral",
    subrace: "high-elf",
    parts: [
        meaning("t0", "prefix", "lam", "Song"),
        meaning("t1", "suffix", "ath", "Star"),
        meaning("n0", "family prefix", "ker", "Wolf", "family"),
        { ...joint("nj1", "joining letter", "e", "family"), basis: "Dragon #251" },
        meaning("n1", "family suffix", "lar", "Storm", "family")
    ]
};
const lore = book("Lost Empires of Faerun");
const word = (text, names, sources) => ({ text, names, sources });
export const STARGAZE_WORDS = [
    word("Star", ["Starbrow", "Starfall"], [lore, book("Cormanthyr")]),
    word("gaze", ["Moongaze"], [lore])
];
/** A Common-form family name; `more` gives its words and where they come from. */
export const stargaze = (more) => ({
    key: "family",
    role: "family name",
    text: "Stargaze",
    method: "composed",
    words: [{ text: "Star" }, { text: "gaze" }],
    ...placed("family", "whole"),
    ...more
});
/** A published family name with its translation from the Player's Handbook; `sources` are its books. */
export const galanodel = (sources) => ({
    ...elf.parts[2],
    text: "Galanodel",
    sources,
    meaning: "Moonwhisper",
    meaningSource: "Player's Handbook (5e)"
});
