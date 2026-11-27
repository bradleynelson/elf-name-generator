// The page's messages and its one live region.
import { $, button, element, icon } from "./dom.js?v=4.3.2";

/** Says a message to screen readers through the page's one live region; a repeated message is said again. */
export function announce(text) {
    $("announcer").replaceChildren(element("p", null, text));
}

/**
 * A page message: a warning (amber) is about what will happen, an error (red) about what went wrong; copyText is shown
 * selected, ready for the person to copy.
 * @typedef {{ kind: "warning" | "error", title: string, text?: string, action?: { label: string, onClick: Function },
 *   copyText?: string }} PageMessage
 */

/**
 * Shows a message in one of the page's message slots, or empties the slot (null), and announces it.
 * @param {string} slotId
 * @param {PageMessage | null} message
 */
export function renderMessage(slotId, message) {
    const box = message && messageBox(message);
    $(slotId).replaceChildren(...(box ? [box] : []));
    if (box) showMessage(message, box);
}

/**
 * Adds a message at the end of `parent` (a row of a list), with an extra class, and announces it.
 * @param {Element} parent
 * @param {PageMessage} message
 * @param {string} className
 */
export function renderMessageIn(parent, message, className) {
    const box = messageBox(message);
    box.classList.add(className);
    parent.append(box);
    showMessage(message, box);
}

function messageBox({ kind, title, text, action, copyText }) {
    const body = element("div", "message-box-body");
    body.append(element("strong", "message-box-title", title));
    if (text) body.append(text);
    if (action) body.append(" ", button("message-box-action", action.label, undefined, action.onClick));
    if (copyText) body.append(element("span", "message-box-copy", copyText));
    const box = element("div", `message-box is-${kind}`);
    const symbol = icon(kind);
    symbol.setAttribute("aria-hidden", "true");
    box.append(symbol, body);
    return box;
}

// once the box is on the page, where its name can be selected
function showMessage({ title, text }, box) {
    announce(text ? `${title} ${text}` : title);
    const copy = box.querySelector(".message-box-copy");
    if (copy) selectText(copy);
}

function selectText(node) {
    const range = document.createRange();
    range.selectNodeContents(node);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}
