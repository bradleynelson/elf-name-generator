// High Elf Name Generator - Espruar Naming System
// Component data with interchangeability rules
const components = [
  {
    "root": "ae",
    "prefix_text": "Ae-",
    "prefix_meaning": "ever, eternal",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ae",
    "suffix_meaning": "Whisper / Secret",
    "is_gender_modifier": false
  },
  {
    "root": "ael",
    "prefix_text": "Ael-",
    "prefix_meaning": "Knight / Warrior",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ael",
    "suffix_meaning": "noble light",
    "is_gender_modifier": false
  },
  {
    "root": "aer",
    "prefix_text": "Aer-",
    "prefix_meaning": "Law / Sky",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "ala",
    "prefix_text": "Ala-",
    "prefix_meaning": "memory, kinship",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "an",
    "prefix_text": "An-",
    "prefix_meaning": "Light / Sky",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "ara",
    "prefix_text": "Ara-",
    "prefix_meaning": "Great / King",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "aran",
    "prefix_text": "Aran-",
    "prefix_meaning": "King / High",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "ath",
    "prefix_text": "Ath-",
    "prefix_meaning": "Loyalty / Steadfast",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "bi",
    "prefix_text": "Bi-",
    "prefix_meaning": "Jade / Green",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "cae",
    "prefix_text": "Cae-",
    "prefix_meaning": "Lady / Noble",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "cela",
    "prefix_text": "Cela-",
    "prefix_meaning": "silver, moon-silver",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "cor",
    "prefix_text": "Cor-",
    "prefix_meaning": "Legend / Ancient",
    "can_be_prefix": true,
    "can_be_suffix": false,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "del",
    "prefix_text": "Del-",
    "prefix_meaning": "Earth / Ground",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "eir",
    "prefix_text": "Eir-",
    "prefix_meaning": "Sharp / Grim",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "ela",
    "prefix_text": "Ela-",
    "prefix_meaning": "bright, radiant",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "faer",
    "prefix_text": "Faer-",
    "prefix_meaning": "weave, magic",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "fha",
    "prefix_text": "Fha-",
    "prefix_meaning": "Faerie / Fey",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "gyl",
    "prefix_text": "Gyl-",
    "prefix_meaning": "Song / Music",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "iar",
    "prefix_text": "Iar-",
    "prefix_meaning": "Sea / Wave",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "ilan",
    "prefix_text": "Ilan-",
    "prefix_meaning": "Silver / Moon",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "im",
    "prefix_text": "Im-",
    "prefix_meaning": "Deep / Ocean",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "iri",
    "prefix_text": "Iri-",
    "prefix_meaning": "dream, mist",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "la",
    "prefix_text": "La-",
    "prefix_meaning": "Night / Crescent",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "lae",
    "prefix_text": "Lae-",
    "prefix_meaning": "dawn, light",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "lia",
    "prefix_text": "Lia-",
    "prefix_meaning": "Moon / Arcane",
    "can_be_prefix": true,
    "can_be_suffix": false,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "luin",
    "prefix_text": "Luin-",
    "prefix_meaning": "Blue / Sapphire",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "mae",
    "prefix_text": "Mae-",
    "prefix_meaning": "Shadow, Mystery",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "menal",
    "prefix_text": "Menal-",
    "prefix_meaning": "Moon",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "mer",
    "prefix_text": "Mer-",
    "prefix_meaning": "Star / Noble",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "min",
    "prefix_text": "Min-",
    "prefix_meaning": "Tower / High Place",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "mon",
    "prefix_text": "Mon-",
    "prefix_meaning": "Moon (a common simplification of Menal)",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "mon / morn",
    "prefix_text": "Mon- / Morn-",
    "prefix_meaning": "Stone, Mountain, Great",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "morn",
    "prefix_text": "Morn-",
    "prefix_meaning": "Darkness (sometimes)",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "myr",
    "prefix_text": "Myr-",
    "prefix_meaning": "Onyx / Rare / Jewel",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "nae",
    "prefix_text": "Nae-",
    "prefix_meaning": "Wind, Breeze",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "nae",
    "prefix_text": "Nae-",
    "prefix_meaning": "Whisper / Secret",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "qil",
    "prefix_text": "Qil-",
    "prefix_meaning": "Arrow / Bolt",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "quess",
    "prefix_text": "Quess-",
    "prefix_meaning": "Elf / People",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "rath",
    "prefix_text": "Rath-",
    "prefix_meaning": "Path / Way",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "rho",
    "prefix_text": "Rho-",
    "prefix_meaning": "Shining, Bright, Golden",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "rhyn",
    "prefix_text": "Rhyn-",
    "prefix_meaning": "Shining, Bright, Golden",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "ro / roe",
    "prefix_text": "Ro- / Roe-",
    "prefix_meaning": "Song, Music, Flowing",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "sar",
    "prefix_text": "Sar-",
    "prefix_meaning": "Eye / Watcher",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "shae",
    "prefix_text": "Shae-",
    "prefix_meaning": "Starlit, Fey-touched",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-shae",
    "suffix_meaning": "fey-touched, moon-blessed",
    "is_gender_modifier": false
  },
  {
    "root": "sil",
    "prefix_text": "Sil-",
    "prefix_meaning": "Silver / Moon",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "silv",
    "prefix_text": "Silv-",
    "prefix_meaning": "Shade / Dusk",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "sol",
    "prefix_text": "Sol-",
    "prefix_meaning": "Sun / History",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "syl",
    "prefix_text": "Syl-",
    "prefix_meaning": "Forest, Wild Grace",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "tan",
    "prefix_text": "Tan-",
    "prefix_meaning": "Maker / Shaper",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "thal",
    "prefix_text": "Thal-",
    "prefix_meaning": "Peace / Calm",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-thal",
    "suffix_meaning": "Foot / Step",
    "is_gender_modifier": false
  },
  {
    "root": "thorn / thor",
    "prefix_text": "Thorn- / Thor-",
    "prefix_meaning": "Stone / Permanent / Enduring",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "vael",
    "prefix_text": "Vael-",
    "prefix_meaning": "Destiny, Chosen Path",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "val",
    "prefix_text": "Val-",
    "prefix_meaning": "Watcher / Vigilant",
    "can_be_prefix": true,
    "can_be_suffix": false,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "xil",
    "prefix_text": "Xil-",
    "prefix_meaning": "Gold / Petal",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "yae",
    "prefix_text": "Yae-",
    "prefix_meaning": "Sky, Celestial",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "zyl",
    "prefix_text": "Zyl-",
    "prefix_meaning": "Shadow / Dusk",
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": null,
    "suffix_meaning": null,
    "is_gender_modifier": false
  },
  {
    "root": "ael / ail",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ael / -ail",
    "suffix_meaning": "Blade, Edge, or Warrior",
    "is_gender_modifier": false
  },
  {
    "root": "aera",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-aera",
    "suffix_meaning": "of the sky",
    "is_gender_modifier": false
  },
  {
    "root": "ar",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ar",
    "suffix_meaning": "Lord / Master / King",
    "is_gender_modifier": false
  },
  {
    "root": "ariel",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ariel",
    "suffix_meaning": "bright spirit",
    "is_gender_modifier": false
  },
  {
    "root": "aris",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-aris",
    "suffix_meaning": "beloved, precious",
    "is_gender_modifier": false
  },
  {
    "root": "astra",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-astra",
    "suffix_meaning": "Storm / Power",
    "is_gender_modifier": false
  },
  {
    "root": "athar",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-athar",
    "suffix_meaning": "Watcher / Guardian",
    "is_gender_modifier": false
  },
  {
    "root": "ayne",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ayne",
    "suffix_meaning": "wanderer, traveler",
    "is_gender_modifier": false
  },
  {
    "root": "beth",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-beth",
    "suffix_meaning": "Renown / Fame",
    "is_gender_modifier": false
  },
  {
    "root": "brae",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-brae",
    "suffix_meaning": "Craft / Maker",
    "is_gender_modifier": false
  },
  {
    "root": "dil",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-dil",
    "suffix_meaning": "Friend / Devoted",
    "is_gender_modifier": false
  },
  {
    "root": "dor",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-dor",
    "suffix_meaning": "Master / Land",
    "is_gender_modifier": false
  },
  {
    "root": "dorei",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-dorei",
    "suffix_meaning": "people, tribe (archaic)",
    "is_gender_modifier": false
  },
  {
    "root": "drel",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-drel",
    "suffix_meaning": "Skill, Dexterity, Precision",
    "is_gender_modifier": false
  },
  {
    "root": "dril",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-dril",
    "suffix_meaning": "Tress, Braid, Fine Hair",
    "is_gender_modifier": false
  },
  {
    "root": "drith",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": false,
    "can_be_suffix": true,
    "suffix_text": "-drith",
    "suffix_meaning": "Widow / Sorrow",
    "is_gender_modifier": true
  },
  {
    "root": "dul",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-dul",
    "suffix_meaning": "Glade / Valley",
    "is_gender_modifier": false
  },
  {
    "root": "estel",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-estel",
    "suffix_meaning": "Hope / Trust",
    "is_gender_modifier": false
  },
  {
    "root": "eth",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-eth",
    "suffix_meaning": "ancient, sacred",
    "is_gender_modifier": false
  },
  {
    "root": "felle",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-felle",
    "suffix_meaning": "Bloom / Spring",
    "is_gender_modifier": false
  },
  {
    "root": "findel",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-findel",
    "suffix_meaning": "Tress / Braid (of hair)",
    "is_gender_modifier": false
  },
  {
    "root": "gal",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-gal",
    "suffix_meaning": "Shine / Radiance",
    "is_gender_modifier": false
  },
  {
    "root": "gwyn",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-gwyn",
    "suffix_meaning": "Pale / Ice / White",
    "is_gender_modifier": false
  },
  {
    "root": "iel",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": false,
    "can_be_suffix": true,
    "suffix_text": "-iel",
    "suffix_meaning": "radiant one",
    "is_gender_modifier": true
  },
  {
    "root": "ion",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": false,
    "can_be_suffix": true,
    "suffix_text": "-ion",
    "suffix_meaning": "Son of",
    "is_gender_modifier": true
  },
  {
    "root": "ira",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ira",
    "suffix_meaning": "dreamer",
    "is_gender_modifier": false
  },
  {
    "root": "is",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-is",
    "suffix_meaning": "one who sees",
    "is_gender_modifier": false
  },
  {
    "root": "ith",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ith",
    "suffix_meaning": "Wisdom / Mind",
    "is_gender_modifier": false
  },
  {
    "root": "kian",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": false,
    "can_be_suffix": true,
    "suffix_text": "-kian",
    "suffix_meaning": "Bane / Killer",
    "is_gender_modifier": true
  },
  {
    "root": "lamin",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-lamin",
    "suffix_meaning": "Path / Quest",
    "is_gender_modifier": false
  },
  {
    "root": "lar",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-lar",
    "suffix_meaning": "Lord / Master / King",
    "is_gender_modifier": false
  },
  {
    "root": "lor",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-lor",
    "suffix_meaning": "knowledge, lore",
    "is_gender_modifier": false
  },
  {
    "root": "los",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-los",
    "suffix_meaning": "Snow / Frost",
    "is_gender_modifier": false
  },
  {
    "root": "mith",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-mith",
    "suffix_meaning": "Grey / Mist",
    "is_gender_modifier": false
  },
  {
    "root": "nail",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-nail",
    "suffix_meaning": "Spike, Point, or Fixed Position",
    "is_gender_modifier": false
  },
  {
    "root": "no",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-no",
    "suffix_meaning": "Son of",
    "is_gender_modifier": false
  },
  {
    "root": "nodel",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-nodel",
    "suffix_meaning": "Moon (as a final component)",
    "is_gender_modifier": false
  },
  {
    "root": "on",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-on",
    "suffix_meaning": "Son of",
    "is_gender_modifier": false
  },
  {
    "root": "ra",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ra",
    "suffix_meaning": "warrior, protector",
    "is_gender_modifier": false
  },
  {
    "root": "riel",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-riel",
    "suffix_meaning": "shining maiden",
    "is_gender_modifier": false
  },
  {
    "root": "rion",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-rion",
    "suffix_meaning": "wanderer, seeker",
    "is_gender_modifier": false
  },
  {
    "root": "ser",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ser",
    "suffix_meaning": "Soft / Gentle",
    "is_gender_modifier": false
  },
  {
    "root": "thae",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-thae",
    "suffix_meaning": "starlit, blessed",
    "is_gender_modifier": false
  },
  {
    "root": "thala",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-thala",
    "suffix_meaning": "Healer",
    "is_gender_modifier": false
  },
  {
    "root": "thir",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-thir",
    "suffix_meaning": "guardian",
    "is_gender_modifier": false
  },
  {
    "root": "ue",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-ue",
    "suffix_meaning": "Cloud / Mystery",
    "is_gender_modifier": false
  },
  {
    "root": "vrae",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-vrae",
    "suffix_meaning": "Fire / Madness",
    "is_gender_modifier": false
  },
  {
    "root": "we",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-we",
    "suffix_meaning": "song, melody",
    "is_gender_modifier": false
  },
  {
    "root": "wen",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-wen",
    "suffix_meaning": "Maiden / Young Woman",
    "is_gender_modifier": false
  },
  {
    "root": "wiir",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-wiir",
    "suffix_meaning": "Gem / Stone",
    "is_gender_modifier": false
  },
  {
    "root": "wyn",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-wyn",
    "suffix_meaning": "graceful one",
    "is_gender_modifier": false
  },
  {
    "root": "yn",
    "prefix_text": null,
    "prefix_meaning": null,
    "can_be_prefix": true,
    "can_be_suffix": true,
    "suffix_text": "-yn",
    "suffix_meaning": "Flower / Blossom",
    "is_gender_modifier": false
  }
];

