// Test name generation for all subraces and complexities
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
const nameGenPath = join(projectRoot, "js", "core", "NameGenerator.js").replace(/\\/g, "/");
const nameGenUrl = `file:///${nameGenPath}`;
const { NameGenerator } = await import(nameGenUrl);
const generator = new NameGenerator(components, connectors);

// Test parameters
const SUBRACES = ["high-elf", "sun-elf", "moon-elf", "wood-elf", "drow-male", "drow-female"];
const COMPLEXITIES = ["simple", "auto", "complex"];
const SAMPLES = 100;

const results = {};

console.log("=".repeat(70));
console.log("NAME GENERATION TEST RESULTS");
console.log("=".repeat(70));
console.log(`Total components: ${components.length}`);
console.log(`Total connectors: ${connectors.length}`);
console.log("");

for (const subrace of SUBRACES) {
    results[subrace] = {};
    console.log(`${subrace.toUpperCase()}`);
    console.log("-".repeat(70));

    for (const complexity of COMPLEXITIES) {
        const generated = [];
        const errors = [];

        // Suppress console warnings/errors for cleaner output
        const originalWarn = console.warn;
        const originalError = console.error;
        const warnings = [];
        console.warn = (...args) => warnings.push(args.join(" "));
        console.error = (...args) => warnings.push(args.join(" "));

        for (let i = 0; i < SAMPLES; i++) {
            try {
                const result = generator.generate({
                    subrace: subrace,
                    complexity: complexity,
                    style: subrace === "wood-elf" ? "martial" : "lyrical"
                });

                if (result && result.name) {
                    generated.push(result.name);
                } else if (result && typeof result === "string") {
                    generated.push(result);
                } else {
                    errors.push(`No name generated: ${JSON.stringify(result)}`);
                }
            } catch (e) {
                errors.push(e.message || String(e));
            }
        }

        // Restore console
        console.warn = originalWarn;
        console.error = originalError;

        // Calculate statistics
        const unique = new Set(generated).size;
        const duplicates = SAMPLES - unique - errors.length;
        const duplicateRate = ((duplicates / SAMPLES) * 100).toFixed(1);
        const errorRate = ((errors.length / SAMPLES) * 100).toFixed(1);

        // Count component repeats within names
        const componentRepeats = [];
        for (const name of generated) {
            // Simple check: look for repeated roots (simplified)
            const words = name.split(/[-'\s]+/);
            const roots = new Set();
            let hasRepeat = false;
            for (const word of words) {
                const root = word
                    .toLowerCase()
                    .replace(/[aeiouy]+/g, "")
                    .substring(0, 3);
                if (roots.has(root) && root.length >= 2) {
                    hasRepeat = true;
                    break;
                }
                roots.add(root);
            }
            if (hasRepeat) {
                componentRepeats.push(name);
            }
        }

        results[subrace][complexity] = {
            generated: generated.length,
            unique: unique,
            duplicates: duplicates,
            duplicateRate: `${duplicateRate}%`,
            errors: errors.length,
            errorRate: `${errorRate}%`,
            componentRepeats: componentRepeats.length,
            componentRepeatRate: `${((componentRepeats.length / generated.length) * 100).toFixed(1)}%`
        };

        console.log(
            `  ${complexity.padEnd(8)}: ${unique.toString().padStart(3)} unique / ${generated.length.toString().padStart(3)} generated | ${duplicateRate}% duplicates | ${errorRate}% errors | ${componentRepeats.length} component repeats`
        );
    }
    console.log("");
}

// Summary
console.log("=".repeat(70));
console.log("SUMMARY");
console.log("=".repeat(70));

for (const subrace of SUBRACES) {
    console.log(`\n${subrace.toUpperCase()}:`);
    for (const complexity of COMPLEXITIES) {
        const r = results[subrace][complexity];
        console.log(
            `  ${complexity.padEnd(8)}: ${r.unique} unique, ${r.duplicateRate} duplicates, ${r.errorRate} errors, ${r.componentRepeatRate} component repeats`
        );
    }
}

// Save results
import { writeFileSync } from "fs";
writeFileSync(join(projectRoot, "test_results_current.json"), JSON.stringify(results, null, 2), "utf-8");

console.log("\nResults saved to test_results_current.json");
