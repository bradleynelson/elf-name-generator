import { reportError, setUpConsent, track } from "./analytics.js?v=4.3.0";
import { createGeneratorFor } from "./core/generators.js?v=4.3.0";
import {
    getLocks,
    isEveryPartLocked,
    KIND,
    METHOD,
    SECTION,
    SECTION_ANALYTICS,
    STRUCTURE_CONTROLS
} from "./core/nameStructure.js?v=4.3.0";
import {
    formatNameWithKind,
    getLineage,
    getOfferedLineages,
    getSpeciesName,
    getStyleForSex,
    getStylesFor,
    SEX_BY_STYLE,
    SPECIES
} from "./core/species.js?v=4.3.0";
import { loadSpeciesData } from "./core/speciesData.js?v=4.3.0";
import { loadSetting, saveSetting } from "./favorites.js?v=4.3.0";
import { announce, renderMessage } from "./messages.js?v=4.3.0";
import {
    copyToClipboard,
    renderListMessage,
    isSaved,
    isSavedNamesFull,
    addToHistory,
    setMoreNames,
    SAVED_NAMES_FULL,
    startNameLists,
    toggleSaved
} from "./nameLists.js?v=4.3.0";
import {
    focusPart,
    focusStructure,
    getConsentControls,
    renderLockNudge,
    openPartPicker,
    renderCardConfirmation,
    renderFlash,
    renderLineageNote,
    renderPickers,
    renderSpeciesPicker,
    renderStarted,
    renderLoading,
    renderResult,
    renderSaved,
    endCardConfirmations,
    wireCardControls
} from "./ui.js?v=4.3.0";

const LIST_SIZE = 10;
// after a failed try, the name lists are tried again after each wait (or when the connection returns), then it gives up
const RETRY_SECONDS = [2, 5, 10, 30];
const WAITING_FOR_LISTS = {
    kind: "warning",
    title: "Cannot complete that action",
    text: "Please wait until the name lists load to roll, save, or copy a name."
};
const LISTS_FAILED = { ...WAITING_FOR_LISTS, text: "Lists failed to load; please refresh to try again." };
// the name lists loaded, but the first roll failed, so there is nothing yet to copy or save
const NO_NAME = { kind: "warning", title: "No name yet.", text: "Press Roll Name to make one." };
const KEPT_LAST_NAME = { kind: "error", title: "That didn't work, so we kept your last name." };
const ROLLED_NEW_NAME = { kind: "error", title: "That didn't work, so we rolled a new name." };
// The settings live in state; the controls show them and are never read back.
const state = {
    generatorFor: null,
    // the name lists failed after every retry, so nothing will load until the page is reloaded
    gaveUp: false,
    result: null,
    controls: [],
    locked: new Set(),
    // what the name card's message box shows, so the full-list message can go once there is room again
    cardMessage: null,
    settings: { subrace: null, style: "neutral", expanded: false }
};

// A copy that fails to download, parse or decode (often a stale cached file) is retried once, bypassing the cache.
async function loadJson(path, decode) {
    let failure;
    for (const cache of ["default", "reload"]) {
        try {
            const response = await fetch(path, { cache });
            if (response.ok) return decode(await response.json());
            failure = new Error(`Could not load ${path}: HTTP ${response.status}`);
        } catch (error) {
            failure = error;
        }
    }
    throw new Error(`Could not load ${path} (${failure.message})`, { cause: failure });
}

const options = () => ({ ...state.settings });
const isReady = () => Boolean(state.generatorFor);
const notReady = () => (state.gaveUp ? LISTS_FAILED : WAITING_FOR_LISTS);
const renderNoNameMessage = () => renderCardMessage(isReady() ? NO_NAME : notReady());
function formatSmallPoolNote() {
    const { subrace, style, expanded } = state.settings;
    if (expanded || !isReady() || !state.generatorFor(subrace).hasSmallPool?.(style)) return "";
    const { label, species } = getLineage(subrace);
    const name = label[0].toUpperCase() + label.slice(1);
    return `${name} ${species.plural} have a small set of published names, so repeats are normal. Turn on Expanded Variety for more variety.`;
}

// The note is plain text, so screen readers hear it only when a choice brings it up, through the one announcer
function announceSmallPoolNote() {
    const text = formatSmallPoolNote();
    if (text) announce(text);
}

function renderSettings() {
    const { subrace, style, expanded } = state.settings;
    const speciesName = getSpeciesName(subrace);
    // the list shows one species' lineages; a species change or a restored name (even of a retired lineage) redraws it
    renderPickers({
        speciesName,
        lineages: getOfferedLineages(speciesName, subrace),
        styles: getStylesFor(speciesName),
        subrace,
        style,
        expanded,
        smallPoolNote: formatSmallPoolNote()
    });
}