const connectors = [
  {
    "text": "-a-",
    "function": "Simple vowel bridge for flow"
  },
  {
    "text": "-e-",
    "function": "Simple vowel bridge for flow"
  },
  {
    "text": "-o-",
    "function": "Simple vowel bridge for flow"
  },
  {
    "text": "-an-",
    "function": "Spirit / Common smooth bridge"
  },
  {
    "text": "-ani-",
    "function": "Implies \"spirit of\" or \"essence of\""
  },
  {
    "text": "-ea-",
    "function": "Adds a pause or weight to the name"
  },
  {
    "text": "-ella-",
    "function": "gentle, elegant"
  },
  {
    "text": "-en-",
    "function": "Breaks up harsh consonants to add softness, often means \"small\" or \"dear\""
  },
  {
    "text": "-i-",
    "function": "A soft connector bridge that breaks up the consonants"
  },
  {
    "text": "-il-",
    "function": "Common Moon Elf bridge; adds a \"silvery\" sound"
  },
  {
    "text": "-ira-",
    "function": "dreaming, soul-deep"
  },
  {
    "text": "-la-",
    "function": "grace, beauty"
  },
  {
    "text": "-l\u00eb-",
    "function": "A melodic, quick bridge (from tel\u00eb or la) often used for Moon/Star root to a status suffix"
  },
  {
    "text": "-na-",
    "function": "heart, spirit"
  },
  {
    "text": "-or-",
    "function": "Adds a sturdy or strong tone"
  },
  {
    "text": "-ri-",
    "function": "light, movement"
  },
  {
    "text": "-sae-",
    "function": "sky, ethereal"
  },
  {
    "text": "-sha-",
    "function": "moonlit, enchanted"
  },
  {
    "text": "-th-",
    "function": "Separates two vowels or a consonant and a vowel for an airy sound."
  },
  {
    "text": "-the-",
    "function": "kin, heritage"
  },
  {
    "text": "-v-",
    "function": "Very rare; Used when the root already contains an 'r' or 'l' and another vowel is needed."
  },
  {
    "text": "-va-",
    "function": "strength, vitality"
  },
  {
    "text": "-yr-",
    "function": "Used between two strong consonants to add a rich, ancient, or rare tone"
  }
];

