// Rendering only; text is always set with textContent. Reads a part's `section` and `kind`, never species rules.
import {
    capitalize,
    formatPartLabel,
    groupWords,
    isSlotComponent,
    isSamePart,
    isSurnamePart,
    KIND,
    METHOD,
    NAME_STRUCTURE_CONTROL,
    SECTION,
    STRUCTURE_CONTROLS,
    surnameStart
} from "./core/nameStructure.js?v=4.3.2";
import { getLineage } from "./core/species.js?v=4.3.2";
import { $, button, element, iconButton, renderBookmark, switchOff } from "./dom.js?v=4.3.2";
import { announce } from "./messages.js?v=4.3.2";
import { formatSourceTitle, renderSources } from "./sourcesPanel.js?v=4.3.2";

// Ed Greenwood's own sources read "from", not "published in"
const isFromCreator = (sources) => sources?.[0]?.authority === "creator";

function displayTexts(parts) {
    let wordStart = true;
    const start = surnameStart(parts);
    return parts.map((part, index) => {
        if (part.role === "space") {
            wordStart = true;
            return " ";
        }
        if (index === start) wordStart = true;
        // table and split components are lower case; whole names and phrase words are shown as printed ("the Younger")
        const text = wordStart && isSlotComponent(part) ? capitalize(part.text) : part.text;
        wordStart = false;
        return text;
    });
}

// "Infested, plague" -> "Infested": the first gloss of each part
const firstGloss = (meaning) => meaning.split(", ")[0];

// `whole` is shown over the word, `byPart` over each component
function wordMeaning(parts) {
    const phrase = parts.find((p) => p.wordMeaning);
    if (phrase) return { whole: { text: phrase.wordMeaning } };
    const translated = parts.find((p) => p.meaningSource);
    if (translated) return { whole: { text: translated.meaning } };
    if (parts.some((p) => p.method === METHOD.PUBLISHED && p.form !== "common")) {
        return { whole: { text: "Meaning unknown", unknown: true } };
    }
    const composed = parts.find((p) => p.method === METHOD.COMPOSED);
    if (composed) return { whole: { text: composed.words.map((w) => w.text.toLowerCase()).join("-"), gloss: true } };
    const components = parts.filter(isSlotComponent);
    if (!components.length) return {};
    if (components.every((p) => p.method === METHOD.SPLIT)) {
        return { whole: { text: "Meaning unknown", unknown: true, split: true } };
    }
    const segment = (p) =>
        p.method === METHOD.SPLIT ? { text: "Unknown", unknown: true, split: true } : { text: firstGloss(p.meaning) };
    return { byPart: new Map(components.map((p) => [p, segment(p)])) };
}

const knownMeaningsOf = ({ whole, byPart }) => ({
    whole: whole?.unknown ? undefined : whole,
    byPart: byPart && new Map([...byPart].map(([part, segment]) => [part, segment.unknown ? null : segment]))
});

/**
 * @param {Object} result - generator result
 * @param {Set<string>} locked - keys of locked parts
 * @param {{ onToggleLock: Function, onChoose: Function, structure?: { controls: Object[], onChange: Function } }} handlers
 *   - onChoose opens the picker for a part; `structure` gives the controls the generator offers now ({ control, on })
 *   and the function called with the one pressed, shown as + / - beside the words they change
 */
export function renderResult(result, locked, handlers) {
    renderNameText(result);
    renderWords(result, locked, handlers);
    renderScript(result);
    renderSources(result);
}

// a built first name that matches a published one, or a whole published first name
const publishedSourcesOf = (result) =>
    result.published?.sources ??
    result.parts.find((p) => p.section === SECTION.GIVEN && p.method === METHOD.PUBLISHED)?.sources;

function renderNameText(result) {
    const sources = publishedSourcesOf(result);
    const matchNote = isFromCreator(sources) ? "a name used by Ed Greenwood" : "a published name";
    $("nameText").textContent = sources ? `${result.name}, ${matchNote}` : result.name;
}

