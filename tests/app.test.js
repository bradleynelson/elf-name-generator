import { beforeEach, describe, expect, it, vi } from "vitest";
import { seededRandom } from "./helpers/random.js";
import { readJson, readPage } from "./helpers/files.js";

// Page flows with the real page, the real app script and the real name data: what a person does with the controls,
// checked by what they would see. The data files are served from disk in place of the network.
const page = readPage();
const $ = (id) => document.getElementById(id);
const textOf = (key) => document.querySelector(`[data-key="${key}"] .name-part-text`)?.textContent;
const textButton = (key) => document.querySelector(`[data-key="${key}"] .name-part-text`);
const roll = () => $("generateButton").click();
// usage events are recorded here instead of being sent
const events = [];
const sent = (name) => events.filter(([event]) => event === name).map(([, params]) => params);

beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(Math, "random").mockImplementation(seededRandom(20261023));
    document.documentElement.innerHTML = page;
    events.length = 0;
    vi.doMock("../js/analytics.js", () => ({
        track: (event, params) => events.push([event, params]),
        reportError: () => {},
        setUpConsent: () => {}
    }));
    vi.stubGlobal("fetch", async (path) => ({
        ok: true,
        // like a server, ignore the ?v= version stamp on the URL
        json: async () => readJson(path.split("?")[0])
    }));
    // jsdom does not implement modal dialogs or scrolling
    HTMLDialogElement.prototype.showModal ??= function showModal() {
        this.open = true;
    };
    HTMLDialogElement.prototype.close ??= function close() {
        this.open = false;
    };
    Element.prototype.scrollIntoView ??= () => {};
    vi.resetModules();
    await import("../js/app.js");
    await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
});

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
        // choose from the other list
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
        // A lineage has five pickers: a given name's prefix and suffix, and a surname's whole name, prefix and suffix
        // (the whole name and the prefix are the two tabs of one surname; the suffix is its second component).
        const PICKERS_PER_LINEAGE = 5;
        for (const lineage of [...$("pickerLineage").options].map((o) => o.value)) {
            $("pickerLineage").value = lineage;
            $("pickerLineage").dispatchEvent(new Event("change"));
            // Roll until each picker has been opened and checked once; opening a picker builds its whole list, so
            // repeating the same one adds time and no coverage
            const checked = new Set();
            for (let i = 0; i < 60 && checked.size < PICKERS_PER_LINEAGE; i++) {
                roll();
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
            expect(checked.size, `pickers reached for ${lineage}`).toBe(PICKERS_PER_LINEAGE);
        }
    });

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

    it("brings back a removed saved name with Undo", () => {
        $("saveButton").click();
        const saved = () => [...document.querySelectorAll("#favoritesList .name-list-name")].map((n) => n.textContent);
        const name = saved()[0];
        expect(name).toBeTruthy();
        document.querySelector("#favoritesList .favorites-remove").click();
        expect(saved()).toEqual([]);
        expect($("notice").textContent).toMatch(/Removed/);
        document.querySelector("#notice .notice-action").click();
        expect(saved()).toEqual([name]);
    });

    it("clears the locks when an earlier name is shown again from the history", () => {
        roll();
        document.querySelector('[data-key="t0"] .name-part-lock').click();
        expect(document.querySelectorAll(".name-part.is-locked")).toHaveLength(1);
        // the history is newest first: the second entry is the name shown before this one
        document.querySelectorAll("#historyList .name-list-name")[1].click();
        expect(document.querySelectorAll(".name-part.is-locked")).toHaveLength(0);
    });

    it("brings back cleared history with Undo", () => {
        roll();
        roll();
        const history = () => document.querySelectorAll("#historyList li").length;
        const before = history();
        expect(before).toBeGreaterThan(1);
        $("historyClear").click();
        expect(history()).toBe(0);
        document.querySelector("#notice .notice-action").click();
        expect(history()).toBe(before);
    });

    it("offers the privacy notice from buttons, in the footer and in the cookie banner, since they go nowhere", () => {
        const links = [...document.querySelectorAll(".privacy-link")];
        expect(links.map((link) => link.closest("footer, #cookieBanner").localName)).toEqual(["footer", "div"]);
        for (const link of links) {
            expect(link.tagName).toBe("BUTTON");
            expect(link.type).toBe("button");
        }
    });
});

describe("usage events", () => {
    const context = { species: "elf", generation_mode: "standard", character_gender: "neutral", lineage: "any" };

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
        expect(sent("name_saved")).toEqual([context]);
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
