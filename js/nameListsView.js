// The lists of names on the page (More names, History and Saved names), each row with its tools.
import { formatNameKind } from "./core/species.js?v=4.3.0";
import { $, button, element, iconButton, renderBookmark } from "./dom.js?v=4.3.0";
import { renderMessageIn } from "./messages.js?v=4.3.0";
import { renderButtonConfirmation, renderGlint } from "./ui.js?v=4.3.0";

// what a row's button does (its data-action) and the handler it calls
const HANDLER_OF = {
    pick: "onPick",
    load: "onLoad",
    copy: "onCopy",
    save: "onSave",
    remove: "onRemove",
    undo: "onUndo"
};
// each list's rows and handlers as last drawn, for its one click listener
const drawnLists = new WeakMap();

function renderRows(list, rows, handlers, renderRow) {
    if (!drawnLists.has(list)) list.addEventListener("click", (event) => handleRowClick(list, event));
    drawnLists.set(list, { rows, handlers });
    list.replaceChildren(
        ...rows.map((row, index) => {
            const item = renderRow(row);
            item.dataset.index = String(index);
            return item;
        })
    );
}

function handleRowClick(list, event) {
    const pressed = event.target.closest("button[data-action]");
    if (!pressed || !list.contains(pressed)) return;
    const { rows, handlers } = drawnLists.get(list);
    const index = Number(pressed.closest("li").dataset.index);
    const { result, record } = rows[index];
    handlers[HANDLER_OF[pressed.dataset.action]](result ?? record, index, pressedRow(pressed));
}

/**
 * What a handler may do with the row pressed, without holding its elements: confirm on the button (glinting the
 * row's name), and ask whether the row is still shown (a copy can outlast a redraw).
 * @typedef {{ confirm: (word: string, iconName?: string) => void, isShown: () => boolean }} PressedRow
 */
const pressedRow = (pressed) => ({
    confirm: (word, iconName) => renderRowConfirmation(pressed, word, iconName),
    isShown: () => pressed.isConnected
});

function renderRowConfirmation(node, word, iconName) {
    renderButtonConfirmation(node, word, iconName);
    renderGlint(node.closest("li").querySelector(".name-list-name"));
}

// a list's Copy all button, shown while the list has a name to copy
const COPY_ALL_OF = { nameList: "copyAllListButton" };

const rowButton = (action, className, text, label) => {
    const node = button(className, text, label);
    node.dataset.action = action;
    return node;
};

const rowTool = (action, iconName, label) => {
    const node = iconButton(`icon-button name-list-tool name-list-${action}`, iconName, label);
    node.dataset.action = action;
    return node;
};

/**
 * A list of names (more names, history), each with what it is under it, a bookmark and a copy button; picking one
 * shows it. Given onRemove, each name can also be removed, keeping its row with an Undo.
 * @param {{ result: NameResult, isRemoved?: boolean }[]} rows - in the order shown
 * @param {{ onPick: Function, onCopy: Function, isSaved: Function, isFull: boolean, onSave: Function,
 *   onRemove?: Function, onUndo?: Function }} handlers - each called with the row's result, its index in `rows` and the
 *   button pressed; isSaved(result) fills the bookmark, which is switched off (but still pressable, to say why) while
 *   Saved names is full, and a removed name that is saved says so
 */
export function renderNameList(listId, rows, handlers) {
    if (COPY_ALL_OF[listId]) $(COPY_ALL_OF[listId]).hidden = rows.every((row) => row.isRemoved);
    renderRows($(listId), rows, handlers, ({ result, isRemoved }) =>
        isRemoved
            ? renderRemovedRow(result.name, {
                  done: "Removed",
                  undoLabel: `Undo removing ${result.name}`,
                  note: handlers.isSaved(result) ? "Still in Saved names." : undefined
              })
            : renderListedRow(result, handlers)
    );
}