// word by word, so narrow screens wrap between words; a missing compound name shows as an empty slot
function renderWords(result, locked, handlers) {
    const texts = displayTexts(result.parts);
    const { controls = [], onChange } = handlers.structure || {};
    const steps = new Map(controls.map(({ control, on }) => [control, on]));
    const stepFor = (control) => (steps.has(control) ? [renderStep(control, steps.get(control), onChange)] : []);
    const { COMPOUND_NAME, PHRASE } = NAME_STRUCTURE_CONTROL;
    const isCompoundMissing = steps.get(COMPOUND_NAME) === false;
    // a species whose published names carry no meanings (dwarves) captions only the meanings that are known
    const showsUnknownMeanings = getLineage(result.subrace)?.species?.captionsUnknownMeanings !== false;
    let givenWords = 0;
    $("nameDials").replaceChildren(
        ...groupWords(result.parts).flatMap((indexes) => {
            const isSurname = isSurnamePart(result.parts[indexes[0]]);
            const control = controlOfWord(isSurname, isSurname ? null : givenWords++);
            const ownStep = control === COMPOUND_NAME && isCompoundMissing ? [] : stepFor(control);
            const shown = indexes.map((i) => ({ part: result.parts[i], text: texts[i] }));
            const word = renderWord(shown, ownStep, { locked, handlers, showsUnknownMeanings });
            return isSurname && isCompoundMissing ? [...stepFor(COMPOUND_NAME), word] : [word];
        }),
        // the name phrase's + / - follows the whole name, since a phrase is added at its end or around the clan
        ...stepFor(PHRASE)
    );
}

function controlOfWord(isSurname, givenWordIndex) {
    if (isSurname) return NAME_STRUCTURE_CONTROL.SURNAME;
    return givenWordIndex === 0 ? NAME_STRUCTURE_CONTROL.FIRST_NAME : NAME_STRUCTURE_CONTROL.COMPOUND_NAME;
}

/** One word: its meaning above, then its parts with their own meanings, then the + / - it carries. */
function renderWord(shown, ownStep, { locked, handlers, showsUnknownMeanings }) {
    const meanings = wordMeaning(shown.map(({ part }) => part));
    const { whole, byPart } = showsUnknownMeanings ? meanings : knownMeaningsOf(meanings);
    const row = element("span", `name-word-parts${byPart ? " has-part-meanings" : ""}`);
    shown.forEach(({ part, text }) => {
        const meaning = byPart && renderMeaning("name-part-meaning", byPart.get(part));
        row.append(renderPart(part, text, locked.has(part.key), handlers, meaning));
    });
    row.append(...ownStep);
    const word = element("span", "name-word");
    word.append(renderMeaning("name-word-meaning", byPart ? null : whole), row);
    return word;
}

function renderMeaning(className, segment) {
    const caption = element("span", className);
    if (segment) {
        const style = segment.split ? "name-word-unknown" : segment.gloss ? "name-word-gloss" : null;
        caption.append(element("span", style, segment.text));
    }
    return caption;
}

// The script fonts draw accented letters and punctuation (apostrophes, hyphens, commas, full stops) as an empty box,
// so the transcription writes the plain letter and leaves punctuation out.
const scriptText = (name) =>
    name
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .replace(/[^\p{L}\s]/gu, "");

function renderScript(result) {
    const { font, label } = getLineage(result.subrace).script;
    const node = $("nameScript");
    node.textContent = scriptText(result.name);
    node.dataset.script = font;
    $("nameScriptLabel").textContent = label;
}

function renderPart(part, text, isLocked, { onToggleLock, onChoose }, meaning) {
    if (part.kind === KIND.JOINT) {
        return element("span", `name-part-joint name-part-${part.role.replace(" ", "-")}`, text);
    }
    const label = formatPartLabel(part);
    const wrapper = element("span", `name-part${isLocked ? " is-locked" : ""}`);
    wrapper.dataset.key = part.key;
    const choose = button("name-part-text", text, `Choose the ${label}: ${text}`, () => onChoose(part.key));
    choose.setAttribute("aria-haspopup", "dialog");
    const lock = iconButton("name-part-lock", isLocked ? "lock" : "unlock", `Lock the ${label}`, () =>
        onToggleLock(part.key)
    );
    lock.setAttribute("aria-pressed", String(isLocked));
    wrapper.append(...(meaning ? [meaning] : []), choose, lock);
    return wrapper;
}

