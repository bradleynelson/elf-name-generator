import { beforeEach, describe, expect, it, vi } from "vitest";
import { $, failNext, reported, roll, sent, setUpPage, startPage, startPageWithFailures } from "./helpers/page.js";

// Page flows of Saved names, More names and History, with the real page, app script and name data.

beforeEach(setUpPage);

describe("removing names and bringing them back", () => {
    const savedNames = () =>
        [...document.querySelectorAll("#favoritesList button.name-list-name")].map((n) => n.textContent);
    const rowNames = () =>
        [...document.querySelectorAll("#favoritesList li")].map(
            (row) => row.querySelector(".name-list-name, .name-list-removed-name").textContent
        );
    const ghosts = () => [...document.querySelectorAll("#favoritesList .name-list-removed")];
    const removeRow = (n) =>
        document.querySelectorAll("#favoritesList li")[n].querySelector(".name-list-remove").click();
    const history = () => document.querySelectorAll("#historyList li").length;
    function saveRolledNames(count) {
        for (let i = 0; i < count; i++) {
            roll();
            $("saveButton").click();
        }
        return savedNames();
    }
    const refuseStorage = () =>
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("full");
        });

    it("leaves a removed name in its row with an Undo that has no timer, and Undo puts it back in place", () => {
        const names = saveRolledNames(3);
        vi.useFakeTimers();
        removeRow(1);
        expect(savedNames()).toEqual([names[0], names[2]]);
        expect(rowNames()).toEqual(names);
        expect($("favoritesCount").textContent).toBe("(2 of 100)");
        expect(ghosts()[0].textContent).toMatch(/Unsaved · Undo/);
        const undo = ghosts()[0].querySelector("button");
        expect(document.activeElement).toBe(undo);
        expect($("announcer").textContent).toContain(`Unsaved ${names[1]}`);
        vi.advanceTimersByTime(10 * 60 * 1000);
        vi.useRealTimers();
        expect(ghosts()).toHaveLength(1);
        undo.click();
        expect(savedNames()).toEqual(names);
        expect(ghosts()).toHaveLength(0);
        expect(document.activeElement).toBe(document.querySelectorAll("#favoritesList .name-list-remove")[1]);
        expect($("announcer").textContent).toContain(`${names[1]} is back`);
    });

    it("keeps every removed name's Undo, in its place, when more are removed and other messages appear", async () => {
        const names = saveRolledNames(3);
        removeRow(0);
        removeRow(1);
        expect(savedNames()).toEqual([names[2]]);
        expect(rowNames()).toEqual(names);
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
        $("copyButton").click();
        await vi.waitFor(() => expect($("cardMessage").textContent).not.toBe(""));
        ghosts()[1].querySelector("button").click();
        expect(savedNames()).toEqual([names[1], names[2]]);
        expect(rowNames()).toEqual(names);
        expect(ghosts()).toHaveLength(1);
    });

    it("leaves the row with an Undo when the bookmark unsaves a name, and saving it again removes the Undo", () => {
        $("saveButton").click();
        const [name] = savedNames();
        $("saveButton").focus();
        $("saveButton").click();
        expect(savedNames()).toEqual([]);
        expect(rowNames()).toEqual([name]);
        expect(document.activeElement).toBe($("saveButton"));
        ghosts()[0].querySelector("button").click();
        expect(savedNames()).toEqual([name]);
        expect($("saveButton").getAttribute("aria-pressed")).toBe("true");
        $("saveButton").click();
        $("saveButton").click();
        expect(rowNames()).toEqual([name]);
        expect(ghosts()).toHaveLength(0);
    });

    it("keeps the row and the count, and explains in that row, when the browser refuses a removal", () => {
        saveRolledNames(1);
        const remove = document.querySelector("#favoritesList .name-list-remove");
        const count = $("favoritesCount").textContent;
        remove.focus();
        refuseStorage();
        remove.click();
        expect(ghosts()).toHaveLength(0);
        expect(document.querySelectorAll("#favoritesList .name-list-remove")).toHaveLength(1);
        expect($("favoritesCount").textContent).toBe(count);
        const row = document.querySelector("#favoritesList li");
        expect(row.querySelector(".message-box").classList).toContain("is-error");
        expect(row.querySelector(".message-box").textContent).toMatch(/wasn't unsaved/);
        expect(document.activeElement).toBe(remove);
    });

    it("explains a refused copy in the saved name's own row, with the name and what it is selected", async () => {
        saveRolledNames(2);
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
        const [, row] = document.querySelectorAll("#favoritesList li");
        row.querySelector(".name-list-tool").click();
        await vi.waitFor(() => expect(row.querySelector(".message-box")).not.toBeNull());
        const kind = row.querySelector(".name-list-kind").textContent;
        expect(window.getSelection().toString()).toBe(`${row.dataset.name} (${kind})`);
        expect(document.querySelectorAll("#favoritesList .message-box")).toHaveLength(1);
        expect($("cardMessage").textContent).toBe("");
    });

    it("keeps the Undo, and explains, when the browser refuses to put a name back", () => {
        saveRolledNames(1);
        removeRow(0);
        refuseStorage();
        ghosts()[0].querySelector("button").click();
        expect(savedNames()).toEqual([]);
        expect(ghosts()).toHaveLength(1);
        expect(ghosts()[0].querySelector(".message-box").textContent).toMatch(/wasn't put back/);
    });

    it("asks before clearing History, and leaves an Undo that puts the names back after any new ones", () => {
        roll();
        roll();
        const before = history();
        $("historyClear").click();
        expect(history()).toBe(before);
        expect($("historyClear").hidden).toBe(true);
        expect(document.activeElement).toBe($("historyCancel"));
        $("historyCancel").click();
        expect(history()).toBe(before);
        expect($("historyClear").hidden).toBe(false);
        expect(document.activeElement).toBe($("historyClear"));
        $("historyClear").click();
        $("historyDelete").click();
        expect(history()).toBe(0);
        expect($("historyConfirm").hidden).toBe(true);
        expect($("historyCleared").hidden).toBe(false);
        expect(document.activeElement).toBe($("historyUndo"));
        roll();
        const newest = document.querySelector("#historyList .name-list-name").textContent;
        $("historyUndo").click();
        expect(history()).toBe(before + 1);
        expect(document.querySelector("#historyList .name-list-name").textContent).toBe(newest);
        expect($("historyCleared").hidden).toBe(true);
    });
});

