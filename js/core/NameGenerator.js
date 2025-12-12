// Main Name Generator class following Espruar naming rules
import { CONFIG } from "../config.js";
import * as phonetics from "../utils/phonetics.js";

/**
 * High Elf Name Generator
 * Implements the Espruar "Lego System" with interchangeable components
 */
export class NameGenerator {
    constructor(components, connectors) {
        this.components = components;
        this.connectors = connectors;

        // Pre-filter components for faster access
        this.prefixCandidates = components.filter((c) => c.can_be_prefix && c.prefix_text);
        this.suffixCandidates = components.filter((c) => c.can_be_suffix && c.suffix_text);

        // Track recently used components to reduce repeats
        this.recentlyUsed = [];
        this.maxRecentHistory = 5; // Remember last 5 generations
    }

    /**
     * Generate a High Elf name based on user preferences
     * @param {Object} options - Generation options
     * @returns {Object} Generated name data
     */
    generate(options = {}) {
        const {
            complexity = CONFIG.DEFAULT_COMPLEXITY,
            targetSyllables = CONFIG.DEFAULT_SYLLABLES,
            style = CONFIG.DEFAULT_STYLE,
            subrace = "high-elf" // NEW: subrace selection
        } = options;

        // Map drow + gender to internal tags
        let effectiveSubrace = subrace;
        if (subrace === "drow") {
            // Use gender/style selector to determine drow variant
            effectiveSubrace = style === "feminine" ? "drow-female" : "drow-male";
        }

        // Wood Elves prefer shorter names (2-3 syllables)
        // Drow females prefer longer names (4-6 syllables)
        // Drow males prefer shorter names (2-3 syllables)
        let adjustedTarget = targetSyllables;
        if (subrace === "wood-elf" || effectiveSubrace === "drow-male") {
            adjustedTarget = Math.max(2, targetSyllables - 1); // Lower by 1, min 2
        } else if (effectiveSubrace === "drow-female") {
            adjustedTarget = Math.min(6, targetSyllables + 1); // Higher by 1, max 6
        }

        let bestName = null;
        let bestDiff = 100;
        const acceptableCandidates = []; // Store all acceptable candidates for random selection

        // Define subrace-specific minimums and maximums
        const baseMinSyllables =
            effectiveSubrace === "drow-female" ? 4 : subrace === "wood-elf" || effectiveSubrace === "drow-male" ? 2 : 0;
        const maxSyllables =
            effectiveSubrace === "drow-female" ? 6 : subrace === "wood-elf" || effectiveSubrace === "drow-male" ? 3 : 5;

        // Try multiple attempts to get close to target syllable count
        // Increase attempts if we need to meet minimums (more attempts for stricter requirements)
        const maxAttempts = baseMinSyllables > 0 ? CONFIG.MAX_GENERATION_ATTEMPTS * 2 : CONFIG.MAX_GENERATION_ATTEMPTS;

        for (let attempts = 0; attempts < maxAttempts; attempts++) {
            // Adaptive minimum for drow-female to reduce starvation on later attempts
            let minSyllables = baseMinSyllables;
            if (effectiveSubrace === "drow-female") {
                if (attempts > maxAttempts) {
                    minSyllables = Math.max(2, baseMinSyllables - 2);
                } else if (attempts > maxAttempts / 2) {
                    minSyllables = Math.max(2, baseMinSyllables - 1);
                }
            }

            const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);

            // Reject candidates that don't meet subrace minimums or exceed maximums
            if (minSyllables > 0 && candidate.syllables < minSyllables) {
                continue; // Skip this candidate, try again
            }
            if (candidate.syllables > maxSyllables) {
                continue; // Skip this candidate, try again
            }

            const diff = Math.abs(candidate.syllables - adjustedTarget);

            // Track best match
            if (diff < bestDiff) {
                bestDiff = diff;
                bestName = candidate;
            }

            // Store acceptable candidates (within target ±1) for random selection
            if (diff <= CONFIG.ACCEPTABLE_SYLLABLE_DIFFERENCE) {
                acceptableCandidates.push(candidate);
            }

            // Stop early if we have enough acceptable candidates (adds randomness)
            if (acceptableCandidates.length >= 3) {
                // Randomly pick from acceptable candidates instead of always best
                bestName = acceptableCandidates[Math.floor(Math.random() * acceptableCandidates.length)];
                break;
            }

            // Stop if we're close enough and have at least one acceptable candidate
            if (diff <= CONFIG.ACCEPTABLE_SYLLABLE_DIFFERENCE && acceptableCandidates.length > 0) {
                // 50% chance to use best, 50% chance to use random acceptable
                if (Math.random() < 0.5 && acceptableCandidates.length > 1) {
                    bestName = acceptableCandidates[Math.floor(Math.random() * acceptableCandidates.length)];
                }
                break;
            }
        }