/** A + (the change is off now) or - (it is on) button for a structure control. */
function renderStep(control, isOn, onChange) {
    const step = iconButton(
        `name-structure-step${control === NAME_STRUCTURE_CONTROL.COMPOUND_NAME && !isOn ? " is-slot" : ""}`,
        isOn ? "minus" : "plus",
        isOn ? STRUCTURE_CONTROLS[control].removeLabel : STRUCTURE_CONTROLS[control].addLabel,
        () => onChange(control)
    );
    step.dataset.control = control;
    return step;
}

export function focusStructure(control) {
    $("nameDials").querySelector(`[data-control="${control}"]`)?.focus();
}

/** After a redraw, which replaces the part's buttons. */
export function focusPart(key, control) {
    $("nameDials").querySelector(`[data-key="${key}"] .name-part-${control}`)?.focus();
}

/** The species picker's options, in the species description's order. */
export const renderSpeciesPicker = (species) => renderOptions($("pickerSpecies"), species);

/**
 * The pickers and Expanded Variety as the settings say; the lineage list is redrawn only when it changes.
 * @param {{ speciesName: string, lineages: { value: string, label: string }[], styles: string[], subrace: string,
 *   style: string, expanded: boolean, smallPoolNote: string }} settings - `lineages` in the species description's
 *   order; an empty `smallPoolNote` hides it
 */
export function renderPickers({ speciesName, lineages, styles, subrace, style, expanded, smallPoolNote }) {
    const lineagePicker = $("pickerLineage");
    const shown = [...lineagePicker.options].map((option) => option.value);
    if (shown.join() !== lineages.map((lineage) => lineage.value).join()) renderOptions(lineagePicker, lineages);
    renderSexChoices(styles);
    $("pickerSpecies").value = speciesName;
    lineagePicker.value = subrace;
    $("pickerSex").value = style;
    $("expandedToggle").setAttribute("aria-pressed", String(expanded));
    renderNote($("smallPoolNote"), smallPoolNote);
}

// only the genders the species offers (dwarves: female and male)
function renderSexChoices(styles) {
    for (const option of $("pickerSex").options) {
        const isOffered = styles.includes(option.value);
        option.hidden = !isOffered;
        option.disabled = !isOffered;
    }
}

/** A line under the name about the lineage (wild dwarves: why there is no clan name); hidden when there is none. */
export const renderLineageNote = (text) => renderNote($("lineageNote"), text);

function renderNote(node, text) {
    node.textContent = text || "";
    node.hidden = !text;
}

function renderOptions(select, options) {
    select.replaceChildren(
        ...options.map(({ value, label }) => {
            const option = element("option", null, label);
            option.value = value;
            return option;
        })
    );
}

/**
 * The name card's bookmark; pressing it again removes the saved name. While it is switched off it says Full.
 * @param {{ isSaved: boolean, isFull: boolean }} state
 */
export function renderSaved({ isSaved, isFull }) {
    const save = $("saveButton");
    const isOff = renderBookmark(save, { isSaved, isFull, label: "Save name" });
    // says Full for as long as it is off, not only when pressed
    save.toggleAttribute("data-labelled", isOff);
    if (isOff) buttonLabel(save).textContent = "Full";
}

const CONFIRM_MS = 1500;
const confirming = new WeakMap();

/** Briefly turns an icon button into what it did, in words ("Copied", "Saved"), with another icon if given. */
export function renderButtonConfirmation(node, word, iconName) {
    // one word at a time per group of buttons, where they would overlap on a narrow card
    node.parentElement.querySelectorAll("[data-confirming]").forEach(endConfirmation);
    const use = node.querySelector("use");
    const label = buttonLabel(node);
    const restingIcon = use.getAttribute("href");
    label.textContent = word;
    use.setAttribute("href", iconName ? `#icon-${iconName}` : restingIcon);
    // the countdown line (style.css) runs for the same time as the word's timer; the layout read restarts it
    borderLine(node);
    node.style.setProperty("--confirm-ms", `${CONFIRM_MS}ms`);
    node.getBoundingClientRect();
    node.toggleAttribute("data-confirming", true);
    confirming.set(node, { timer: setTimeout(() => endConfirmation(node), CONFIRM_MS), restingIcon });
}

