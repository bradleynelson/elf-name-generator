import { beforeEach, describe, expect, it } from "vitest";
import { announce, renderMessageIn, renderMessage } from "../js/messages.js";
import { readPage } from "./helpers/files.js";

const page = readPage();
const $ = (id) => document.getElementById(id);
const said = () => $("announcer").textContent;

beforeEach(() => {
    document.documentElement.innerHTML = page;
});

describe("announce", () => {
    it("says one message at a time through the page's one live region", () => {
        announce("Copied.");
        announce("Saved.");
        expect([...$("announcer").children].map((p) => p.textContent)).toEqual(["Saved."]);
    });
});

describe("renderMessage", () => {
    it("shows a warning or an error in its slot, says it, and empties the slot for null", () => {
        renderMessage("cardMessage", { kind: "warning", title: "Every part is locked.", text: "Unlock a part." });
        const box = $("cardMessage").querySelector(".message-box");
        expect([box.classList.contains("is-warning"), box.textContent, said()]).toEqual([
            true,
            "Every part is locked.Unlock a part.",
            "Every part is locked. Unlock a part."
        ]);
        renderMessage("cardMessage", null);
        expect($("cardMessage").children).toHaveLength(0);
    });

    it("selects the text to copy by hand when the browser would not copy it", () => {
        renderMessage("cardMessage", { kind: "warning", title: "Your browser wouldn't copy it.", copyText: "Alra" });
        expect(window.getSelection().toString()).toBe("Alra");
    });
});

describe("renderMessageIn", () => {
    it("adds the message at the end of a row, with the row's class, and says it", () => {
        const row = document.createElement("li");
        $("favoritesList").append(row);
        renderMessageIn(row, { kind: "error", title: "That name wasn't unsaved." }, "name-list-message");
        expect([row.lastElementChild.className, said()]).toEqual([
            "message-box is-error name-list-message",
            "That name wasn't unsaved."
        ]);
    });
});
