import { describe, it, expect, beforeEach } from "vitest";
import { GnomishNameGenerator } from "../../js/core/GnomishNameGenerator.js";
import { loadTestData } from "../helpers/loadTestData.js";

describe("GnomishNameGenerator - Randomness & Uniqueness (Real Data)", () => {
    let generator;
    let realPersonalNames;
    let realClanNames;
    let realNicknames;

    beforeEach(() => {
        // Load real data for comprehensive testing
        const data = loadTestData();
        realPersonalNames = data.gnomishPersonalNames || [];
        realClanNames = data.gnomishClanNames || [];
        realNicknames = data.gnomishNicknames || [];
        generator = new GnomishNameGenerator(realPersonalNames, realClanNames, realNicknames);
    });

    describe("Anti-Repeat Logic Effectiveness", () => {
        it("should avoid immediate component repeats in personal names", () => {
            const componentRoots = [];
            const recentComponents = [];

            // Generate 20 names in a row
            for (let i = 0; i < 20; i++) {
                const result = generator.generate({
                    subrace: "rock",
                    nameType: "personal",
                    gender: "neutral"
                });

                // Extract roots from the name (we'll track what we can)
                // Since personal names combine prefix + suffix, we track the full name
                const nameKey = result.name.toLowerCase();
                componentRoots.push(nameKey);

                // Check last 5 generations don't repeat
                if (recentComponents.length >= 5) {
                    const lastFiveNames = recentComponents.slice(-5);
                    expect(lastFiveNames).not.toContain(nameKey);
                }

                recentComponents.push(nameKey);
                if (recentComponents.length > 5) {
                    recentComponents.shift();
                }
            }

            // Should have good diversity
            const uniqueNames = new Set(componentRoots);
            const uniqueRate = uniqueNames.size / componentRoots.length;
            expect(uniqueRate).toBeGreaterThan(0.7); // At least 70% unique in 20 attempts
        });

        it("should avoid immediate repeats in clan names", () => {
            const clanNames = [];
            const recentClans = [];

            // Generate 20 clan names in a row
            for (let i = 0; i < 20; i++) {
                const result = generator.generate({
                    subrace: "rock",
                    nameType: "clan"
                });

                const clanName = result.name.toLowerCase();
                clanNames.push(clanName);

                // Check last 5 generations don't repeat
                if (recentClans.length >= 5) {
                    const lastFiveClans = recentClans.slice(-5);
                    expect(lastFiveClans).not.toContain(clanName);
                }

                recentClans.push(clanName);
                if (recentClans.length > 5) {
                    recentClans.shift();
                }
            }

            // Should have good diversity
            const uniqueClans = new Set(clanNames);
            const uniqueRate = uniqueClans.size / clanNames.length;
            expect(uniqueRate).toBeGreaterThan(0.6); // At least 60% unique in 20 attempts
        });

        it("should avoid immediate repeats in nicknames", () => {
            const nicknames = [];
            const recentNicknames = [];

            // Generate 20 nicknames in a row
            for (let i = 0; i < 20; i++) {
                const result = generator.generate({
                    nameType: "nickname"
                });

                // Extract nickname text (remove quotes)
                const nicknameText = result.name.replace(/"/g, "").toLowerCase();
                nicknames.push(nicknameText);

                // Check last 5 generations don't repeat
                if (recentNicknames.length >= 5) {
                    const lastFiveNicknames = recentNicknames.slice(-5);
                    expect(lastFiveNicknames).not.toContain(nicknameText);
                }

                recentNicknames.push(nicknameText);
                if (recentNicknames.length > 5) {
                    recentNicknames.shift();
                }
            }

            // Should have good diversity
            const uniqueNicknames = new Set(nicknames);
            const uniqueRate = uniqueNicknames.size / nicknames.length;
            expect(uniqueRate).toBeGreaterThan(0.6); // At least 60% unique in 20 attempts
        });
    });

    describe("Full Name Diversity", () => {
        it("should generate diverse full names with 100 attempts", () => {
            const names = new Set();
            const attempts = 100;

            for (let i = 0; i < attempts; i++) {
                const result = generator.generate({
                    subrace: "rock",
                    nameType: "full",
                    gender: "neutral",
                    includeNickname: true
                });
                names.add(result.name);
            }

            // With 71 personal names, 33 clan names, 49 nicknames
            // Theoretical max: 71 * 33 * 49 = ~114,807 combinations
            // But personal names combine prefix+suffix, so actual is lower
            // Still should have very high diversity
            const uniqueRate = names.size / attempts;
            expect(uniqueRate).toBeGreaterThan(0.85); // At least 85% unique in 100 attempts

            console.log(
                `Generated ${attempts} gnome names, ${names.size} unique (${(uniqueRate * 100).toFixed(2)}% unique)`
            );
        });

        it("should generate diverse full names even with 1000 attempts", () => {
            const names = new Set();
            const attempts = 1000;

            for (let i = 0; i < attempts; i++) {
                const result = generator.generate({
                    subrace: "rock",
                    nameType: "full",
                    gender: "neutral",
                    includeNickname: true
                });
                names.add(result.name);
            }

            // Even with 1000 attempts, should maintain high diversity
            const uniqueRate = names.size / attempts;
            expect(uniqueRate).toBeGreaterThan(0.75); // At least 75% unique in 1000 attempts

            console.log(
                `Generated ${attempts} gnome names, ${names.size} unique (${(uniqueRate * 100).toFixed(2)}% unique)`
            );
        });
    });

    describe("Component Pool Size Validation", () => {
        it("should have sufficient component pools", () => {
            expect(realPersonalNames.length).toBeGreaterThan(50);
            expect(realClanNames.length).toBeGreaterThan(20);
            expect(realNicknames.length).toBeGreaterThan(30);

            console.log(
                `Component pools: ${realPersonalNames.length} personal, ${realClanNames.length} clan, ${realNicknames.length} nickname`
            );
        });
    });
});