const GLINT_MS = 600;
const glinting = new WeakMap();

/** Confirms on a name card button ("copyButton", "saveButton") and glints the card's name. */
export function renderCardConfirmation(buttonId, word, iconName) {
    renderButtonConfirmation($(buttonId), word, iconName);
    renderGlint($("nameDials"));
}

/** Confirms on any other button, such as a Copy all. */
export const renderConfirmation = (buttonId, word, iconName) => renderButtonConfirmation($(buttonId), word, iconName);

/** Glints a name (style.css) once, like a shutter; pressing again starts over. */
export function renderGlint(node) {
    clearTimeout(glinting.get(node));
    node.removeAttribute("data-glinting");
    // the layout read restarts the animation
    node.getBoundingClientRect();
    node.toggleAttribute("data-glinting", true);
    glinting.set(
        node,
        setTimeout(() => endGlint(node), GLINT_MS)
    );
}

function endGlint(node) {
    clearTimeout(glinting.get(node));
    glinting.delete(node);
    node.removeAttribute("data-glinting");
}

/** Ends the name card's confirmations, which were about the name it showed before. */
export function endCardConfirmations() {
    $("saveButton").parentElement.querySelectorAll("[data-confirming]").forEach(endConfirmation);
    endGlint($("nameDials"));
}

/** The countdown line: a stroke round the button's border, drawn by style.css while it is confirming. */
function borderLine(node) {
    if (node.querySelector(".icon-button-border")) return;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "icon-button-border");
    svg.setAttribute("aria-hidden", "true");
    const outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    // path length 100 makes the dashes percentages of the border, whatever the button's size
    outline.setAttribute("pathLength", "100");
    svg.append(outline);
    node.append(svg);
}

const buttonLabel = (node) =>
    node.querySelector(".icon-button-label") || node.appendChild(element("span", "icon-button-label"));

function endConfirmation(node) {
    const { timer, restingIcon } = confirming.get(node);
    clearTimeout(timer);
    node.removeAttribute("data-confirming");
    node.style.removeProperty("--confirm-ms");
    node.querySelector("use").setAttribute("href", restingIcon);
    confirming.delete(node);
}

/** Brings a section's heading to the top of the screen and focuses it; focus alone stops once the heading shows. */
export function goToSection(headingId) {
    const heading = $(headingId);
    heading.scrollIntoView({ block: "start" });
    heading.focus({ preventScroll: true });
}

/**
 * Opens the sorted options for one part, with the current one marked. A surname has two lists (published and
 * constructed) switched by toggle buttons (aria-pressed rather than an ARIA tab widget, so no arrow-key handling).
 * @param {{ kind?: string, label?: string, options: Object[], onPick: Function, selected?: boolean }[]} tabs - parts
 *   from the generator; the tab marked `selected` is the part's current kind and is shown first
 * @param {Part} currentPart - marked in its own tab by isSamePart, since two entries can share a spelling
 */
