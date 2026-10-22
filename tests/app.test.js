import { readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Page flows with the real page, the real app script and the real name data: what a person does with the controls,
// checked by what they would see. The data files are served from disk in place of the network.
const page = readFileSync(join(process.cwd(), "index.html"), "utf-8");
const $ = (id) => document.getElementById(id);
const textOf = (key) => document.querySelector(`[data-key="${key}"] .name-part-text`)?.textContent;
const roll = () => $("generateButton").click();
// usage events are recorded here instead of being sent
const events = [];
const sent = (name) => events.filter(([event]) => event === name).map(([, params]) => params);

beforeEach(async () => {
    document.documentElement.innerHTML = page;
    events.length = 0;
    vi.doMock("../js/analytics.js", () => ({
        track: (event, params) => events.push([event, params]),
        reportError: () => {},
        setUpConsent: () => {}
    }));
    vi.stubGlobal("fetch", async (path) => ({
        ok: true,
        json: async () => JSON.parse(readFileSync(join(process.cwd(), path), "utf-8"))
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