describe("a saved list that is filling up", () => {
    const fillSavedNames = (count) =>
        localStorage.setItem(
            "faerunNameFavorites",
            JSON.stringify(Array.from({ length: count }, (_, i) => ({ name: `Stored ${i}`, savedAt: i })))
        );
    const label = () => $("saveButton").querySelector(".icon-button-label")?.textContent;

    it("says how many spaces are left when saving near the limit, and turns the count amber from 90", async () => {
        fillSavedNames(88);
        await startPage();
        $("saveButton").click();
        expect($("favoritesCount").textContent).toBe("(89 of 100)");
        expect($("favoritesCount").dataset.fill).not.toBe("near");
        expect(label()).toBe("Saved");
        roll();
        $("saveButton").click();
        expect($("favoritesCount").textContent).toBe("(90 of 100)");
        expect($("favoritesCount").dataset.fill).toBe("near");
        expect(label()).toBe("Saved · 10 left");
        expect($("announcer").textContent).toMatch(/10 spaces left/);
    });

    it("says one space, not one spaces, when a single space is left", async () => {
        fillSavedNames(98);
        await startPage();
        $("saveButton").click();
        expect(label()).toBe("Saved · 1 left");
        expect($("announcer").textContent).toBe("Saved. 1 space left.");
    });

    it("when full, marks the count, switches off the bookmark and explains it, until a name is removed", async () => {
        fillSavedNames(99);
        await startPage();
        $("saveButton").click();
        expect(label()).toBe("Saved · now full");
        expect($("favoritesCount").textContent).toBe("(100 of 100 · full)");
        expect($("favoritesCount").dataset.fill).toBe("full");
        expect($("saveButton").hasAttribute("aria-disabled")).toBe(false);
        roll();
        expect($("saveButton").getAttribute("aria-disabled")).toBe("true");
        expect($("saveButton").hasAttribute("data-labelled")).toBe(true);
        expect(label()).toBe("Full");
        expect($("saveButton").getAttribute("aria-label")).toBe("Save name (Saved names is full)");
        $("saveButton").click();
        const box = $("cardMessage").querySelector(".message-box");
        expect(box.classList).toContain("is-warning");
        expect(box.textContent).toMatch(/Saved names is full/);
        expect(JSON.parse(localStorage.getItem("faerunNameFavorites"))).toHaveLength(100);
        const scrolled = vi.fn();
        $("favoritesTitle").scrollIntoView = scrolled;
        box.querySelector("button").click();
        // to the top of the screen even when the heading already shows lower down, where focus alone would not move
        expect(scrolled).toHaveBeenCalledWith({ block: "start" });
        expect(document.activeElement).toBe($("favoritesTitle"));
        document.querySelector("#favoritesList .name-list-remove").click();
        expect($("saveButton").hasAttribute("aria-disabled")).toBe(false);
        expect($("saveButton").hasAttribute("data-labelled")).toBe(false);
        expect($("saveButton").getAttribute("aria-label")).toBe("Save name");
        expect($("cardMessage").textContent).toBe("");
        expect($("favoritesCount").textContent).toBe("(99 of 100)");
    });

    it("keeps the Undo, and says why, when putting a name back would go past the limit", async () => {
        fillSavedNames(100);
        await startPage();
        document.querySelector("#favoritesList .name-list-remove").click();
        $("saveButton").click();
        expect($("favoritesCount").textContent).toBe("(100 of 100 · full)");
        const ghost = document.querySelector("#favoritesList .name-list-removed");
        ghost.querySelector(".name-list-undo").click();
        expect(JSON.parse(localStorage.getItem("faerunNameFavorites"))).toHaveLength(100);
        expect(document.querySelector("#favoritesList .name-list-removed")).not.toBeNull();
        expect(document.querySelector("#favoritesList .name-list-removed .message-box").textContent).toMatch(
            /Saved names is full/
        );
    });
});