export function openPartPicker(tabs, currentPart) {
    const dialog = $("partPicker");
    const describe = (option) =>
        option.meaning ||
        (option.from && `from ${option.from.slice(0, 3).join(", ")}`) ||
        (option.sources?.length ? formatSourceTitle(option.sources[0]) : "");
    const showTab = (tab) => {
        // the title names what the list holds (a whole family name, or a prefix), so it follows the tab
        $("partPickerTitle").textContent = `Choose the ${formatPartLabel(tab.options[0])}`;
        $("partPickerTabs")
            .querySelectorAll(".part-picker-tab")
            .forEach((node) => node.setAttribute("aria-pressed", String(node.dataset.kind === tab.kind)));
        const items = [...tab.options]
            .sort((a, b) => a.text.localeCompare(b.text))
            .map((option) => {
                const item = element("li");
                const pick = button("part-picker-option", undefined, undefined, () => {
                    dialog.close();
                    tab.onPick(option);
                });
                pick.append(
                    element("span", "part-picker-text", option.text),
                    element("span", "part-picker-detail", describe(option))
                );
                if (tab.selected && isSamePart(option, currentPart)) pick.setAttribute("aria-current", "true");
                item.append(pick);
                return item;
            });
        $("partPickerList").replaceChildren(...items);
        dialog.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
    };
    const tabBar = $("partPickerTabs");
    tabBar.hidden = tabs.length < 2;
    tabBar.replaceChildren(
        ...(tabs.length < 2
            ? []
            : tabs.map((tab) => {
                  const node = button("part-picker-tab", tab.label, undefined, () => showTab(tab));
                  node.dataset.kind = tab.kind;
                  return node;
              }))
    );
    showTab(tabs.find((tab) => tab.selected) || tabs[0]);
    dialog.showModal();
    dialog.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "center" });
}

const LOADING_WORDS = {
    loading: { title: "Loading the name lists" },
    retrying: { title: "The name lists didn't load. Retrying", note: "Your saved names and history are safe." },
    failed: {
        title: "The name lists still won't load.",
        note: "Check your connection, then reload. If that doesn't help, press Ctrl+F5 (Cmd+Shift+R on a Mac) to skip an old saved copy."
    },
    broken: {
        title: "The name card stopped working.",
        note: "Reload to start again. Your saved names and history are safe."
    }
};
const NEEDS_NAMES = ["generateButton", "saveButton", "copyButton", "listButton"];

/**
 * Where the name card stands while the name lists load: "loading", "retrying" (said once), "failed" (with a Reload
 * button calling onReload), "broken" (the card failed after loading, also with Reload) or "ready", which hides the
 * panel and switches the buttons that need the lists back on.
 * @param {"loading" | "retrying" | "failed" | "broken" | "ready"} step
 * @param {Function} [onReload]
 */
export function renderLoading(step, onReload) {
    const panel = $("nameLoading");
    panel.dataset.step = step;
    panel.hidden = step === "ready";
    NEEDS_NAMES.forEach((id) => switchOff($(id), step !== "ready"));
    if (step === "ready") return;
    const { title, note } = LOADING_WORDS[step];
    $("nameLoadingTitle").textContent = title;
    $("nameLoadingNote").replaceChildren(...(note ? [note] : []));
    if (onReload) $("nameLoadingNote").append(" ", button("name-card-loading-reload", "Reload", undefined, onReload));
    const sentence = title.endsWith(".") ? title : `${title}.`;
    announce(note ? `${sentence} ${note}` : title);
}

/**
 * Reports what the visitor does with the pickers and the name card. `onRoll(trigger)` ("button" or "spacebar") says
 * whether a name was rolled, so the Roll Name effects play only then. The Expanded Variety hint and closing a dialog
 * from its backdrop change nothing the app holds, so they are handled here.
 * @param {{ onSpeciesChange: Function, onLineageChange: Function, onSexChange: Function, onExpandedToggle: Function,
 *   onRollPress: Function, onRoll: Function, onCopy: Function, onSave: Function, onSourcesOpen: Function }} handlers -
 *   the three pickers' handlers are called with the value chosen
 */
export function wireCardControls(handlers) {
    const { onSpeciesChange, onLineageChange, onSexChange, onExpandedToggle, onRollPress, onRoll } = handlers;
    $("pickerSpecies").addEventListener("change", (event) => onSpeciesChange(event.target.value));
    $("pickerLineage").addEventListener("change", (event) => onLineageChange(event.target.value));
    $("pickerSex").addEventListener("change", (event) => onSexChange(event.target.value));
    $("expandedToggle").addEventListener("click", onExpandedToggle);
    $("expandedInfo").addEventListener("click", toggleExpandedHint);
    $("namePicker").addEventListener("submit", (event) => event.preventDefault());
    const generate = $("generateButton");
    generate.addEventListener("pointerdown", () => {
        onRollPress();
        rechargeOnLetGo(generate);
    });
    // a pointer flashed on its press; a click with no pointer (detail 0) came from the keyboard
    generate.addEventListener("click", (event) => {
        if (!onRoll("button")) return;
        if (event.detail === 0) renderFlash();
        renderRolled();
    });
    document.body.addEventListener("keydown", (event) => {
        const typing = event.target.closest("input, select, textarea, button, summary, a");
        if (event.code !== "Space" || typing || document.querySelector("dialog[open]")) return;
        event.preventDefault();
        if (!onRoll("spacebar")) return;
        renderFlash();
        renderRolled();
    });
    $("copyButton").addEventListener("click", handlers.onCopy);
    $("saveButton").addEventListener("click", handlers.onSave);
    $("nameSourcesSummary")
        .closest("details")
        .addEventListener("toggle", (event) => event.currentTarget.open && handlers.onSourcesOpen());
    closeOnOutsideClick($("partPicker"));
    closeOnOutsideClick($("privacyDialog"));
}

