// Rendering only: turns results and lists into page content. Text is always set with textContent.
const $ = (id) => document.getElementById(id);
const STRUCTURAL = new Set(["joining letter", "apostrophe", "space"]);
const LABELS = {
    "family name": "family name",
    prefix: "prefix",
    suffix: "suffix",
    "family prefix": "family name prefix",
    "family suffix": "family name suffix",
    house: "house",
    "house prefix": "house prefix",
    "house suffix": "house suffix"
};
// family names and houses: whole (published or Common-form) or in table components
const isSurnamePart = (part) => /^(family|house)/.test(part.role);
const TABLE_ROLES = new Set(["prefix", "suffix", "family prefix", "family suffix", "house prefix", "house suffix"]);

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

/** What a part is called in labels and the picker title. */
export const partLabel = (part) => LABELS[part.role] || part.role;

/** Display text of each part: the first part of each word starts with a capital. */
function displayTexts(parts) {
    let wordStart = true;
    return parts.map((part, index) => {
        if (part.role === "space") {
            wordStart = true;
            return " ";
        }
        if (isSurnamePart(part) && !isSurnamePart(parts[index - 1] || {})) wordStart = true;
        const text = wordStart ? part.text.charAt(0).toUpperCase() + part.text.slice(1) : part.text;
        wordStart = false;
        return text;
    });
}

// "Infested, plague" -> "Infested": the first gloss of each part
const firstGloss = (meaning) => meaning.split(", ")[0];

/**
 * The meaning shown above one word, as segments ({ text, unknown?, split? }). Kinds stay distinct: a book's translation
 * ("Moonwhisper"), meanings built from published naming tables ("Age · Gift · Fair"; a drow house reads as one
 * phrase), split components (Expanded Variety), whose meaning is unknown: "Unknown" for one component, "Meaning
 * unknown" when every component is; and published family or house names without a translation, "Meaning unknown".
 * Common-form family names show none.
 */
function wordMeaning(parts) {
    const phrase = parts.find((p) => p.wordMeaning);
    if (phrase) return [{ text: phrase.wordMeaning }];
    const translated = parts.find((p) => p.meaningSource);
    if (translated) return [{ text: translated.meaning }];
    if (parts.some((p) => p.method === "published")) return [{ text: "Meaning unknown", unknown: true }];
    const components = parts.filter((p) => TABLE_ROLES.has(p.role));
    if (components.length) {
        if (components.every((p) => p.method === "split"))
            return [{ text: "Meaning unknown", unknown: true, split: true }];
        return components.map((p) =>
            p.method === "split" ? { text: "Unknown", unknown: true, split: true } : { text: firstGloss(p.meaning) }
        );
    }
    return [];
}

/**
 * @param {Object} result - generator result
 * @param {Set<string>} locked - keys of locked parts
 * @param {{ onToggleLock: Function, onChoose: Function }} handlers - onChoose opens the picker for a part
 */
