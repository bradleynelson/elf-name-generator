import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    focusHistoryControl,
    focusListedName,
    renderFavorites,
    renderHistoryTools,
    renderListedConfirmation,
    renderNameList,
    renderSavedNameMessage
} from "../js/nameListsView.js";
import { readPage } from "./helpers/files.js";

// The lists are drawn into the real page markup, so a renamed or removed element fails here rather than on the live site.
const page = readPage();

beforeEach(() => {
    document.documentElement.innerHTML = page;
});

describe("a row's buttons", () => {
    const results = [{ name: "Alra" }, { name: "Brix" }];
    const handlersFor = () => ({
        onPick: vi.fn(),
        onCopy: vi.fn(),
        isSaved: () => false,
        isFull: false,
        onSave: vi.fn(),
        onRemove: vi.fn(),
        onUndo: vi.fn()
    });
    const press = (index, control) => focusListedName("nameList", index, control).click();

    it("call their handler with the row's name, its index and the row pressed", () => {
        const handlers = handlersFor();
        renderNameList(
            "nameList",
            results.map((result) => ({ result })),
            handlers
        );
        press(1, "copy");
        expect(handlers.onCopy).toHaveBeenCalledWith(
            results[1],
            1,
            expect.objectContaining({ isShown: expect.any(Function) })
        );
        press(0, "save");
        press(0, "remove");
        document.querySelector('#nameList [data-index="1"] .name-list-name').click();
        expect(handlers.onSave).toHaveBeenCalledWith(results[0], 0, expect.anything());
        expect(handlers.onRemove).toHaveBeenCalledWith(results[0], 0, expect.anything());
        expect(handlers.onPick).toHaveBeenCalledWith(results[1], 1, expect.anything());
    });

    it("let the handler confirm on the button pressed, glinting its row's name, while the row is shown", () => {
        const handlers = handlersFor();
        renderNameList(
            "nameList",
            results.map((result) => ({ result })),
            handlers
        );
        press(1, "copy");
        const row = handlers.onCopy.mock.calls[0][2];
        row.confirm("Copied", "check");
        const item = document.querySelector('#nameList [data-index="1"]');
        expect(item.querySelector(".name-list-copy").hasAttribute("data-confirming")).toBe(true);
        expect(item.querySelector(".name-list-name").hasAttribute("data-glinting")).toBe(true);
        expect(row.isShown()).toBe(true);
        renderNameList(
            "nameList",
            results.map((result) => ({ result })),
            handlers
        );
        expect(row.isShown()).toBe(false);
    });

    it("confirm on a row's button after a redraw, focusing it", () => {
        renderNameList(
            "nameList",
            results.map((result) => ({ result })),
            handlersFor()
        );
        renderListedConfirmation("nameList", 1, "save", "Saved");
        const bookmark = document.querySelector('#nameList [data-index="1"] .name-list-save');
        expect(document.activeElement).toBe(bookmark);
        expect(bookmark.hasAttribute("data-confirming")).toBe(true);
    });

    it("call only the handlers of the latest drawing, once, however often the list is redrawn", () => {
        const first = handlersFor();
        const latest = handlersFor();
        renderNameList(
            "nameList",
            results.map((result) => ({ result })),
            first
        );
        renderNameList(
            "nameList",
            results.map((result) => ({ result })),
            first
        );
        renderNameList("nameList", [{ result: results[0], isRemoved: true }], latest);
        press(0, "undo");
        expect(first.onUndo).not.toHaveBeenCalled();
        expect(latest.onUndo).toHaveBeenCalledTimes(1);
        expect(latest.onUndo).toHaveBeenCalledWith(results[0], 0, expect.anything());
    });

    it("of Saved names call their handler with the row's record", () => {
        const record = {
            name: "Alra",
            subrace: "sun-elf",
            result: { name: "Alra", sex: "female", subrace: "sun-elf" }
        };
        const handlers = { onLoad: vi.fn(), onCopy: vi.fn(), onRemove: vi.fn(), onUndo: vi.fn() };
        renderFavorites([{ record }], { count: 1, max: 100, isNearlyFull: false, canLoad: () => true, ...handlers });
        document.querySelector("#favoritesList .name-list-name").click();
        document.querySelector("#favoritesList .name-list-remove").click();
        expect(handlers.onLoad).toHaveBeenCalledWith(record, 0, expect.anything());
        expect(handlers.onRemove).toHaveBeenCalledWith(record, 0, expect.anything());
    });
});

describe("renderSavedNameMessage", () => {
    it("shows nothing, and does not fail, when that saved name's row is no longer listed", () => {
        document.getElementById("favoritesList").replaceChildren();
        expect(() =>
            renderSavedNameMessage("Gone", { kind: "warning", title: "Your browser wouldn't copy it." })
        ).not.toThrow();
        expect(document.querySelectorAll(".message-box")).toHaveLength(0);
    });
});