function toggleExpandedHint(event) {
    const isOpen = event.currentTarget.getAttribute("aria-expanded") !== "true";
    event.currentTarget.setAttribute("aria-expanded", String(isOpen));
    $("expandedHint").hidden = !isOpen;
}

// a tap outside a dialog (on its backdrop) closes it
function closeOnOutsideClick(dialog) {
    dialog.addEventListener("click", (event) => {
        const box = dialog.getBoundingClientRect();
        const outside =
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom;
        if (event.target === dialog && outside) dialog.close();
    });
}

/** Tells the inline guard in index.html that the page's script has run. */
export function renderStarted() {
    document.documentElement.dataset.started = "true";
}

/** The cookie banner, its buttons, the privacy dialog and the links that open it, for setUpConsent. */
export const getConsentControls = () => ({
    banner: $("cookieBanner"),
    accept: document.querySelectorAll(".cookie-accept"),
    decline: document.querySelectorAll(".cookie-decline"),
    dialog: $("privacyDialog"),
    links: document.querySelectorAll(".privacy-link")
});

/** Plays the Roll Name button's discharge, the moment it is pressed or a roll comes from the keyboard. */
export function renderFlash() {
    replayAnimation($("generateButton"), "data-flashing");
}

// the Roll Name button's sparkles come back after a roll
function renderRolled() {
    replayAnimation($("generateButton"), "data-rolled");
}

const LET_GO_CATCH_UP_MS = 90;

// A press dragged off the button and let go there is no click, so the page, not the button, hears it end.
function rechargeOnLetGo(button) {
    const pressEnded = new AbortController();
    const letGo = () => {
        pressEnded.abort();
        springBack(button);
    };
    for (const type of ["pointerup", "pointercancel"]) {
        document.addEventListener(type, letGo, { signal: pressEnded.signal });
    }
}

// The restore and recharge wait out the discharge but are paused while held, so after a long hold they would wait again.
// Let go mid-discharge, the light finishes leaving at once, so the stone's light comes back with its lift.
function springBack(button) {
    const animations = button.getAnimations?.() ?? [];
    const named = (name) => animations.find((animation) => animation.animationName === name);
    const discharge = named("generate-discharge");
    const isDischarging = (discharge?.playState ?? "finished") !== "finished";
    const leftToRun = isDischarging ? discharge.effect.getTiming().duration - discharge.currentTime : 0;
    const catchUp = Math.min(leftToRun, LET_GO_CATCH_UP_MS);
    if (isDischarging) discharge.playbackRate = leftToRun / catchUp;
    for (const animation of [named("generate-restore"), named("generate-recharge")]) {
        if (animation) {
            animation.currentTime = Math.max(animation.currentTime, animation.effect.getTiming().delay - catchUp);
        }
    }
}

/** Draws the eye to the locked parts, which are why a roll found no name. */
export function renderLockNudge() {
    $("nameDials")
        .querySelectorAll(".name-part.is-locked .name-part-lock")
        .forEach((lock) => replayAnimation(lock, "data-nudged"));
}

function replayAnimation(node, attribute) {
    node.removeAttribute(attribute);
    void node.offsetWidth; // forces a reflow, so setting the attribute again starts the animation over
    node.toggleAttribute(attribute, true);
}
