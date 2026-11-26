import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    $,
    events,
    failNext,
    page,
    reported,
    roll,
    sent,
    setUpPage,
    startPage,
    startPageWithFailures,
    stopFailing,
    textButton,
    textOf
} from "./helpers/page.js";
import { drowSavedBy415, savedBy415 } from "./helpers/storedNames.js";
import { getSpeciesName, SPECIES } from "../js/core/species.js";

// Page flows of the name card, its pickers and settings, with the real page, app script and name data.

beforeEach(setUpPage);

describe("page flows", () => {
    it("keeps a locked component when the name is rolled again, and keeps focus on its lock", () => {
        const kept = textOf("t0");
        const lock = document.querySelector('[data-key="t0"] .name-part-lock');
        lock.focus();
        lock.click();
        expect(document.activeElement.getAttribute("aria-pressed")).toBe("true");
        const names = new Set();
        for (let i = 0; i < 8; i++) {
            roll();
            expect(textOf("t0")).toBe(kept);
            names.add($("nameText").textContent);
        }
        expect(names.size).toBeGreaterThan(1);
    });

    it("puts the component chosen in the picker into the name, keeping the rest", () => {
        const current = textOf("t0");
        const rest = $("nameText").textContent.split(" ").at(-1);
        document.querySelector('[data-key="t0"] .name-part-text').click();
        expect($("partPicker").open).toBe(true);
        const option = [...document.querySelectorAll(".part-picker-option")].find(
            (o) => o.querySelector(".part-picker-text").textContent.toLowerCase() !== current.toLowerCase()
        );
        const chosen = option.querySelector(".part-picker-text").textContent;
        option.click();
        expect($("partPicker").open).toBe(false);
        expect(textOf("t0").toLowerCase()).toBe(chosen.toLowerCase());
        expect($("nameText").textContent.split(" ").at(-1)).toBe(rest);
        expect(document.activeElement).toBe(document.querySelector('[data-key="t0"] .name-part-text'));
    });

    it("does not roll a name on Space while a dialog is open, but does once it is closed", () => {
        const pressSpace = (target) =>
            target.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true, cancelable: true }));
        const name = $("nameText").textContent;
        document.querySelector('[data-key="t0"] .name-part-text').click();
        pressSpace($("partPickerList"));
        $("partPicker").close();
        $("privacyDialog").showModal();
        pressSpace($("privacyDialog"));
        $("privacyDialog").close();
        expect($("nameText").textContent).toBe(name);
        expect(sent("name_generated")).toEqual([]);
        pressSpace(document.body);
        expect(sent("name_generated")).toHaveLength(1);
    });

    it("leaves the name as it is, without rolling, when the current component is picked", () => {
        const before = $("nameText").textContent;
        const history = document.querySelectorAll("#historyList li").length;
        textButton("t0").click();
        const current = document.querySelectorAll('.part-picker-option[aria-current="true"]');
        expect(current).toHaveLength(1);
        Math.random.mockClear();
        current[0].click();
        expect(Math.random).not.toHaveBeenCalled();
        expect($("nameText").textContent).toBe(before);
        expect(document.querySelectorAll("#historyList li")).toHaveLength(history);
        expect(sent("component_selected")).toEqual([]);
    });

    it("adds and removes a suffix with the + and - beside the name, keeping focus and the history", () => {
        // a plain first name with a table surname offers all three controls
        const addGiven = '[data-control="given"][aria-label^="Add"]';
        for (let i = 0; i < 80 && !document.querySelector(addGiven); i++) roll();
        const history = () => document.querySelectorAll("#historyList li").length;
        const before = {
            name: $("nameText").textContent,
            history: history(),
            parts: document.querySelectorAll(".name-part")
        };
        const plus = document.querySelector(addGiven);
        plus.focus();
        plus.click();
        expect(document.querySelector('[data-control="given"]').getAttribute("aria-label")).toMatch(/^Remove/);
        expect(document.querySelectorAll(".name-part").length).toBe(before.parts.length + 1);
        expect(document.activeElement.dataset.control).toBe("given");
        expect(history()).toBe(before.history);
        document.querySelector('[data-control="given"]').click();
        expect($("nameText").textContent.split(" ").at(-1)).toBe(before.name.split(" ").at(-1));
        // a part chosen in the picker is a manual edit too
        document.querySelector('[data-key="t0"] .name-part-text').click();
        document.querySelector(".part-picker-option").click();
        expect(history()).toBe(before.history);
    });

    it("shows a compound name's + as an empty slot between the names, and its - on the compound word", () => {
        const words = () => document.querySelectorAll(".name-word").length;
        const slot = '.name-structure-step.is-slot[data-control="compound"]';
        for (let i = 0; i < 80 && !document.querySelector(slot); i++) roll();
        expect(words()).toBe(2);
        // the slot comes before the surname word
        expect(document.querySelector(slot).nextElementSibling.classList.contains("name-word")).toBe(true);
        document.querySelector(slot).click();
        expect(words()).toBe(3);
        expect(document.querySelector(slot)).toBeNull();
        const remove = document.querySelectorAll(".name-word")[1].querySelector('[data-control="compound"]');
        expect(remove.getAttribute("aria-label")).toBe("Remove the compound name");
        remove.click();
        expect(words()).toBe(2);
    });
    it("switches the surname between published and constructed in its picker, without rolling", () => {
        const surnamePart = () => textButton("family") || textButton("n0");
        const tabs = () => [...document.querySelectorAll("#partPickerTabs button")];
        const history = () => document.querySelectorAll("#historyList li").length;
        for (let i = 0; i < 80 && !surnamePart(); i++) roll();
        const historyBefore = history();
        surnamePart().click();
        expect(tabs().map((t) => t.textContent)).toEqual(["Published", "Constructed"]);
        // a pair of toggle buttons: the kind shown now is pressed
        const pressed = () => tabs().filter((t) => t.getAttribute("aria-pressed") === "true");
        expect(pressed()).toHaveLength(1);
        const startedPublished = surnamePart().closest("[data-key]").dataset.key === "family";
        expect(pressed()[0].textContent).toBe(startedPublished ? "Published" : "Constructed");
        tabs()[startedPublished ? 1 : 0].click();
        expect(pressed()[0].textContent).toBe(startedPublished ? "Constructed" : "Published");
        document.querySelector(".part-picker-option").click();
        const nowPublished = Boolean(document.querySelector('[data-key="family"]'));
        expect(nowPublished).toBe(!startedPublished);
        expect(history()).toBe(historyBefore);
        // a first-name part has a single list and no tabs
        document.querySelector('[data-key="t0"] .name-part-text').click();
        expect($("partPickerTabs").hidden).toBe(true);
    });

    it("titles the surname picker after the list shown, whichever tab is open", () => {
        const surnamePart = () => textButton("family") || textButton("n0");
        const tabs = () => [...document.querySelectorAll("#partPickerTabs button")];
        const title = () => $("partPickerTitle").textContent;
        for (let i = 0; i < 80 && !surnamePart(); i++) roll();
        surnamePart().click();
        const byLabel = (label) => tabs().find((t) => t.textContent === label);
        byLabel("Published").click();
        expect(title()).toBe("Choose the family name");
        byLabel("Constructed").click();
        expect(title()).toBe("Choose the family name prefix");
        byLabel("Published").click();
        expect(title()).toBe("Choose the family name");
    });

    it("explains in every picker, for every lineage, that the options are filtered", () => {
        const note = () => $("partPicker").querySelector(".part-picker-note");
        // An elf has five pickers: first name prefix and suffix, surname whole, prefix and suffix (two tabs, one second
        // component). A dwarf has a published first name and a clan; a wild dwarf only the first name.
        const PICKERS = { "wild-dwarf": 1, "shield-dwarf": 2, "gold-dwarf": 2, duergar: 2 };
        const lineages = Object.values(SPECIES).flatMap((species) =>
            species.lineages.filter((l) => !l.retired).map((l) => l.value)
        );
        for (const lineage of lineages) {
            $("pickerSpecies").value = getSpeciesName(lineage);
            $("pickerSpecies").dispatchEvent(new Event("change"));
            $("pickerLineage").value = lineage;
            $("pickerLineage").dispatchEvent(new Event("change"));
            const PICKERS_PER_LINEAGE = PICKERS[lineage] ?? 5;
            const names = new Set();
            // Roll until each picker has been opened and checked once; opening a picker builds its whole list, so
            // repeating the same one adds time and no coverage
            const checked = new Set();
            for (let i = 0; i < 60 && (checked.size < PICKERS_PER_LINEAGE || i < 2); i++) {
                roll();
                names.add($("nameText").textContent);
                for (const part of document.querySelectorAll(".name-part-text")) {
                    part.click();
                    // a surname's picker is checked on both of its tabs
                    const tabs = [...document.querySelectorAll("#partPickerTabs button")];
                    for (const tab of tabs.length ? tabs : [null]) {
                        tab?.click();
                        const title = $("partPickerTitle").textContent;
                        if (checked.has(title)) continue;
                        checked.add(title);
                        expect(note().textContent).toMatch(/naming rules.*locked components.*limited/s);
                        expect(note().closest("dialog")).toBe($("partPicker"));
                        expect(note().hidden).toBe(false);
                    }
                    $("partPicker").close();
                }
            }
            expect(checked.size, `pickers reached for ${lineage}`).toBeGreaterThanOrEqual(PICKERS_PER_LINEAGE);
            // rolls that failed would leave the last lineage's name, and its pickers, on the card
            expect(names.size, `names rolled for ${lineage}`).toBeGreaterThan(1);
        }
        // nine lineages, each opening every picker, outlast the default 5 s in jsdom (about 20 ms each in a browser)
    }, 20000);

    it("offers the same structure buttons and surname tabs for drow", () => {
        $("pickerLineage").value = "drow";
        $("pickerLineage").dispatchEvent(new Event("change"));
        for (let i = 0; i < 80 && !document.querySelector('[data-control="given"]'); i++) roll();
        const control = document.querySelector('[data-control="given"]');
        expect(control).not.toBeNull();
        const parts = document.querySelectorAll(".name-part").length;
        control.click();
        expect(document.querySelectorAll(".name-part").length).not.toBe(parts);
        const house = textButton("house") || textButton("n0");
        house.click();
        expect([...document.querySelectorAll("#partPickerTabs button")].map((t) => t.textContent)).toEqual([
            "Published",
            "Constructed"
        ]);
        const startedBuilt = !textButton("house");
        document.querySelector(`#partPickerTabs [data-kind="${startedBuilt ? "published" : "constructed"}"]`).click();
        document.querySelector(".part-picker-option").click();
        expect(Boolean(textButton("house"))).toBe(startedBuilt);
    });

    it("lets a roll change a name's shape around a locked component, which stays", () => {
        for (let i = 0; i < 80 && !textButton("t0"); i++) roll();
        const kept = textOf("t0");
        document.querySelector('[data-key="t0"] .name-part-lock').click();
        const firstNameParts = () => document.querySelectorAll('.name-part[data-key^="t"]').length;
        const shapes = new Set();
        for (let i = 0; i < 40; i++) {
            roll();
            expect(textOf("t0")).toBe(kept);
            shapes.add(firstNameParts());
        }
        expect(shapes.size).toBeGreaterThan(1);
    });

    it("offers no Published tab while a part of a constructed surname is locked", () => {
        for (let i = 0; i < 80 && !textButton("n0"); i++) roll();
        document.querySelector('[data-key="n0"] .name-part-lock').click();
        textButton("n0").click();
        expect($("partPicker").open).toBe(true);
        expect($("partPickerTabs").hidden).toBe(true);
        expect(document.querySelectorAll(".part-picker-option").length).toBeGreaterThan(0);
    });

    it("keeps a name saved in another tab when saving, and shows the other tab's changes as they happen", () => {
        const saved = () => [...document.querySelectorAll("#favoritesList .name-list-name")].map((n) => n.textContent);
        const otherTab = { name: "Drerae Iliathor", savedAt: 1 };
        localStorage.setItem("faerunNameFavorites", JSON.stringify([otherTab]));
        window.dispatchEvent(new StorageEvent("storage", { key: "faerunNameFavorites" }));
        expect(saved()).toEqual([otherTab.name]);
        localStorage.setItem("faerunNameFavorites", JSON.stringify([otherTab, { name: "Ilsevel", savedAt: 2 }]));
        $("saveButton").click();
        const name = $("nameText").textContent;
        expect(saved()).toEqual([otherTab.name, "Ilsevel", name]);
        expect(JSON.parse(localStorage.getItem("faerunNameFavorites")).map((f) => f.name)).toEqual(saved());
    });

    it("clears the locks when an earlier name is shown again from the history", () => {
        roll();
        document.querySelector('[data-key="t0"] .name-part-lock').click();
        expect(document.querySelectorAll(".name-part.is-locked")).toHaveLength(1);
        // the history is newest first: the second entry is the name shown before this one
        document.querySelectorAll("#historyList .name-list-name")[1].click();
        expect(document.querySelectorAll(".name-part.is-locked")).toHaveLength(0);
    });

    it("takes the settings from an earlier name shown again, and the next roll follows them", () => {
        const pick = (lineage) => {
            $("pickerLineage").value = lineage;
            $("pickerLineage").dispatchEvent(new Event("change")); // picking a lineage makes a name of it
        };
        pick("drow");
        pick("sun-elf");
        // the history is newest first: the second entry is the drow name
        document.querySelectorAll("#historyList .name-list-name")[1].click();
        expect($("pickerLineage").value).toBe("drow");
        roll();
        expect(document.body.textContent).toMatch(/High Drowic/);
    });

    it("makes the controls match a name picked from the list, as History and Saved names do", () => {
        const choose = (id, value) => {
            $(id).value = value;
            $(id).dispatchEvent(new Event("change"));
        };
        choose("pickerLineage", "drow");
        choose("pickerSex", "feminine");
        $("saveButton").click();
        choose("pickerLineage", "sun-elf");
        choose("pickerSex", "masculine");
        $("listButton").click();
        const batchName = document.querySelector("#nameList .name-list-name").textContent;
        document.querySelector("#favoritesList .name-list-name").click();
        expect($("pickerLineage").value).toBe("drow");
        expect($("pickerSex").value).toBe("feminine");
        document.querySelector(".name-part-lock").click();
        document.querySelector("#nameList .name-list-name").click();
        expect($("nameText").textContent).toBe(batchName);
        expect($("pickerLineage").value).toBe("sun-elf");
        expect($("pickerSex").value).toBe("masculine");
        expect(document.querySelectorAll(".name-part-lock[aria-pressed=true]")).toHaveLength(0);
    });

    it("calls the neutral option unisex in the picker, keeping neutral as its value", () => {
        const option = $("pickerSex").querySelector("option[value=neutral]");
        expect(option.textContent).toBe("unisex");
        expect($("pickerSex").value).toBe("neutral");
    });

    it("offers the privacy notice from buttons, in the footer and in the cookie banner, since they go nowhere", () => {
        const links = [...document.querySelectorAll(".privacy-link")];
        expect(links.map((link) => link.closest("footer, #cookieBanner").localName)).toEqual(["footer", "div"]);
        for (const link of links) {
            expect(link.tagName).toBe("BUTTON");
            expect(link.type).toBe("button");
        }
    });

    it("asks for cookies with No on the left and OK on the right, in that order for Tab as well", () => {
        const banner = $("cookieBanner");
        expect([...banner.querySelectorAll(":scope > button")].map((button) => button.textContent)).toEqual([
            "No",
            "OK"
        ]);
        expect(banner.querySelector("p").textContent.replace(/\s+/g, " ").trim()).toBe(
            "With your OK, cookies help us track usage and catch errors. Learn more"
        );
    });

    it("closes the privacy dialog, like the picker, on a click outside it but not on a click on its text", () => {
        const click = (target) =>
            target.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: 9999, clientY: 9999 }));
        for (const id of ["privacyDialog", "partPicker"]) {
            const dialog = $(id);
            dialog.showModal();
            click(dialog.querySelector("h2"));
            expect(dialog.open).toBe(true);
            click(dialog);
            expect(dialog.open).toBe(false);
        }
    });

    it("repeats No and OK in the privacy dialog, in the banner's order, on the same row as Close", () => {
        const choice = $("privacyDialog").querySelector(".privacy-dialog-choice");
        expect([...choice.querySelectorAll("button")].map((button) => button.textContent)).toEqual(["No", "OK"]);
        expect($("privacyDialog").querySelector("form button").textContent).toBe("Close");
    });
});