        // Final validation: ensure we have a valid name meeting subrace minimums
        // (This is a fallback in case the main loop didn't find any valid candidates)
        if (baseMinSyllables > 0) {
            // If we don't have a valid name yet, keep trying until we get one
            if (!bestName || bestName.syllables < baseMinSyllables) {
                // Last resort: try many more times to get a valid name
                for (let retry = 0; retry < 50; retry++) {
                    const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
                    if (candidate.syllables >= baseMinSyllables) {
                        bestName = candidate;
                        break;
                    }
                }
            }
        }

        // Safety check: if we still don't have a valid name, something is wrong
        // But we should have found one by now with all the retries
        if (!bestName || (baseMinSyllables > 0 && bestName.syllables < baseMinSyllables)) {
            console.warn(`Failed to generate valid name for ${subrace} ${style} after ${maxAttempts + 50} attempts`);
            // Keep trying until we get a valid name (absolute last resort)
            for (let finalRetry = 0; finalRetry < 100; finalRetry++) {
                const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
                if (baseMinSyllables === 0 || candidate.syllables >= baseMinSyllables) {
                    bestName = candidate;
                    break;
                }
            }
            // If we STILL don't have a valid name, something is seriously wrong
            // But we must return something, so return the last attempt even if invalid
            if (!bestName || (baseMinSyllables > 0 && bestName.syllables < baseMinSyllables)) {
                console.error(
                    `CRITICAL: Could not generate valid name for ${subrace} ${style} after ${maxAttempts + 150} attempts`
                );
                bestName = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
            }
        }

        // Final validation: ensure we have a valid name meeting subrace minimums
        // (This is a fallback in case the main loop didn't find any valid candidates)
        if (baseMinSyllables > 0) {
            // If we don't have a valid name yet, keep trying until we get one
            if (!bestName || bestName.syllables < baseMinSyllables) {
                // Last resort: try many more times to get a valid name
                for (let retry = 0; retry < 50; retry++) {
                    const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
                    if (candidate.syllables >= baseMinSyllables) {
                        bestName = candidate;
                        break;
                    }
                }
            }
        }

        // Safety check: if we still don't have a valid name, something is wrong
        // But we should have found one by now with all the retries
        if (!bestName || (baseMinSyllables > 0 && bestName.syllables < baseMinSyllables)) {
            console.warn(`Failed to generate valid name for ${subrace} ${style} after ${maxAttempts + 50} attempts`);
            // Keep trying until we get a valid name (absolute last resort)
            for (let finalRetry = 0; finalRetry < 100; finalRetry++) {
                const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
                if (baseMinSyllables === 0 || candidate.syllables >= baseMinSyllables) {
                    bestName = candidate;
                    break;
                }
            }
            // If we STILL don't have a valid name, something is seriously wrong
            // But we must return something, so return the last attempt even if invalid
            if (!bestName || (baseMinSyllables > 0 && bestName.syllables < baseMinSyllables)) {
                console.error(
                    `CRITICAL: Could not generate valid name for ${subrace} ${style} after ${maxAttempts + 150} attempts`
                );
                bestName = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
            }
        }

        // Final validation: ensure we have a valid name meeting subrace minimums
        // (This is a fallback in case the main loop didn't find any valid candidates)
        if (baseMinSyllables > 0) {
            // If we don't have a valid name yet, keep trying until we get one
            if (!bestName || bestName.syllables < baseMinSyllables) {
                // Last resort: try many more times to get a valid name
                for (let retry = 0; retry < 50; retry++) {
                    const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
                    if (candidate.syllables >= baseMinSyllables) {
                        bestName = candidate;
                        break;
                    }
                }
            }
        }

        // Safety check: if we still don't have a valid name, something is wrong
        // But we should have found one by now with all the retries
        if (!bestName || (baseMinSyllables > 0 && bestName.syllables < baseMinSyllables)) {
            console.warn(`Failed to generate valid name for ${subrace} ${style} after ${maxAttempts + 50} attempts`);
            // Keep trying until we get a valid name (absolute last resort)
            for (let finalRetry = 0; finalRetry < 100; finalRetry++) {
                const candidate = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
                if (baseMinSyllables === 0 || candidate.syllables >= baseMinSyllables) {
                    bestName = candidate;
                    break;
                }
            }
            // If we STILL don't have a valid name, something is seriously wrong
            // But we must return something, so return the last attempt even if invalid
            if (!bestName || (baseMinSyllables > 0 && bestName.syllables < baseMinSyllables)) {
                console.error(
                    `CRITICAL: Could not generate valid name for ${subrace} ${style} after ${maxAttempts + 150} attempts`
                );
                bestName = this._generateCandidate(complexity, style, effectiveSubrace, adjustedTarget);
            }
        }

