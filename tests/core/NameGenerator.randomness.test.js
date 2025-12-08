import { describe, it, expect, beforeEach } from "vitest";
import { NameGenerator } from "../../js/core/NameGenerator.js";
import { loadTestData } from "../helpers/loadTestData.js";

describe("NameGenerator - Randomness & Uniqueness (Real Data)", () => {
    let generator;
    let realComponents;
    let realConnectors;

    beforeEach(() => {
        // Load real data for comprehensive testing using filesystem (works in Node.js)
        const data = loadTestData();
        realComponents = data.components;
        realConnectors = data.connectors;
        generator = new NameGenerator(realComponents, realConnectors);
    });

    describe("Complex Mode - 10B+ Combination Space", () => {
        it("should have massive combination space (duplicates should be extremely rare)", () => {
            const names = new Set();
            const attempts = 1000; // Test with 1000 generations

            for (let i = 0; i < attempts; i++) {
                const result = generator.generate({
                    subrace: "high-elf",
                    complexity: "complex",
                    targetSyllables: 4,
                    style: "neutral"
                });
                names.add(result.name);
            }

            // With 10B+ combinations, duplicates should be extremely rare
            const uniqueRate = names.size / attempts;
            const duplicateRate = 1 - uniqueRate;

            expect(duplicateRate).toBeLessThan(0.05); // Less than 5% duplicates
            expect(uniqueRate).toBeGreaterThan(0.95); // More than 95% unique

            console.log(`Generated ${attempts} names, ${names.size} unique (${(uniqueRate * 100).toFixed(2)}% unique)`);
        });

        it("should generate diverse names even with 10,000 attempts", () => {
            const names = new Set();
            const componentCombinations = new Set();
            const attempts = 10000;

            for (let i = 0; i < attempts; i++) {
                const result = generator.generate({
                    subrace: "high-elf",
                    complexity: "complex",
                    targetSyllables: 4,
                    style: "neutral"
                });

                names.add(result.name);

                // Track component combinations
                if (result.components) {
                    const combo = result.components
                        .map((c) => c.component.root)
                        .sort()
                        .join("+");
                    componentCombinations.add(combo);
                }
            }

            // Even with 10k attempts, should have high diversity
            // With syllable constraints and subrace rules, 85%+ is still excellent
            const uniqueRate = names.size / attempts;
            expect(uniqueRate).toBeGreaterThan(0.85); // At least 85% unique (realistic with constraints)

            console.log(`10k attempts: ${names.size} unique names (${(uniqueRate * 100).toFixed(2)}% unique)`);
            console.log(`${componentCombinations.size} unique component combinations`);
        });
    });

    describe("Anti-Repeat Logic Effectiveness", () => {
        it("should avoid immediate component repeats", () => {
            const componentRoots = [];
            const recentComponents = [];

            // Generate 20 names in a row
            for (let i = 0; i < 20; i++) {
                const result = generator.generate({
                    subrace: "high-elf",
                    complexity: "complex",
                    targetSyllables: 4,
                    style: "neutral"
                });

                if (result.components) {
                    const roots = result.components.map((c) => c.component.root);
                    componentRoots.push(...roots);

                    // Check last 5 generations don't repeat
                    if (recentComponents.length >= 5) {
                        const lastFiveRoots = new Set();
                        recentComponents.slice(-5).forEach((comps) => {
                            comps.forEach((root) => lastFiveRoots.add(root));
                        });

                        // Current generation should avoid recent roots
                        const overlap = roots.filter((root) => lastFiveRoots.has(root));
                        expect(overlap.length).toBeLessThan(roots.length); // Not all should repeat
                    }

                    recentComponents.push(roots);
                }
            }
        });

        it("should track recently used components correctly", () => {
            generator.generate({
                subrace: "high-elf",
                complexity: "simple",
                targetSyllables: 3,
                style: "neutral"
            });

            // Generate 5 more names
            for (let i = 0; i < 5; i++) {
                generator.generate({
                    subrace: "high-elf",
                    complexity: "simple",
                    targetSyllables: 3,
                    style: "neutral"
                });
            }

            // Generator should have tracked recent usage
            expect(generator.recentlyUsed.length).toBeGreaterThan(0);
            expect(generator.recentlyUsed.length).toBeLessThanOrEqual(5); // Max 5 history
        });
    });

    describe("Performance with Large Combination Space", () => {
        it("should generate names quickly despite 10B+ combinations", () => {
            const startTime = performance.now();
            const count = 100;

            for (let i = 0; i < count; i++) {
                generator.generate({
                    subrace: "high-elf",
                    complexity: "complex",
                    targetSyllables: 4,
                    style: "neutral"
                });
            }

            const endTime = performance.now();
            const avgTime = (endTime - startTime) / count;

            // Should be fast (less than 50ms per name on average)
            expect(avgTime).toBeLessThan(50);

            console.log(`Average generation time: ${avgTime.toFixed(2)}ms per name`);
        });

        it("should handle generateMultiple efficiently", () => {
            const startTime = performance.now();
            const results = generator.generateMultiple(50, {
                subrace: "high-elf",
                complexity: "complex",
                targetSyllables: 4,
                style: "neutral"
            });

            const endTime = performance.now();
            const totalTime = endTime - startTime;

            expect(results.length).toBe(50);
            expect(totalTime).toBeLessThan(5000); // Should complete in under 5 seconds

            // Verify all are unique
            const uniqueNames = new Set(results.map((r) => r.name));
            expect(uniqueNames.size).toBe(50);

            console.log(`Generated 50 unique names in ${totalTime.toFixed(2)}ms`);
        });
    });

    describe("Distribution and Fairness", () => {
        it("should have good component distribution across generations", () => {
            const componentUsage = new Map();
            const attempts = 500;

            for (let i = 0; i < attempts; i++) {
                const result = generator.generate({
                    subrace: "high-elf",
                    complexity: "complex",
                    targetSyllables: 4,
                    style: "neutral"
                });

                if (result.components) {
                    result.components.forEach((comp) => {
                        const root = comp.component.root;
                        componentUsage.set(root, (componentUsage.get(root) || 0) + 1);
                    });
                }
            }

            // Should use multiple different components
            expect(componentUsage.size).toBeGreaterThan(10);

            // No single component should dominate (>50% usage)
            const maxUsage = Math.max(...Array.from(componentUsage.values()));
            const maxPercentage = maxUsage / (attempts * 3); // Rough estimate
            expect(maxPercentage).toBeLessThan(0.5);
        });
    });

    describe("Subrace-Specific Randomness", () => {
        it("should generate diverse names for each subrace", () => {
            const subraces = ["high-elf", "wood-elf", "moon-elf", "sun-elf"];
            const subraceNames = {};

            subraces.forEach((subrace) => {
                const names = new Set();
                for (let i = 0; i < 100; i++) {
                    const result = generator.generate({
                        subrace,
                        complexity: "complex",
                        targetSyllables: 4,
                        style: "neutral"
                    });
                    names.add(result.name);
                }
                subraceNames[subrace] = names.size;
            });

            // Each subrace should have good diversity
            Object.values(subraceNames).forEach((uniqueCount) => {
                expect(uniqueCount).toBeGreaterThan(50); // At least 50% unique in 100 attempts
            });
        });
    });
});
