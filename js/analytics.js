// Loads only after consent and only on production; events carry controlled values only (ANALYTICS.md), never names.
// A failure here never reaches the generator.
const MEASUREMENT_ID = "G-8T9GFW6PVK";
const CONSENT_KEY = "analytics_consent";
// how long the privacy dialog stays open after an answer, so the filled button is seen
const DIALOG_CLOSE_DELAY_MS = 600;
const PRODUCTION_HOSTS = ["espruar.com", "www.espruar.com"];
// ?analytics_debug: on production, marks events for GA4 DebugView; elsewhere, logs them to the console instead
const isDebug = () => new URLSearchParams(location.search).has("analytics_debug");
const isProduction = () => PRODUCTION_HOSTS.includes(location.hostname);

function loadAnalytics() {
    if (window.gtag || !isProduction()) return;
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.append(script);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
        window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, isDebug() ? { debug_mode: true } : {});
}

/** Sends a usage event if the visitor accepted analytics on the production site; otherwise does nothing. */
export function track(event, params = {}) {
    try {
        if (window.gtag) window.gtag("event", event, params);
        else if (!isProduction() && isDebug()) console.debug("analytics", event, params);
    } catch {
        /* analytics must never interrupt the page */
    }
}

/**
 * Logs an error; with consent, also sends its area and type ("generator_typeerror"), never its message, which may
 * hold page content.
 * @param {string} where - a fixed area: "generator", "data_load", "click", "page" or "promise"
 */
export function reportError(error, where = "page") {
    console.error(error);
    const type = error instanceof Error && /^\w+$/.test(error.name) ? error.name : "other";
    track("exception", { description: `${where}_${type}`.toLowerCase(), fatal: false });
}

/**
 * The cookie banner and privacy links. Analytics loads only once the visitor accepts (now or on an earlier visit).
 * The privacy dialog repeats the choice (`.privacy-dialog-choice`), always, so a visitor can see what they chose and
 * switch: the chosen button is marked `aria-pressed`, and the dialog closes a moment after an answer. Declining after
 * accepting stops sending at once (Google's `ga-disable` switch); the script stays loaded until the page is left.
 * @param {{ banner: Element, accept: NodeList, decline: NodeList, dialog: HTMLDialogElement, links: NodeList }} page
 */
export function setUpConsent({ banner, accept, decline, dialog, links }) {
    // the privacy explanation is always available, whatever happens to consent below
    links.forEach((link) => link.addEventListener("click", () => dialog.showModal()));
    let consent;
    try {
        consent = localStorage.getItem(CONSENT_KEY);
    } catch {
        // storage is blocked: no choice could be kept, so the banner and the dialog's buttons stay hidden
        return;
    }
    const inDialog = (buttons) => [...buttons].filter((button) => dialog.contains(button));
    // `answer` is the stored value: "true", "false", or null before the visitor has answered
    const showChoice = (answer) => {
        inDialog(accept).forEach((button) => button.setAttribute("aria-pressed", String(answer === "true")));
        inDialog(decline).forEach((button) => button.setAttribute("aria-pressed", String(answer === "false")));
    };
    if (consent === "true") loadAnalytics();
    banner.hidden = consent !== null;
    dialog.querySelectorAll(".privacy-dialog-choice").forEach((choice) => (choice.hidden = false));
    showChoice(consent);
    let closing;
    const choose = (accepted) => {
        try {
            localStorage.setItem(CONSENT_KEY, String(accepted));
        } catch {
            /* the choice still applies to this visit */
        }
        banner.hidden = true;
        showChoice(String(accepted));
        window[`ga-disable-${MEASUREMENT_ID}`] = !accepted;
        if (accepted) loadAnalytics();
        clearTimeout(closing);
        closing = setTimeout(() => dialog.open && dialog.close(), DIALOG_CLOSE_DELAY_MS);
    };
    accept.forEach((button) => button.addEventListener("click", () => choose(true)));
    decline.forEach((button) => button.addEventListener("click", () => choose(false)));
}
