// Comprehensive test for all name generators across all species and subraces
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Load all data files
const components = JSON.parse(readFileSync(join(projectRoot, "data", "components.json"), "utf-8"));
const connectors = JSON.parse(readFileSync(join(projectRoot, "data", "connectors.json"), "utf-8"));
const dwarvenFirstNames = JSON.parse(readFileSync(join(projectRoot, "data", "dwarvenFirstNames.json"), "utf-8"));
const dwarvenClanNames = JSON.parse(readFileSync(join(projectRoot, "data", "dwarvenClanNames.json"), "utf-8"));
const gnomishPersonalNames = JSON.parse(readFileSync(join(projectRoot, "data", "gnomishPersonalNames.json"), "utf-8"));
const gnomishClanNames = JSON.parse(readFileSync(join(projectRoot, "data", "gnomishClanNames.json"), "utf-8"));
const gnomishNicknames = JSON.parse(readFileSync(join(projectRoot, "data", "gnomishNicknames.json"), "utf-8"));
const halflingPersonalNames = JSON.parse(
    readFileSync(join(projectRoot, "data", "halflingPersonalNames.json"), "utf-8")
);
const halflingFamilyNames = JSON.parse(readFileSync(join(projectRoot, "data", "halflingFamilyNames.json"), "utf-8"));
const halflingNicknames = JSON.parse(readFileSync(join(projectRoot, "data", "halflingNicknames.json"), "utf-8"));
const orcPersonalNames = JSON.parse(readFileSync(join(projectRoot, "data", "orcPersonalNames.json"), "utf-8"));
const orcClanNames = JSON.parse(readFileSync(join(projectRoot, "data", "orcClanNames.json"), "utf-8"));
const orcEpithets = JSON.parse(readFileSync(join(projectRoot, "data", "orcEpithets.json"), "utf-8"));

// Import all generators
const nameGenPath = join(projectRoot, "js", "core", "NameGenerator.js").replace(/\\/g, "/");
const { NameGenerator } = await import(`file:///${nameGenPath}`);

const dwarvenGenPath = join(projectRoot, "js", "core", "DwarvenNameGenerator.js").replace(/\\/g, "/");
const { DwarvenNameGenerator } = await import(`file:///${dwarvenGenPath}`);

const gnomishGenPath = join(projectRoot, "js", "core", "GnomishNameGenerator.js").replace(/\\/g, "/");
const { GnomishNameGenerator } = await import(`file:///${gnomishGenPath}`);

const halflingGenPath = join(projectRoot, "js", "core", "HalflingNameGenerator.js").replace(/\\/g, "/");
const { HalflingNameGenerator } = await import(`file:///${halflingGenPath}`);

const orcGenPath = join(projectRoot, "js", "core", "OrcNameGenerator.js").replace(/\\/g, "/");
const { OrcNameGenerator } = await import(`file:///${orcGenPath}`);

// Initialize generators
const elvenGenerator = new NameGenerator(components, connectors);
const dwarvenGenerator = new DwarvenNameGenerator(dwarvenFirstNames, dwarvenClanNames);
const gnomishGenerator = new GnomishNameGenerator(gnomishPersonalNames, gnomishClanNames, gnomishNicknames);
const halflingGenerator = new HalflingNameGenerator(halflingPersonalNames, halflingFamilyNames, halflingNicknames);
const orcGenerator = new OrcNameGenerator(orcPersonalNames, orcClanNames, orcEpithets);

// Test configuration
const SAMPLES = 100;

// Test definitions
const TESTS = {
    elven: {
        generator: elvenGenerator,
        subraces: ["high-elf", "sun-elf", "moon-elf", "wood-elf", "drow-male", "drow-female"],
        complexities: ["simple", "auto", "complex"],
        generate: (gen, subrace, complexity) => {
            return gen.generate({
                subrace: subrace,
                complexity: complexity,
                style: subrace === "wood-elf" ? "martial" : "lyrical"
            });
        }
    },
    dwarven: {
        generator: dwarvenGenerator,
        subraces: ["general"],
        complexities: ["first", "clan", "full"],
        generate: (gen, subrace, complexity) => {
            return gen.generate({
                nameType: complexity,
                gender: "neutral",
                subrace: subrace
            });
        }
    },
    gnomish: {
        generator: gnomishGenerator,
        subraces: ["rock"],
        complexities: ["personal", "clan", "full"],
        generate: (gen, subrace, complexity) => {
            return gen.generate({
                nameType: complexity,
                gender: "neutral",
                subrace: subrace,
                includeNickname: complexity === "full"
            });
        }
    },
    halfling: {
        generator: halflingGenerator,
        subraces: ["lightfoot"],
        complexities: ["personal", "family", "full"],
        generate: (gen, subrace, complexity) => {
            return gen.generate({
                nameType: complexity,
                gender: "neutral",
                subrace: subrace
            });
        }
    },
    orc: {
        generator: orcGenerator,
        subraces: ["general"],
        complexities: ["personal", "epithet", "full"],
        generate: (gen, subrace, complexity) => {
            return gen.generate({
                nameType: complexity
            });
        }
    }
};

