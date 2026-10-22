import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

function readManifest(root) {
    const files = JSON.parse(readFileSync(path.join(root, "release-files.json"), "utf8"));
    if (!Array.isArray(files) || files.length === 0 || new Set(files).size !== files.length) {
        throw new Error("Release list must contain unique file paths.");
    }
    for (const file of files) {
        // Only website assets can be approved; directory globs and private/tooling paths are forbidden.
        if (
            typeof file !== "string" ||
            // fonts/: self-hosted OFL fonts plus their license, which the OFL requires to ship with them; the share and
            // touch images, robots.txt and sitemap.xml are named exactly
            !/^(?:index\.html|style\.css|favicon\.(?:ico|png)|apple-touch-icon\.png|share-card\.png|robots\.txt|sitemap\.xml|CNAME|LICENSE|js\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.js|data\/[A-Za-z0-9_-]+\.json|fonts\/[a-z0-9-]+\.(?:otf|woff2)|fonts\/OFL\.txt)$/.test(
                file
            )
        ) {
            throw new Error(`Unsafe release path: ${file}`);
        }
    }
    for (const required of ["index.html", "style.css", "js/app.js", "CNAME", "LICENSE"]) {
        if (!files.includes(required)) throw new Error(`Required release asset is not approved: ${required}`);
    }
    return files;
}

function assertRegularPath(root, file) {
    let current = root;
    if (!lstatSync(root).isDirectory() || lstatSync(root).isSymbolicLink()) {
        throw new Error(`Release root must be a real directory: ${root}`);
    }
    const parts = file.split("/");
    for (let index = 0; index < parts.length; index++) {
        current = path.join(current, parts[index]);
        const stat = lstatSync(current);
        if (stat.isSymbolicLink() || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())) {
            throw new Error(`Release asset must be a regular file without links: ${file}`);
        }
    }
}

function listFiles(root, relative = "") {
    const files = [];
    for (const entry of readdirSync(path.join(root, relative), { withFileTypes: true })) {
        const file = relative ? `${relative}/${entry.name}` : entry.name;
        if (entry.isSymbolicLink()) throw new Error(`Links are forbidden in the release folder: ${file}`);
        if (entry.isDirectory()) files.push(...listFiles(root, file));
        else if (entry.isFile()) files.push(file);
        else throw new Error(`Unsupported release entry: ${file}`);
    }
    return files.sort();
}

function checkReferences(root, files) {
    const approved = new Set(files);
    function checkReference(from, reference, documentRelative = false) {
        // decoded first: inside an inline SVG data URI a fragment reference is written %23id
        if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(decodeURIComponent(reference))) return;
        const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
        const target = path.posix.normalize(
            clean.startsWith("/")
                ? clean.slice(1)
                : path.posix.join(documentRelative ? "" : path.posix.dirname(from), clean)
        );
        if (!approved.has(target)) throw new Error(`Unapproved or missing dependency in ${from}: ${reference}`);
    }
    for (const file of files) {
        if (!/\.(?:html|css|js)$/.test(file)) continue;
        const text = readFileSync(path.join(root, file), "utf8");
        if (file.endsWith(".html")) {
            for (const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))
                checkReference(file, match[1]);
        } else if (file.endsWith(".css")) {
            for (const match of text.matchAll(/url\(\s*["']?([^\s"')]+)["']?\s*\)/gi)) checkReference(file, match[1]);
        } else {
            for (const match of text.matchAll(
                /(?:^\s*import\s+(?:[^;]*?\bfrom\s*)?|^\s*export\s+[^;]*?\bfrom\s*|\bimport\s*\(\s*)["']([^"'\r\n]+)["']/gm
            )) {
                checkReference(file, match[1]);
            }
            // The current loader resolves literal data paths relative to index.html.
            for (const match of text.matchAll(/["'](data\/[^"']+\.json)["']/g)) checkReference(file, match[1], true);
        }
    }
}

export function buildSite(root = repositoryRoot) {
    const files = readManifest(root);
    for (const file of files) assertRegularPath(root, file);
    checkReferences(root, files);
    const output = path.join(root, "dist");
    if (existsSync(output)) {
        if (lstatSync(output).isSymbolicLink() || !lstatSync(output).isDirectory()) {
            throw new Error("dist must be a real directory.");
        }
        const expected = new Set([...files, ".nojekyll"]);
        const extra = listFiles(output).filter((file) => !expected.has(file));
        if (extra.length)
            throw new Error(`Unexpected release files; inspect them before rebuilding: ${extra.join(", ")}`);
    } else mkdirSync(output);
    for (const file of files) {
        mkdirSync(path.dirname(path.join(output, file)), { recursive: true });
        copyFileSync(path.join(root, file), path.join(output, file));
    }
    writeFileSync(path.join(output, ".nojekyll"), "");
    verifySite(root);
    return files.length + 1;
}

export function verifySite(root = repositoryRoot) {
    const files = readManifest(root);
    const output = path.join(root, "dist");
    if (lstatSync(output).isSymbolicLink() || !lstatSync(output).isDirectory()) {
        throw new Error("dist must be a real directory.");
    }
    const expected = [...files, ".nojekyll"].sort();
    if (JSON.stringify(listFiles(output)) !== JSON.stringify(expected)) {
        throw new Error("Release folder contains missing or unapproved files.");
    }
    for (const file of files) {
        assertRegularPath(root, file);
        assertRegularPath(output, file);
        if (!readFileSync(path.join(root, file)).equals(readFileSync(path.join(output, file)))) {
            throw new Error(`Release copy differs from source: ${file}`);
        }
        if (file.endsWith(".json")) JSON.parse(readFileSync(path.join(output, file), "utf8"));
    }
    if (readFileSync(path.join(output, ".nojekyll")).length !== 0) throw new Error(".nojekyll must be empty.");
    if (readFileSync(path.join(output, "CNAME"), "utf8").trim() !== "espruar.com") {
        throw new Error("Unexpected production domain.");
    }
    checkReferences(output, files);
    return expected.length;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const mode = process.argv[2];
        if (mode !== "build" && mode !== "check") throw new Error("Usage: node scripts/release-site.js build|check");
        const count = mode === "build" ? buildSite() : verifySite();
        console.log(`Release ${mode} passed: ${count} approved files in dist/.`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}