// Final vowel options
const finalVowels = [
    { vowel: 'a', tone: 'Clear, bright, feminine' },
    { vowel: 'i', tone: 'Sharp, intellectual' },
    { vowel: 'o', tone: 'Deep, noble (rare)' },
    { vowel: 'u', tone: 'Mysterious, ancient' },
    { vowel: 'ae', tone: 'Lyrical, elegant' }
];

let currentName = null;
let favorites = JSON.parse(localStorage.getItem('elfNameFavorites')) || [];

// Helper functions
function isVowel(char) {
    return 'aeiouAEIOU'.includes(char);
}

function endsWithVowel(str) {
    return isVowel(str[str.length - 1]);
}

function startsWithVowel(str) {
    return isVowel(str[0]);
}

function endsWithHardConsonant(str) {
    const hardConsonants = 'kptbdgcszxfv';
    return hardConsonants.includes(str[str.length - 1].toLowerCase());
}

function countSyllables(word) {
    word = word.toLowerCase();
    let count = 0;
    let prevVowel = false;
    
    for (let char of word) {
        if (isVowel(char)) {
            if (!prevVowel) count++;
            prevVowel = true;
        } else {
            prevVowel = false;
        }
    }
    
    if (word.endsWith('e') && count > 1) count--;
    
    return Math.max(1, count);
}

