// Google Analytics 4 (gtag.js): consent, loading, usage events and error reports, in one place. It loads only after
// the visitor accepts, and only on the production site, so development and test traffic never reaches the property.
// Events carry controlled values only (see ANALYTICS.md), never generated names or their components. A failure here
// never reaches the generator.
const MEASUREMENT_ID = "G-8T9GFW6PVK";
const CONSENT_KEY = "analytics_consent";
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
 * Errors go to the console in full. Google Analytics (only with consent) gets where it happened and the error's type,
 * such as "generator_typeerror", never its message, which could contain a name, a URL or other page content.
 * @param {string} where - a fixed area: "generator", "data_load", "page" or "promise"
 */
export function reportError(error, where = "page") {
    console.error(error);
    const type = error instanceof Error && /^\w+$/.test(error.name) ? error.name : "other";
    track("exception", { description: `${where}_${type}`.toLowerCase(), fatal: false });
}

/**
 * The cookie banner and privacy links. Analytics loads only once the visitor accepts (now or on an earlier visit).
 * @param {{ banner: Element, accept: Element, decline: Element, dialog: HTMLDialogElement, links: NodeList }} page
 */
export function setUpConsent({ banner, accept, decline, dialog, links }) {
    // the privacy explanation is always available, whatever happens to consent below
    links.forEach((link) => link.addEventListener("click", () => dialog.showModal()));
    let consent;
    try {
        consent = localStorage.getItem(CONSENT_KEY);
    } catch {
        // storage is blocked: no choice could be kept, so the banner stays hidden and analytics stays off
        return;
    }
    if (consent === "true") loadAnalytics();
    banner.hidden = consent !== null;
    const choose = (accepted) => {
        try {
            localStorage.setItem(CONSENT_KEY, String(accepted));
        } catch {
            /* the choice still applies to this visit */
        }
        banner.hidden = true;
        if (accepted) loadAnalytics();
    };
    accept.addEventListener("click", () => choose(true));
    decline.addEventListener("click", () => choose(false));
}
