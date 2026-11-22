import { reportError, setUpConsent, track } from "./analytics.js?v=4.2.0";
import { createGeneratorFor } from "./core/generators.js?v=4.2.0";
import { getLocks, KIND, NAME_STRUCTURE_CONTROL, SECTION } from "./core/nameStructure.js?v=4.2.0";
import { getLineage, getStyleForSex, SEX_BY_STYLE, SPECIES } from "./core/species.js?v=4.2.0";
import { loadSpeciesData } from "./core/speciesData.js?v=4.2.0";
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
} from "./favorites.js?v=4.2.0";
import {
    focusPart,
    focusStructure,
    openPartPicker,
    renderFavorites,
    renderLineagePicker,
    renderNameList,
    renderResult,
    renderSaved,
    showNotice
} from "./ui.js?v=4.2.0";

const $ = (id) => document.getElementById(id);
const LIST_SIZE = 10;
const HISTORY_SIZE = 10;
// The settings live in state; the controls show them and are never read back.
const state = {
    generatorFor: null,
    result: null,
    controls: [],
    locked: new Set(),
    favorites: [],
    history: [],
    settings: { subrace: null, style: "neutral", expanded: false }
};

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

const options = () => ({ ...state.settings });

function showSettings() {
    const { subrace, style, expanded } = state.settings;
    $("pickerLineage").value = subrace;
    $("pickerSex").value = style;
    $("expandedToggle").setAttribute("aria-pressed", String(expanded));
}

function pickedGenerator() {
    return state.generatorFor(options().subrace);
}

// Usage analytics (event plan in ANALYTICS.md): controlled lowercase values, never names or their components
const POSITION_VALUES = { [SECTION.GIVEN]: "first_name", [SECTION.FAMILY]: "family_name" };

function usage(extra = {}) {
    const { subrace, style, expanded } = options();
    const lineage = getLineage(subrace);
    return {
        species: lineage.species.analytics,
        generation_mode: expanded ? "expanded" : "standard",
        character_gender: SEX_BY_STYLE[style],
        lineage: lineage.analytics,
        ...extra
    };
}

/** Where a component sits and what kind it is, without its text. */
const describeComponent = (part) => ({
    component_position: POSITION_VALUES[part.section],
    component_type: part.kind
});

const SURNAME_KINDS = ["published", "constructed"]; // the order of the picker's tabs
const STRUCTURE_VALUES = {
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: "first_name_length",
    [NAME_STRUCTURE_CONTROL.SURNAME]: "surname_length",
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: "compound_name"
};
const ORIGINS = { split: "split", published: "published", composed: "common_words" };
const originOf = (part) => ORIGINS[part.method] || "table";

// `focus` ({ key, control }) puts keyboard focus back on that part after the redraw.
function show(result, { remember = true, focus = null } = {}) {
    state.result = result;
    if (remember) {
        updateHistory([result, ...state.history.filter((r) => r.name !== result.name)].slice(0, HISTORY_SIZE));
    }
    state.controls = state.generatorFor(result.subrace).getStructureControls(result, state.locked, options());
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

// locks are cleared: they belonged to the previous name
function restore(result, { remember = true } = {}) {
    state.locked.clear();
    state.settings.subrace = result.subrace;
    state.settings.style = getStyleForSex(result.sex);
    showSettings();
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
        pickedGenerator().generate({ ...options(), reshape: true, locks: getLocks(state.result, state.locked) })
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

function choosePart(key) {
    const current = state.result;
    const part = current.parts.find((p) => p.key === key);
    const generator = state.generatorFor(current.subrace);
    const choices = attempt(() => generator.optionsFor(current, key));
    const isSurname = part.section === SECTION.FAMILY;
    const isWholeSurname = isSurname && part.kind === KIND.WHOLE;
    const other = isSurname ? generator.getSurnameSwitchOptions(current, state.locked, options()) : null;
    const own = {
        kind: isWholeSurname ? "published" : "constructed",
        options: choices || [],
        selected: true,
        onPick: (choice) => {
            const locks = { ...getLocks(current, new Set(current.parts.map((p) => p.key))), [key]: choice };
            const result = attempt(() => generator.generate({ ...options(), subrace: current.subrace, locks }));
            if (!result) return;
            track("component_selected", usage({ ...describeComponent(part), component_origin: originOf(choice) }));
            show(result, { remember: false, focus: { key, control: "text" } });
        }
    };
    const switchTo = other && {
        kind: other.kind,
        options: other.options,
        onPick: (choice) => {
            const result = attempt(() => generator.generateSurnameChange(current, choice, options()));
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
    openPartPicker(tabs, part.text);
}

// only a roll joins the history
function handleStructureChange(control) {
    const changed = state.generatorFor(state.result.subrace).generateStructureChange(state.result, control, {
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
    const locks = getLocks(state.result, state.locked);
    const results = [];
    for (let i = 0; i < LIST_SIZE; i++) {
        const result = attempt(() => pickedGenerator().generate({ ...options(), reshape: true, locks }));
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
    state.settings.subrace = $("pickerLineage").value; // the picker's first lineage, the default
    $("pickerSex").addEventListener("change", (event) => {
        state.settings.style = event.target.value;
        changeSetting("gender", SEX_BY_STYLE[event.target.value]);
    });
    $("pickerLineage").addEventListener("change", (event) => {
        state.settings.subrace = event.target.value;
        changeSetting("lineage", getLineage(event.target.value).analytics);
    });
    const expanded = $("expandedToggle");
    state.settings.expanded = loadSetting("expandedVariety", false) === true;
    showSettings();
    expanded.addEventListener("click", () => {
        const isOn = !state.settings.expanded;
        state.settings.expanded = isOn;
        showSettings();
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
    const species = Object.entries(SPECIES);
    renderLineagePicker(species.flatMap(([, { lineages }]) => lineages));
    try {
        // a file in an older shape (often a stale cached copy) is refused by loadSpeciesData, like a failed download
        const files = await Promise.all(species.map(([, { dataFile }]) => loadJson(dataFile)));
        const data = Object.fromEntries(
            species.map(([name, description], i) => [name, loadSpeciesData(files[i], description)])
        );
        state.generatorFor = createGeneratorFor(data);
    } catch (error) {
        // usually a stale cached copy: Ctrl+F5 bypasses the cache, Reload does not
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
