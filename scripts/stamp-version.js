// Puts ?v=<version> on every local script, stylesheet and data reference in the site's source files. The site is served
// straight from these files, so a browser holding an older cached copy of one file can never be paired with newer ones:
// each release asks for new URLs. Run by scripts/version.js on every bump; scripts/release-site.js refuses a release
// whose stamps are missing or disagree.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const OPTIONAL_STAMP = "(?:\\?v=[\\w.-]+)?";
const HTML_REFERENCE = new RegExp(
    `(\\b(?:href|src)\\s*=\\s*["'])((?:[\\w-]+\\/)*[\\w-]+\\.(?:js|css|json))${OPTIONAL_STAMP}(?=["'])`,
    "gi"
);
const SCRIPT_IMPORT = new RegExp(`(\\bfrom\\s*["'])(\\.{1,2}\\/[\\w./-]+\\.js)${OPTIONAL_STAMP}(?=["'])`, "g");
const DATA_PATH = new RegExp(`(["'])(data\\/[\\w-]+\\.json)${OPTIONAL_STAMP}(?=["'])`, "g");

/** The text with every local reference stamped with `version` (already-stamped references are restamped). */
export function stampText(file, text, version) {
    const stamp = (source, pattern) => source.replace(pattern, `$1$2?v=${version}`);
    if (file.endsWith(".html")) return stamp(text, HTML_REFERENCE);
    if (file.endsWith(".js")) return stamp(stamp(text, SCRIPT_IMPORT), DATA_PATH);
    return text;
}

/** The site's own files that can reference others: the page and every script. */
export function stampedFiles(root) {
    const scripts = (dir) =>
        readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) =>
            entry.isDirectory()
                ? scripts(`${dir}/${entry.name}`)
                : /\.js$/.test(entry.name)
                  ? [`${dir}/${entry.name}`]
                  : []
        );
    return ["index.html", ...scripts("js")];
}

/** Stamps the page and scripts under `root`; returns the files that changed. */
export function stampSources(root, version) {
    const changed = [];
    for (const file of stampedFiles(root)) {
        const text = readFileSync(path.join(root, file), "utf8");
        const stamped = stampText(file, text, version);
        if (stamped !== text) {
            writeFileSync(path.join(root, file), stamped);
            changed.push(file);
        }
    }
    return changed;
}

/** The version the page stamps its stylesheet with, or null when it has none. */
export function stampedVersion(root) {
    return readFileSync(path.join(root, "index.html"), "utf8").match(/href="style\.css\?v=([\w.-]+)"/)?.[1] ?? null;
}

// node scripts/stamp-version.js: stamps the source files with the version in package.json
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).version;
    const changed = stampSources(root, version);
    console.log(`Stamped v${version}: ${changed.length ? changed.join(", ") : "nothing to change"}`);
}