describe("copying every name in a list at once", () => {
    const stored = (names) =>
        localStorage.setItem(
            "faerunNameFavorites",
            JSON.stringify(
                names.map(({ name, sex, subrace }) => ({
                    name,
                    subrace,
                    savedAt: 1,
                    result: { name, sex, subrace, parts: [] }
                }))
            )
        );
    const copyTo = () => {
        const writeText = vi.fn().mockResolvedValue();
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        return writeText;
    };
    const listed = () => [...document.querySelectorAll("#nameList .name-list-name")].map((n) => n.textContent);
    const SUN_ELF_KIND = "female elf · sun lineage";
    const choose = (sex, lineage) => {
        $("pickerSex").value = sex;
        $("pickerSex").dispatchEvent(new Event("change"));
        $("pickerLineage").value = lineage;
        $("pickerLineage").dispatchEvent(new Event("change"));
    };
    const kindLines = (listId) =>
        [...document.querySelectorAll(`#${listId} .name-list-kind`)].map((line) => line.textContent);

    it("copies each saved name with what it is in parentheses, one per line", async () => {
        stored([
            { name: "Aelar", sex: "male", subrace: "moon-elf" },
            { name: "Brena", sex: "female", subrace: "sun-elf" },
            { name: "Cael", sex: "neutral", subrace: "drow" }
        ]);
        await startPage();
        const writeText = copyTo();
        $("copyAllSavedButton").click();
        await vi.waitFor(() => expect(sent("name_copied")).toHaveLength(1));
        expect(writeText).toHaveBeenCalledWith(
            "Aelar (male elf · moon lineage)\nBrena (female elf · sun lineage)\nCael (unisex elf · drow lineage)"
        );
        expect(sent("name_copied")[0].copy_source).toBe("saved_all");
    });

    it("copies a saved name that has no known kind as the bare name, and leaves out names unsaved this visit", async () => {
        localStorage.setItem(
            "faerunNameFavorites",
            JSON.stringify([
                { name: "Legacy", savedAt: 1 },
                { name: "Aelar", subrace: "moon-elf", savedAt: 2 }
            ])
        );
        await startPage();
        document.querySelectorAll("#favoritesList .name-list-remove")[1].click();
        const writeText = copyTo();
        $("copyAllSavedButton").click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
        expect(writeText).toHaveBeenCalledWith("Legacy");
    });

    it("shows Copy all for saved names only while some are saved, and says Copied after copying", async () => {
        expect($("copyAllSavedButton").hidden).toBe(true);
        $("saveButton").click();
        expect($("copyAllSavedButton").hidden).toBe(false);
        copyTo();
        $("copyAllSavedButton").click();
        await vi.waitFor(() => expect($("copyAllSavedButton").hasAttribute("data-confirming")).toBe(true));
        expect($("copyAllSavedButton").querySelector(".icon-button-label").textContent).toBe("Copied all");
        expect($("announcer").textContent).toBe("Copied all.");
        document.querySelector("#favoritesList .name-list-remove").click();
        expect($("copyAllSavedButton").hidden).toBe(true);
    });

    it("copies the names from Roll 10 More with what they are, one per line, and hides the button when the list is cleared", async () => {
        expect($("copyAllListButton").hidden).toBe(true);
        choose("feminine", "sun-elf");
        $("listButton").click();
        expect($("copyAllListButton").hidden).toBe(false);
        const names = listed();
        expect(names).toHaveLength(10);
        const writeText = copyTo();
        $("copyAllListButton").click();
        await vi.waitFor(() =>
            expect(writeText).toHaveBeenCalledWith(names.map((name) => `${name} (${SUN_ELF_KIND})`).join("\n"))
        );
        expect(sent("name_copied")[0].copy_source).toBe("list_all");
        await vi.waitFor(() =>
            expect($("copyAllListButton").querySelector(".icon-button-label").textContent).toBe("Copied all")
        );
        $("pickerSex").value = "feminine";
        $("pickerSex").dispatchEvent(new Event("change"));
        expect($("copyAllListButton").hidden).toBe(true);
    });

    it("selects the lines for the person, in the panel's own message, when the browser refuses", async () => {
        stored([
            { name: "Aelar", sex: "male", subrace: "moon-elf" },
            { name: "Brena", sex: "female", subrace: "sun-elf" }
        ]);
        await startPage();
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
        $("copyAllSavedButton").click();
        await vi.waitFor(() => expect($("favoritesMessage").textContent).toMatch(/Ctrl\+C/));
        const shown = document.querySelector("#favoritesMessage .message-box-copy");
        expect(shown.textContent).toBe("Aelar (male elf · moon lineage)\nBrena (female elf · sun lineage)");
        expect(window.getSelection().toString()).toBe(shown.textContent);
        expect(sent("name_copied")).toHaveLength(0);
    });

    it("says nothing about a copy of the list that finishes after the list is rolled again", async () => {
        $("listButton").click();
        let finish;
        const writeText = vi.fn(() => new Promise((resolve) => (finish = resolve)));
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        $("copyAllListButton").click();
        $("listButton").click();
        finish();
        await writeText.mock.results[0].value;
        await Promise.resolve();
        expect($("copyAllListButton").hasAttribute("data-confirming")).toBe(false);
    });

    it("says what each name is under it in Roll 10 More and History", () => {
        choose("feminine", "sun-elf");
        $("listButton").click();
        expect(kindLines("nameList")).toEqual(Array(10).fill(SUN_ELF_KIND));
        expect(kindLines("historyList")[0]).toBe(SUN_ELF_KIND);
    });

    it("copies the name card's name with what it is", async () => {
        choose("feminine", "sun-elf");
        const writeText = copyTo();
        $("copyButton").click();
        await vi.waitFor(() =>
            expect(writeText).toHaveBeenCalledWith(`${$("nameText").textContent} (${SUN_ELF_KIND})`)
        );
    });

    it("copies a saved name with what it is, and a saved name of unknown kind bare", async () => {
        localStorage.setItem(
            "faerunNameFavorites",
            JSON.stringify([
                { name: "Aelar", subrace: "moon-elf", savedAt: 1, result: { sex: "male" } },
                { name: "Legacy", savedAt: 2 }
            ])
        );
        await startPage();
        const writeText = copyTo();
        const [aelar, legacy] = document.querySelectorAll("#favoritesList .name-list-tool[aria-label^='Copy']");
        aelar.click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("Aelar (male elf · moon lineage)"));
        legacy.click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalledWith("Legacy"));
    });
});

