// Run comprehensive name generation tests
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Load data
const components = JSON.parse(readFileSync(join(projectRoot, "data", "components.json"), "utf-8"));
const connectors = JSON.parse(readFileSync(join(projectRoot, "data", "connectors.json"), "utf-8"));

// Import NameGenerator - use file:// URL for Windows
import { pathToFileURL } from "url";
const { NameGenerator } = await import(pathToFileURL(join(projectRoot, "js", "core", "NameGenerator.js")).href);

const generator = new NameGenerator(components, connectors);

const SUBRACES = ["high-elf", "sun-elf", "moon-elf", "wood-elf", "drow-male", "drow-female"];
const COMPLEXITIES = ["simple", "auto", "complex"];
const SAMPLES = 100;

const results = {};

console.log("Running Name Generation Tests...");
console.log("=".repeat(70));

for (const subrace of SUBRACES) {
    results[subrace] = {};
    console.log(`\n${subrace.toUpperCase()}`);
    console.log("-".repeat(70));

    for (const complexity of COMPLEXITIES) {
        process.stdout.write(`  ${complexity}: `);

        const generated = [];
        const errors = [];
        const nameCounts = new Map();

        for (let i = 0; i < SAMPLES; i++) {
            try {
                const name = generator.generate({
                    subrace: subrace,
                    complexity: complexity,
                    style: subrace === "wood-elf" ? "martial" : "lyrical"
                });

                if (name && name.name) {
                    generated.push(name.name);
                    nameCounts.set(name.name, (nameCounts.get(name.name) || 0) + 1);
                } else {
                    errors.push("No name generated");
                }
            } catch (error) {
                errors.push(error.message);
            }
        }

        const unique = new Set(generated).size;
        const duplicates = SAMPLES - unique - errors.length;
        const duplicateRate = ((duplicates / SAMPLES) * 100).toFixed(1);

        // Find most duplicated names
        const mostDuplicated = Array.from(nameCounts.entries())
            .filter(([name, count]) => count > 1)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        results[subrace][complexity] = {
            generated: generated.length,
            unique: unique,
            duplicates: duplicates,
            errors: errors.length,
            duplicateRate: `${duplicateRate}%`,
            successRate: `${((generated.length / SAMPLES) * 100).toFixed(1)}%`,
            mostDuplicated: mostDuplicated
        };

        console.log(
            `Generated: ${generated.length}, Unique: ${unique}, ` +
                `Duplicates: ${duplicates} (${duplicateRate}%), Errors: ${errors.length}`
        );
    }
}

// Save results
import { writeFileSync } from "fs";
writeFileSync(join(projectRoot, "test_results_final.json"), JSON.stringify(results, null, 2), "utf-8");

console.log("\n" + "=".repeat(70));
console.log("SUMMARY");
console.log("=".repeat(70));

for (const subrace of SUBRACES) {
    console.log(`\n${subrace.toUpperCase()}:`);
    for (const complexity of COMPLEXITIES) {
        const r = results[subrace][complexity];
        console.log(
            `  ${complexity.padEnd(8)}: ${r.unique.toString().padStart(3)} unique / ` +
                `${r.generated.toString().padStart(3)} generated (${r.duplicateRate} duplicates, ${r.successRate} success)`
        );
    }
}

console.log(`\nResults saved to: ${join(projectRoot, "test_results_final.json")}`);