function renderListedRow(result, { isSaved, isFull, onRemove }) {
    const item = element("li");
    const name = rowButton("pick", "name-list-name", result.name, `Show ${result.name}`);
    const kind = formatNameKind(result);
    item.append(nameWithKind(name, kind && element("span", "name-list-kind", kind)));
    const save = rowTool("save", "bookmark");
    renderBookmark(save, { isSaved: isSaved(result), isFull, label: `Save ${result.name}` });
    const tools = element("span", "name-list-tools");
    tools.append(save, rowTool("copy", "copy", `Copy ${result.name}`));
    if (onRemove) tools.append(rowTool("remove", "trash", `Remove ${result.name}`));
    item.append(tools);
    return item;
}

/**
 * Saved names: click one to load it, copy or remove it. One that cannot be shown again is marked damaged but listed;
 * a removed one keeps its row, with an Undo, until the page is left.
 * @param {{ record: Object, isRemoved?: boolean }[]} rows - in the order shown
 * @param {{ count: number, max: number, isNearlyFull: boolean, restored?: string, canLoad: Function, onLoad: Function,
 *   onCopy: Function, onRemove: Function, onUndo: Function }} handlers - canLoad(record) says whether a saved name can be
 *   shown again; onLoad, onCopy, onRemove and onUndo are called with the row's record, its index in `rows` and the
 *   button pressed (onLoad for every click); `restored` names the row just put back, which glints
 */
export function renderFavorites(rows, { count, max, isNearlyFull, restored, canLoad, ...handlers }) {
    const isFull = count >= max;
    $("copyAllSavedButton").hidden = count === 0;
    const counter = $("favoritesCount");
    counter.textContent = isFull ? `(${count} of ${max} · full)` : `(${count} of ${max})`;
    if (isFull || isNearlyFull) counter.dataset.fill = isFull ? "full" : "near";
    else delete counter.dataset.fill;
    renderRows($("favoritesList"), rows, handlers, ({ record, isRemoved }) => {
        const item = isRemoved
            ? renderRemovedRow(record.name, {
                  done: "Unsaved",
                  undoLabel: `Undo unsaving ${record.name}`,
                  note: "Cleared when you leave or refresh this page."
              })
            : renderSavedRow(record, canLoad(record));
        item.dataset.name = record.name;
        item.toggleAttribute("data-restored", record.name === restored);
        return item;
    });
}

const DAMAGED_NOTE = "Damaged: Cannot be rebuilt in generator. Copy and remove still work.";

function renderSavedRow(favorite, canLoad) {
    const item = element("li", null);
    const isDamaged = !canLoad;
    const name = rowButton(
        "load",
        `name-list-name${isDamaged ? " is-damaged" : ""}`,
        favorite.name,
        isDamaged ? `${favorite.name}, damaged` : `Show ${favorite.name}`
    );
    const tools = element("span", "name-list-tools");
    tools.append(
        rowTool("copy", "copy", `Copy ${favorite.name}`),
        rowTool("remove", "trash", `Unsave ${favorite.name}`)
    );
    const kind = formatNameKind({ sex: favorite.result?.sex, subrace: favorite.subrace });
    const line = isDamaged ? noteLine(DAMAGED_NOTE) : kind && element("span", "name-list-kind", kind);
    item.append(nameWithKind(name, line), tools);
    return item;
}

// a message from the page rather than a fact about the name
const noteLine = (text) => element("span", "name-list-kind is-note", text);

function nameWithKind(nameNode, line) {
    const group = element("span", "name-list-text");
    group.append(nameNode);
    if (line) group.append(line);
    return group;
}

/** A removed name's row, with what was done ("Unsaved") and an Undo. */
function renderRemovedRow(name, { done, undoLabel, note }) {
    const item = element("li", "name-list-removed");
    const undo = element("span", "name-list-removed-note", `${done} · `);
    undo.append(rowButton("undo", "name-list-undo", "Undo", undoLabel));
    item.append(nameWithKind(element("span", "name-list-removed-name", name), note && noteLine(note)), undo);
    return item;
}

