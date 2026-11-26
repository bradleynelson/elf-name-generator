export const savedBy415 = {
    name: "Alra Elerae Starym",
    sex: "neutral",
    subrace: "sun-elf",
    published: { source: { title: "Cormanthyr", file: "Cormanthyr.pdf", pdfPages: [3], scope: "fr" } },
    tables: 'Races of the Wild (3.5e), first published in Dragon #251 (1998), "By Any Other Name"',
    parts: [
        { key: "t0", role: "prefix", text: "al", method: "split", from: ["Alarra"], books: ["Cormanthyr", "FRCS"] },
        { key: "tj1", role: "joining letter", text: "r" },
        { key: "t2", role: "suffix", text: "a", meaning: "Gift" },
        { key: "s3", role: "space", text: " " },
        {
            key: "family",
            role: "family name",
            text: "Starym",
            method: "published",
            source: { title: "forum answer by Ed Greenwood, the Realms' creator", file: "Part 9.pdf", creator: true }
        }
    ]
};
export const drowSavedBy415 = {
    name: "Vic Baenre",
    sex: "male",
    subrace: "drow",
    tables: "By Any Other Name: The Drow (Dragon #267)",
    parts: [
        { key: "f0", role: "prefix", text: "vic", meaning: "Death" },
        { key: "n0", role: "house prefix", text: "baen", meaning: "Blood of the" },
        { key: "n1", role: "house suffix", text: "re", meaning: "Ways", wordMeaning: "Blood of the ways" }
    ]
};
// rolled by the 4.2.0 release code (moon elf, Expanded Variety; drow with a built house)
export const savedBy420 = {
    name: "Jylephra Silverleaf",
    sex: "female",
    subrace: "moon-elf",
    shape: ["prefix", "suffix"],
    parts: [
        {
            text: "jy",
            from: ["Jyriel"],
            sources: [{ title: "Player's Option: Heroes of Shadow (4e)", authority: "official" }],
            method: "split",
            key: "t0",
            role: "prefix",
            section: "given",
            kind: "prefix"
        },
        {
            text: "lephra",
            from: ["Selephra"],
            sources: [{ title: "Dungeon #185", authority: "official" }],
            method: "split",
            key: "t1",
            role: "suffix",
            section: "given",
            kind: "suffix"
        },
        {
            key: "family",
            role: "family name",
            section: "family",
            kind: "whole",
            text: "Silverleaf",
            method: "composed",
            words: ["Silver", "leaf"],
            wordNames: [
                [
                    "Silverdawn",
                    "Silverfrond",
                    "Silverkin",
                    "Silverlock",
                    "Silveroak",
                    "Silversong",
                    "Silverspear",
                    "Silversun",
                    "Silversword",
                    "Silverthorn",
                    "Silverthorne",
                    "Silvertome",
                    "Silvertree"
                ],
                ["Ebonleaf", "Firstleaf", "Greenleaf", "Lightleaf", "Sunleaf"]
            ],
            wordSources: [
                [
                    { title: "Cormanthyr: Empire of the Elves (2e)", authority: "official" },
                    { title: "D&D Next Playtest", authority: "official" },
                    { title: "Elves of Evermeet (2e)", authority: "official" },
                    { title: "Dungeon #206", authority: "official" },
                    { title: "The Lost Adventures, Volume 3 (1e)", authority: "official" },
                    { title: "Swarm of Chaos (4e)", authority: "official" },
                    { title: "Candlekeep Mysteries (5e)", authority: "official" },
                    { title: "Empires of the Shining Sea (2e)", authority: "official" },
                    { title: "Night Watch in the Living City (2e)", authority: "official" },
                    { title: "Dragotha's Lair (2e)", authority: "official" },
                    { title: "Drums of the Dead (5e)", authority: "official" },
                    { title: "Tower of Maraj (4e)", authority: "official" },
                    { title: "Forum answer by Ed Greenwood (Realms creator)", authority: "creator" }
                ],
                [
                    { title: "Lost Tales of Myth Drannor (5e)", authority: "official" },
                    { title: "Swarm of Chaos (4e)", authority: "official" },
                    { title: "Candlekeep Mysteries (5e)", authority: "official" },
                    { title: "Complete Warrior (3.5e)", authority: "official" },
                    { title: "Dungeon #48", authority: "official" }
                ]
            ]
        }
    ]
};
export const drowSavedBy420 = {
    name: "Mers-slistvin Baenghym",
    sex: "male",
    subrace: "drow",
    shape: ["prefix", "suffix", "suffix"],
    parts: [
        {
            text: "mers-s",
            from: ["Mers-svi-yes"],
            sources: [{ title: "Boltsmelter's Book (5e)", authority: "official" }],
            method: "split",
            key: "f0",
            role: "prefix",
            section: "given",
            kind: "prefix"
        },
        {
            text: "list",
            from: ["Karelist"],
            sources: [{ title: "Menzoberranzan (2e)", authority: "official" }],
            method: "split",
            key: "f1",
            role: "suffix",
            section: "given",
            kind: "suffix"
        },
        {
            text: "vin",
            from: ["Chilvin", "Drivvin"],
            sources: [
                { title: "Waterdeep: Dungeon of the Mad Mage (5e)", authority: "official" },
                { title: "Lair Assault: Kill the Wizard (4e)", authority: "official" }
            ],
            method: "split",
            key: "f2",
            role: "suffix",
            section: "given",
            kind: "suffix"
        },
        {
            key: "n0",
            role: "house prefix",
            text: "baen",
            meaning: "Blessed by",
            sources: [{ title: "Dragon #267", authority: "official" }],
            section: "family",
            kind: "prefix"
        },
        {
            key: "n1",
            role: "house suffix",
            text: "ghym",
            meaning: "The forgotten ways",
            sources: [{ title: "Dragon #267", authority: "official" }],
            section: "family",
            kind: "suffix",
            wordMeaning: "Blessed by the forgotten ways"
        }
    ]
};
