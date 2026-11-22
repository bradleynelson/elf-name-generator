// Rendering only; text is always set with textContent. Reads a part's `section` and `kind`, never species rules.
import { isSurnamePart, KIND, NAME_STRUCTURE_CONTROL, surnameStart } from "./core/nameStructure.js?v=4.2.0";
import { getLineage } from "./core/species.js?v=4.2.0";

const $ = (id) => document.getElementById(id);
const LABELS = {
    "family name": "family name",
    prefix: "prefix",
    suffix: "suffix",
    "family prefix": "family name prefix",
    "family suffix": "family name suffix",
    house: "house name",
    "house prefix": "house name prefix",
    "house suffix": "house name suffix"
};
const isSlotComponent = (part) => part.kind === KIND.PREFIX || part.kind === KIND.SUFFIX;
// Ed Greenwood's own sources read "from", not "published in"
const isFromCreator = (sources) => sources?.[0]?.authority === "creator";

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function button(className, text, label, onClick) {
    const node = element("button", className, text);
    node.type = "button";
    if (label) node.setAttribute("aria-label", label);
    node.addEventListener("click", onClick);
    return node;
}

/** An icon from the sprite in index.html. */
function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#icon-${name}`);
    svg.append(use);
    return svg;
}

function iconButton(className, iconName, label, onClick) {
    const node = button(className, undefined, label, onClick);
    node.title = label;
    node.append(icon(iconName));
    return node;
}

const partLabel = (part) => LABELS[part.role] || part.role;

