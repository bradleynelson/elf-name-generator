import { expect, vi } from "vitest";
import { seededRandom } from "./random.js";
import { readJson, readPage } from "./files.js";

// Page flows with the real page, the real app script and the real name data: what a person does with the controls,
// checked by what they would see. The data files are served from disk in place of the network.
export const page = readPage();
export const $ = (id) => document.getElementById(id);
export const textOf = (key) => document.querySelector(`[data-key="${key}"] .name-part-text`)?.textContent;
export const textButton = (key) => document.querySelector(`[data-key="${key}"] .name-part-text`);
export const roll = () => $("generateButton").click();
// usage events are recorded here instead of being sent
export const events = [];
// errors reported to analytics are recorded here too, as [error, area]
export const reported = [];
export const sent = (name) => events.filter(([event]) => event === name).map(([, params]) => params);

// A page is started again for each test, but its window listeners would outlive it and redraw the next page's lists:
// the storage listeners of the page left behind are removed.
const storageListeners = [];
const addEventListener = window.addEventListener.bind(window);
window.addEventListener = (type, listener, options) => {
    if (type === "storage") storageListeners.push(listener);
    addEventListener(type, listener, options);
};

export async function startPage() {
    storageListeners.splice(0).forEach((listener) => window.removeEventListener("storage", listener));
    document.documentElement.innerHTML = page;
    vi.resetModules();
    await import("../../js/app.js");
    await vi.waitFor(() => expect($("nameText").textContent).not.toBe(""));
}

// Calls that throw on demand (generator methods, and "renderResult" for drawing the card): key -> how many of the next
// calls fail. Real data rarely fails them, so the real generator and renderer are wrapped.
const failing = new Map();
export const stopFailing = () => failing.clear();
export const failNext = (key, times = Infinity) => failing.set(key, times);
const failsNow = (key) => {
    const left = failing.get(key) ?? 0;
    if (left > 0) failing.set(key, left - 1);
    return left > 0;
};

export async function startPageWithFailures() {
    failing.clear();
    vi.doMock("../../js/core/generators.js", async (importOriginal) => {
        const actual = await importOriginal();
        const failOnDemand = (generator) =>
            new Proxy(generator, {
                get(target, key) {
                    if (failsNow(key)) {
                        return () => {
                            throw new Error("Could not make an elf name with these choices. Try unlocking a part.");
                        };
                    }
                    const value = Reflect.get(target, key);
                    return typeof value === "function" ? value.bind(target) : value;
                }
            });
        return {
            ...actual,
            createGeneratorFor: (data) => {
                const generatorFor = actual.createGeneratorFor(data);
                return (subrace) => failOnDemand(generatorFor(subrace));
            }
        };
    });
    vi.doMock("../../js/ui.js", async (importOriginal) => {
        const actual = await importOriginal();
        const failOnDemand =
            (name) =>
            (...args) => {
                if (failsNow(name)) throw new Error(`${name} could not run.`);
                return actual[name](...args);
            };
        return {
            ...actual,
            renderResult: failOnDemand("renderResult"),
            renderGlint: failOnDemand("renderGlint")
        };
    });
    vi.doMock("../../js/messages.js", async (importOriginal) => {
        const actual = await importOriginal();
        return {
            ...actual,
            announce: (...args) => {
                if (failsNow("announce")) throw new Error("announce could not run.");
                return actual.announce(...args);
            }
        };
    });
    vi.doMock("../../js/core/species.js", async (importOriginal) => {
        const actual = await importOriginal();
        return {
            ...actual,
            formatNameWithKind: (...args) => {
                if (failsNow("formatNameWithKind")) throw new Error("The name could not be described.");
                return actual.formatNameWithKind(...args);
            }
        };
    });
    await startPage();
}

/** Each page-flow test file's beforeEach: fresh mocks, seeded randomness, the data from disk, and the page started. */
export async function setUpPage() {
    vi.restoreAllMocks();
    vi.useRealTimers();
    vi.doUnmock("../../js/core/generators.js");
    vi.doUnmock("../../js/ui.js");
    vi.doUnmock("../../js/messages.js");
    vi.doUnmock("../../js/core/species.js");
    vi.spyOn(Math, "random").mockImplementation(seededRandom(20261023));
    events.length = 0;
    reported.length = 0;
    vi.doMock("../../js/analytics.js", () => ({
        track: (event, params) => events.push([event, params]),
        reportError: (error, where) => reported.push([error, where]),
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
    await startPage();
}
