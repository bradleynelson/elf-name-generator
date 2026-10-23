// Coordinates the page: loads data, keeps the current name and its locks, and reacts to the controls.
import { reportError, setUpConsent, track } from "./analytics.js?v=4.1.2";
import { ElfNameGenerator } from "./core/ElfNameGenerator.js?v=4.1.2";
import { DrowNameGenerator } from "./core/DrowNameGenerator.js?v=4.1.2";
import { NAME_STRUCTURE_CONTROL } from "./core/nameStructure.js?v=4.1.2";
import {
    MAX_FAVORITES,
    addFavorite,
    canLoadFavorite,
    loadFavorites,
    loadHistory,
    loadSetting,
    removeFavorite,
    restoreFavorite,
    saveHistory,
    saveSetting,
    storageAvailable
} from "./favorites.js?v=4.1.2";
import {
    focusPart,
    focusStructure,
    openPartPicker,
    partLabel,
    renderFavorites,
    renderNameList,
    renderResult,
    renderSaved,
    showNotice
} from "./ui.js?v=4.1.2";

const $ = (id) => document.getElementById(id);
const LIST_SIZE = 10;
const HISTORY_SIZE = 10;
const state = { generator: null, result: null, controls: [], locked: new Set(), favorites: [], history: [] };

// A failed or unreadable copy (often a stale cached file) is retried once, bypassing the browser cache.
async function loadJson(path) {
    for (const cache of ["default", "reload"]) {
        try {
            const response = await fetch(path, { cache });
            if (response.ok) return await response.json();
        } catch {
            /* retried below, then reported */
        }
    }
    throw new Error(`Could not load ${path}`);
}

function options() {
    return {
        subrace: $("pickerLineage").value,
        style: $("pickerSex").value,
        expanded: $("expandedToggle").getAttribute("aria-pressed") === "true"
    };
}

// Usage analytics (event plan in ANALYTICS.md): controlled lowercase values, never names or their components
const GENDER_VALUES = { neutral: "neutral", feminine: "female", masculine: "male" };
const LINEAGE_VALUES = {
    "high-elf": "any",
    "sun-elf": "sun_elf",
    "moon-elf": "moon_elf",
    "wood-elf": "wood_elf",
    drow: "drow"
};

/** The current settings as event parameters, plus any event-specific ones. */
function usage(extra = {}) {
    const { subrace, style, expanded } = options();
    return {
        species: "elf",
        generation_mode: expanded ? "expanded" : "standard",
        character_gender: GENDER_VALUES[style],
        lineage: LINEAGE_VALUES[subrace],
        ...extra
    };
}

/** Where a component sits and what kind it is, without its text. */
function describeComponent(part) {
    const kind = part.role.match(/(prefix|suffix)$/)?.[1] || "whole";
    return {
        component_position: /^(family|house)/.test(part.role) ? "family_name" : "first_name",
        component_type: kind
    };
}

const SURNAME_KINDS = ["published", "constructed"]; // the order of the picker's tabs
const STRUCTURE_VALUES = {
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: "first_name_length",
    [NAME_STRUCTURE_CONTROL.SURNAME]: "surname_length",
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: "compound_name"
};
const ORIGINS = { split: "split", published: "published", composed: "common_words" };
const originOf = (part) => ORIGINS[part.method] || "table";

/** Locked parts of the current result, in the form the generators accept. */
function locksFor(result, keys) {
    if (!result || !keys.size) return {};
    const locks = Object.fromEntries(result.parts.filter((p) => keys.has(p.key)).map((p) => [p.key, p]));
    // table parts keep their places through the shape they came in (first name and table-built surname apart)
    return {
        ...locks,
        ...(result.shape ? { shape: result.shape, sex: result.sex } : {}),
        ...(result.familyShape ? { familyShape: result.familyShape } : {})
    };
}

