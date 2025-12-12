// Generate test names using Node.js
const fs = require("fs");
const path = require("path");

// Load data
const components = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/components.json"), "utf-8"));
const connectors = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/connectors.json"), "utf-8"));

// Simple name generator for testing
function generateSimpleName(subrace, complexity) {
    // Filter components by subrace
    let relevant = components;
    if (subrace === "drow-male") {
        relevant = components.filter(
            (c) => c.tags && (c.tags.includes("drow") || c.tags.includes("drow-male") || c.tags.includes("neutral"))
        );
    } else if (subrace === "drow-female") {
        relevant = components.filter(
            (c) => c.tags && (c.tags.includes("drow") || c.tags.includes("drow-female") || c.tags.includes("neutral"))
        );
    } else if (subrace === "wood-elf") {
        relevant = components.filter((c) => c.tags && (c.tags.includes("wood") || c.tags.includes("neutral")));
    } else if (subrace === "moon-elf") {
        relevant = components.filter((c) => c.tags && (c.tags.includes("moon") || c.tags.includes("neutral")));
    } else if (subrace === "sun-elf") {
        relevant = components.filter((c) => c.tags && (c.tags.includes("sun") || c.tags.includes("neutral")));
    } else {
        relevant = components.filter((c) => c.tags && (c.tags.includes("high-elf") || c.tags.includes("neutral")));
    }

    const prefixes = relevant.filter((c) => c.can_be_prefix);
    const suffixes = relevant.filter((c) => c.can_be_suffix);

    if (complexity === "simple") {
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        return (prefix.prefix_text || "") + (suffix.suffix_text || "").replace(/^-/, "");
    }

    // For auto/complex, just use simple for now
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return (prefix.prefix_text || "") + (suffix.suffix_text || "").replace(/^-/, "");
}

// Test
const SUBRACES = ["high-elf", "sun-elf", "moon-elf", "wood-elf", "drow-male", "drow-female"];
const COMPLEXITIES = ["simple", "auto", "complex"];
const SAMPLES = 100;

const results = {};

for (const subrace of SUBRACES) {
    results[subrace] = {};
    console.log(`\n${subrace.toUpperCase()}`);

    for (const complexity of COMPLEXITIES) {
        const generated = [];
        for (let i = 0; i < SAMPLES; i++) {
            const name = generateSimpleName(subrace, complexity);
            if (name) generated.push(name);
        }

        const unique = new Set(generated).size;
        const duplicates = SAMPLES - unique;

        results[subrace][complexity] = {
            generated: generated.length,
            unique: unique,
            duplicates: duplicates,
            duplicate_rate: `${((duplicates / SAMPLES) * 100).toFixed(1)}%`
        };

        console.log(
            `  ${complexity}: ${unique} unique / ${generated.length} generated (${results[subrace][complexity].duplicate_rate} duplicates)`
        );
    }
}

fs.writeFileSync(
    path.join(__dirname, "../name_generation_test_results.json"),
    JSON.stringify(results, null, 2),
    "utf-8"
);

console.log("\nResults saved to name_generation_test_results.json");