describe("keeping and dropping names in Roll 10 More and History", () => {
    const rows = (listId) => [...document.querySelectorAll(`#${listId} li`)];
    const bookmark = (listId, n) => rows(listId)[n].querySelector(".name-list-save");
    const listedName = (listId, n) =>
        rows(listId)[n].querySelector(".name-list-name, .name-list-removed-name").textContent;
    const savedNames = () =>
        [...document.querySelectorAll("#favoritesList button.name-list-name")].map((n) => n.textContent);
    const keptInList = () =>
        [...document.querySelectorAll("#nameList button.name-list-name")].map((n) => n.textContent);
    const removeFromList = (n) => rows("nameList")[n].querySelector(".name-list-remove").click();

    it("saves a name from Roll 10 More with its bookmark, and pressing it again unsaves it", () => {
        $("listButton").click();
        const name = listedName("nameList", 2);
        bookmark("nameList", 2).click();
        expect(savedNames()).toEqual([name]);
        expect(bookmark("nameList", 2).getAttribute("aria-pressed")).toBe("true");
        expect(bookmark("nameList", 2).getAttribute("aria-label")).toBe(`Save ${name}`);
        expect(document.activeElement).toBe(bookmark("nameList", 2));
        expect($("announcer").textContent).toBe("Saved.");
        expect(sent("name_saved")[0].save_source).toBe("list");
        bookmark("nameList", 2).click();
        expect(savedNames()).toEqual([]);
        expect(bookmark("nameList", 2).getAttribute("aria-pressed")).toBe("false");
        expect(document.querySelector("#favoritesList .name-list-removed-name").textContent).toBe(name);
        expect($("announcer").textContent).toBe("Unsaved. Undo is in Saved names.");
    });

    it("saves a name from History, and the name card's bookmark shows it is saved", () => {
        const name = $("nameText").textContent;
        expect(listedName("historyList", 0)).toBe(name);
        bookmark("historyList", 0).click();
        expect(savedNames()).toEqual([name]);
        expect($("saveButton").getAttribute("aria-pressed")).toBe("true");
        expect(bookmark("historyList", 0).getAttribute("aria-pressed")).toBe("true");
        expect(sent("name_saved")[0].save_source).toBe("history");
    });

    it("says Saved and Unsaved on a row's bookmark, as the name card's bookmark does", () => {
        const word = (listId) => bookmark(listId, 0).querySelector(".icon-button-label")?.textContent;
        bookmark("historyList", 0).click();
        expect(word("historyList")).toBe("Saved");
        expect(bookmark("historyList", 0).hasAttribute("data-confirming")).toBe(true);
        bookmark("historyList", 0).click();
        expect(word("historyList")).toBe("Unsaved");
        $("listButton").click();
        bookmark("nameList", 0).click();
        expect(word("nameList")).toBe("Saved");
    });

    it("fills a row's bookmark when the same name is saved from the name card", () => {
        $("saveButton").click();
        expect(bookmark("historyList", 0).getAttribute("aria-pressed")).toBe("true");
    });

    it("switches the bookmarks off while Saved names is full, and pressing one says why in its own list", async () => {
        localStorage.setItem(
            "faerunNameFavorites",
            JSON.stringify(Array.from({ length: 100 }, (_, i) => ({ name: `Stored ${i}`, savedAt: i })))
        );
        await startPage();
        $("listButton").click();
        expect(bookmark("nameList", 0).getAttribute("aria-disabled")).toBe("true");
        expect(bookmark("nameList", 0).getAttribute("aria-label")).toMatch(/Saved names is full/);
        bookmark("nameList", 0).click();
        expect($("nameListMessage").textContent).toMatch(/Saved names is full/);
        bookmark("historyList", 0).click();
        expect($("historyMessage").textContent).toMatch(/Saved names is full/);
        expect($("favoritesCount").textContent).toBe("(100 of 100 · full)");
    });

    it("leaves a name removed from Roll 10 More in its row with an Undo, and Undo puts it back", () => {
        $("listButton").click();
        const names = keptInList();
        removeFromList(3);
        expect(keptInList()).toEqual(names.filter((_, i) => i !== 3));
        expect(listedName("nameList", 3)).toBe(names[3]);
        const ghost = rows("nameList")[3];
        expect(ghost.textContent).toMatch(/Removed · Undo/);
        const undo = ghost.querySelector(".name-list-undo");
        expect(undo.getAttribute("aria-label")).toBe(`Undo removing ${names[3]}`);
        expect(document.activeElement).toBe(undo);
        expect($("announcer").textContent).toBe(`Removed ${names[3]}. Undo is in its row.`);
        undo.click();
        expect(keptInList()).toEqual(names);
        expect(document.activeElement).toBe(rows("nameList")[3].querySelector(".name-list-remove"));
        expect($("announcer").textContent).toBe(`${names[3]} is back in More names.`);
    });

    it("leaves removed names out of Copy all, and hides Copy all once every name is removed", async () => {
        $("listButton").click();
        const names = keptInList();
        removeFromList(0);
        removeFromList(5);
        const writeText = vi.fn().mockResolvedValue();
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        $("copyAllListButton").click();
        await vi.waitFor(() => expect(writeText).toHaveBeenCalled());
        const copied = writeText.mock.calls[0][0].split("\n").map((line) => line.replace(/ \(.*\)$/, ""));
        expect(copied).toEqual(names.filter((_, i) => i !== 0 && i !== 5));
        for (let i = 0; i < names.length; i++) {
            if (i !== 0 && i !== 5) removeFromList(i);
        }
        expect($("copyAllListButton").hidden).toBe(true);
    });

    it("forgets removed names when the list is rolled again", () => {
        $("listButton").click();
        removeFromList(0);
        $("listButton").click();
        expect(document.querySelectorAll("#nameList .name-list-removed")).toHaveLength(0);
        expect(keptInList()).toHaveLength(10);
    });

    it("copies one name from Roll 10 More or History with what it is, and says Copied on its button", async () => {
        const copyButton = (listId, n) => rows(listId)[n].querySelector(".name-list-copy");
        const writeText = vi.fn().mockResolvedValue();
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        $("listButton").click();
        const name = listedName("nameList", 4);
        expect(copyButton("nameList", 4).getAttribute("aria-label")).toBe(`Copy ${name}`);
        const tools = [...rows("nameList")[4].querySelector(".name-list-tools").children];
        expect(tools.map((tool) => tool.classList[2])).toEqual([
            "name-list-save",
            "name-list-copy",
            "name-list-remove"
        ]);
        copyButton("nameList", 4).click();
        await vi.waitFor(() => expect(sent("name_copied")).toHaveLength(1));
        expect(writeText).toHaveBeenCalledWith(`${name} (unisex elf · sun lineage)`);
        expect(sent("name_copied")[0].copy_source).toBe("list");
        await vi.waitFor(() =>
            expect(copyButton("nameList", 4).querySelector(".icon-button-label").textContent).toBe("Copied")
        );
        copyButton("historyList", 0).click();
        await vi.waitFor(() => expect(sent("name_copied")).toHaveLength(2));
        expect(sent("name_copied")[1].copy_source).toBe("history");
    });

    it("explains a refused copy of one name in its own list, with the text selected", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
        rows("historyList")[0].querySelector(".name-list-copy").click();
        await vi.waitFor(() => expect($("historyMessage").textContent).toMatch(/Ctrl\+C/));
        expect($("historyMessage").querySelector(".message-box-copy").textContent).toContain(
            listedName("historyList", 0)
        );
    });

    it("keeps a saved name saved when it is removed from Roll 10 More, and says so in its row", () => {
        $("listButton").click();
        const name = listedName("nameList", 0);
        bookmark("nameList", 0).click();
        removeFromList(0);
        removeFromList(1);
        expect(savedNames()).toEqual([name]);
        const [savedGhost, plainGhost] = rows("nameList");
        expect(savedGhost.querySelector(".name-list-kind").textContent).toBe("Still in Saved names.");
        expect(plainGhost.querySelector(".name-list-kind")).toBeNull();
    });

    it("has no remove button in History, which is cleared all at once", () => {
        expect(rows("historyList")[0].querySelector(".name-list-remove")).toBeNull();
    });

    it("says under Roll 10 More when its names are cleared", () => {
        const panel = $("nameListTitle").closest("section");
        expect(panel.querySelector(".panel-note").textContent).toMatch(
            /cleared when you leave the page or change a setting/i
        );
    });
});