/**
 * Shows a result; new results also go to the top of the history (restoring from a list does not).
 * `focus` ({ key, control: "text" | "lock" }) returns keyboard focus to the part that was used, since redrawing
 * replaces its buttons.
 */
function show(result, { remember = true, focus = null } = {}) {
    state.result = result;
    if (remember) {
        updateHistory([result, ...state.history.filter((r) => r.name !== result.name)].slice(0, HISTORY_SIZE));
    }
    state.controls = state.generator.getStructureControls(result, state.locked, options());
    renderResult(result, state.locked, {
        onToggleLock: toggleLock,
        onChoose: choosePart,
        structure: { controls: state.controls, onChange: handleStructureChange }
    });
    renderSaved(isSaved(result));
    if (focus) focusPart(focus.key, focus.control);
}

const isSaved = (result) => Boolean(result) && state.favorites.some((f) => f.name === result.name);

function updateHistory(history) {
    state.history = history;
    saveHistory(history);
    renderNameList("historyList", history, (r) => restore(r, { remember: false }));
    $("historyClear").hidden = !history.length;
}

/**
 * Shows an earlier name and matches the controls to it, so the next name follows the same settings. Locks are
 * cleared: they belonged to the components of the name on screen, not to whatever fills the same slots in this one.
 */
function restore(result, { remember = true } = {}) {
    state.locked.clear();
    $("pickerLineage").value = result.subrace;
    $("pickerSex").value = { female: "feminine", male: "masculine" }[result.sex] || "neutral";
    show(result, { remember });
}

/** Runs a generator call; on failure keeps the current name on screen and explains what happened. */
function attempt(action) {
    try {
        return action();
    } catch (error) {
        showNotice(error.message);
        reportError(error, "generator");
        return null;
    }
}

function generate() {
    const result = attempt(() =>
        state.generator.generate({ ...options(), reshape: true, locks: locksFor(state.result, state.locked) })
    );
    if (result) show(result);
    return result;
}

/** A roll the visitor asked for (button or spacebar), as opposed to the new name shown when a setting changes. */
function rollName(trigger) {
    if (generate()) track("name_generated", usage({ roll_type: "single", name_count: 1, trigger }));
}

function toggleLock(key) {
    const isLocked = !state.locked.has(key);
    if (isLocked) state.locked.add(key);
    else state.locked.delete(key);
    const part = state.result.parts.find((p) => p.key === key);
    track("component_lock_changed", usage({ ...describeComponent(part), locked: isLocked ? "on" : "off" }));
    show(state.result, { remember: false, focus: { key, control: "lock" } });
}

/** Opens the options that fit one part; the chosen one replaces it while the rest of the name stays as it is. */
function choosePart(key) {
    const current = state.result;
    const part = current.parts.find((p) => p.key === key);
    const choices = attempt(() => state.generator.optionsFor(current, key));
    // a surname can also be switched to the other kind (published or constructed) without rolling
    const isWholeSurname = key === "family" || key === "house"; // a published family name or drow house
    const isSurname = isWholeSurname || /^n\d/.test(key);
    const other = isSurname ? state.generator.getSurnameSwitchOptions(current, state.locked, options()) : null;
    const own = {
        kind: isWholeSurname ? "published" : "constructed",
        options: choices || [],
        selected: true,
        onPick: (choice) => {
            const locks = { ...locksFor(current, new Set(current.parts.map((p) => p.key))), [key]: choice };
            const result = attempt(() => state.generator.generate({ ...options(), locks }));
            if (!result) return;
            track("component_selected", usage({ ...describeComponent(part), component_origin: originOf(choice) }));
            show(result, { remember: false, focus: { key, control: "text" } });
        }
    };
    const switchTo = other && {
        kind: other.kind,
        options: other.options,
        onPick: (choice) => {
            const result = attempt(() => state.generator.generateSurnameChange(current, choice, options()));
            if (!result) return showNotice("That surname is not available for this name.");
            track("surname_kind_changed", usage({ surname_kind: other.kind }));
            show(result, { remember: false, focus: { key: choice.key, control: "text" } });
        }
    };
    const tabs = [own, switchTo]
        .filter((tab) => tab?.options.length)
        .sort((a, b) => SURNAME_KINDS.indexOf(a.kind) - SURNAME_KINDS.indexOf(b.kind))
        .map((tab) => ({ ...tab, label: tab.kind === "published" ? "Published" : "Constructed" }));
    if (!tabs.length) return;
    track("component_picker_opened", usage(describeComponent(part)));
    openPartPicker(`Choose the ${partLabel(part)}`, tabs, part.text);
}