describe("dwarves", () => {
    beforeEach(startPage);
    const choose = (id, value) => {
        $(id).value = value;
        $(id).dispatchEvent(new Event("change"));
    };
    const visible = (id) => [...$(id).options].filter((o) => !o.hidden).map((o) => o.value);

    it("lists the dwarf lineages once dwarf is chosen, and only female and male", () => {
        expect(visible("pickerSex")).toEqual(["neutral", "feminine", "masculine"]);
        choose("pickerSpecies", "dwarf");
        expect([...$("pickerLineage").options].map((o) => o.textContent)).toEqual([
            "shield",
            "gold",
            "wild",
            "duergar"
        ]);
        // unisex was chosen; a dwarf is female or male, so the picker moves to the first it offers
        expect(visible("pickerSex")).toEqual(["feminine", "masculine"]);
        expect($("pickerSex").value).toBe("feminine");
        expect($("nameScriptLabel").textContent).not.toBe("");
        expect(sent("species_changed").at(-1)).toMatchObject({ species: "dwarf", lineage: "shield_dwarf" });
        choose("pickerSpecies", "elf");
        expect(visible("pickerSex")).toEqual(["neutral", "feminine", "masculine"]);
        expect($("pickerLineage").value).toBe("sun-elf");
    });

    it("shows no meaning captions over a published dwarf name, since none is known", () => {
        choose("pickerSpecies", "dwarf");
        for (let i = 0; i < 10; i++) {
            roll();
            const captions = [...document.querySelectorAll(".name-word-meaning, .name-part-meaning")];
            expect(captions.map((c) => c.textContent.trim()).filter(Boolean)).toEqual([]);
        }
        // the sources panel says why, so the missing meanings are not taken for a fault
        expect($("nameSources").querySelector(".panel-note").textContent).toMatch(/No book gives the meaning/);
        choose("pickerSpecies", "elf");
        expect($("nameSources").querySelector(".panel-note")).toBeNull();
    });

    it("says why a wild dwarf has no clan name, and shows no clan", () => {
        choose("pickerSpecies", "dwarf");
        expect($("lineageNote").hidden).toBe(true);
        choose("pickerLineage", "wild-dwarf");
        expect($("lineageNote").hidden).toBe(false);
        expect($("lineageNote").textContent).toMatch(/no clan names/);
        expect(document.querySelector('[data-key="clan"]')).toBeNull();
        // the default roll: one published first name, said to be published, and nothing after it
        expect($("nameText").textContent).toMatch(/^[^ ,]+, a published name$/);
    });

    it("explains repeats only where the published names are few, and not once Expanded Variety is on", () => {
        const note = $("smallPoolNote");
        expect(note.hidden).toBe(true);
        choose("pickerSpecies", "dwarf");
        expect(note.hidden).toBe(true);
        choose("pickerLineage", "wild-dwarf");
        expect(note.hidden).toBe(false);
        expect(note.textContent).toBe(
            "Wild dwarves have a small set of published names, so repeats are normal. Turn on Expanded Variety for more variety."
        );
        $("expandedToggle").click();
        expect(note.hidden).toBe(true);
        $("expandedToggle").click();
        expect(note.hidden).toBe(false);
        choose("pickerLineage", "gold-dwarf");
        expect(note.hidden).toBe(true);
        choose("pickerSpecies", "elf");
        expect(note.hidden).toBe(true);
    });

    it("says the small-pool note through the page's one announcer, not a live region of its own", () => {
        const note = $("smallPoolNote");
        expect(note.hasAttribute("role")).toBe(false);
        expect(note.closest("[aria-live], [role=status]")).toBeNull();
        const said = () => $("announcer").textContent;
        choose("pickerSpecies", "dwarf");
        expect(said()).not.toMatch(/published names/);
        choose("pickerLineage", "wild-dwarf");
        expect(said()).toBe(note.textContent);
        choose("pickerSex", "masculine");
        expect(said()).toBe(note.textContent);
        $("announcer").replaceChildren();
        choose("pickerLineage", "gold-dwarf");
        expect(said()).toBe("");
    });

    it("adds and takes away a name phrase with its + / - button", () => {
        choose("pickerSpecies", "dwarf");
        const step = () => document.querySelector('[data-control="phrase"]');
        for (let i = 0; i < 20 && step()?.getAttribute("aria-label") !== "Add a name phrase"; i++) roll();
        const plain = $("nameText").textContent;
        step().click();
        expect($("nameText").textContent).not.toBe(plain);
        expect(step().getAttribute("aria-label")).toBe("Remove the name phrase");
        step().click();
        expect($("nameText").textContent).toBe(plain);
        expect(sent("name_structure_changed").map((e) => e.structure_control)).toEqual(["name_phrase", "name_phrase"]);
    });

    it("saves a dwarf name as dwarven and shows it again with the dwarf pickers", () => {
        choose("pickerSpecies", "dwarf");
        choose("pickerLineage", "duergar");
        const name = $("nameText").textContent;
        $("saveButton").click();
        const [saved] = JSON.parse(localStorage.getItem("faerunNameFavorites"));
        expect(saved).toMatchObject({ generatorType: "dwarven", subrace: "duergar" });
        choose("pickerSpecies", "elf");
        document.querySelector("#favoritesList .name-list-name").click();
        expect($("nameText").textContent).toBe(name);
        expect($("pickerSpecies").value).toBe("dwarf");
        expect($("pickerLineage").value).toBe("duergar");
        expect(visible("pickerSex")).toEqual(["feminine", "masculine"]);
    });
});