        // Track components used in this generation
        this._trackUsedComponents(bestName);

        return bestName;
    }

    /**
     * Generate multiple unique names
     * @param {number} count - Number of names to generate
     * @param {Object} options - Generation options (same as generate)
     * @returns {Array<Object>} Array of generated name data
     */
    generateMultiple(count, options = {}) {
        const results = [];
        const seenNames = new Set();
        const maxAttempts = count * 10; // Prevent infinite loops
        let attempts = 0;

        while (results.length < count && attempts < maxAttempts) {
            attempts++;
            const nameData = this.generate(options);

            // Only add if unique
            if (!seenNames.has(nameData.name)) {
                seenNames.add(nameData.name);
                results.push(nameData);
            }
        }

        return results;
    }

    /**
     * Track components used in a name to avoid immediate repeats
     * @private
     */
    _trackUsedComponents(nameData) {
        const usedRoots = new Set();

        // Standard mode
        if (nameData.prefix) {
            usedRoots.add(nameData.prefix.root);
        }
        if (nameData.suffix) {
            usedRoots.add(nameData.suffix.root);
        }

        // Complex mode
        if (nameData.components) {
            nameData.components.forEach((comp) => {
                usedRoots.add(comp.component.root);
            });
        }

        // Add to history (keep last N)
        this.recentlyUsed.push(usedRoots);
        if (this.recentlyUsed.length > this.maxRecentHistory) {
            this.recentlyUsed.shift();
        }
    }

    /**
     * Generate a single name candidate
     * @private
     */
    _generateCandidate(complexity, style, subrace, targetSyllables) {
        // Route to complex mode for 3+ component names
        if (complexity === "complex") {
            return this._generateComplexCandidate(style, subrace, targetSyllables);
        }

        // For Drow female with high target (4-6 syllables), use complex mode
        // to ensure we can meet the minimum syllable requirement
        // Note: subrace parameter here is actually effectiveSubrace ('drow-female' or 'drow-male')
        if (complexity === "auto" && subrace === "drow-female" && targetSyllables >= 4) {
            // Use complex mode to get enough syllables for Drow female names
            return this._generateComplexCandidate(style, subrace, targetSyllables);
        }

        // Standard 2-component generation
        let prefix = this._selectPrefix(style, subrace);

        // Check if prefix is a complete famous character name (should be used as-is)
        const isCompleteFamousName =
            this._isFamous(prefix) &&
            prefix.prefix_text &&
            (!prefix.can_be_suffix || !prefix.suffix_text) &&
            complexity === "simple";

        // If it's a complete famous character name, use it as-is without combining
        if (isCompleteFamousName) {
            const fullName = phonetics.capitalize(phonetics.cleanComponentText(prefix.prefix_text));
            const meaning = phonetics.formatMeaning(prefix.prefix_meaning);
            const pronunciation = prefix.prefix_phonetic || "";

            return {
                name: fullName,
                prefix: prefix,
                suffix: null,
                connector: null,
                meaning,
                pronunciation,
                syllables: phonetics.countSyllables(fullName),
                genderPrefixVowel: null,
                finalVowel: null
            };
        }

        let suffix = this._selectSuffix(style, subrace);

        // Reduce frequency of famous names for non-Drow subraces
        // Heavily bias against famous names (95% chance to reroll)
        const isNonDrowElf =
            subrace === "high-elf" || subrace === "sun-elf" || subrace === "moon-elf" || subrace === "wood-elf";
        if (isNonDrowElf) {
            let nonDrowFamousGuard = 0;
            while (this._isFamous(prefix) && nonDrowFamousGuard < 10 && Math.random() < 0.95) {
                prefix = this._selectPrefix(style, subrace);
                nonDrowFamousGuard++;
                // Re-check if new prefix is complete famous name
                const newIsComplete =
                    this._isFamous(prefix) &&
                    prefix.prefix_text &&
                    (!prefix.can_be_suffix || !prefix.suffix_text) &&
                    complexity === "simple";
                if (newIsComplete) {
                    const fullName = phonetics.capitalize(phonetics.cleanComponentText(prefix.prefix_text));
                    const meaning = phonetics.formatMeaning(prefix.prefix_meaning);
                    const pronunciation = prefix.prefix_phonetic || "";

                    return {
                        name: fullName,
                        prefix: prefix,
                        suffix: null,
                        connector: null,
                        meaning,
                        pronunciation,
                        syllables: phonetics.countSyllables(fullName),
                        genderPrefixVowel: null,
                        finalVowel: null
                    };
                }
            }
        }

        // Drow simple: prefer non-famous prefixes; allow famous suffix with low odds; avoid famous+famous
        if (subrace === "drow" || subrace === "drow-female" || subrace === "drow-male") {
            let refGuard = 0;
            if (complexity === "simple") {
                // Bias away from famous prefix
                while (this._isFamous(prefix) && refGuard < 5 && Math.random() < 0.7) {
                    prefix = this._selectPrefix(style, subrace);
                    refGuard++;
                }
            }
            let sufGuard = 0;
            if (complexity === "simple") {
                // Famous suffix allowed but try to avoid pairing famous+famous
                while (this._isFamous(suffix) && (this._isFamous(prefix) || Math.random() < 0.5) && sufGuard < 5) {
                    suffix = this._selectSuffix(style, subrace);
                    sufGuard++;
                }
            }
        }

        // For Drow, avoid identical root pairs in simple mode (unless we intentionally allow it)
        if (subrace === "drow" || subrace === "drow-female" || subrace === "drow-male") {
            let guard = 0;
            while (prefix.root === suffix.root && guard < 5) {
                suffix = this._selectSuffix(style, subrace);
                guard++;
            }
            // Avoid famous+famous pairing in simple mode
            let famousGuard = 0;
            while (this._isFamous(prefix) && this._isFamous(suffix) && famousGuard < 5) {
                suffix = this._selectSuffix(style, subrace);
                famousGuard++;
            }
        }

        // Get clean text (remove hyphens)
        const prefixText = phonetics.cleanComponentText(prefix.prefix_text);
        const suffixText = phonetics.cleanComponentText(suffix.suffix_text);

        // Determine if connector is needed
        let connector = null;
        let needsConnector = complexity === "auto" && phonetics.needsConnector(prefixText, suffixText);

        // Wood Elves discourage connectors - only use for REALLY harsh clusters
        if (subrace === "wood-elf" && needsConnector) {
            // Only use connector if it's a harsh cluster, not just any consonant collision
            needsConnector = phonetics.hasHarshCluster(prefixText, suffixText);
        }

        // Drow EMBRACE harsh clusters - don't use connectors to smooth them
        // BUT: Drow female needs connectors to reach 4-6 syllable minimum
        if ((subrace === "drow" || subrace === "drow-male" || subrace === "drow-female") && needsConnector) {
            // Drow female: allow connectors to meet 4-6 syllable requirement
            // Drow male: skip connectors (want harsh, clumsy sound)
            if (subrace === "drow-male" || (subrace === "drow" && style !== "feminine")) {
                needsConnector = false;
            }
        }

        if (needsConnector) {
            connector = this._selectConnector(style);
        }

        // Build the name
        const nameParts = [prefixText, connector ? phonetics.cleanComponentText(connector.text) : "", suffixText];

        const fullName = phonetics.capitalize(nameParts.join(""));
        const syllables = phonetics.countSyllables(fullName);

        // Build meaning string (include connector meaning if it exists)
        const prefixMeaning = phonetics.formatMeaning(prefix.prefix_meaning);
        const suffixMeaning = phonetics.formatMeaning(suffix.suffix_meaning);
        let meaning = prefixMeaning + " + " + suffixMeaning;

        // Add connector meaning if it has one
        if (connector && connector.meaning) {
            const connectorMeaning = phonetics.formatMeaning(connector.meaning);
            meaning = prefixMeaning + " + " + connectorMeaning + " + " + suffixMeaning;
        }

        // Build phonetic pronunciation
        let pronunciation = "";
        if (prefix.prefix_phonetic) {
            pronunciation += prefix.prefix_phonetic;
        }
        if (connector && connector.phonetic) {
            pronunciation += "-" + connector.phonetic;
        }
        if (suffix.suffix_phonetic) {
            pronunciation += "-" + suffix.suffix_phonetic;
        }

        return {
            name: fullName,
            baseForm: fullName,
            meaning,
            pronunciation,
            prefix,
            connector,
            suffix,
            syllables,
            genderPrefixVowel: null,
            finalVowel: null
        };
    }

    /**
     * Generate a complex name with 2-4 components (syllable-driven)
     * @private
     */
    _generateComplexCandidate(style, subrace, targetSyllables) {
        const components = [];
        const connectors = [];
        const nameParts = [];
        let currentSyllables = 0;
        const rootCounts = new Map(); // enforce max two uses per root
        let usedFamous = false; // avoid multiple famous components per name
        // Use the passed targetSyllables, not hardcoded

        // Get flexible components (can be either prefix or suffix)
        const flexibleComponents = this.components.filter(
            (c) => c.can_be_prefix && c.can_be_suffix && !c.is_gender_modifier
        );

        // Start with a flexible component (can be both prefix and suffix)
        // This ensures all non-final components are flexible
        let component = this._selectWeightedComponent(flexibleComponents, subrace);
        // Prevent over-using the same root (max 2 per name)
        let guardAttempts = 0;
        while (
            (rootCounts.get(component.root) >= 2 || (usedFamous && this._isFamous(component))) &&
            guardAttempts < 10
        ) {
            component = this._selectWeightedComponent(flexibleComponents, subrace);
            guardAttempts++;
        }
        let componentText = phonetics.cleanComponentText(component.prefix_text);
        let componentMeaning = phonetics.formatMeaning(component.prefix_meaning);

        components.push({ component, text: componentText, meaning: componentMeaning });
        nameParts.push(componentText);
        currentSyllables = phonetics.countSyllables(componentText);
        rootCounts.set(component.root, (rootCounts.get(component.root) || 0) + 1);
        if (this._isFamous(component)) {
            usedFamous = true;
        }

        let lastText = componentText;
        let attempts = 0;
        const maxComponents = 3; // Lowered from 4 - keep names shorter
        const minComponents = 2; // Always need at least 2 components

        // Keep adding components until we reach target syllables
        while (currentSyllables < targetSyllables && components.length < maxComponents && attempts < 10) {
            attempts++;

            // Select next component from flexible pool
            component = this._selectWeightedComponent(flexibleComponents, subrace);
            // Enforce max two uses of the same root in a single name
            let innerGuard = 0;
            while (
                (rootCounts.get(component.root) >= 2 || (usedFamous && this._isFamous(component))) &&
                innerGuard < 10
            ) {
                component = this._selectWeightedComponent(flexibleComponents, subrace);
                innerGuard++;
            }

            // Randomly use as prefix or suffix (ensure component has the required form)
            let useAsPrefix = Math.random() > 0.5;

            // If component doesn't have the preferred form, use the available one
            if (useAsPrefix && !component.prefix_text) {
                useAsPrefix = false;
            } else if (!useAsPrefix && !component.suffix_text) {
                useAsPrefix = true;
            }

            // Ensure we have a valid form (fallback if somehow both are missing)
            if (!component.prefix_text && !component.suffix_text) {
                // Skip this component and try again
                attempts--;
                continue;
            }

            componentText = phonetics.cleanComponentText(useAsPrefix ? component.prefix_text : component.suffix_text);
            componentMeaning = phonetics.formatMeaning(
                useAsPrefix ? component.prefix_meaning : component.suffix_meaning
            );

            // Check syllable count if we add this component
            const componentSyllables = phonetics.countSyllables(componentText);
            const projectedTotal = currentSyllables + componentSyllables;

            // Don't add if it would exceed target+1 (unless we need minimum components)
            if (projectedTotal > targetSyllables + 1 && components.length >= minComponents) {
                break;
            }

            // Check if we need a connector
            const needsConn =
                phonetics.needsConnector(lastText, componentText) || phonetics.hasHarshCluster(lastText, componentText);

            // Drow male: don't use connectors (embrace harsh clusters)
            const allowConnector = !(subrace === "drow-male" && needsConn);

            if (needsConn && allowConnector) {
                let connector = this._selectConnector(style);
                let connectorText = phonetics.cleanComponentText(connector.text);

                // Moon Elf vowel repetition (1/3 chance)
                if (subrace === "moon-elf" && Math.random() < 0.33) {
                    const matchingConnectors = this.connectors.filter((c) =>
                        phonetics.sharesVowelSound(c.text, componentText)
                    );
                    if (matchingConnectors.length > 0) {
                        connector = matchingConnectors[Math.floor(Math.random() * matchingConnectors.length)];
                        connectorText = phonetics.cleanComponentText(connector.text);
                    }
                }

                // Check if connector makes name too long
                const connectorSyllables = phonetics.countSyllables(connectorText);
                if (currentSyllables + connectorSyllables + componentSyllables > targetSyllables + 1) {
                    break;
                }

                connectors.push({ connector, text: connectorText });
                nameParts.push(connectorText);
                currentSyllables += connectorSyllables;
                lastText = connectorText;
            }

            // Add the component
            components.push({ component, text: componentText, meaning: componentMeaning });
            nameParts.push(componentText);
            currentSyllables += componentSyllables;
            rootCounts.set(component.root, (rootCounts.get(component.root) || 0) + 1);
            if (this._isFamous(component)) {
                usedFamous = true;
            }
            lastText = componentText;

            // Stop immediately if we've met the target (don't wait for next loop)
            if (currentSyllables >= targetSyllables && components.length >= minComponents) {
                break;
            }
        }

        // Ensure we end with a proper suffix if last component isn't suffix-capable
        const lastComponent = components[components.length - 1].component;
        if (!lastComponent.suffix_text || !lastComponent.can_be_suffix) {
            // Replace last component with a proper suffix
            let finalSuffix = this._selectSuffix(style, subrace);
            // Avoid exceeding root reuse limit
            let suffixGuard = 0;
            while (
                (rootCounts.get(finalSuffix.root) >= 2 || (usedFamous && this._isFamous(finalSuffix))) &&
                suffixGuard < 10
            ) {
                finalSuffix = this._selectSuffix(style, subrace);
                suffixGuard++;
            }
            const finalSuffixText = phonetics.cleanComponentText(finalSuffix.suffix_text);
            const finalSuffixMeaning = phonetics.formatMeaning(finalSuffix.suffix_meaning);

            // Remove last component
            components.pop();
            nameParts.pop();
            currentSyllables -= phonetics.countSyllables(lastText);

            // Get new lastText
            if (nameParts.length > 0) {
                lastText = nameParts[nameParts.length - 1];
            }

            // Check if connector needed (but not for Drow male)
            const needsConnector = phonetics.needsConnector(lastText, finalSuffixText);
            const allowConnector = !(subrace === "drow-male" && needsConnector);

            if (needsConnector && allowConnector) {
                const connector = this._selectConnector(style);
                const connectorText = phonetics.cleanComponentText(connector.text);

                connectors.push({ connector, text: connectorText });
                nameParts.push(connectorText);
            }

            components.push({
                component: finalSuffix,
                text: finalSuffixText,
                meaning: finalSuffixMeaning
            });
            nameParts.push(finalSuffixText);
            rootCounts.set(finalSuffix.root, (rootCounts.get(finalSuffix.root) || 0) + 1);
            if (this._isFamous(finalSuffix)) {
                usedFamous = true;
            }
        }

        // Build the final name - join first, THEN capitalize only first letter
        let fullName = phonetics.capitalize(nameParts.join("").toLowerCase());
        let syllables = phonetics.countSyllables(fullName);

        // Enforce subrace-specific minimums and maximums
        // Define min/max for complex mode
        const minSyllablesComplex =
            subrace === "drow-female" ? 4 : subrace === "wood-elf" || subrace === "drow-male" ? 2 : 2;
        const maxSyllablesComplex =
            subrace === "drow-female" ? 6 : subrace === "wood-elf" || subrace === "drow-male" ? 3 : 5;

        // Ensure we meet subrace-specific minimums
        // If we don't, add more components or connectors (prioritize minimum over target)
        if (syllables < minSyllablesComplex) {
            // Try to add another component to reach minimum (even if it exceeds target+1)
            for (let retry = 0; retry < 10 && syllables < minSyllablesComplex; retry++) {
                let extraComponent = this._selectWeightedComponent(flexibleComponents, subrace);
                let extraGuard = 0;
                while (
                    (rootCounts.get(extraComponent.root) >= 2 || (usedFamous && this._isFamous(extraComponent))) &&
                    extraGuard < 10
                ) {
                    extraComponent = this._selectWeightedComponent(flexibleComponents, subrace);
                    extraGuard++;
                }
                const extraText = phonetics.cleanComponentText(
                    extraComponent.prefix_text || extraComponent.suffix_text
                );
                const extraSyllables = phonetics.countSyllables(extraText);

                // Check if we need a connector (but not for Drow male)
                const needsConn = phonetics.needsConnector(lastText, extraText);
                const allowConnector = !(subrace === "drow-male" && needsConn);

                if (needsConn && allowConnector) {
                    const connector = this._selectConnector(style);
                    const connectorText = phonetics.cleanComponentText(connector.text);
                    const connectorSyllables = phonetics.countSyllables(connectorText);

                    // Don't add if it would exceed maximum
                    if (syllables + connectorSyllables + extraSyllables <= maxSyllablesComplex) {
                        connectors.push({ connector, text: connectorText });
                        nameParts.push(connectorText);
                        syllables += connectorSyllables;
                    }
                }

                // Add component if it doesn't exceed maximum
                if (
                    syllables + extraSyllables <= maxSyllablesComplex &&
                    (rootCounts.get(extraComponent.root) || 0) < 2
                ) {
                    components.push({
                        component: extraComponent,
                        text: extraText,
                        meaning: phonetics.formatMeaning(extraComponent.prefix_meaning || extraComponent.suffix_meaning)
                    });
                    nameParts.push(extraText);
                    syllables += extraSyllables;
                    lastText = extraText;
                    rootCounts.set(extraComponent.root, (rootCounts.get(extraComponent.root) || 0) + 1);
                    if (this._isFamous(extraComponent)) {
                        usedFamous = true;
                    }
                }

                if (syllables >= minSyllablesComplex) {
                    break;
                }
            }

            // Rebuild name if we added components
            fullName = phonetics.capitalize(nameParts.join("").toLowerCase());
            syllables = phonetics.countSyllables(fullName);
        }

        // Final check: enforce maximum syllables
        if (syllables > maxSyllablesComplex && components.length > 2) {
            // Remove last component if it causes us to exceed max
            components.pop();
            nameParts.pop();
            // Also remove last connector if present
            if (connectors.length > 0 && nameParts.length > components.length) {
                connectors.pop();
                nameParts.pop();
            }
            fullName = phonetics.capitalize(nameParts.join("").toLowerCase());
            syllables = phonetics.countSyllables(fullName);
        }

        // Build meaning string - ONLY component meanings, filter out empty ones
        const componentMeanings = components.map((c) => c.meaning).filter((m) => m && m.trim());
        const meaning = componentMeanings.join(" + ");

        // Build phonetic pronunciation
        const pronunciationParts = [];
        for (let i = 0; i < components.length; i++) {
            const comp = components[i];

            // Add component phonetic
            if (comp.component.prefix_phonetic && comp.component.can_be_prefix) {
                pronunciationParts.push(comp.component.prefix_phonetic);
            } else if (comp.component.suffix_phonetic && comp.component.can_be_suffix) {
                pronunciationParts.push(comp.component.suffix_phonetic);
            }

            // Add connector phonetic if there's one after this component
            if (i < connectors.length && connectors[i] && connectors[i].connector && connectors[i].connector.phonetic) {
                pronunciationParts.push(connectors[i].connector.phonetic);
            }
        }
        const pronunciation = pronunciationParts.join("-");

        return {
            name: fullName,
            baseForm: fullName,
            meaning,
            pronunciation,
            components,
            connectors,
            syllables,
            genderPrefixVowel: null,
            finalVowel: null
        };
    }

    /**
     * Select a prefix component, applying style and subrace preferences
     * @private
     */
    _selectPrefix(style, subrace) {
        return this._selectWeightedComponent(this.prefixCandidates, subrace);
    }

    /**
     * Select a suffix component, applying style and subrace preferences
     * @private
     */
    _selectSuffix(style, subrace) {
        let candidates = this.suffixCandidates;

        // Apply style filters with weighted probability (not always-on)
        // Use style preference 50% of the time to maintain randomness
        if (style === "feminine" && Math.random() < 0.5) {
            // Filter for feminine suffixes (check suffix_text, not root, for accuracy)
            const femSuffixes = candidates.filter((s) => {
                const suffixText = (s.suffix_text || "").toLowerCase();
                return (
                    suffixText.includes("iel") ||
                    suffixText.includes("wen") ||
                    suffixText.includes("lia") ||
                    suffixText.includes("riel") ||
                    suffixText.includes("rae") ||
                    suffixText.includes("ae") ||
                    (s.is_gender_modifier && suffixText.includes("iel"))
                );
            });
            if (femSuffixes.length > 0) {
                candidates = femSuffixes;
            }
        } else if (style === "masculine" && Math.random() < 0.5) {
            // Filter for masculine suffixes
            const mascSuffixes = candidates.filter((s) => {
                const suffixText = (s.suffix_text || "").toLowerCase();
                return (
                    suffixText.includes("ion") ||
                    suffixText.includes("ar") ||
                    suffixText.includes("kian") ||
                    suffixText.includes("drith") ||
                    suffixText.includes("dor") ||
                    suffixText.includes("val") ||
                    (s.is_gender_modifier &&
                        (suffixText.includes("ion") || suffixText.includes("kian") || suffixText.includes("drith")))
                );
            });
            if (mascSuffixes.length > 0) {
                candidates = mascSuffixes;
            }
        }

        return this._selectWeightedComponent(candidates, subrace);
    }

    /**
     * Select a connector, applying style preferences
     * @private
     */
    _selectConnector(style) {
        // Feminine style prefers softer sounds (50% chance to apply preference)
        if (style === "feminine" && Math.random() < 0.5) {
            const softConnectors = this.connectors.filter(
                (c) => c.text.includes("i") || c.text.includes("e") || c.text.includes("ella")
            );
            if (softConnectors.length > 0) {
                return this._randomElement(softConnectors);
            }
        }

        // Masculine style prefers stronger sounds (50% chance to apply preference)
        if (style === "masculine" && Math.random() < 0.5) {
            const strongConnectors = this.connectors.filter(
                (c) => c.text.includes("th") || c.text.includes("or") || c.text.includes("an")
            );
            if (strongConnectors.length > 0) {
                return this._randomElement(strongConnectors);
            }
        }

        // Default: prefer liquid connectors for natural flow (60% chance)
        const liquidConnectors = this.connectors.filter(
            (c) => c.text.includes("l") || c.text.includes("r") || c.text.includes("n")
        );
        if (liquidConnectors.length > 0 && Math.random() < 0.6) {
            return this._randomElement(liquidConnectors);
        }

        // Otherwise, completely random from all connectors
        return this._randomElement(this.connectors);
    }

    /**
     * Get a random element from an array
     * @private
     */
    _randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    /**
     * Select a component using weighted probability based on subrace
     * @private
     */
    _selectWeightedComponent(candidates, subrace) {
        // Filter out recently used components (anti-repeat for better randomness)
        let availableCandidates = candidates;
        if (this.recentlyUsed.length > 0) {
            // Flatten all recently used roots
            const recentRoots = new Set();
            this.recentlyUsed.forEach((usedSet) => {
                usedSet.forEach((root) => recentRoots.add(root));
            });

            // Filter out recently used (but keep if that leaves too few options)
            // Lowered threshold from 10 to 5 to be more aggressive about avoiding repeats
            const filtered = candidates.filter((c) => !recentRoots.has(c.root));
            if (filtered.length > 5) {
                // Only filter if we have enough left
                availableCandidates = filtered;
            }
        }

        // Exclude Drow-tagged components from non-Drow subraces
        const isNonDrowElf =
            subrace === "high-elf" || subrace === "sun-elf" || subrace === "moon-elf" || subrace === "wood-elf";
        if (isNonDrowElf) {
            availableCandidates = availableCandidates.filter((c) => {
                // Exclude components tagged with "drow", "drow-male", or "drow-female"
                return !c.tags || !c.tags.some((tag) => tag.startsWith("drow"));
            });
        }

        // If no subrace filtering, use random selection
        if (subrace === "high-elf") {
            return this._randomElement(availableCandidates);
        }

        // Determine preferred tag based on subrace
        const preferredTag =
            subrace === "sun-elf"
                ? "sun"
                : subrace === "moon-elf"
                  ? "moon"
                  : subrace === "wood-elf"
                    ? "wood"
                    : subrace === "drow-female"
                      ? "drow-female"
                      : subrace === "drow-male"
                        ? "drow-male"
                        : null;

        if (!preferredTag) {
            return this._randomElement(availableCandidates);
        }

        // Filter components by preferred tag
        const preferred = availableCandidates.filter((c) => c.tags && c.tags.includes(preferredTag));
        const neutral = availableCandidates.filter((c) => c.tags && c.tags.includes("neutral"));
        const other = availableCandidates.filter(
            (c) => !c.tags || (!c.tags.includes(preferredTag) && !c.tags.includes("neutral"))
        );

        // Weighted random selection
        // Drow: now use same weighting as elves (60% preferred, 30% neutral, 10% other)
        if (subrace === "drow-female" || subrace === "drow-male") {
            const drowAll = availableCandidates.filter((c) => c.tags && c.tags.includes("drow"));
            const drowPreferred = preferred;
            const rollDrow = Math.random();

            if (rollDrow < 0.6 && drowPreferred.length > 0) {
                return this._randomElement(drowPreferred);
            } else if (rollDrow < 0.9 && neutral.length > 0) {
                return this._randomElement(neutral);
            } else if (other.length > 0) {
                return this._randomElement(other);
            } else if (drowAll.length > 0) {
                return this._randomElement(drowAll);
            }
            return this._randomElement(availableCandidates);
        }

        // Standard weighting for other subraces
        // 60% chance preferred, 30% chance neutral, 10% chance other
        const roll = Math.random();

        if (roll < 0.6 && preferred.length > 0) {
            return this._randomElement(preferred);
        } else if (roll < 0.9 && neutral.length > 0) {
            return this._randomElement(neutral);
        } else if (other.length > 0) {
            return this._randomElement(other);
        }

        // Fallback: pick from any available
        return this._randomElement(availableCandidates);
    }

    /**
     * Check if a component is tagged as famous
     * @private
     */
    _isFamous(component) {
        return Boolean(component && component.tags && component.tags.includes("famous"));
    }
}