describe("renderFavorites: the line under each name", () => {
    const record = (name, sex, subrace) => ({ name, subrace, result: { name, sex, subrace } });
    const show = (rows, canLoad = () => true) =>
        renderFavorites(
            rows.map((row) => (row.isRemoved ? row : { record: row })),
            {
                count: rows.length,
                max: 100,
                isNearlyFull: false,
                canLoad,
                onLoad: vi.fn(),
                onCopy: vi.fn(),
                onRemove: vi.fn(),
                onUndo: vi.fn()
            }
        );
    const lines = () =>
        [...document.querySelectorAll("#favoritesList li")].map(
            (li) => li.querySelector(".name-list-kind")?.textContent
        );

    it("says what each saved name is", () => {
        show([record("Alra", "female", "sun-elf"), record("Brix", "male", "drow")]);
        expect(lines()).toEqual(["female elf · sun lineage", "male elf · drow lineage"]);
    });

    it("leaves the name's button label and the tools as they were", () => {
        show([record("Alra", "female", "sun-elf")]);
        const row = document.querySelector("#favoritesList li");
        expect(row.querySelector(".name-list-name").getAttribute("aria-label")).toBe("Show Alra");
        expect([...row.querySelectorAll(".name-list-tool")].map((b) => b.getAttribute("aria-label"))).toEqual([
            "Copy Alra",
            "Unsave Alra"
        ]);
    });

    it("says an unsaved row is gone when the page is left", () => {
        show([{ record: record("Alra", "female", "sun-elf"), isRemoved: true }]);
        expect(lines()).toEqual(["Cleared when you leave or refresh this page."]);
        expect(document.querySelector(".name-list-kind").classList.contains("is-note")).toBe(true);
    });

    it("says Damaged, and only red for that, when a saved name cannot be shown again", () => {
        show([record("Alra", "female", "sun-elf"), record("Brix", "male", "drow")], (r) => r.name === "Alra");
        expect(lines()).toEqual([
            "female elf · sun lineage",
            "Damaged: Cannot be rebuilt in generator. Copy and remove still work."
        ]);
        const names = [...document.querySelectorAll("#favoritesList .name-list-name")];
        expect(names.map((n) => n.classList.contains("is-damaged"))).toEqual([false, true]);
        const notes = [...document.querySelectorAll("#favoritesList .name-list-kind")];
        expect(notes.map((n) => n.classList.contains("is-note"))).toEqual([false, true]);
    });

    it("shows only what is known, and no line when nothing is", () => {
        show([
            record("Old", undefined, "rock-gnome"),
            record("Half", "male", "undefined"),
            record("Gnome", "female", "rock-gnome")
        ]);
        expect(lines()).toEqual([undefined, "male", "female"]);
    });
});

describe("renderNameList: the line under each name", () => {
    const handlers = { onPick: vi.fn(), isSaved: () => false, isFull: false, onSave: vi.fn() };
    const rowsOf = (results) => results.map((result) => ({ result }));

    it("says what each name is, with no published label (the name card shows that)", () => {
        const published = { sources: [{ title: "Elves of Evermeet", authority: "official" }] };
        renderNameList(
            "nameList",
            rowsOf([
                { name: "Alra", sex: "female", subrace: "sun-elf", published },
                { name: "Brix", sex: "male", subrace: "drow" }
            ]),
            handlers
        );
        const [first, second] = document.querySelectorAll("#nameList li");
        expect(first.querySelector(".name-list-kind").textContent).toBe("female elf · sun lineage");
        expect(first.textContent).not.toMatch(/published/);
        expect(second.querySelector(".name-list-kind").textContent).toBe("male elf · drow lineage");
    });

    it("leaves out the line when nothing about the name is known", () => {
        renderNameList("nameList", rowsOf([{ name: "Legacy" }]), handlers);
        expect(document.querySelector("#nameList .name-list-kind")).toBeNull();
        expect(document.querySelector("#nameList .name-list-name").textContent).toBe("Legacy");
    });
});

describe("the Copy all buttons", () => {
    const handlers = { onPick: vi.fn(), isSaved: () => false, isFull: false, onSave: vi.fn() };
    const hidden = (id) => document.getElementById(id).hidden;

    it("show beside Roll 10 More only while a name is left to copy", () => {
        renderNameList("nameList", [{ result: { name: "Alra" } }], handlers);
        expect(hidden("copyAllListButton")).toBe(false);
        renderNameList("nameList", [{ result: { name: "Alra" }, isRemoved: true }], handlers);
        expect(hidden("copyAllListButton")).toBe(true);
        renderNameList("nameList", [], handlers);
        expect(hidden("copyAllListButton")).toBe(true);
    });

    it("show in Saved names only while a name is saved", () => {
        const savedHandlers = {
            canLoad: () => true,
            onLoad: vi.fn(),
            onCopy: vi.fn(),
            onRemove: vi.fn(),
            onUndo: vi.fn()
        };
        renderFavorites([{ record: { name: "Alra" } }], { count: 1, max: 100, isNearlyFull: false, ...savedHandlers });
        expect(hidden("copyAllSavedButton")).toBe(false);
        renderFavorites([{ record: { name: "Alra" }, isRemoved: true }], {
            count: 0,
            max: 100,
            isNearlyFull: false,
            ...savedHandlers
        });
        expect(hidden("copyAllSavedButton")).toBe(true);
    });
});

describe("History's tools", () => {
    const shown = () =>
        ["historyClear", "historyConfirm", "historyCleared"].filter((id) => !document.getElementById(id).hidden);

    it("offer Clear while there is history, the question in its place while it is open, and Undo after clearing", () => {
        renderHistoryTools({ hasHistory: true, isConfirming: false, canUndo: false });
        expect(shown()).toEqual(["historyClear"]);
        renderHistoryTools({ hasHistory: true, isConfirming: true, canUndo: false });
        expect(shown()).toEqual(["historyConfirm"]);
        renderHistoryTools({ hasHistory: false, isConfirming: false, canUndo: true });
        expect(shown()).toEqual(["historyCleared"]);
        renderHistoryTools({ hasHistory: true, isConfirming: false, canUndo: true });
        expect(shown()).toEqual(["historyClear", "historyCleared"]);
    });

    it("move focus to the control named", () => {
        renderHistoryTools({ hasHistory: true, isConfirming: true, canUndo: false });
        focusHistoryControl("cancel");
        expect(document.activeElement.id).toBe("historyCancel");
    });
});