describe("messages on the name card", () => {
    const box = () => $("cardMessage").querySelector(".message-box");

    beforeEach(startPageWithFailures);

    it("explains a roll that fits no name under the buttons, nudges the locks, and keeps the name", () => {
        document.querySelector(".name-part-lock").click();
        const name = $("nameText").textContent;
        failNext("generate");
        roll();
        expect($("nameText").textContent).toBe(name);
        expect(box().classList).toContain("is-error");
        expect(box().textContent).toMatch(/locked parts/);
        expect($("announcer").textContent).toMatch(/locked parts/);
        const locks = [...document.querySelectorAll(".name-part.is-locked .name-part-lock")];
        expect(locks.length).toBeGreaterThan(0);
        expect(locks.every((lock) => lock.hasAttribute("data-nudged"))).toBe(true);
        stopFailing();
        roll();
        expect($("cardMessage").textContent).toBe("");
    });

    const lockEveryPart = () => {
        let lock;
        while ((lock = document.querySelector('.name-part-lock[aria-pressed="false"]'))) lock.click();
    };

    it("keeps the name and explains, without rolling, when every part is locked", () => {
        lockEveryPart();
        const name = $("nameText").textContent;
        roll();
        expect($("nameText").textContent).toBe(name);
        expect(box().classList).toContain("is-warning");
        expect(box().textContent).toMatch(/Every part is locked/);
        expect($("announcer").textContent).toMatch(/Every part is locked/);
        const locks = [...document.querySelectorAll(".name-part-lock")];
        expect(locks.every((lock) => lock.hasAttribute("data-nudged"))).toBe(true);
        locks[0].click();
        roll();
        expect($("cardMessage").textContent).toBe("");
    });

    it("explains under Roll 10 More, listing nothing, when every part is locked", () => {
        lockEveryPart();
        $("listButton").click();
        expect($("nameListMessage").textContent).toMatch(/Every part is locked/);
        expect($("nameList").children).toHaveLength(0);
    });

    it("explains under Roll 10 More, not on the name card, when no name fits the locked parts", () => {
        document.querySelector(".name-part-lock").click();
        failNext("generate");
        $("listButton").click();
        expect($("nameListMessage").querySelector(".message-box").classList).toContain("is-error");
        expect($("cardMessage").textContent).toBe("");
        stopFailing();
        $("listButton").click();
        expect($("nameListMessage").textContent).toBe("");
    });

    it("explains a failed roll without blaming the locks when nothing is locked", () => {
        failNext("generate");
        roll();
        expect(box().classList).toContain("is-error");
        expect(box().textContent).toMatch(/Couldn't make a name/);
        expect(box().textContent).not.toMatch(/lock/i);
    });

    it("says there is no name yet, rather than to wait for the name lists, when the first roll after loading fails", async () => {
        failNext("generate");
        document.documentElement.innerHTML = page;
        vi.resetModules();
        await import("../js/app.js");
        await vi.waitFor(() => expect($("nameLoading").hidden).toBe(true));
        expect(box().textContent).toMatch(/Couldn't make a name/);
        for (const id of ["copyButton", "saveButton"]) {
            $(id).click();
            expect(box().textContent).toMatch(/No name yet/);
            expect(box().textContent).not.toContain("Cannot complete that action");
        }
    });

    it("says nothing about a refused copy once another name is shown", async () => {
        let refuse;
        const writeText = vi.fn(() => new Promise((resolve, reject) => (refuse = reject)));
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        $("copyButton").click();
        roll();
        refuse(new Error("denied"));
        await writeText.mock.results[0].value.catch(() => {});
        await Promise.resolve();
        expect($("cardMessage").textContent).toBe("");
        expect(window.getSelection().toString()).toBe("");
    });

    it("counts a copy that finishes after another roll, without saying Copied over the new name", async () => {
        let finish;
        const writeText = vi.fn(() => new Promise((resolve) => (finish = resolve)));
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        $("copyButton").click();
        roll();
        finish();
        await writeText.mock.results[0].value;
        await Promise.resolve();
        expect($("copyButton").hasAttribute("data-confirming")).toBe(false);
        expect(sent("name_copied")).toHaveLength(1);
    });

    it("explains a picker choice that is not available, under the buttons", () => {
        failNext("generatePartChange");
        textButton("t0").click();
        const other = [...document.querySelectorAll(".part-picker-option")].find(
            (o) => !o.hasAttribute("aria-current")
        );
        other.click();
        expect(box().classList).toContain("is-error");
        expect(box().textContent).toMatch(/choice isn't available/);
    });

    it("explains a name-shape change that is not available, under the buttons, and reports it as a generator error", () => {
        const addGiven = '[data-control="given"][aria-label^="Add"]';
        for (let i = 0; i < 80 && !document.querySelector(addGiven); i++) roll();
        const name = $("nameText").textContent;
        failNext("generateStructureChange", 1);
        document.querySelector(addGiven).click();
        expect($("nameText").textContent).toBe(name);
        expect(box().classList).toContain("is-error");
        expect(box().textContent).toMatch(/change isn't available/);
        expect(reported).toHaveLength(1);
        expect(reported[0][1]).toBe("generator");
    });

    it("selects the name and what it is for the person, and says how to copy it, when the browser refuses to copy", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
        $("copyButton").click();
        await vi.waitFor(() => expect(box()).not.toBeNull());
        expect(box().classList).toContain("is-warning");
        expect(box().textContent).toMatch(/Ctrl\+C/);
        const selected = window.getSelection().toString();
        expect(selected).toBe(document.querySelector("#cardMessage .message-box-copy").textContent);
        const kind = document.querySelector("#historyList .name-list-kind").textContent;
        expect(selected).toBe(`${$("nameText").textContent} (${kind})`);
    });

    it("explains a name the browser would not save, under the buttons", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("full");
        });
        $("saveButton").click();
        expect(box().classList).toContain("is-error");
        expect(box().textContent).toMatch(/wasn't saved/);
        expect($("saveButton").getAttribute("aria-pressed")).toBe("false");
    });
});

describe("confirmations on the button pressed", () => {
    const label = (button) => button.querySelector(".icon-button-label")?.textContent;
    const icon = (button) => button.querySelector("use").getAttribute("href");
    const isConfirming = (button) => button.hasAttribute("data-confirming");

    it("turns Copy into a check and Copied, then back", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue() } });
        vi.useFakeTimers();
        $("copyButton").click();
        await vi.advanceTimersByTimeAsync(0);
        expect(isConfirming($("copyButton"))).toBe(true);
        expect(label($("copyButton"))).toBe("Copied");
        expect(icon($("copyButton"))).toBe("#icon-check");
        expect($("announcer").textContent).toBe("Copied.");
        await vi.advanceTimersByTimeAsync(2000);
        expect(isConfirming($("copyButton"))).toBe(false);
        expect(icon($("copyButton"))).toBe("#icon-copy");
    });

    const glinting = (node) => node.hasAttribute("data-glinting");

    it("glints the name on the card when Copy and Save confirm", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue() } });
        expect(glinting($("nameDials"))).toBe(false);
        $("copyButton").click();
        await vi.waitFor(() => expect(glinting($("nameDials"))).toBe(true));
        roll();
        expect(glinting($("nameDials"))).toBe(false);
        $("saveButton").click();
        expect(glinting($("nameDials"))).toBe(true);
    });

    it("does not glint the card's name when a save is refused", () => {
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("full");
        });
        $("saveButton").click();
        expect(glinting($("nameDials"))).toBe(false);
    });

    it("glints a saved row's own name when its copy button confirms", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue() } });
        $("saveButton").click();
        document.querySelector("#favoritesList .name-list-tool").click();
        await vi.waitFor(() => expect(glinting(document.querySelector("#favoritesList .name-list-name"))).toBe(true));
    });

    it("glints a History row's name when its copy or bookmark confirms", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue() } });
        document.querySelector("#historyList .name-list-save").click();
        expect(glinting(document.querySelector("#historyList .name-list-name"))).toBe(true);
    });

    it("turns a saved name's copy button into a check and Copied", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue() } });
        $("saveButton").click();
        const copy = document.querySelector("#favoritesList .name-list-tool");
        copy.click();
        await vi.waitFor(() => expect(isConfirming(copy)).toBe(true));
        expect(label(copy)).toBe("Copied");
        expect(icon(copy)).toBe("#icon-check");
    });

    it("says Saved and Unsaved on the bookmark at every press, then goes back", () => {
        vi.useFakeTimers();
        const save = $("saveButton");
        save.click();
        expect(isConfirming(save)).toBe(true);
        expect(label(save)).toBe("Saved");
        expect($("announcer").textContent).toMatch(/^Saved/);
        save.click();
        expect(label(save)).toBe("Unsaved");
        save.click();
        expect(label(save)).toBe("Saved");
        expect(icon(save)).toBe("#icon-bookmark");
        vi.advanceTimersByTime(2000);
        expect(isConfirming(save)).toBe(false);
    });

    it("ends the bookmark's confirmation when another name is shown, since it was about the last one", () => {
        $("saveButton").click();
        roll();
        expect(isConfirming($("saveButton"))).toBe(false);
    });

    it("shows one confirmation at a time beside Roll Name, so the words never overlap", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockResolvedValue() } });
        $("saveButton").click();
        $("copyButton").click();
        await vi.waitFor(() => expect(isConfirming($("copyButton"))).toBe(true));
        expect(isConfirming($("saveButton"))).toBe(false);
        expect(icon($("saveButton"))).toBe("#icon-bookmark");
    });

    it("confirms nothing when the browser refuses to copy or save", async () => {
        vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) } });
        $("copyButton").click();
        await vi.waitFor(() => expect($("cardMessage").textContent).not.toBe(""));
        expect(isConfirming($("copyButton"))).toBe(false);
        vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
            throw new Error("full");
        });
        $("saveButton").click();
        expect(isConfirming($("saveButton"))).toBe(false);
    });
});