/** Presses a + or - beside the name (longer or shorter first name or surname, compound name); only a roll joins the history. */
function handleStructureChange(control) {
    const changed = state.generator.generateStructureChange(state.result, control, {
        ...options(),
        locked: state.locked
    });
    if (!changed) return showNotice("That change is not available for this name.");
    const wasOn = state.controls.find((c) => c.control === control)?.on;
    track(
        "name_structure_changed",
        usage({ structure_control: STRUCTURE_VALUES[control], structure_value: wasOn ? "off" : "on" })
    );
    show(changed, { remember: false });
    focusStructure(control);
}

function showList() {
    const locks = locksFor(state.result, state.locked);
    const results = [];
    for (let i = 0; i < LIST_SIZE; i++) {
        const result = attempt(() => state.generator.generate({ ...options(), reshape: true, locks }));
        if (!result) break;
        results.push(result);
    }
    renderNameList("nameList", results, (r) => show(r));
    if (results.length) {
        track("name_generated", usage({ roll_type: "list", name_count: results.length, trigger: "button" }));
    }
}

function updateFavorites(change) {
    try {
        state.favorites = change(state.favorites);
        renderSaved(isSaved(state.result));
        renderFavorites(state.favorites, {
            canLoad: canLoadFavorite,
            onLoad: (result) => restore(result),
            onCopy: (name) => copyName(name, "saved"),
            onRemove: (name) => {
                const index = state.favorites.findIndex((f) => f.name === name);
                const record = state.favorites[index];
                updateFavorites((list) => removeFavorite(list, name));
                // the removed row's button is gone: move focus to the next row, or the heading if none is left
                const remaining = $("favoritesList").querySelectorAll(".favorites-remove");
                (remaining[Math.min(index, remaining.length - 1)] || $("favoritesTitle")).focus();
                showNotice(`Removed ${name}.`, {
                    label: "Undo",
                    onClick: () => {
                        updateFavorites((list) => restoreFavorite(list, record, index));
                        $("favoritesTitle").focus();
                    }
                });
            },
            max: MAX_FAVORITES
        });
    } catch (error) {
        showNotice(error.message);
    }
}

/** Copies a name; `source` is "current" (the name card) or "saved" (the saved list). Only a successful copy counts. */
async function copyName(name, source) {
    try {
        await navigator.clipboard.writeText(name);
        showNotice("Copied.");
        track("name_copied", usage({ copy_source: source }));
    } catch {
        showNotice("Your browser would not copy the name. Select it and copy it instead.");
    }
}

