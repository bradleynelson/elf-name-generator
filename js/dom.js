// The page's building blocks for every rendering module; text is always set with textContent.

export const $ = (id) => document.getElementById(id);

export function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

export function button(className, text, label, onClick) {
    const node = element("button", className, text);
    node.type = "button";
    if (label) node.setAttribute("aria-label", label);
    if (onClick) node.addEventListener("click", onClick);
    return node;
}

/** An icon from the sprite in index.html. */
export function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", `#icon-${name}`);
    svg.append(use);
    return svg;
}

export function iconButton(className, iconName, label, onClick) {
    const node = button(className, undefined, label, onClick);
    node.title = label;
    node.append(icon(iconName));
    return node;
}

// aria-disabled rather than disabled, so the button can still be focused and pressed to say why it is off
export function switchOff(node, isOff) {
    if (isOff) node.setAttribute("aria-disabled", "true");
    else node.removeAttribute("aria-disabled");
}

/**
 * A save bookmark, filled (aria-pressed) while its name is saved; while Saved names is full an unsaved name's bookmark
 * is switched off, but still pressable so it can say why. Returns whether it is off.
 * @param {Element} node
 * @param {{ isSaved: boolean, isFull: boolean, label: string }} state - label names what pressing it saves
 */
export function renderBookmark(node, { isSaved, isFull, label }) {
    const isOff = isFull && !isSaved;
    node.setAttribute("aria-pressed", String(isSaved));
    switchOff(node, isOff);
    node.title = isSaved ? "Saved (press to remove)" : isOff ? "Saved names is full" : "Save";
    node.setAttribute("aria-label", isOff ? `${label} (Saved names is full)` : label);
    return isOff;
}
