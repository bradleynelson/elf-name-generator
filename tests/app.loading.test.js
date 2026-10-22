import { readFileSync } from "fs";
import { join } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Loading the name lists when the first copy cannot be used, as with a stale cached file.
const page = readFileSync(join(process.cwd(), "index.html"), "utf-8");
const $ = (id) => document.getElementById(id);
const fromDisk = (path) => JSON.parse(readFileSync(join(process.cwd(), path), "utf-8"));

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
        expect(caches).toContain("data/elfNames.json:reload");
        expect($("notice").hidden).toBe(true);
    });

    it("tells the person how to refresh when the lists still cannot be loaded", async () => {
        await startPage(async () => ({ ok: false, status: 404 }));
        await vi.waitFor(() => expect($("notice").hidden).toBe(false));
        expect($("notice").textContent).toContain("Ctrl+F5");
        expect($("notice").querySelector(".notice-action").textContent).toBe("Reload");
    });
});
