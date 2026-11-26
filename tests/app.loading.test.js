import { beforeEach, describe, expect, it, vi } from "vitest";
import { readJson, readPage } from "./helpers/files.js";

// Loading the name lists when the first copy cannot be used, as with a stale cached file or no connection.
const page = readPage();
const $ = (id) => document.getElementById(id);
const served = (path) => ({ ok: true, json: async () => fromDisk(path) });
const unavailable = { ok: false, status: 503 };
// the waits between tries, in milliseconds, before the card gives up
const RETRY_WAITS = [2000, 5000, 10000, 30000];
const SWITCHED_OFF = ["generateButton", "saveButton", "copyButton", "listButton"];
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
    beforeEach(() => {
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

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
        expect($("cardMessage").textContent).toBe("");
    });

    it("retries once, bypassing the cache, when the first copy loads but is in an older schema", async () => {
        const caches = [];
        await startPage(async (path, { cache }) => {
            caches.push(cache);
            if (cache === "default") return { ok: true, json: async () => ({ ...fromDisk(path), schema: 4 }) };
            return { ok: true, json: async () => fromDisk(path) };
        });
        await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
        expect(caches).toContain("reload");
        expect($("cardMessage").textContent).toBe("");
    });

    it("tells the person to refresh, after the retries, when every copy is in an older schema", async () => {
        vi.useFakeTimers();
        await startPage(async (path) => ({ ok: true, json: async () => ({ ...fromDisk(path), schema: 4 }) }));
        await vi.advanceTimersByTimeAsync(RETRY_WAITS.reduce((a, b) => a + b));
        expect($("nameLoading").textContent).toContain("Ctrl+F5");
    });

    it("still makes names, and says so, when the browser blocks storage", async () => {
        const blocked = () => {
            throw new DOMException("blocked", "SecurityError");
        };
        // clear is called by the shared test setup, which is not what is being blocked here
        vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked, clear: () => {} });
        await startPage(async (path) => ({ ok: true, json: async () => fromDisk(path) }));
        await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
        for (const id of ["favoritesStorage", "historyStorage"]) {
            expect($(id).querySelector(".message-box").classList).toContain("is-warning");
            expect($(id).textContent).toContain("blocking site storage");
        }
    });

    it("stays quiet about storage when the browser allows it", async () => {
        await startPage(async (path) => ({ ok: true, json: async () => fromDisk(path) }));
        await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
        expect($("favoritesStorage").textContent).toBe("");
        expect($("historyStorage").textContent).toBe("");
    });
});