function needsConnector(comp1Text, comp2Text) {
    const end = comp1Text[comp1Text.length - 1];
    const start = comp2Text[0];
    
    // Need connector if both are consonants
    if (!isVowel(end) && !isVowel(start)) {
        return true;
    }
    
    // Liquid consonants (l, r, n, m, w) blend well
    const liquidConsonants = 'lrnmw';
    if (liquidConsonants.includes(end.toLowerCase()) && 
        liquidConsonants.includes(start.toLowerCase())) {
        return false;
    }
    
    return false;
}

function selectConnector(style) {
    const liquidConnectors = connectors.filter(c => 
        c.text.includes('l') || c.text.includes('r') || c.text.includes('n')
    );
    
    if (style === 'feminine') {
        const soft = connectors.filter(c => 
            c.text.includes('i') || c.text.includes('e') || c.text.includes('ella')
        );
        if (soft.length > 0 && Math.random() > 0.3) {
            return soft[Math.floor(Math.random() * soft.length)];
        }
    }
    
    if (style === 'masculine') {
        const strong = connectors.filter(c => 
            c.text.includes('th') || c.text.includes('or') || c.text.includes('an')
        );
        if (strong.length > 0 && Math.random() > 0.3) {
            return strong[Math.floor(Math.random() * strong.length)];
        }
    }
    
    if (liquidConnectors.length > 0 && Math.random() > 0.5) {
        return liquidConnectors[Math.floor(Math.random() * liquidConnectors.length)];
    }
    
    return connectors[Math.floor(Math.random() * connectors.length)];
}