// a saved name's row in Saved names, if it is still listed
const savedRow = (name) => [...$("favoritesList").children].find((item) => item.dataset.name === name);

const controlOf = (row, control) => row?.querySelector(`[data-action="${control}"]`);

/** After a redraw of Saved names: focus one of that name's buttons (its data-action), and return it. */
export function focusSavedName(name, control) {
    const node = controlOf(savedRow(name), control);
    node?.focus();
    return node;
}

/** After a redraw of a list of names: focus one row's button (its data-action), and return it. */
export function focusListedName(listId, index, control) {
    const node = controlOf(
        [...$(listId).children].find((item) => item.dataset.index === String(index)),
        control
    );
    node?.focus();
    return node;
}

/**
 * Call before the lists are redrawn by a change from another tab. The function it returns puts focus back on the row
 * button that had it; if that row or button is gone (only Saved names rows can go), focus moves to the Saved names
 * heading, so the next Tab does not start from the top of the page.
 * @returns {() => void}
 */
export function rememberRowFocus() {
    const pressed = document.activeElement?.closest("button[data-action]");
    const row = pressed?.closest("li");
    const list = row?.parentElement;
    if (!drawnLists.has(list)) return () => {};
    const { action } = pressed.dataset;
    return () => {
        const node =
            list.id === "favoritesList"
                ? focusSavedName(row.dataset.name, action)
                : focusListedName(list.id, row.dataset.index, action);
        if (!node) $("favoritesTitle").focus();
    };
}

/** After a redraw: focus a row's button and confirm on it, as the press before the redraw asked. */
export function renderListedConfirmation(listId, index, control, word) {
    renderRowConfirmation(focusListedName(listId, index, control), word);
}

/**
 * Reports the list buttons outside the rows: Roll 10 More, the two Copy all buttons, and History's Clear, its
 * Cancel and Delete, and the Undo after clearing.
 * @param {{ onRollList: Function, onCopyAllList: Function, onCopyAllSaved: Function, onHistoryClear: Function,
 *   onHistoryCancel: Function, onHistoryDelete: Function, onHistoryUndo: Function }} handlers
 */
export function wireListControls(handlers) {
    const handlerOf = {
        listButton: handlers.onRollList,
        copyAllListButton: handlers.onCopyAllList,
        copyAllSavedButton: handlers.onCopyAllSaved,
        historyClear: handlers.onHistoryClear,
        historyCancel: handlers.onHistoryCancel,
        historyDelete: handlers.onHistoryDelete,
        historyUndo: handlers.onHistoryUndo
    };
    Object.entries(handlerOf).forEach(([id, handler]) => $(id).addEventListener("click", handler));
}

/** History's Clear (while there is history and no question is open), its Cancel/Delete question, and its Undo. */
export function renderHistoryTools({ hasHistory, isConfirming, canUndo }) {
    $("historyConfirm").hidden = !isConfirming;
    $("historyClear").hidden = isConfirming || !hasHistory;
    $("historyCleared").hidden = !canUndo;
}

const HISTORY_CONTROLS = { clear: "historyClear", cancel: "historyCancel", undo: "historyUndo", title: "historyTitle" };

/** Moves focus in History after its buttons change: to "clear", "cancel", "undo" or the "title". */
export const focusHistoryControl = (control) => $(HISTORY_CONTROLS[control]).focus();

/**
 * A message inside one saved name's row, under the name; null clears every row's message. Nothing is shown when the
 * row has gone, as when another tab unsaved the name while a copy was waiting on the browser.
 */
export function renderSavedNameMessage(name, message) {
    $("favoritesList")
        .querySelectorAll(".name-list-message")
        .forEach((node) => node.remove());
    const row = savedRow(name);
    if (message && row) renderMessageIn(row, message, "name-list-message");
}