function pickedGenerator() {
    return state.generatorFor(options().subrace);
}

// Usage analytics (event plan in ANALYTICS.md): controlled lowercase values, never names or their components
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
const formatComponentUsage = (part) => ({
    component_position: SECTION_ANALYTICS[part.section],
    component_type: part.kind
});

const SURNAME_KINDS = ["published", "constructed"]; // the order of the picker's tabs
const ORIGINS = { [METHOD.SPLIT]: "split", [METHOD.PUBLISHED]: "published", [METHOD.COMPOSED]: "common_words" };
const originOf = (part) => ORIGINS[part.method] || "table";

// Wraps what a click or key press runs: an unexpected error is reported and the card put right (recoverCard).
function guarded(handler) {
    return (...args) => {
        try {
            return handler(...args);
        } catch (error) {
            reportError(error, "click");
            recoverCard();
        }
    };
}

// runs a recovery step; false once it has failed (reported) or came back empty
function recovered(step) {
    try {
        return step() !== null;
    } catch (error) {
        reportError(error, "click");
        return false;
    }
}

// redraw the last name that was shown, else roll a new one, else offer a reload
function recoverCard() {
    if (state.result && recovered(() => setResult(state.result, { remember: false })))
        return renderCardMessage(KEPT_LAST_NAME);
    state.locked.clear();
    if (recovered(generate)) return renderCardMessage(ROLLED_NEW_NAME);
    renderLoading("broken", () => location.reload());
}

// The name, its locks and the history change only once the card has been drawn.
// `focus` ({ key, control }) puts keyboard focus back on that part after the redraw.
function setResult(result, { remember = true, focus = null, locked = state.locked } = {}) {
    const controls = state.generatorFor(result.subrace).getStructureControls(result, locked, options());
    renderResult(result, locked, {
        onToggleLock: guarded(handleLockToggle),
        onChoose: guarded(handlePartChoice),
        structure: { controls, onChange: guarded(handleStructureChange) }
    });
    state.result = result;
    state.locked = locked;
    state.controls = controls;
    renderCardMessage(null);
    endCardConfirmations();
    if (remember) addToHistory(result);
    renderLineageNote(getLineage(result.subrace).note);
    renderSaveButton();
    if (focus) focusPart(focus.key, focus.control);
}

const renderSaveButton = () => renderSaved({ isSaved: isSaved(state.result), isFull: isSavedNamesFull() });

// Saved names changed: the card's bookmark follows (before the first name it stays off, waiting for the name lists),
// and the full-list message goes once there is room
function handleSavedNamesChange() {
    if (state.result) renderSaveButton();
    if (state.cardMessage === SAVED_NAMES_FULL && !isSavedNamesFull()) renderCardMessage(null);
}

// the name came from History, Saved names or the list: its lineage and gender become the settings, and locks are cleared
function restore(result, { remember = true } = {}) {
    if (!isReady()) return renderCardMessage(notReady());
    const before = { ...state.settings };
    state.settings.subrace = result.subrace;
    state.settings.style = getStyleForSex(result.sex);
    renderSettings();
    try {
        setResult(result, { remember, locked: new Set() });
    } catch (error) {
        Object.assign(state.settings, before);
        renderSettings();
        throw error;
    }
}

/** Runs a generator call; on failure reports it and returns null, so the current name stays on screen. */
function attempt(action) {
    try {
        return action();
    } catch (error) {
        reportError(error, "generator");
        return null;
    }
}

const unavailable = (what) => ({ kind: "error", title: `That ${what} isn't available for this name.` });

// only locks can make a roll fail by design; with none, it is an unexpected failure, so the locks are not blamed
function renderRollFailure(explain) {
    if (!state.locked.size)
        return explain({ kind: "error", title: "Couldn't make a name.", text: "Try rolling again." });
    explain({
        kind: "error",
        title: "No name fits the locked parts.",
        text: "Unlock a part, then roll again."
    });
    renderLockNudge();
}

function renderEveryPartLocked(explain) {
    explain({ kind: "warning", title: "Every part is locked.", text: "Unlock a part to roll a new name." });
    renderLockNudge();
}

function generate() {
    const result = attempt(() =>
        pickedGenerator().generate({ ...options(), reshape: true, locks: getLocks(state.result, state.locked) })
    );
    if (result) setResult(result);
    else renderRollFailure(renderCardMessage);
    return result;
}