describe("the Roll Name button's press effect", () => {
    const button = () => $("generateButton");
    const isMarked = () => button().hasAttribute("data-rolled");
    const pressSpacebar = () =>
        document.body.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));

    beforeEach(startPageWithFailures);

    it("plays on every roll the visitor asks for, by button or spacebar", () => {
        expect(isMarked()).toBe(false);
        roll();
        expect(isMarked()).toBe(true);
        button().removeAttribute("data-rolled");
        pressSpacebar();
        expect(isMarked()).toBe(true);
    });

    it("flashes on a pointer's press, and with the roll itself from the keyboard", () => {
        const isFlashing = () => button().hasAttribute("data-flashing");
        button().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
        expect(isMarked()).toBe(true);
        expect(isFlashing()).toBe(false);
        button().dispatchEvent(new Event("pointerdown", { bubbles: true }));
        expect(isFlashing()).toBe(true);
        button().removeAttribute("data-flashing");
        pressSpacebar();
        expect(isFlashing()).toBe(true);
        button().removeAttribute("data-flashing");
        roll(); // Enter on the focused button clicks it with no pointer
        expect(isFlashing()).toBe(true);
    });

    // a browser drops a finished animation from the list
    const fakeAnimations = (...others) => {
        const timing = { getTiming: () => ({ delay: 380 }) };
        const waiting = ["generate-recharge", "generate-restore"].map((animationName) => ({
            animationName,
            currentTime: 0,
            effect: timing
        }));
        button().getAnimations = () => [...waiting, ...others];
        return () => waiting.map((animation) => animation.currentTime);
    };
    const discharging = (currentTime) => ({
        animationName: "generate-discharge",
        playState: "running",
        currentTime,
        playbackRate: 1,
        effect: { getTiming: () => ({ duration: 380 }) }
    });
    const press = () => button().dispatchEvent(new Event("pointerdown", { bubbles: true }));
    const letGo = (type, target) => target.dispatchEvent(new Event(type, { bubbles: true }));

    it("recharges as soon as a held press is let go anywhere, once its light has already run out", () => {
        // on the button, dragged off it (no click follows), and a touch taken over by scrolling
        for (const [type, target] of [
            ["pointerup", button()],
            ["pointerup", document.body],
            ["pointercancel", button()]
        ]) {
            const heldLong = fakeAnimations();
            press();
            letGo(type, target);
            expect(heldLong()).toEqual([380, 380]);
        }
        const elsewhere = fakeAnimations();
        letGo("pointerup", document.body);
        expect(elsewhere()).toEqual([0, 0]);
    });

    it("clears the rest of the light within 90 ms when a quick press is let go, and springs back right after", () => {
        const discharge = discharging(100);
        const waiting = fakeAnimations(discharge);
        press();
        letGo("pointerup", button());
        expect(discharge.playbackRate).toBeCloseTo(280 / 90);
        expect(waiting()).toEqual([290, 290]);

        const nearlyDone = discharging(340);
        const waitingNearlyDone = fakeAnimations(nearlyDone);
        press();
        letGo("pointerup", button());
        expect(nearlyDone.playbackRate).toBe(1);
        expect(waitingNearlyDone()).toEqual([340, 340]);
    });

    it("does not play when no name was rolled", () => {
        failNext("generate");
        roll();
        expect(isMarked()).toBe(false);
        stopFailing();
        let lock;
        while ((lock = document.querySelector('.name-part-lock[aria-pressed="false"]'))) lock.click();
        pressSpacebar();
        expect(isMarked()).toBe(false);
    });
});

