import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reportError, setUpConsent, track } from "../js/analytics.js";

// Analytics loads only with consent and only on the production site, and a failure in it never reaches the page.
const page = () => {
    document.body.innerHTML = `<div id="banner"><button class="accept"></button><button class="decline"></button></div>
        <dialog id="dialog"><div class="privacy-dialog-choice" hidden><button class="accept"></button><button class="decline"></button></div></dialog>
        <button type="button" class="privacy-link"></button>`;
    const $ = (id) => document.getElementById(id);
    return {
        banner: $("banner"),
        accept: document.querySelectorAll(".accept"),
        decline: document.querySelectorAll(".decline"),
        dialog: $("dialog"),
        links: document.querySelectorAll(".privacy-link")
    };
};
const gtagScript = () => document.head.querySelector('script[src*="googletagmanager"]');

beforeEach(() => {
    delete window.gtag;
    delete window["ga-disable-G-8T9GFW6PVK"];
    document.head.innerHTML = "";
});
afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

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
        controls.accept[0].click();
        expect(gtagScript()).toBeNull();
        expect(window.gtag).toBeUndefined();
        expect(controls.banner.hidden).toBe(true);
    });

    it("loads analytics on the production site only after the visitor accepts", () => {
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        const controls = page();
        setUpConsent(controls);
        expect(gtagScript()).toBeNull();
        controls.accept[0].click();
        expect(gtagScript().src).toMatch(/G-8T9GFW6PVK/);
        expect(typeof window.gtag).toBe("function");
    });

    it("does not load analytics when the visitor declines", () => {
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        const controls = page();
        setUpConsent(controls);
        controls.decline[0].click();
        expect(gtagScript()).toBeNull();
        expect(localStorage.getItem("analytics_consent")).toBe("false");
    });

    it("answers from the privacy dialog too, and the dialog then shows the choice, filled, before it closes", () => {
        vi.useFakeTimers();
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        const controls = page();
        const [bannerOk, dialogOk] = controls.accept;
        const [, dialogNo] = controls.decline;
        setUpConsent(controls);
        expect([dialogNo, dialogOk].map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "false"]);
        expect(bannerOk.hasAttribute("aria-pressed")).toBe(false);
        controls.dialog.open = true;
        controls.dialog.close = vi.fn();
        dialogOk.click();
        expect(controls.dialog.close).not.toHaveBeenCalled();
        expect(controls.banner.hidden).toBe(true);
        vi.advanceTimersByTime(599);
        expect(controls.dialog.close).not.toHaveBeenCalled();
        expect([dialogNo, dialogOk].map((button) => button.getAttribute("aria-pressed"))).toEqual(["false", "true"]);
        expect(localStorage.getItem("analytics_consent")).toBe("true");
        expect(gtagScript()).not.toBeNull();
        vi.advanceTimersByTime(1);
        expect(controls.dialog.close).toHaveBeenCalledTimes(1);
    });

    it("does not touch the dialog when the answer comes from the banner", () => {
        vi.useFakeTimers();
        const controls = page();
        controls.dialog.close = vi.fn();
        setUpConsent(controls);
        controls.accept[0].click();
        vi.advanceTimersByTime(1000);
        expect(controls.dialog.close).not.toHaveBeenCalled();
    });

    it("shows an earlier answer in the dialog on a later visit, with no banner", () => {
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        localStorage.setItem("analytics_consent", "false");
        const controls = page();
        setUpConsent(controls);
        expect(controls.banner.hidden).toBe(true);
        expect(controls.dialog.querySelector(".privacy-dialog-choice").hidden).toBe(false);
        expect(controls.decline[1].getAttribute("aria-pressed")).toBe("true");
        expect(controls.accept[1].getAttribute("aria-pressed")).toBe("false");
        expect(gtagScript()).toBeNull();
    });

    it("lets a visitor switch from the dialog: No stops sending at once, and OK starts again", () => {
        vi.stubGlobal("location", { hostname: "espruar.com", search: "" });
        localStorage.setItem("analytics_consent", "true");
        const controls = page();
        setUpConsent(controls);
        expect(gtagScript()).not.toBeNull();
        controls.decline[1].click();
        expect(window["ga-disable-G-8T9GFW6PVK"]).toBe(true);
        expect(localStorage.getItem("analytics_consent")).toBe("false");
        expect(controls.decline[1].getAttribute("aria-pressed")).toBe("true");
        expect(controls.accept[1].getAttribute("aria-pressed")).toBe("false");
        controls.accept[1].click();
        expect(window["ga-disable-G-8T9GFW6PVK"]).toBe(false);
        expect(localStorage.getItem("analytics_consent")).toBe("true");
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
        expect(controls.dialog.querySelector(".privacy-dialog-choice").hidden).toBe(true);
        expect(gtagScript()).toBeNull();
    });
});