/** A roll the visitor asked for (button or spacebar), not the name shown when a setting changes; true if one was rolled. */
function handleRoll(trigger) {
    if (!isReady()) {
        renderCardMessage(notReady());
        return false;
    }
    if (isEveryPartLocked(state.result, state.locked)) {
        renderEveryPartLocked(renderCardMessage);
        return false;
    }
    if (!generate()) return false;
    track("name_generated", usage({ roll_type: "single", name_count: 1, trigger }));
    return true;
}

function handleRollPress() {
    if (isReady()) renderFlash();
}

function handleLockToggle(key) {
    const locked = new Set(state.locked);
    const isLocked = !locked.has(key);
    if (isLocked) locked.add(key);
    else locked.delete(key);
    setResult(state.result, { remember: false, focus: { key, control: "lock" }, locked });
    const part = state.result.parts.find((p) => p.key === key);
    track("component_lock_changed", usage({ ...formatComponentUsage(part), locked: isLocked ? "on" : "off" }));
}

function handlePartChoice(key) {
    const current = state.result;
    const part = current.parts.find((p) => p.key === key);
    const generator = state.generatorFor(current.subrace);
    const choices = attempt(() => generator.optionsFor(current, key));
    const isSurname = part.section === SECTION.FAMILY;
    const isWholeSurname = isSurname && part.kind === KIND.WHOLE;
    const other = isSurname ? generator.getSurnameSwitchOptions?.(current, state.locked, options()) : null;
    const own = {
        kind: isWholeSurname ? "published" : "constructed",
        options: choices || [],
        selected: true,
        onPick: guarded((choice) => {
            const result = attempt(() => generator.generatePartChange(current, key, choice));
            if (result === current) return;
            if (!result) return renderCardMessage(unavailable("choice"));
            setResult(result, { remember: false, focus: { key, control: "text" } });
            track("component_selected", usage({ ...formatComponentUsage(part), component_origin: originOf(choice) }));
        })
    };
    const switchTo = other && {
        kind: other.kind,
        options: other.options,
        onPick: guarded((choice) => {
            const result = attempt(() => generator.generateSurnameChange(current, choice, options()));
            if (!result) return renderCardMessage(unavailable("surname"));
            setResult(result, { remember: false, focus: { key: choice.key, control: "text" } });
            track("surname_kind_changed", usage({ surname_kind: other.kind }));
        })
    };
    const tabs = [own, switchTo]
        .filter((tab) => tab?.options.length)
        .sort((a, b) => SURNAME_KINDS.indexOf(a.kind) - SURNAME_KINDS.indexOf(b.kind))
        .map((tab) => ({ ...tab, label: tab.kind === "published" ? "Published" : "Constructed" }));
    if (!tabs.length) return;
    track("component_picker_opened", usage(formatComponentUsage(part)));
    openPartPicker(tabs, part);
}

// only a roll joins the history
function handleStructureChange(control) {
    const generator = state.generatorFor(state.result.subrace);
    const changed = attempt(() =>
        generator.generateStructureChange(state.result, control, { ...options(), locked: state.locked })
    );
    if (!changed) return renderCardMessage(unavailable("change"));
    const wasOn = state.controls.find((c) => c.control === control)?.on;
    setResult(changed, { remember: false });
    track(
        "name_structure_changed",
        usage({ structure_control: STRUCTURE_CONTROLS[control].analytics, structure_value: wasOn ? "off" : "on" })
    );
    focusStructure(control);
}

function handleRollList() {
    if (!isReady()) return renderListMessage(notReady());
    if (isEveryPartLocked(state.result, state.locked)) {
        setMoreNames([]);
        return renderEveryPartLocked(renderListMessage);
    }
    const locks = getLocks(state.result, state.locked);
    const results = [];
    renderListMessage(null);
    for (let i = 0; i < LIST_SIZE; i++) {
        const result = attempt(() => pickedGenerator().generate({ ...options(), reshape: true, locks }));
        if (!result) {
            renderRollFailure(renderListMessage);
            break;
        }
        results.push(result);
    }
    setMoreNames(results);
    if (results.length) {
        track("name_generated", usage({ roll_type: "list", name_count: results.length, trigger: "button" }));
    }
}

function renderCardMessage(message) {
    state.cardMessage = message;
    renderMessage("cardMessage", message);
}