describe("usage events", () => {
    const context = { species: "elf", generation_mode: "standard", character_gender: "neutral", lineage: "sun_elf" };

    it("sends nothing when the page first shows a name, and one event per roll the visitor asks for", () => {
        expect(events).toEqual([]);
        roll();
        document.body.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
        $("listButton").click();
        expect(sent("name_generated")).toEqual([
            { ...context, roll_type: "single", name_count: 1, trigger: "button" },
            { ...context, roll_type: "single", name_count: 1, trigger: "spacebar" },
            { ...context, roll_type: "list", name_count: 10, trigger: "button" }
        ]);
    });

    it("describes components by position and kind, and locks as on or off", () => {
        // the apostrophe shape (suffix'prefix…) starts with a suffix; roll until the name starts with a prefix
        for (let i = 0; i < 50 && $("nameText").textContent.includes("'"); i++) roll();
        events.length = 0;
        const lock = () => document.querySelector('[data-key="t0"] .name-part-lock').click();
        lock();
        lock();
        expect(sent("component_lock_changed")).toEqual([
            { ...context, component_position: "first_name", component_type: "prefix", locked: "on" },
            { ...context, component_position: "first_name", component_type: "prefix", locked: "off" }
        ]);
        document.querySelector('[data-key="t1"] .name-part-text').click();
        document.querySelector(".part-picker-option").click();
        expect(sent("component_picker_opened")).toEqual([
            { ...context, component_position: "first_name", component_type: "suffix" }
        ]);
        expect(sent("component_selected")).toEqual([
            { ...context, component_position: "first_name", component_type: "suffix", component_origin: "table" }
        ]);
    });

    it("records the structure buttons with their new state, and a surname switch with the kind chosen", () => {
        for (let i = 0; i < 80 && !document.querySelector('[data-control="given"][aria-label^="Add"]'); i++) roll();
        events.length = 0;
        const press = () => document.querySelector('[data-control="given"]').click();
        press();
        press();
        expect(sent("name_structure_changed")).toEqual([
            { ...context, structure_control: "first_name_length", structure_value: "on" },
            { ...context, structure_control: "first_name_length", structure_value: "off" }
        ]);
        document.querySelector('[data-control="compound"]').click();
        expect(sent("name_structure_changed").at(-1)).toEqual({
            ...context,
            structure_control: "compound_name",
            structure_value: "on"
        });
        // the other kind of surname, chosen in the picker's other tab
        const surname = textButton("family") || textButton("n0");
        const kindNow = textButton("family") ? "published" : "constructed";
        surname.click();
        document.querySelector(`#partPickerTabs [data-kind]:not([data-kind="${kindNow}"])`).click();
        document.querySelector(".part-picker-option").click();
        expect(sent("surname_kind_changed")).toEqual([
            { ...context, surname_kind: kindNow === "published" ? "constructed" : "published" }
        ]);
        expect(sent("component_selected")).toEqual([]);
    });

    it("records settings, Expanded Variety and the sources section without counting their new names as rolls", async () => {
        $("pickerLineage").value = "drow";
        $("pickerLineage").dispatchEvent(new Event("change"));
        $("expandedToggle").click();
        const details = $("nameSourcesSummary").closest("details");
        details.open = true;
        await vi.waitFor(() => expect(sent("name_sources_opened")).toHaveLength(1));
        details.open = false;
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(sent("name_setting_changed")).toEqual([
            { ...context, lineage: "drow", setting_name: "lineage", setting_value: "drow" }
        ]);
        expect(sent("expanded_variety_changed")).toEqual([
            { ...context, lineage: "drow", generation_mode: "expanded", setting_value: "on" }
        ]);
        expect(sent("name_sources_opened")).toHaveLength(1);
        expect(sent("name_generated")).toEqual([]);
    });

    it("counts a copy only when it succeeds, and a save only when it is added", async () => {
        const writeText = vi.fn().mockResolvedValue();
        vi.stubGlobal("navigator", { clipboard: { writeText } });
        $("copyButton").click();
        await vi.waitFor(() => expect(sent("name_copied")).toEqual([{ ...context, copy_source: "current" }]));
        writeText.mockRejectedValue(new Error("denied"));
        $("copyButton").click();
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(sent("name_copied")).toHaveLength(1);
        $("saveButton").click();
        $("saveButton").click();
        expect(sent("name_saved")).toEqual([{ ...context, save_source: "current" }]);
    });

    it("never sends the name or any of its components", () => {
        roll();
        document.querySelector('[data-key="t0"] .name-part-lock').click();
        const texts = [
            $("nameText").textContent,
            ...[...document.querySelectorAll(".name-part-text")].map((b) => b.textContent)
        ];
        const values = events.flatMap(([, params]) => Object.values(params).map(String));
        texts.forEach((text) => expect(values).not.toContain(text));
        values.forEach((value) => expect(value).toMatch(/^[a-z0-9_]+$/));
    });
});