describe("an unexpected error in a button of a list or of History", () => {
    const box = () => $("cardMessage").querySelector(".message-box");
    const KEPT = "That didn't work, so we kept your last name.";
    const tool = (list, kind) => document.querySelector(`#${list} .name-list-${kind}`);
    const rollList = () => $("listButton").click();
    const saveCurrent = () => $("saveButton").click();
    const refuseFocusOnce = () =>
        vi.spyOn(HTMLElement.prototype, "focus").mockImplementationOnce(() => {
            throw new Error("Focus could not move.");
        });

    beforeEach(startPageWithFailures);

    // each case arms one failure, then presses one button: the card keeps its name, says so, and one error is reported
    const buttons = {
        "a row's bookmark in More names": {
            prepare: rollList,
            fails: "renderGlint",
            press: () => tool("nameList", "save").click()
        },
        "a row's bookmark in History": { fails: "renderGlint", press: () => tool("historyList", "save").click() },
        "a row's copy in More names": {
            prepare: rollList,
            fails: "formatNameWithKind",
            press: () => tool("nameList", "copy").click()
        },
        "a row's copy in History": { fails: "formatNameWithKind", press: () => tool("historyList", "copy").click() },
        "a row's remove in More names": {
            prepare: rollList,
            fails: "announce",
            press: () => tool("nameList", "remove").click()
        },
        "a row's undo in More names": {
            prepare: () => {
                rollList();
                tool("nameList", "remove").click();
            },
            fails: "announce",
            press: () => tool("nameList", "undo").click()
        },
        "a saved name's copy": {
            prepare: saveCurrent,
            fails: "formatNameWithKind",
            press: () => tool("favoritesList", "copy").click()
        },
        "a saved name's remove": {
            prepare: saveCurrent,
            fails: "announce",
            press: () => tool("favoritesList", "remove").click()
        },
        "a saved name's undo": {
            prepare: () => {
                saveCurrent();
                tool("favoritesList", "remove").click();
            },
            fails: "announce",
            press: () => tool("favoritesList", "undo").click()
        },
        "History's clear": { fails: "focus", press: () => $("historyClear").click() },
        "History's cancel": {
            prepare: () => $("historyClear").click(),
            fails: "focus",
            press: () => $("historyCancel").click()
        },
        "History's delete": {
            prepare: () => $("historyClear").click(),
            fails: "announce",
            press: () => $("historyDelete").click()
        },
        "History's undo": {
            prepare: () => {
                $("historyClear").click();
                $("historyDelete").click();
            },
            fails: "announce",
            press: () => $("historyUndo").click()
        }
    };

    it.each(Object.entries(buttons))("keeps the last name, says so and reports it, when %s fails", (_, button) => {
        button.prepare?.();
        const name = $("nameText").textContent;
        if (button.fails === "focus") refuseFocusOnce();
        else failNext(button.fails, 1);
        button.press();
        expect($("nameText").textContent).toBe(name);
        expect(box().classList).toContain("is-error");
        expect(box().textContent).toContain(KEPT);
        expect(reported).toHaveLength(1);
        expect(reported[0][1]).toBe("click");
    });
});