export function renderResult(result, locked, handlers) {
    const fromCreator = result.published?.source.creator;
    const matchNote = fromCreator ? "a name used by Ed Greenwood" : "a published name";
    $("nameText").textContent = result.published ? `${result.name}, ${matchNote}` : result.name;
    const texts = displayTexts(result.parts);
    // parts are grouped into words, so a narrow screen wraps between words, never inside one, and each word carries
    // its own meaning above it
    const words = [];
    result.parts.forEach((part, index) => {
        const startsSurname = isSurnamePart(part) && !isSurnamePart(result.parts[index - 1] || {});
        if (part.role === "space") return words.push([]);
        if (!words.length || startsSurname) words.push([]);
        words.at(-1).push(index);
    });
    let hasMeaning = false;
    $("nameDials").replaceChildren(
        ...words.map((indexes) => {
            const segments = wordMeaning(indexes.map((i) => result.parts[i]));
            hasMeaning ||= segments.some((s) => !s.unknown);
            const caption = element("span", "name-word-meaning");
            segments.forEach((segment, n) => {
                if (n) caption.append(" · ");
                caption.append(element("span", segment.split ? "name-word-unknown" : null, segment.text));
            });
            const word = element("span", "name-word");
            const row = element("span", "name-word-parts");
            indexes.forEach((i) =>
                row.append(renderPart(result.parts[i], texts[i], locked.has(result.parts[i].key), handlers))
            );
            word.append(caption, row);
            return word;
        })
    );
    const script = $("nameScript");
    // the script fonts have no apostrophe glyph and would show an empty box
    script.textContent = result.name.replace(/'/g, "");
    script.dataset.script = result.subrace === "drow" ? "high-drowic" : "espruar";
    $("nameScriptLabel").textContent =
        result.subrace === "drow" ? "Written in the High Drowic font" : "Written in Espruar, the elven alphabet";
    $("nameSourcesSummary").textContent = hasMeaning ? "Name meanings and sources" : "Where this name comes from";
    $("nameSources").replaceChildren(
        ...describeSources(result).map(([label, value]) => {
            const row = element("div", "name-sources-row");
            row.append(element("span", "name-sources-label", label), element("span", "name-sources-value", value));
            return row;
        })
    );
}

/** One part: a button to choose another option and a lock; joints (joining letter, apostrophe) are plain text. */
function renderPart(part, text, isLocked, { onToggleLock, onChoose }) {
    if (STRUCTURAL.has(part.role)) {
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
    wrapper.append(choose, lock);
    return wrapper;
}

/** Puts keyboard focus back on a part after the name is redrawn (its buttons are replaced). */
export function focusPart(key, control) {
    $("nameDials").querySelector(`[data-key="${key}"] .name-part-${control}`)?.focus();
}

/** One labelled row per part: what it is and where it comes from (names and the books they appear in). */
function describeSources(result) {
    const from = (part) => {
        const books = part.books?.length ? ` (${part.books.join("; ")})` : "";
        return `from ${part.from.join(", ")}${books}`;
    };
    const label = (part) => partLabel(part).charAt(0).toUpperCase() + partLabel(part).slice(1);
    const rows = result.parts.map((part) => {
        switch (part.method || part.role) {
            case "split":
                return part.role.endsWith("prefix")
                    ? [label(part), `${part.text}- ${from(part)}`]
                    : [label(part), `-${part.text} ${from(part)}`];
            case "joining letter":
                return [
                    "Joining letter",
                    `-${part.text}- added so the components join smoothly, as Dragon #251 suggests`
                ];
            case "prefix":
            case "suffix":
            case "family prefix":
            case "family suffix":
            case "house prefix":
            case "house suffix":
                return [label(part), `${part.text} means "${part.meaning}"`];
            case "published": {
                const where = `${part.source.creator ? "from a" : "published in"} ${part.source.title}`;
                const note = part.note ? `. ${part.note}` : "";
                if (!part.meaningSource) return [label(part), `${part.text}, ${where}${note}`];
                const book = part.meaningSource === part.source.title ? "" : ` (translated in ${part.meaningSource})`;
                return [label(part), `${part.text} means "${part.meaning}"${book}, ${where}${note}`];
            }
            case "composed": {
                const [first, second] = part.words;
                return [label(part), `${part.text}: "${first}" and "${second}", words from published elf family names`];
            }
            default:
                return null;
        }
    });
    if (result.tables) rows.push(["Tables", `${result.tables}, which also gives the meanings`]);
    // a generated first name that matches a published one; names known only from Ed Greenwood's forum answers are
    // labelled apart from book names
    if (result.published) {
        const personal = result.name.slice(0, result.name.lastIndexOf(" "));
        const { source } = result.published;
        rows.unshift([
            "Published name",
            source.creator
                ? `${personal} is used by Ed Greenwood, the Realms' creator, in a forum answer`
                : `${personal} appears in ${source.title}`
        ]);
    }
    return rows.filter(Boolean);
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
                const badge = result.published.source.creator ? "Ed Greenwood" : "published";
                item.append(element("span", "name-list-badge", badge));
            }
            return item;
        })
    );
}

/**
 * Saved names: click one to load it (names saved before this version only have their text), copy or remove it.
 * @param {{ onLoad: Function, onCopy: Function, onRemove: Function, max: number }} handlers
 */
export function renderFavorites(favorites, { onLoad, onCopy, onRemove, max }) {
    $("favoritesCount").textContent = `(${favorites.length} of ${max})`;
    $("favoritesList").replaceChildren(
        ...favorites.map((favorite) => {
            const item = element("li", null);
            const name = favorite.result
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
 * Opens the full list of options for one part, sorted alphabetically, with the current one marked and in view.
 * @param {string} title
 * @param {Object[]} options - parts from the generator's optionsFor
 * @param {string} currentText
 * @param {Function} onPick - called with the chosen option
 */
export function openPartPicker(title, options, currentText, onPick) {
    const dialog = $("partPicker");
    $("partPickerTitle").textContent = title;
    const describe = (option) => option.meaning || (option.from && `from ${option.from.slice(0, 3).join(", ")}`) || "";
    const items = [...options]
        .sort((a, b) => a.text.localeCompare(b.text))
        .map((option) => {
            const item = element("li");
            const pick = button("part-picker-option", undefined, undefined, () => {
                dialog.close();
                onPick(option);
            });
            pick.append(
                element("span", "part-picker-text", option.text),
                element("span", "part-picker-detail", describe(option))
            );
            if (option.text === currentText) pick.setAttribute("aria-current", "true");
            item.append(pick);
            return item;
        });
    $("partPickerList").replaceChildren(...items);
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