describe("starting with names stored in the browser", () => {
    const stored = (key, value) => localStorage.setItem(key, JSON.stringify(value));
    const withMeaning = (name) => ({
        name,
        sex: "neutral",
        subrace: "moon-elf",
        parts: [{ key: "t0", role: "prefix", text: name, meaning: "Gift", section: "given", kind: "prefix" }]
    });
    const noMeaning = { ...withMeaning("Broken"), parts: [{ ...withMeaning("x").parts[0], meaning: undefined }] };
    const booksAsText = {
        ...withMeaning("Legacy"),
        parts: [{ key: "t0", role: "prefix", text: "al", method: "split", from: ["Alarra"], books: "Cormanthyr" }]
    };
    const historyNames = () => [...document.querySelectorAll("#historyList .name-list-name")].map((n) => n.textContent);
    const savedRows = () => [...document.querySelectorAll("#favoritesList li")];

    it("shows a name made with the retired any lineage again, with any in the picker until another is chosen", async () => {
        stored("faerunNameHistory", [{ ...withMeaning("Ilsevel"), subrace: "high-elf" }]);
        await startPage();
        const lineages = () => [...$("pickerLineage").options].map((o) => o.value);
        expect(lineages()).not.toContain("high-elf");
        document.querySelectorAll("#historyList .name-list-name")[1].click();
        expect($("nameText").textContent).toBe("Ilsevel");
        expect($("pickerLineage").value).toBe("high-elf");
        expect($("pickerLineage").selectedOptions[0].textContent).toBe("any");
        $("pickerLineage").value = "moon-elf";
        $("pickerLineage").dispatchEvent(new Event("change"));
        expect(lineages()).toEqual(["sun-elf", "moon-elf", "wood-elf", "drow"]);
    });

    it("reaches the first name, and lists the other history entries, when one entry is damaged", async () => {
        stored("faerunNameHistory", [withMeaning("Ilsevel"), booksAsText, noMeaning]);
        await startPage();
        expect(historyNames().slice(1)).toEqual(["Ilsevel"]);
        document.querySelectorAll("#historyList .name-list-name")[1].click();
        expect($("nameText").textContent).toBe("Ilsevel");
    });

    it("lists a saved name the page cannot draw as damaged, says so when it is clicked, and loads the others", async () => {
        const record = (result) => ({ name: result.name, savedAt: 1, result });
        stored("faerunNameFavorites", [record(noMeaning), record(booksAsText), record(withMeaning("Aerith"))]);
        await startPage();
        const shown = $("nameText").textContent;
        const [first, second, third] = savedRows();
        for (const row of [first, second]) {
            expect(row.querySelector("button.name-list-name").classList).toContain("is-damaged");
            expect(row.querySelector('[aria-label^="Copy"]')).not.toBeNull();
        }
        first.querySelector("button.name-list-name").click();
        expect(first.querySelector(".message-box").textContent).toMatch(/damaged/);
        expect(second.querySelector(".message-box")).toBeNull();
        expect($("nameText").textContent).toBe(shown);
        expect(third.querySelector("button.name-list-name").classList).not.toContain("is-damaged");
        third.querySelector("button.name-list-name").click();
        expect($("nameText").textContent).toBe("Aerith");
    });

    it("lists a name whose parts would draw an empty word as damaged, and keeps the page working", async () => {
        const part = (key, role, text, section, kind) => ({ key, role, text, section, kind, meaning: "Gift" });
        const space = part("sp", "space", " ", "given", "joint");
        const trailingSpace = {
            ...withMeaning("Ael "),
            parts: [part("t0", "prefix", "ael", "given", "prefix"), space]
        };
        const record = (result) => ({ name: result.name, savedAt: 1, result });
        stored("faerunNameFavorites", [record(trailingSpace), record(withMeaning("Aerith"))]);
        stored("faerunNameHistory", [trailingSpace, withMeaning("Ilsevel")]);
        await startPage();
        expect(historyNames().slice(1)).toEqual(["Ilsevel"]);
        const [damaged, fine] = savedRows();
        expect(damaged.querySelector("button.name-list-name").classList).toContain("is-damaged");
        damaged.querySelector("button.name-list-name").click();
        expect(damaged.querySelector(".message-box").textContent).toMatch(/damaged/);
        fine.querySelector("button.name-list-name").click();
        expect($("nameText").textContent).toBe("Aerith");
    });

    it.each([
        ["an elf", savedBy415, 2],
        ["a drow", drowSavedBy415, 2]
    ])("still draws %s name saved by 4.1.5, given name and family name as two words", async (_, result, words) => {
        stored("faerunNameFavorites", [{ name: result.name, savedAt: 1, result }]);
        await startPage();
        document.querySelector("#favoritesList button.name-list-name").click();
        expect($("nameText").textContent).toContain(result.name);
        expect(document.querySelectorAll("#nameDials .name-word").length).toBe(words);
        expect($("nameDials").textContent.toLowerCase()).toContain(result.parts.at(-1).text.toLowerCase());
    });

    it("opens the first-name picker of an elf name saved by 4.1.5, which has a space before its surname", async () => {
        stored("faerunNameFavorites", [{ name: savedBy415.name, savedAt: 1, result: savedBy415 }]);
        await startPage();
        document.querySelector("#favoritesList button.name-list-name").click();
        for (const key of ["t0", "t2"]) {
            textButton(key).click();
            expect(document.querySelectorAll(".part-picker-option").length).toBeGreaterThan(1);
            $("partPicker").close();
        }
    });
});