function wireControls() {
    const fresh = () => {
        state.locked.clear();
        setMoreNames([]);
        if (isReady()) generate();
    };
    const changeSetting = (settingName, settingValue) => {
        track("name_setting_changed", usage({ setting_name: settingName, setting_value: settingValue }));
        fresh();
    };
    state.settings.subrace = getOfferedLineages(Object.keys(SPECIES)[0])[0].value; // the first lineage, the default
    state.settings.expanded = loadSetting("expandedVariety", false) === true;
    renderSettings();
    wireCardControls(
        guardedAll({
            onSexChange: (style) => {
                state.settings.style = style;
                renderSettings();
                changeSetting("gender", SEX_BY_STYLE[style]);
                announceSmallPoolNote();
            },
            // a species starts at its first lineage, and a gender it does not offer moves to the first it does
            onSpeciesChange: (speciesName) => {
                const styles = getStylesFor(speciesName);
                state.settings.subrace = getOfferedLineages(speciesName)[0].value;
                if (!styles.includes(state.settings.style)) state.settings.style = styles[0];
                renderSettings();
                track("species_changed", usage());
                fresh();
            },
            onLineageChange: (subrace) => {
                state.settings.subrace = subrace;
                renderSettings(); // a retired lineage shown for a restored name leaves the list once another is chosen
                changeSetting("lineage", getLineage(subrace).analytics);
                announceSmallPoolNote();
            },
            onExpandedToggle: () => {
                const isOn = !state.settings.expanded;
                state.settings.expanded = isOn;
                renderSettings();
                saveSetting("expandedVariety", isOn);
                track("expanded_variety_changed", usage({ setting_value: isOn ? "on" : "off" }));
                fresh();
            },
            onRollPress: handleRollPress,
            onRoll: handleRoll,
            onCopy: handleCopy,
            onSave: handleSave,
            onSourcesOpen: () => track("name_sources_opened", usage())
        })
    );
}

const guardedAll = (handlers) =>
    Object.fromEntries(Object.entries(handlers).map(([name, handler]) => [name, guarded(handler)]));

function handleCopy() {
    if (!state.result) return renderNoNameMessage();
    const { name } = state.result;
    const isStillShown = () => state.result?.name === name;
    const text = formatNameWithKind(name, state.result);
    copyToClipboard(text, "current", {
        explain: renderCardMessage,
        confirm: (word, iconName) => renderCardConfirmation("copyButton", word, iconName),
        isStillShown
    });
}

function handleSave() {
    if (!state.result) return renderNoNameMessage();
    renderCardMessage(null);
    const done = toggleSaved(state.result, renderCardMessage, "current");
    if (!done) return;
    renderCardConfirmation("saveButton", done.word);
    announce(done.said);
}

const waitOrOnline = (ms) =>
    new Promise((resolve) => {
        const done = () => {
            clearTimeout(timer);
            window.removeEventListener("online", done);
            resolve();
        };
        const timer = setTimeout(done, ms);
        window.addEventListener("online", done);
    });

async function loadGenerators() {
    const species = Object.entries(SPECIES);
    const files = await Promise.all(
        species.map(([, description]) => loadJson(description.dataFile, (raw) => loadSpeciesData(raw, description)))
    );
    return createGeneratorFor(Object.fromEntries(species.map(([name], i) => [name, files[i]])));
}

/** The generators once the name lists load, retrying as RETRY_SECONDS says; null when it gives up. */
async function loadGeneratorsRetrying() {
    for (let retry = 0; ; retry++) {
        try {
            return await loadGenerators();
        } catch (error) {
            if (retry === RETRY_SECONDS.length) {
                // usually a stale cached copy: Ctrl+F5 bypasses the cache, Reload does not
                state.gaveUp = true;
                renderLoading("failed", () => location.reload());
                reportError(error, "data_load");
                return null;
            }
        }
        if (retry === 0) renderLoading("retrying");
        await waitOrOnline(RETRY_SECONDS[retry] * 1000);
    }
}

async function start() {
    // the inline guard in index.html says the page did not load unless this has run
    renderStarted();
    window.addEventListener("error", (event) => reportError(event.error || event.message, "page"));
    window.addEventListener("unhandledrejection", (event) => reportError(event.reason, "promise"));
    setUpConsent(getConsentControls());
    renderSpeciesPicker(Object.entries(SPECIES).map(([value, { label }]) => ({ value, label })));
    // saved names and history work while the name lists load: they can be copied, removed and cleared
    wireControls();
    startNameLists({
        guarded,
        guardedAll,
        usage,
        restore,
        rollList: handleRollList,
        onSavedNamesChange: handleSavedNamesChange
    });
    state.generatorFor = await loadGeneratorsRetrying();
    if (!isReady()) return;
    renderLoading("ready");
    generate();
}

start();
