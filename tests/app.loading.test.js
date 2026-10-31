import { beforeEach, describe, expect, it, vi } from "vitest";
import { readJson, readPage } from "./helpers/files.js";

// Loading the name lists when the first copy cannot be used, as with a stale cached file.
const page = readPage();
const $ = (id) => document.getElementById(id);
// like a server, ignore the ?v= version stamp on the URL
const fromDisk = (path) => readJson(path.split("?")[0]);

async function startPage(fetchFile) {
    document.documentElement.innerHTML = page;
    vi.doMock("../js/analytics.js", () => ({ track: () => {}, reportError: () => {}, setUpConsent: () => {} }));
    vi.stubGlobal("fetch", fetchFile);
    Element.prototype.scrollIntoView ??= () => {};
    vi.resetModules();
    await import("../js/app.js");
}

describe("loading the name lists", () => {
    beforeEach(() => vi.unstubAllGlobals());

    it("retries once, bypassing the cache, and then shows a name", async () => {
        const caches = [];
        await startPage(async (path, { cache }) => {
            caches.push(`${path}:${cache}`);
            // the first copy of each file is unusable; the cache-bypassing retry is good
            if (cache === "default") return { ok: false, status: 500 };
            return { ok: true, json: async () => fromDisk(path) };
        });
        await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
        expect(caches.some((entry) => /^data\/elfNames\.json\?v=[\w.-]+:reload$/.test(entry))).toBe(true);
        expect($("notice").hidden).toBe(true);
    });

    it("still makes names, and says so, when the browser blocks storage", async () => {
        const blocked = () => {
            throw new DOMException("blocked", "SecurityError");
        };
        // clear is called by the shared test setup, which is not what is being blocked here
        vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked, clear: () => {} });
        await startPage(async (path) => ({ ok: true, json: async () => fromDisk(path) }));
        await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
        expect($("notice").hidden).toBe(false);
        expect($("notice").textContent).toContain("blocking site storage");
    });

    it("stays quiet about storage when the browser allows it", async () => {
        await startPage(async (path) => ({ ok: true, json: async () => fromDisk(path) }));
        await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
        expect($("notice").hidden).toBe(true);
    });

    it("tells the person how to refresh when the lists still cannot be loaded", async () => {
        await startPage(async () => ({ ok: false, status: 404 }));
        await vi.waitFor(() => expect($("notice").hidden).toBe(false));
        expect($("notice").textContent).toContain("Ctrl+F5");
        expect($("notice").querySelector(".notice-action").textContent).toBe("Reload");
    });
});