describe("when the name lists don't load", () => {
    let isOnline;
    const tries = [];
    const fetchFile = async (path, { cache }) => {
        if (cache === "default") tries.push(path);
        return isOnline ? served(path) : unavailable;
    };
    const step = () => $("nameLoading").dataset.step;

    beforeEach(async () => {
        vi.unstubAllGlobals();
        vi.useFakeTimers();
        isOnline = false;
        tries.length = 0;
        await startPage(fetchFile);
        await vi.advanceTimersByTimeAsync(0);
    });

    it("says it is loading, with the loader, and switches off the buttons until a name can be shown", async () => {
        vi.useRealTimers();
        await startPage(() => new Promise(() => {}));
        expect($("nameLoading").hidden).toBe(false);
        expect(step()).toBe("loading");
        expect($("nameLoading").textContent).toMatch(/Loading the name lists/);
        for (const id of SWITCHED_OFF) expect($(id).getAttribute("aria-disabled")).toBe("true");
    });

    it("says once that it is retrying, retries after 2, 5, 10 and 30 seconds, and shows a name when one works", async () => {
        expect(step()).toBe("retrying");
        expect($("nameLoading").textContent).toMatch(/didn't load\. Retrying/);
        for (const id of SWITCHED_OFF) expect($(id).getAttribute("aria-disabled")).toBe("true");
        expect($("announcer").textContent).toMatch(/didn't load/);
        const firstTries = tries.length;
        await vi.advanceTimersByTimeAsync(RETRY_WAITS[0] - 1);
        expect(tries.length).toBe(firstTries);
        await vi.advanceTimersByTimeAsync(1);
        expect(tries.length).toBe(firstTries * 2);
        await vi.advanceTimersByTimeAsync(RETRY_WAITS[1]);
        expect(tries.length).toBe(firstTries * 3);
        expect(step()).toBe("retrying");
        isOnline = true;
        await vi.advanceTimersByTimeAsync(RETRY_WAITS[2]);
        expect($("nameText").textContent).not.toBe("");
        expect($("nameLoading").hidden).toBe(true);
        for (const id of SWITCHED_OFF) expect($(id).hasAttribute("aria-disabled")).toBe(false);
    });

    it("tries again at once when the connection comes back", async () => {
        isOnline = true;
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(0);
        expect($("nameText").textContent).not.toBe("");
    });

    it("gives up after the last retry, and explains the fix with a Reload button", async () => {
        const total = RETRY_WAITS.reduce((a, b) => a + b);
        await vi.advanceTimersByTimeAsync(total - 1);
        expect(step()).toBe("retrying");
        await vi.advanceTimersByTimeAsync(1);
        expect(step()).toBe("failed");
        expect($("nameLoading").textContent).toMatch(/still won't load/);
        expect($("nameLoading").textContent).toContain("Ctrl+F5");
        expect($("nameLoading").querySelector("button").textContent).toBe("Reload");
        expect($("announcer").textContent).toMatch(/still won't load/);
        expect($("announcer").textContent).not.toContain("..");
        const triesWhenGivenUp = tries.length;
        await vi.advanceTimersByTimeAsync(60000);
        expect(tries.length).toBe(triesWhenGivenUp);
    });

    it("explains, without failing, when a switched-off button or an earlier name is pressed", async () => {
        $("pickerLineage").value = "drow";
        $("pickerLineage").dispatchEvent(new Event("change"));
        expect($("cardMessage").textContent).toBe("");
        $("generateButton").click();
        expect($("cardMessage").querySelector(".message-box").classList).toContain("is-warning");
        expect($("cardMessage").textContent).toContain("Cannot complete that action");
        $("cardMessage").replaceChildren();
        for (const id of ["saveButton", "copyButton"]) {
            $(id).click();
            expect($("cardMessage").textContent).toContain("Cannot complete that action");
        }
        $("listButton").click();
        expect($("nameListMessage").textContent).toContain("Cannot complete that action");
        document.body.dispatchEvent(new KeyboardEvent("keydown", { code: "Space", bubbles: true }));
        expect($("nameText").textContent).toBe("");
        isOnline = true;
        window.dispatchEvent(new Event("online"));
        await vi.advanceTimersByTimeAsync(0);
        expect($("cardMessage").textContent).toBe("");
    });

    it("says to refresh once the card has given up, instead of to wait", async () => {
        await vi.advanceTimersByTimeAsync(RETRY_WAITS.reduce((a, b) => a + b));
        expect(step()).toBe("failed");
        for (const id of ["generateButton", "saveButton", "copyButton"]) {
            $("cardMessage").replaceChildren();
            $(id).click();
            expect($("cardMessage").textContent).toContain("Cannot complete that action");
            expect($("cardMessage").textContent).toContain("Lists failed to load; please refresh to try again.");
            expect($("cardMessage").textContent).not.toContain("wait");
        }
        $("listButton").click();
        expect($("nameListMessage").textContent).toContain("Lists failed to load; please refresh to try again.");
    });

    it("lists saved names and history while it waits, and explains when one is clicked", async () => {
        const result = {
            name: "Ilsevel",
            sex: "neutral",
            subrace: "moon-elf",
            parts: [{ key: "t0", role: "prefix", text: "ilsevel", meaning: "Gift", section: "given", kind: "prefix" }]
        };
        localStorage.setItem("faerunNameFavorites", JSON.stringify([{ name: "Ilsevel", savedAt: 1, result }]));
        localStorage.setItem("faerunNameHistory", JSON.stringify([result]));
        await startPage(fetchFile);
        await vi.advanceTimersByTimeAsync(0);
        expect(document.querySelectorAll("#favoritesList li")).toHaveLength(1);
        document.querySelector("#historyList .name-list-name").click();
        expect($("cardMessage").textContent).toContain("Cannot complete that action");
        expect($("nameText").textContent).toBe("");
    });
});

describe("when the page script never starts", () => {
    // the inline guard in index.html, which has to work with no module code
    const guard = /<script id="pageGuard">([\s\S]*?)<\/script>/.exec(page)?.[1] ?? "";
    const STALL_WAIT = 10000;
    const step = () => $("nameLoading").dataset.step;

    beforeEach(() => {
        vi.unstubAllGlobals();
        vi.useFakeTimers();
        // a reload gives a fresh document; here the marker from an earlier start would stay on the <html> element
        delete document.documentElement.dataset.started;
        document.documentElement.innerHTML = page;
        new Function(guard)();
    });

    it("keeps saying it is loading until the wait is over", async () => {
        await vi.advanceTimersByTimeAsync(STALL_WAIT - 1);
        expect(step()).toBe("loading");
    });

    it("then says the page did not load, with Reload and the cache advice, announced once", async () => {
        await vi.advanceTimersByTimeAsync(STALL_WAIT);
        expect(step()).toBe("stalled");
        expect($("nameLoading").hidden).toBe(false);
        expect($("nameLoadingTitle").textContent).toBe("The page didn't load.");
        expect($("nameLoading").textContent).toContain("Ctrl+F5");
        expect($("nameLoading").querySelector("button").textContent).toBe("Reload");
        expect($("announcer").textContent).toMatch(/page didn't load/);
        await vi.advanceTimersByTimeAsync(60000);
        expect($("announcer").querySelectorAll("p")).toHaveLength(1);
    });

    it("never shows once app.js has started, even while the name lists are still being retried", async () => {
        vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
        vi.doMock("../js/analytics.js", () => ({ track: () => {}, reportError: () => {}, setUpConsent: () => {} }));
        Element.prototype.scrollIntoView ??= () => {};
        vi.resetModules();
        await import("../js/app.js");
        await vi.advanceTimersByTimeAsync(STALL_WAIT * 3);
        expect(step()).toBe("retrying");
        expect($("nameLoadingTitle").textContent).not.toMatch(/page didn't load/);
    });
});
