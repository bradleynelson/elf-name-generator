import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportError, setUpConsent, track } from "../js/analytics.js";

// Analytics loads only with consent and only on the production site, and a failure in it never reaches the page.
const page = () => {
    document.body.innerHTML = `<div id="banner"></div><button id="accept"></button><button id="decline"></button>
        <dialog id="dialog"></dialog><a class="privacy-link" href="#"></a>`;
    const $ = (id) => document.getElementById(id);
    return {
        banner: $("banner"),
        accept: $("accept"),
        decline: $("decline"),
        dialog: $("dialog"),
        links: document.querySelectorAll(".privacy-link")
    };
};
const gtagScript = () => document.head.querySelector('script[src*="googletagmanager"]');

beforeEach(() => {
    delete window.gtag;
    document.head.innerHTML = "";
});
afterEach(() => vi.unstubAllGlobals());

describe("track", () => {
    it("does nothing, and never throws, when analytics is not loaded or fails", () => {
        expect(() => track("name_generated", {})).not.toThrow();
        window.gtag = () => {
            throw new Error("blocked");
        };
        expect(() => track("name_generated", {})).not.toThrow();
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(() => reportError(new Error("boom"))).not.toThrow();
    });

    it("reports an error by area and type only, never its message", () => {
        window.gtag = vi.fn();
        vi.spyOn(console, "error").mockImplementation(() => {});
        reportError(new TypeError("Cannot read Aelrindel at https://example.com/?q=x"), "generator");
        reportError("a string thrown by some script", "page");
        expect(window.gtag.mock.calls.map(([, , params]) => params)).toEqual([
            { description: "generator_typeerror", fatal: false },
            { description: "page_other", fatal: false }
        ]);
    });

    it("sends the event and its parameters once analytics is loaded", () => {
        window.gtag = vi.fn();
        track("name_copied", { copy_source: "current" });
        expect(window.gtag).toHaveBeenCalledWith("event", "name_copied", { copy_source: "current" });
    });
});

describe("setUpConsent", () => {
    it("never loads analytics off the production site, even after the visitor accepts", () => {
        const controls = page();
        setUpConsent(controls);
        controls.accept.click();
        expect(gtagScript()).toBeNull();
        expect(window.gtag).toBeUndefined();
        expect(controls.banner.hidden).toBe(true);
    });

    it("loads analytics on the production site only after the visitor accepts", () => {
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        const controls = page();
        setUpConsent(controls);
        expect(gtagScript()).toBeNull();
        controls.accept.click();
        expect(gtagScript().src).toMatch(/G-8T9GFW6PVK/);
        expect(typeof window.gtag).toBe("function");
    });

    it("does not load analytics when the visitor declines", () => {
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        const controls = page();
        setUpConsent(controls);
        controls.decline.click();
        expect(gtagScript()).toBeNull();
        expect(localStorage.getItem("analytics_consent")).toBe("false");
    });

    it("still opens the privacy explanation when the browser blocks storage, and loads no analytics", () => {
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        const blocked = () => {
            throw new DOMException("blocked", "SecurityError");
        };
        vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked, clear: () => {} });
        const controls = page();
        controls.banner.hidden = true;
        controls.dialog.showModal = vi.fn();
        setUpConsent(controls);
        controls.links[0].click();
        expect(controls.dialog.showModal).toHaveBeenCalled();
        expect(controls.banner.hidden).toBe(true);
        expect(gtagScript()).toBeNull();
    });
});