function shouldSuggestFinalVowel(name, syllables, targetSyllables) {
    // Suggest if name is short
    if (syllables < targetSyllables) return true;
    
    // Suggest if ends with hard consonant
    if (endsWithHardConsonant(name)) return true;
    
    return false;
}

function applyFinalVowel(vowel) {
    if (!currentName) return;
    
    const newName = currentName.baseForm + vowel;
    const newSyllables = countSyllables(newName);
    
    currentName.name = newName;
    currentName.syllables = newSyllables;
    currentName.finalVowel = vowel;
    
    document.getElementById('generatedName').textContent = newName;
    
    let breakdownHTML = '';
    
    // Clean up meanings
    const cleanPrefixMeaning = currentName.prefix.prefix_meaning.replace(/\s*\/\s*/g, ', ');
    const cleanSuffixMeaning = currentName.suffix.suffix_meaning.replace(/\s*\/\s*/g, ', ');
    
    breakdownHTML += `<div class="component"><span class="component-label">Prefix:</span> ${currentName.prefix.prefix_text} (${cleanPrefixMeaning})</div>`;
    if (currentName.connector) {
        breakdownHTML += `<div class="component"><span class="component-label">Connector:</span> ${currentName.connector.text}</div>`;
    }
    breakdownHTML += `<div class="component"><span class="component-label">Suffix:</span> ${currentName.suffix.suffix_text} (${cleanSuffixMeaning})</div>`;
    breakdownHTML += `<div class="component"><span class="component-label">Final Vowel:</span> -${vowel} (${finalVowels.find(v => v.vowel === vowel).tone})</div>`;
    breakdownHTML += `<div class="component"><span class="component-label">Syllables:</span> ${newSyllables}</div>`;
    
    document.getElementById('breakdown').innerHTML = breakdownHTML;
    
    // Hide vowel suggestions after applying
    document.getElementById('vowelSuggestionsContainer').style.display = 'none';
}

