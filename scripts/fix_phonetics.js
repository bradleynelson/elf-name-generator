// Script to analyze and fix phonetics for General American Broadcast English + TTS compatibility
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// TTS-friendly phonetic patterns for General American
const PHONETIC_PATTERNS = {
    // Long vowels
    ay: "ay", // day, say (long A)
    ee: "ee", // see, tree (long E)
    eye: "eye", // bite, kite (long I) - better than "ai" for TTS
    ai: "eye", // convert "ai" to "eye" for clarity
    oh: "oh", // go, so (long O)
    oo: "oo", // moon, soon (long U)

    // Short vowels
    ah: "ah", // cat, hat (short A)
    eh: "eh", // bed, red (short E)
    ih: "ih", // bit, sit (short I)
    aw: "aw", // hot, not (short O) - but "ah" is clearer for TTS
    uh: "uh", // but, cut (short U)

    // R-controlled
    er: "er", // her, fur
    ar: "ar", // car, far
    or: "or", // for, or
    ur: "ur", // fur, blur
    air: "air", // air, fair
    ear: "ear", // ear, hear
    ire: "eye-er", // fire, wire
    ore: "or", // more, core
    ure: "ur", // sure, pure

    // Common issues
    "fai-r": "fai-er", // fire should be two syllables
    fayr: "fai-er" // fire variant
};

// Common problematic patterns to fix
const FIXES = {
    // Fire variations
    "fai-r": "fai-er",
    fayr: "fai-er",
    faiyr: "fai-er",

    // Long I issues
    ai: "eye", // in context of long I sound
    aye: "eye",

    // R-controlled issues
    ire: "eye-er", // fire, wire
    yre: "eye-er", // lyre

    // Other common issues
    y: "ee", // when it's a long E sound
    ie: "ee" // when it's a long E sound
};

function analyzePhonetics(filePath) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const issues = [];
    const allPhonetics = [];

    function checkPhonetic(text, phonetic, context) {
        if (!phonetic) return;

        allPhonetics.push({ text, phonetic, context });

        // Check for common issues
        const lowerPhonetic = phonetic.toLowerCase();

        // Fire issues
        if (lowerPhonetic.includes("fai-r") || lowerPhonetic === "fayr") {
            issues.push({
                text,
                current: phonetic,
                suggested: "fai-er",
                reason: "Fire should be two syllables: fai-er",
                context
            });
        }

        // Long I issues (ai vs eye)
        if (lowerPhonetic.includes("ai") && !lowerPhonetic.includes("air") && !lowerPhonetic.includes("ay")) {
            // Check if it's meant to be long I
            if (text.toLowerCase().includes("i") && !text.toLowerCase().includes("air")) {
                const suggested = phonetic.replace(/ai/gi, "eye");
                if (suggested !== phonetic) {
                    issues.push({
                        text,
                        current: phonetic,
                        suggested,
                        reason: 'Long I sound should use "eye" for TTS clarity',
                        context
                    });
                }
            }
        }

        // Check for ambiguous spellings
        if (lowerPhonetic.includes("y") && !lowerPhonetic.includes("ay") && !lowerPhonetic.includes("oy")) {
            // Might be ambiguous
            if (text.toLowerCase().endsWith("y") && !lowerPhonetic.endsWith("ee")) {
                issues.push({
                    text,
                    current: phonetic,
                    suggested: phonetic.replace(/y$/gi, "ee"),
                    reason: 'Final Y as long E should be "ee" for TTS',
                    context
                });
            }
        }
    }

    // Process different data structures
    if (Array.isArray(data)) {
        data.forEach((item, index) => {
            if (item.prefix_phonetic) {
                checkPhonetic(item.prefix_text || item.root, item.prefix_phonetic, `prefix_phonetic[${index}]`);
            }
            if (item.suffix_phonetic) {
                checkPhonetic(item.suffix_text || item.root, item.suffix_phonetic, `suffix_phonetic[${index}]`);
            }
            if (item.phonetic) {
                checkPhonetic(item.text || item.root, item.phonetic, `phonetic[${index}]`);
            }
        });
    }

    return { issues, allPhonetics, data };
}

// Analyze all files
const files = [
    "../data/components.json",
    "../data/connectors.json",
    "../data/dwarvenFirstNames.json",
    "../data/dwarvenClanNames.json"
];

console.log("=== PHONETIC ANALYSIS ===\n");

files.forEach((file) => {
    const filePath = path.join(__dirname, file);
    console.log(`\nAnalyzing: ${file}`);
    console.log("=".repeat(50));

    const result = analyzePhonetics(filePath);

    console.log(`Total phonetics found: ${result.allPhonetics.length}`);
    console.log(`Issues found: ${result.issues.length}`);

    if (result.issues.length > 0) {
        console.log("\nIssues:");
        result.issues.forEach((issue, i) => {
            console.log(`\n${i + 1}. ${issue.text}`);
            console.log(`   Current: "${issue.current}"`);
            console.log(`   Suggested: "${issue.suggested}"`);
            console.log(`   Reason: ${issue.reason}`);
            console.log(`   Context: ${issue.context}`);
        });
    }
});

console.log("\n=== ANALYSIS COMPLETE ===");
console.log("\nReview the issues above and decide which fixes to apply.");
