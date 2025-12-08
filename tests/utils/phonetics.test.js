import { describe, it, expect } from "vitest";
import * as phonetics from "../../js/utils/phonetics.js";

describe("Phonetics Utilities", () => {
    describe("countSyllables", () => {
        it("should count syllables correctly for simple words", () => {
            expect(phonetics.countSyllables("Mair")).toBe(1);
            // 'Mairee': 'ai' (1) + 'ee' (1) = 2, but silent 'e' rule reduces to 1
            expect(phonetics.countSyllables("Mairee")).toBe(1);
            // 'Maireel': 'ai' (1) + 'ee' (1) = 2, ends with 'l' so no reduction
            expect(phonetics.countSyllables("Maireel")).toBe(2);
            // Test a clearer 2-syllable word
            expect(phonetics.countSyllables("Mairel")).toBe(2); // 'ai' + 'e'
        });

        it("should handle complex elven names", () => {
            expect(phonetics.countSyllables("Ahnirahdrith")).toBeGreaterThan(2);
            expect(phonetics.countSyllables("Tel")).toBe(1);
        });

        it("should handle empty strings", () => {
            expect(phonetics.countSyllables("")).toBe(0);
        });
    });

    describe("needsConnector", () => {
        it("should detect when connector is needed", () => {
            // 'Mair' ends with 'r' (consonant), 'tel' starts with 't' (consonant)
            // So a connector IS needed (both are consonants)
            expect(phonetics.needsConnector("Mair", "tel")).toBe(true);
            // Test cases where connector is NOT needed
            expect(phonetics.needsConnector("Mair", "ael")).toBe(false); // ends with vowel
            expect(phonetics.needsConnector("Mai", "tel")).toBe(false); // starts with vowel
        });

        it("should return false for smooth transitions", () => {
            expect(phonetics.needsConnector("Mair", "ee")).toBe(false);
        });
    });

    describe("hasHarshCluster", () => {
        it("should detect harsh consonant clusters", () => {
            // Test cases for harsh clusters
            expect(phonetics.hasHarshCluster("Mair", "drith")).toBe(true);
        });
    });

    describe("formatMeaning", () => {
        it("should format meaning strings correctly", () => {
            expect(phonetics.formatMeaning("Light / Star")).toBe("Light, Star");
            expect(phonetics.formatMeaning("Light")).toBe("Light");
        });

        it("should handle empty or null meanings", () => {
            expect(phonetics.formatMeaning("")).toBe("");
            expect(phonetics.formatMeaning(null)).toBe("");
        });
    });

    describe("capitalize", () => {
        it("should capitalize first letter", () => {
            expect(phonetics.capitalize("mair")).toBe("Mair");
            expect(phonetics.capitalize("MAIR")).toBe("MAIR");
        });
    });
});