function generateName() {
    const complexity = document.getElementById('complexity').value;
    const targetSyllables = parseInt(document.getElementById('syllables').value);
    const style = document.getElementById('style').value;
    
    let prefix, connector, suffix;
    let attempts = 0;
    let bestName = null;
    let bestDiff = 100;
    
    while (attempts < 50) {
        // Select prefix (can_be_prefix = true and has prefix_text)
        const prefixCandidates = components.filter(c => c.can_be_prefix && c.prefix_text);
        prefix = prefixCandidates[Math.floor(Math.random() * prefixCandidates.length)];
        
        // Select suffix (can_be_suffix = true and has suffix_text)
        const suffixCandidates = components.filter(c => c.can_be_suffix && c.suffix_text);
        suffix = suffixCandidates[Math.floor(Math.random() * suffixCandidates.length)];
        
        // Apply style preferences
        if (style === 'feminine') {
            const femSuffixes = suffixCandidates.filter(s => 
                s.root.includes('iel') || s.root.includes('wen') || 
                s.root.includes('lia') || s.root.includes('riel') || 
                s.root.includes('rae') || s.root.includes('ae')
            );
            if (femSuffixes.length > 0 && Math.random() > 0.3) {
                suffix = femSuffixes[Math.floor(Math.random() * femSuffixes.length)];
            }
        } else if (style === 'masculine') {
            const mascSuffixes = suffixCandidates.filter(s => 
                s.root.includes('ion') || s.root.includes('ar') || 
                s.root.includes('kian') || s.root.includes('drith') ||
                s.root.includes('dor') || s.root.includes('val')
            );
            if (mascSuffixes.length > 0 && Math.random() > 0.3) {
                suffix = mascSuffixes[Math.floor(Math.random() * mascSuffixes.length)];
            }
        }
        
        // Get clean text for prefix and suffix
        const prefixText = prefix.prefix_text.replace(/-/g, '');
        const suffixText = suffix.suffix_text.replace(/-/g, '');
        
        // Determine if connector is needed
        let useConnector = complexity === 'complex' || 
                          (complexity === 'auto' && needsConnector(prefixText, suffixText));
        
        connector = useConnector ? selectConnector(style) : null;
        
        // Build name
        let nameParts = [
            prefixText,
            connector ? connector.text.replace(/-/g, '') : '',
            suffixText
        ];
        
        let fullName = nameParts.join('');
        fullName = fullName.charAt(0).toUpperCase() + fullName.slice(1);
        
        let syllables = countSyllables(fullName);
        let diff = Math.abs(syllables - targetSyllables);
        
        if (diff < bestDiff) {
            bestDiff = diff;
            bestName = { prefix, connector, suffix, fullName, syllables };
        }
        
        if (diff <= 1) break;
        
        attempts++;
    }
    
    prefix = bestName.prefix;
    connector = bestName.connector;
    suffix = bestName.suffix;
    let fullName = bestName.fullName;
    let syllables = bestName.syllables;
    
    // Create meaning - show construction with + symbols
    const prefixMeaning = prefix.prefix_meaning.replace(/\s*\/\s*/g, ', ');
    const suffixMeaning = suffix.suffix_meaning.replace(/\s*\/\s*/g, ', ');
    
    // Capitalize every word in each meaning
    const capitalizedPrefix = prefixMeaning.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    const capitalizedSuffix = suffixMeaning.split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    // Build meaning display: Prefix meaning + Suffix meaning
    let meaning = `${capitalizedPrefix} + ${capitalizedSuffix}`;
    
    // Store current name
    currentName = {
        name: fullName,
        baseForm: fullName,
        meaning: meaning,
        prefix: prefix,
        connector: connector,
        suffix: suffix,
        syllables: syllables,
        finalVowel: null
    };
    
    // Display result
    document.getElementById('generatedName').textContent = fullName;
    document.getElementById('nameMeaning').textContent = `"${meaning}"`;
    
    // Check if we should suggest final vowels
    if (shouldSuggestFinalVowel(fullName, syllables, targetSyllables)) {
        const vowelOptionsHTML = finalVowels.map(v => `
            <div class="vowel-option" onclick="applyFinalVowel('${v.vowel}')">
                <span class="vowel-option-name">${fullName}${v.vowel}</span>
                <span class="vowel-option-tone">${v.tone}</span>
            </div>
        `).join('');
        
        document.getElementById('vowelOptions').innerHTML = vowelOptionsHTML;
        document.getElementById('vowelSuggestionsContainer').style.display = 'block';
    } else {
        document.getElementById('vowelSuggestionsContainer').style.display = 'none';
    }
    
    // Breakdown
    let breakdownHTML = '';
    
    // Clean up meanings (replace slashes with commas)
    const cleanPrefixMeaning = prefix.prefix_meaning.replace(/\s*\/\s*/g, ', ');
    const cleanSuffixMeaning = suffixMeaning.replace(/\s*\/\s*/g, ', ');
    
    breakdownHTML += `<div class="component"><span class="component-label">Prefix:</span> ${prefix.prefix_text} (${cleanPrefixMeaning})</div>`;
    if (connector) {
        breakdownHTML += `<div class="component"><span class="component-label">Connector:</span> ${connector.text}</div>`;
    }
    breakdownHTML += `<div class="component"><span class="component-label">Suffix:</span> ${suffix.suffix_text} (${cleanSuffixMeaning})</div>`;
    breakdownHTML += `<div class="component"><span class="component-label">Syllables:</span> ${syllables}</div>`;
    breakdownHTML += `<div class="component"><span class="component-label">Interchangeable:</span> ${prefix.can_be_suffix && suffix.can_be_prefix ? 'Yes - components can swap positions' : 'No - follows role/gender rules'}</div>`;
    
    document.getElementById('breakdown').innerHTML = breakdownHTML;
    document.getElementById('result').classList.add('show');
}

function saveFavorite() {
    if (!currentName) return;
    
    if (favorites.some(f => f.name === currentName.name)) {
        alert('This name is already in your favorites!');
        return;
    }
    
    favorites.push(currentName);
    localStorage.setItem('elfNameFavorites', JSON.stringify(favorites));
    displayFavorites();
}

function displayFavorites() {
    const listDiv = document.getElementById('favoritesList');
    
    if (favorites.length === 0) {
        listDiv.className = 'empty-favorites';
        listDiv.textContent = 'No favorites saved yet. Generate and save names you like!';
        return;
    }
    
    listDiv.className = '';
    listDiv.innerHTML = favorites.map((fav, index) => `
        <div class="favorite-item">
            <span class="favorite-name">${fav.name}</span>
            <span class="favorite-meaning">"${fav.meaning}"</span>
            <button class="remove-btn" onclick="removeFavorite(${index})">Remove</button>
        </div>
    `).join('');
}

function removeFavorite(index) {
    favorites.splice(index, 1);
    localStorage.setItem('elfNameFavorites', JSON.stringify(favorites));
    displayFavorites();
}

// Initialize
displayFavorites();
window.onload = function() {
    generateName();
};