describe("a change made in another tab", () => {
    const KEY = "faerunNameFavorites";
    const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const savedRow = (name) =>
        [...document.querySelectorAll("#favoritesList li")].find((li) => li.dataset.name === name);
    // what another tab does: it writes the list, and this tab hears a storage event
    const otherTabSets = (records) => {
        localStorage.setItem(KEY, JSON.stringify(records));
        window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    };
    const otherTabSaves = (name) => otherTabSets([...stored(), { name, savedAt: Date.now() }]);

    function saveRolledNames(count) {
        for (let i = 0; i < count; i++) {
            roll();
            $("saveButton").click();
        }
        return stored().map((f) => f.name);
    }

    it("leaves keyboard focus on the same button of a saved name when another tab saves a name", () => {
        const [first, second] = saveRolledNames(2);
        const copy = savedRow(second).querySelector(".name-list-copy");
        copy.focus();
        otherTabSaves("Drerae Iliathor");
        expect(copy.isConnected).toBe(false);
        expect(document.activeElement).toBe(savedRow(second).querySelector(".name-list-copy"));
        savedRow(first).querySelector(".name-list-name").focus();
        otherTabSaves("Ilsevel");
        expect(document.activeElement).toBe(savedRow(first).querySelector(".name-list-name"));
    });

    it("leaves keyboard focus on the same row's button in Roll 10 More and History", () => {
        $("listButton").click();
        const bookmark = document.querySelectorAll("#nameList li")[2].querySelector(".name-list-save");
        bookmark.focus();
        otherTabSaves("Drerae Iliathor");
        expect(document.activeElement).toBe(
            document.querySelectorAll("#nameList li")[2].querySelector(".name-list-save")
        );
        document.querySelectorAll("#historyList li")[0].querySelector(".name-list-copy").focus();
        otherTabSaves("Ilsevel");
        expect(document.activeElement).toBe(document.querySelector("#historyList .name-list-copy"));
    });

    it("leaves focus on a removed row's Undo in Roll 10 More", () => {
        $("listButton").click();
        document.querySelectorAll("#nameList li")[1].querySelector(".name-list-remove").click();
        const undo = document.querySelectorAll("#nameList li")[1].querySelector(".name-list-undo");
        expect(document.activeElement).toBe(undo);
        otherTabSaves("Drerae Iliathor");
        expect(document.activeElement).toBe(
            document.querySelectorAll("#nameList li")[1].querySelector(".name-list-undo")
        );
    });

    it("moves focus to the Saved names heading when the other tab unsaved the name that had it", () => {
        const [first, second] = saveRolledNames(2);
        savedRow(second).querySelector(".name-list-copy").focus();
        otherTabSets(stored().filter((f) => f.name !== second));
        expect(savedRow(second)).toBeUndefined();
        expect(document.activeElement).toBe($("favoritesTitle"));
        savedRow(first).querySelector(".name-list-name").focus();
        otherTabSaves("Ilsevel");
        expect(document.activeElement).toBe(savedRow(first).querySelector(".name-list-name"));
    });

    it("moves focus to the Saved names heading when the other tab saved again the name this tab had removed", () => {
        const [name] = saveRolledNames(1);
        savedRow(name).querySelector(".name-list-remove").click();
        expect(document.activeElement).toBe(savedRow(name).querySelector(".name-list-undo"));
        otherTabSets([{ name, savedAt: 1 }]);
        expect(document.activeElement).toBe($("favoritesTitle"));
    });

    it("does not take focus from a control outside the lists", () => {
        saveRolledNames(1);
        $("generateButton").focus();
        otherTabSaves("Drerae Iliathor");
        expect(document.activeElement).toBe($("generateButton"));
    });
});