function displayTexts(parts) {
    let wordStart = true;
    const start = surnameStart(parts);
    return parts.map((part, index) => {
        if (part.role === "space") {
            wordStart = true;
            return " ";
        }
        if (index === start) wordStart = true;
        const text = wordStart ? part.text.charAt(0).toUpperCase() + part.text.slice(1) : part.text;
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
    if (parts.some((p) => p.method === "published" && p.form !== "common")) {
        return { whole: { text: "Meaning unknown", unknown: true } };
    }
    const composed = parts.find((p) => p.method === "composed");
    if (composed) return { whole: { text: composed.words.join("-").toLowerCase(), gloss: true } };
    const components = parts.filter(isSlotComponent);
    if (!components.length) return {};
    if (components.every((p) => p.method === "split")) {
        return { whole: { text: "Meaning unknown", unknown: true, split: true } };
    }
    const segment = (p) =>
        p.method === "split" ? { text: "Unknown", unknown: true, split: true } : { text: firstGloss(p.meaning) };
    return { byPart: new Map(components.map((p) => [p, segment(p)])) };
}

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

function renderNameText(result) {
    const matchNote = isFromCreator(result.published?.sources) ? "a name used by Ed Greenwood" : "a published name";
    $("nameText").textContent = result.published ? `${result.name}, ${matchNote}` : result.name;
}

// a space ends a word, and the surname starts one at its first component (a joining letter inside it does not)
function groupWords(parts) {
    const words = [];
    const start = surnameStart(parts);
    parts.forEach((part, index) => {
        if (part.role === "space") return words.push([]);
        if (!words.length || index === start) words.push([]);
        words.at(-1).push(index);
    });
    return words;
}

// word by word, so narrow screens wrap between words; a missing compound name shows as an empty slot
function renderWords(result, locked, handlers) {
    const texts = displayTexts(result.parts);
    const { controls = [], onChange } = handlers.structure || {};
    const steps = new Map(controls.map(({ control, on }) => [control, on]));
    const { FIRST_NAME, COMPOUND_NAME, SURNAME } = NAME_STRUCTURE_CONTROL;
    let firstNameWords = 0;
    $("nameDials").replaceChildren(
        ...groupWords(result.parts).flatMap((indexes) => {
            const parts = indexes.map((i) => result.parts[i]);
            const isSurname = isSurnamePart(parts[0]);
            const kind = isSurname ? SURNAME : firstNameWords++ === 0 ? FIRST_NAME : COMPOUND_NAME;
            const { whole, byPart } = wordMeaning(parts);
            const row = element("span", `name-word-parts${byPart ? " has-part-meanings" : ""}`);
            indexes.forEach((i) => {
                const part = result.parts[i];
                const meaning = byPart && renderMeaning("name-part-meaning", byPart.get(part));
                row.append(renderPart(part, texts[i], locked.has(part.key), handlers, meaning));
            });
            if (steps.has(kind) && (kind !== COMPOUND_NAME || steps.get(kind))) {
                row.append(renderStep(kind, steps.get(kind), onChange));
            }
            const word = element("span", "name-word");
            word.append(renderMeaning("name-word-meaning", byPart ? null : whole), row);
            const slot =
                isSurname && steps.get(COMPOUND_NAME) === false ? [renderStep(COMPOUND_NAME, false, onChange)] : [];
            return [...slot, word];
        })
    );
}

function renderMeaning(className, segment) {
    const caption = element("span", className);
    if (segment) {
        const style = segment.split ? "name-word-unknown" : segment.gloss ? "name-word-gloss" : null;
        caption.append(element("span", style, segment.text));
    }
    return caption;
}

function renderScript(result) {
    const { font, label } = getLineage(result.subrace).script;
    const node = $("nameScript");
    // the script fonts have no apostrophe glyph and would show an empty box
    node.textContent = result.name.replace(/'/g, "");
    node.dataset.script = font;
    $("nameScriptLabel").textContent = label;
}

function renderSources(result) {
    $("nameSources").replaceChildren(
        ...describeSources(result).map((row) => {
            const node = element("div", "name-sources-row");
            const value = element("div", "name-sources-value");
            const text = element("p", "name-sources-text", row.text);
            if (row.names) text.append(" cut from ", ...renderList(row.names, (name) => name, NAME_LIST));
            if (row.asIn) text.append(" as in ", ...renderList(row.asIn, (name) => name, NAME_LIST));
            if (row.note) text.append(`. ${row.note}`);
            value.append(text);
            if (row.sources?.length) value.append(renderSourceLine(row.sources, row.meaningFrom));
            if (row.from) value.append(element("p", "name-sources-from", row.from));
            if (row.ruleFrom) {
                const line = element("p", "name-sources-from", "rule from ");
                line.append(element("cite", null, row.ruleFrom));
                value.append(line);
            }
            node.append(element("span", "name-sources-label", row.label), value);
            return node;
        })
    );
}

function renderSourceLine(sources, meaningFrom) {
    const line = element("p", "name-sources-from");
    const books = element("span", "name-sources-books");
    books.append(...renderList(sources, (source) => element("cite", null, source.title), SOURCE_LIST));
    line.append(books);
    if (meaningFrom) line.append(" · meaning from ", element("cite", null, meaningFrom));
    return line;
}

const NAME_LIST = { shown: 2, separator: ", ", last: " and ", noun: " names" };
const SOURCE_LIST = { shown: 1, separator: "; ", last: "; ", noun: "" };

// everything shows when only one more would be hidden, so there is never an "and 1 more"
function renderList(items, show, { shown: limit, separator, last, noun }) {
    const shown = items.length <= limit + 1 ? items.length : limit;
    const rest = items.slice(shown);
    const first = items.slice(0, shown).flatMap((item, n) => {
        if (!n) return [show(item)];
        return [!rest.length && n === shown - 1 ? last : separator, show(item)];
    });
    if (!rest.length) return first;
    const more = element("span", "name-sources-rest");
    more.hidden = true;
    more.append(...rest.flatMap((item) => [separator, show(item)]));
    const count = `and ${rest.length} more${noun}`;
    const toggle = button("name-sources-more", count, null, () => {
        const isOpen = toggle.getAttribute("aria-expanded") !== "true";
        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.textContent = isOpen ? "show fewer" : count;
        more.hidden = !isOpen;
    });
    toggle.setAttribute("aria-expanded", "false");
    toggle.title = more.textContent.slice(separator.length);
    return [...first, more, toggle];
}

function renderPart(part, text, isLocked, { onToggleLock, onChoose }, meaning) {
    if (part.kind === KIND.JOINT) {
        return element("span", `name-part-joint name-part-${part.role.replace(" ", "-")}`, text);
    }
    const label = partLabel(part);
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

// What each + / - button does, for screen readers: [when the control is off, when it is on]
const STEP_LABELS = {
    [NAME_STRUCTURE_CONTROL.FIRST_NAME]: ["Add a suffix to the first name", "Remove the last suffix of the first name"],
    [NAME_STRUCTURE_CONTROL.COMPOUND_NAME]: ["Add a compound name", "Remove the compound name"],
    [NAME_STRUCTURE_CONTROL.SURNAME]: ["Add a suffix to the surname", "Remove the last suffix of the surname"]
};

/** A + (the change is off now) or - (it is on) button for a structure control. */
function renderStep(control, isOn, onChange) {
    const step = iconButton(
        `name-structure-step${control === NAME_STRUCTURE_CONTROL.COMPOUND_NAME && !isOn ? " is-slot" : ""}`,
        isOn ? "minus" : "plus",
        STEP_LABELS[control][isOn ? 1 : 0],
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

function describeSources(result) {
    const rows = result.parts.flatMap(describePart);
    if (result.published) {
        const personal = result.name.slice(0, result.name.lastIndexOf(" "));
        rows.unshift({ label: "Published name", text: personal, sources: result.published.sources });
    }
    return rows.filter(Boolean);
}

const keepTogether = (text) => text.replaceAll(" ", "\u00a0");

/** A part's row (one per word for a composed family name), or null for an apostrophe or a space. */
function describePart(part) {
    const label = partLabel(part).charAt(0).toUpperCase() + partLabel(part).slice(1);
    const shown = part.kind === KIND.PREFIX ? `${part.text}-` : part.kind === KIND.SUFFIX ? `-${part.text}` : part.text;
    switch (part.method) {
        case "split":
            return { label, text: shown, names: part.from, sources: part.sources };
        case "published": {
            const text = part.meaningSource ? `${part.text} means "${part.meaning}"` : part.text;
            const meaningFrom = part.meaningSource !== part.sources[0]?.title ? part.meaningSource : undefined;
            return { label, text, note: part.note, sources: part.sources, meaningFrom };
        }
        case "composed": {
            const [first, second] = part.words.map((word) => word.toLowerCase());
            if (part.wordNames) {
                return [first, second].map((word, n) => ({
                    label: `${keepTogether(label)}, ${keepTogether(`${n ? "second" : "first"} word`)}`,
                    text: `"${word}"`,
                    asIn: part.wordNames[n],
                    sources: part.wordSources[n]
                }));
            }
            // names saved by earlier versions say only where the words come from, or nothing
            const from = part.wordsFrom && `words from ${part.wordsFrom}`;
            return { label, text: `${part.text}: "${first}" and "${second}"`, from };
        }
        default:
            if (part.role === "joining letter") {
                const text = `-${part.text}- added so the components join smoothly`;
                return { label: "Joining letter", text, ruleFrom: part.basis };
            }
            return isSlotComponent(part)
                ? { label, text: `${shown} means "${part.meaning}"`, sources: part.sources }
                : null;
    }
}

/**
 * Fills the lineage picker from the species description, in its order; the first lineage is the default.
 * @param {{ value: string, label: string }[]} lineages
 */
export function renderLineagePicker(lineages) {
    $("pickerLineage").replaceChildren(
        ...lineages.map(({ value, label }) => {
            const option = element("option", null, label);
            option.value = value;
            return option;
        })
    );
}

/** The bookmark stays filled while the current name is saved; pressing it again removes the name. */
export function renderSaved(isSaved) {
    const save = $("saveButton");
    save.setAttribute("aria-pressed", String(isSaved));
    save.title = isSaved ? "Saved (press to remove)" : "Save";
}

/** A list of names (more names, history); picking one shows it. */
export function renderNameList(listId, results, onPick) {
    $(listId).replaceChildren(
        ...results.map((result) => {
            const item = element("li");
            item.append(button("name-list-name", result.name, `Show ${result.name}`, () => onPick(result)));
            if (result.published) {
                const badge = isFromCreator(result.published.sources) ? "Ed Greenwood" : "published";
                item.append(element("span", "name-list-badge", badge));
            }
            return item;
        })
    );
}

/**
 * Saved names: click one to load it (names saved by older versions may only have their text), copy or remove it.
 * @param {{ canLoad: Function, onLoad: Function, onCopy: Function, onRemove: Function, max: number }} handlers -
 *   canLoad(record) says whether a saved name can be shown again
 */
export function renderFavorites(favorites, { canLoad, onLoad, onCopy, onRemove, max }) {
    $("favoritesCount").textContent = `(${favorites.length} of ${max})`;
    $("favoritesList").replaceChildren(
        ...favorites.map((favorite) => {
            const item = element("li", null);
            const name = canLoad(favorite)
                ? button("name-list-name", favorite.name, `Show ${favorite.name}`, () => onLoad(favorite.result))
                : element("span", "name-list-name", favorite.name);
            const tools = element("span", "favorites-tools");
            tools.append(
                iconButton("icon-button favorites-tool", "copy", `Copy ${favorite.name}`, () => onCopy(favorite.name)),
                iconButton("icon-button favorites-tool favorites-remove", "trash", `Remove ${favorite.name}`, () =>
                    onRemove(favorite.name)
                )
            );
            item.append(name, tools);
            return item;
        })
    );
}

/**
 * Opens the sorted options for one part, with the current one marked. A surname has two lists (published and
 * constructed) switched by toggle buttons (aria-pressed rather than an ARIA tab widget, so no arrow-key handling).
 * @param {{ kind?: string, label?: string, options: Object[], onPick: Function, selected?: boolean }[]} tabs - parts
 *   from the generator; the tab marked `selected` is the part's current kind and is shown first
 * @param {string} currentText
 */
export function openPartPicker(tabs, currentText) {
    const dialog = $("partPicker");
    const describe = (option) => option.meaning || (option.from && `from ${option.from.slice(0, 3).join(", ")}`) || "";
    const showTab = (tab) => {
        // the title names what the list holds (a whole family name, or a prefix), so it follows the tab
        $("partPickerTitle").textContent = `Choose the ${partLabel(tab.options[0])}`;
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
                if (tab.selected && option.text === currentText) pick.setAttribute("aria-current", "true");
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

let noticeTimer;
/**
 * Shows a short message. With an action (such as Undo) it also shows a button and stays longer; it never disappears
 * while the pointer or keyboard focus is on it.
 * @param {string} message
 * @param {{ label: string, onClick: Function }} [action]
 */
export function showNotice(message, action = null) {
    const notice = $("notice");
    notice.replaceChildren(element("span", null, message));
    if (action) {
        notice.append(
            button("notice-action", action.label, undefined, () => {
                notice.hidden = true;
                action.onClick();
            })
        );
    }
    const hideLater = () => {
        clearTimeout(noticeTimer);
        noticeTimer = setTimeout(() => (notice.hidden = true), action ? 8000 : 4000);
    };
    notice.onpointerenter = notice.onfocusin = () => clearTimeout(noticeTimer);
    notice.onpointerleave = notice.onfocusout = hideLater;
    notice.hidden = false;
    hideLater();
}