function wireControls() {
    const fresh = () => {
        state.locked.clear();
        renderNameList("nameList", [], show);
        generate();
    };
    const changeSetting = (settingName, settingValue) => {
        track("name_setting_changed", usage({ setting_name: settingName, setting_value: settingValue }));
        fresh();
    };
    $("pickerSex").addEventListener("change", (event) => changeSetting("gender", GENDER_VALUES[event.target.value]));
    $("pickerLineage").addEventListener("change", (event) =>
        changeSetting("lineage", LINEAGE_VALUES[event.target.value])
    );
    // Expanded Variety is off until chosen; the last choice is remembered in this browser
    const expanded = $("expandedToggle");
    expanded.setAttribute("aria-pressed", String(loadSetting("expandedVariety", false) === true));
    expanded.addEventListener("click", () => {
        const isOn = expanded.getAttribute("aria-pressed") !== "true";
        expanded.setAttribute("aria-pressed", String(isOn));
        saveSetting("expandedVariety", isOn);
        track("expanded_variety_changed", usage({ setting_value: isOn ? "on" : "off" }));
        fresh();
    });
    $("expandedInfo").addEventListener("click", (event) => {
        const isOpen = event.currentTarget.getAttribute("aria-expanded") !== "true";
        event.currentTarget.setAttribute("aria-expanded", String(isOpen));
        $("expandedHint").hidden = !isOpen;
    });
    $("namePicker").addEventListener("submit", (event) => event.preventDefault());
    $("generateButton").addEventListener("click", () => rollName("button"));
    $("listButton").addEventListener("click", showList);
    $("historyClear").addEventListener("click", () => {
        const previous = state.history;
        updateHistory([]);
        $("historyTitle").focus(); // the Clear button hides itself
        showNotice("History cleared.", {
            label: "Undo",
            onClick: () => {
                updateHistory(previous);
                $("historyTitle").focus();
            }
        });
    });
    // a tap outside the picker (on its backdrop) closes it
    $("partPicker").addEventListener("click", (event) => {
        const box = event.currentTarget.getBoundingClientRect();
        const outside =
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom;
        if (event.target === event.currentTarget && outside) event.currentTarget.close();
    });
    $("copyButton").addEventListener("click", () => copyName(state.result.name, "current"));
    // the bookmark toggles: save the current name, or remove it if it is already saved
    $("saveButton").addEventListener("click", () => {
        const wasSaved = isSaved(state.result);
        updateFavorites((list) =>
            wasSaved ? removeFavorite(list, state.result.name) : addFavorite(list, state.result)
        );
        if (!wasSaved && isSaved(state.result)) track("name_saved", usage());
    });
    $("nameSourcesSummary")
        .closest("details")
        .addEventListener("toggle", (event) => {
            if (event.currentTarget.open) track("name_sources_opened", usage());
        });
    document.body.addEventListener("keydown", (event) => {
        const typing = event.target.closest("input, select, textarea, button, summary, a");
        if (event.code === "Space" && !typing) {
            event.preventDefault();
            rollName("spacebar");
        }
    });
}

async function start() {
    window.addEventListener("error", (event) => reportError(event.error || event.message, "page"));
    window.addEventListener("unhandledrejection", (event) => reportError(event.reason, "promise"));
    setUpConsent({
        banner: $("cookieBanner"),
        accept: $("cookieAccept"),
        decline: $("cookieDecline"),
        dialog: $("privacyDialog"),
        links: document.querySelectorAll(".privacy-link")
    });
    try {
        const [elfNames, drowNames] = await Promise.all([
            loadJson("data/elfNames.json?v=4.1.2"),
            loadJson("data/drowNames.json?v=4.1.2")
        ]);
        state.generator = new ElfNameGenerator(elfNames, new DrowNameGenerator(drowNames));
    } catch (error) {
        // a stale cached copy of the site is the usual cause; a hard refresh (Ctrl+F5) bypasses the cache, Reload does not
        showNotice("The name lists could not be loaded. Please refresh with Ctrl+F5 (Cmd+Shift+R on a Mac).", {
            label: "Reload",
            onClick: () => location.reload()
        });
        reportError(error, "data_load");
        return;
    }
    wireControls();
    updateFavorites(() => loadFavorites());
    updateHistory(loadHistory());
    generate();
    // the generator works without storage, but names, history and settings would be lost on leaving: say so
    if (!storageAvailable()) {
        showNotice("Your browser is blocking site storage, so saved names, history and settings won't be kept.", {
            label: "OK",
            onClick: () => {}
        });
    }
}

start();