describe("an unexpected error in a click", () => {
    const box = () => $("cardMessage").querySelector(".message-box");
    const KEPT = "That didn't work, so we kept your last name.";
    const surnamePart = () => textButton("family") || textButton("n0");
    const lockFirstPart = () => document.querySelector('[data-key="t0"] .name-part-lock').click();
    const isFirstPartLocked = () =>
        document.querySelector('[data-key="t0"] .name-part-lock').getAttribute("aria-pressed") === "true";

    beforeEach(startPageWithFailures);

    // each step a click takes that is not guarded by `attempt`, failing once: the card keeps the last name and its locks
    const steps = {
        "drawing the card": { fails: "renderResult", act: roll },
        "building the name-shape controls": { fails: "getStructureControls", act: roll },
        "offering the other kind of surname": {
            fails: "getSurnameSwitchOptions",
            prepare: () => {
                for (let i = 0; i < 80 && !surnamePart(); i++) roll();
            },
            act: () => surnamePart().click()
        }
    };

    it.each(Object.entries(steps))(
        "keeps the last name and its locks, says so and reports it, when %s fails",
        (_, step) => {
            step.prepare?.();
            lockFirstPart();
            const name = $("nameText").textContent;
            const history = $("historyList").textContent;
            failNext(step.fails, 1);
            step.act();
            expect($("nameText").textContent).toBe(name);
            expect(isFirstPartLocked()).toBe(true);
            expect(box().classList).toContain("is-error");
            expect(box().textContent).toContain(KEPT);
            expect($("announcer").textContent).toContain(KEPT);
            expect($("historyList").textContent).toBe(history);
            expect(reported).toHaveLength(1);
            expect(reported[0][0].message).toBeTruthy();
            expect(reported[0][1]).toBe("click");
            roll();
            expect($("cardMessage").textContent).toBe("");
        }
    );

    it("leaves a lock as it was when drawing the card fails after pressing it", () => {
        failNext("renderResult", 1);
        lockFirstPart();
        expect(isFirstPartLocked()).toBe(false);
        expect(box().textContent).toContain(KEPT);
    });

    it("never holds one name while showing another", () => {
        const name = $("nameText").textContent;
        failNext("renderResult", 1);
        roll();
        const written = [];
        vi.stubGlobal("navigator", { clipboard: { writeText: async (text) => written.push(text) } });
        $("copyButton").click();
        expect($("nameText").textContent).toBe(name);
        expect(written[0]).toContain(name);
    });

    it("rolls a fresh name when the last one cannot be drawn again, and says so", () => {
        const name = $("nameText").textContent;
        failNext("getStructureControls", 2);
        roll();
        expect($("nameText").textContent).not.toBe("");
        expect($("nameText").textContent).not.toBe(name);
        expect(box().textContent).toMatch(/rolled a new name/);
        expect(reported).toHaveLength(2);
    });

    it("offers a reload, with the name lists panel in place of the card, when nothing can be drawn", () => {
        failNext("getStructureControls");
        roll();
        const panel = $("nameLoading");
        expect(panel.hidden).toBe(false);
        expect(panel.dataset.step).toBe("broken");
        expect(panel.querySelector(".name-card-loading-reload")).not.toBeNull();
        expect(reported.length).toBeGreaterThan(0);
        expect($("generateButton").getAttribute("aria-disabled")).toBe("true");
    });
});