const results = {};

console.log("=".repeat(70));
console.log("COMPREHENSIVE NAME GENERATION TEST - ALL SPECIES & SUBRACES");
console.log("=".repeat(70));
console.log(`Sample size: ${SAMPLES} names per combination`);
console.log("");

// Suppress console warnings/errors during generation
const originalWarn = console.warn;
const originalError = console.error;

// Run tests
for (const [species, config] of Object.entries(TESTS)) {
    results[species] = {};
    console.log(`${species.toUpperCase()}`);
    console.log("-".repeat(70));

    for (const subrace of config.subraces) {
        results[species][subrace] = {};
        console.log(`  ${subrace}:`);

        for (const complexity of config.complexities) {
            const generated = [];
            const errors = [];
            const warnings = [];

            console.warn = (...args) => warnings.push(args.join(" "));
            console.error = (...args) => warnings.push(args.join(" "));

            for (let i = 0; i < SAMPLES; i++) {
                try {
                    const result = config.generate(config.generator, subrace, complexity);

                    // Extract name from result (different generators return different formats)
                    let name = null;
                    if (result) {
                        if (typeof result === "string") {
                            name = result;
                        } else if (result.name) {
                            name = result.name;
                        } else if (result.firstName) {
                            name = result.firstName;
                        } else if (result.text) {
                            name = result.text;
                        }
                    }

                    if (name) {
                        generated.push(name);
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

            results[species][subrace][complexity] = {
                generated: generated.length,
                unique: unique,
                duplicates: duplicates,
                duplicateRate: `${duplicateRate}%`,
                errors: errors.length,
                errorRate: `${errorRate}%`,
                warnings: warnings.length
            };

            console.log(
                `    ${complexity.padEnd(10)}: ${unique.toString().padStart(3)} unique / ${generated.length.toString().padStart(3)} generated | ${duplicateRate}% duplicates | ${errorRate}% errors`
            );
        }
    }
    console.log("");
}

// Summary
console.log("=".repeat(70));
console.log("SUMMARY");
console.log("=".repeat(70));

let totalGenerated = 0;
let totalUnique = 0;
let totalDuplicates = 0;
let totalErrors = 0;

for (const [species, speciesResults] of Object.entries(results)) {
    console.log(`\n${species.toUpperCase()}:`);
    for (const [subrace, subraceResults] of Object.entries(speciesResults)) {
        console.log(`  ${subrace}:`);
        for (const [complexity, stats] of Object.entries(subraceResults)) {
            console.log(
                `    ${complexity.padEnd(10)}: ${stats.unique} unique, ${stats.duplicateRate} duplicates, ${stats.errorRate} errors`
            );
            totalGenerated += stats.generated;
            totalUnique += stats.unique;
            totalDuplicates += stats.duplicates;
            totalErrors += stats.errors;
        }
    }
}

console.log("\n" + "=".repeat(70));
console.log("OVERALL STATISTICS");
console.log("=".repeat(70));
console.log(`Total generated: ${totalGenerated}`);
console.log(`Total unique: ${totalUnique}`);
console.log(`Total duplicates: ${totalDuplicates} (${((totalDuplicates / totalGenerated) * 100).toFixed(1)}%)`);
console.log(`Total errors: ${totalErrors} (${((totalErrors / totalGenerated) * 100).toFixed(1)}%)`);
console.log(`Overall uniqueness: ${((totalUnique / totalGenerated) * 100).toFixed(1)}%`);

// Save results
import { writeFileSync } from "fs";
writeFileSync(join(projectRoot, "test_results_all_generators.json"), JSON.stringify(results, null, 2), "utf-8");

console.log("\nResults saved to test_results_all_generators.json");
