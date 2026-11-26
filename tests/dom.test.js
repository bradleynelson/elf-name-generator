import { beforeEach, describe, expect, it, vi } from "vitest";
import { button, element, iconButton, renderBookmark, switchOff } from "../js/dom.js";

beforeEach(() => {
    document.body.replaceChildren();
});

describe("page building blocks", () => {
    it("sets text as text, never as markup", () => {
        const node = element("p", "panel-note", "<b>Alra</b>");
        expect([node.className, node.textContent, node.children.length]).toEqual(["panel-note", "<b>Alra</b>", 0]);
    });

    it("makes a plain button, named for screen readers when given a label, and calls onClick when pressed", () => {
        const onClick = vi.fn();
        const node = button("message-box-action", "Go", "Go to saved names", onClick);
        node.click();
        expect([node.type, node.getAttribute("aria-label"), onClick.mock.calls.length]).toEqual([
            "button",
            "Go to saved names",
            1
        ]);
    });

    it("gives an icon button the sprite's icon and its label as a tooltip", () => {
        const node = iconButton("icon-button", "copy", "Copy Alra");
        expect([node.title, node.querySelector("use").getAttribute("href")]).toEqual(["Copy Alra", "#icon-copy"]);
    });

    it("switches a button off with aria-disabled, so it can still be pressed to say why", () => {
        const node = button("icon-button", "Save");
        switchOff(node, true);
        expect([node.getAttribute("aria-disabled"), node.disabled]).toEqual(["true", false]);
        switchOff(node, false);
        expect(node.hasAttribute("aria-disabled")).toBe(false);
    });
});

describe("renderBookmark", () => {
    const shown = (state) => {
        const node = button("icon-button");
        const isOff = renderBookmark(node, { ...state, label: "Save Alra" });
        return [isOff, node.getAttribute("aria-pressed"), node.title, node.getAttribute("aria-label")];
    };

    it("is filled while the name is saved, and pressing it again removes it", () => {
        expect(shown({ isSaved: true, isFull: true })).toEqual([false, "true", "Saved (press to remove)", "Save Alra"]);
    });

    it("is switched off for an unsaved name while Saved names is full, and says so", () => {
        expect(shown({ isSaved: false, isFull: true })).toEqual([
            true,
            "false",
            "Saved names is full",
            "Save Alra (Saved names is full)"
        ]);
        expect(shown({ isSaved: false, isFull: false })).toEqual([false, "false", "Save", "Save Alra"]);
    });
});
