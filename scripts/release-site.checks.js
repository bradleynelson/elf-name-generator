// Run separately with Node's test runner; these filesystem checks do not use Vitest/jsdom.
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import test from "node:test";
import { parse } from "yaml";
import { buildSite, verifySite } from "./release-site.js";
import { getLiveExpectations } from "./check-live-site.js";
import { stampedVersion } from "./stamp-version.js";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const approvedFiles = JSON.parse(readFileSync(path.join(repositoryRoot, "release-files.json"), "utf8"));

function fixture(t) {
    const root = mkdtempSync(path.join(os.tmpdir(), "espruar-release-test-"));
    t.after(() => {
        if (path.dirname(root) !== os.tmpdir() || !path.basename(root).startsWith("espruar-release-test-")) {
            throw new Error("Refusing to remove a fixture outside the test directory.");
        }
        rmSync(root, { recursive: true, force: true });
    });
    copyFileSync(path.join(repositoryRoot, "release-files.json"), path.join(root, "release-files.json"));
    for (const file of approvedFiles) {
        mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
        copyFileSync(path.join(repositoryRoot, file), path.join(root, file));
    }
    return root;
}

test("packages the real site and leaves private notes and tooling out", (t) => {
    const root = fixture(t);
    writeFileSync(path.join(root, "AGENTS.md"), "private instructions");
    writeFileSync(path.join(root, "private-research.pdf"), "private research");
    mkdirSync(path.join(root, "js", "notes"));
    writeFileSync(path.join(root, "js", "notes", "private.js"), "private notes in an asset directory");
    assert.equal(buildSite(root), approvedFiles.length + 1);
    assert.equal(verifySite(root), approvedFiles.length + 1);
    assert.throws(() => readFileSync(path.join(root, "dist", "AGENTS.md")), /ENOENT/);
    assert.throws(() => readFileSync(path.join(root, "dist", "private-research.pdf")), /ENOENT/);
    assert.throws(() => readFileSync(path.join(root, "dist", "js", "notes", "private.js")), /ENOENT/);
    assert.equal(buildSite(root), approvedFiles.length + 1);
});

test("the source files carry one version on every local script, stylesheet and data reference", () => {
    const version = JSON.parse(readFileSync(path.join(repositoryRoot, "package.json"), "utf8")).version;
    const read = (file) => readFileSync(path.join(repositoryRoot, file), "utf8");
    assert.equal(stampedVersion(repositoryRoot), version, "the page is stamped with the package version");
    assert.match(read("index.html"), new RegExp(`src="js/app\\.js\\?v=${version}"`));
    assert.match(read("index.html"), new RegExp(`href="data/elfNames\\.json\\?v=${version}"`));
    assert.match(read("index.html"), /href="favicon\.ico"/, "files that never change are not stamped");
    assert.match(read("js/app.js"), new RegExp(`from "\\./core/ElfNameGenerator\\.js\\?v=${version}"`));
    assert.match(read("js/app.js"), new RegExp(`"data/drowNames\\.json\\?v=${version}"`));
    assert.match(read("js/core/DrowNameGenerator.js"), new RegExp(`from "\\./random\\.js\\?v=${version}"`));
});

test("refuses a release whose stamps are missing or disagree", (t) => {
    const root = fixture(t);
    const script = path.join(root, "js", "app.js");
    const original = readFileSync(script, "utf8");
    // an import without its stamp could be served from an older cache
    writeFileSync(script, original.replace(/(from "\.\/[^"?]+\.js)\?v=[\w.-]+"/, '$1"'));
    assert.throws(() => buildSite(root), /Version stamp missing or not/);
    writeFileSync(script, original);
    const html = path.join(root, "index.html");
    writeFileSync(html, readFileSync(html, "utf8").replace(/\?v=[\w.-]+/, "?v=0.0.0"));
    assert.throws(() => buildSite(root), /Version stamp missing or not 0\.0\.0/);
});

test("rejects missing required assets", (t) => {
    const root = fixture(t);
    rmSync(path.join(root, "favicon.png"));
    assert.throws(() => buildSite(root), /ENOENT/);
});

test("rejects extra files during verification and rebuild without deleting them", (t) => {
    const root = fixture(t);
    buildSite(root);
    const privateFile = path.join(root, "dist", "DECISIONS.md");
    writeFileSync(privateFile, "private decisions");
    assert.throws(() => verifySite(root), /missing or unapproved/);
    assert.throws(() => buildSite(root), /Unexpected release files/);
    assert.equal(readFileSync(privateFile, "utf8"), "private decisions");
});

test("rejects changed output and malformed JSON", (t) => {
    const root = fixture(t);
    buildSite(root);
    writeFileSync(path.join(root, "dist", "index.html"), "modified release");
    assert.throws(() => verifySite(root), /differs from source/);
    writeFileSync(path.join(root, "data", "elfNames.json"), "not JSON");
    assert.throws(() => buildSite(root), SyntaxError);
});

test("rejects traversal, globs, and private/tooling files in the release list", (t) => {
    const root = fixture(t);
    for (const file of ["../secret.js", "js/**", "AGENTS.md", "package.json", "research.pdf", "js/../private.js"]) {
        writeFileSync(path.join(root, "release-files.json"), JSON.stringify([...approvedFiles, file]));
        assert.throws(() => buildSite(root), /Unsafe release path/);
    }
});

test("rejects newly referenced assets unless they are explicitly approved", (t) => {
    const root = fixture(t);
    writeFileSync(path.join(root, "js", "ui.js"), 'import "./new-module.js";');
    writeFileSync(path.join(root, "js", "new-module.js"), "export const value = 1;");
    assert.throws(() => buildSite(root), /Unapproved or missing dependency/);
});

test("rejects links in output directories before writing through them", (t) => {
    const root = fixture(t);
    const other = fixture(t);
    mkdirSync(path.join(root, "dist"));
    symlinkSync(path.join(other, "js"), path.join(root, "dist", "js"), "junction");
    const before = readFileSync(path.join(other, "js", "app.js"));
    assert.throws(() => buildSite(root), /Links are forbidden/);
    assert.deepEqual(readFileSync(path.join(other, "js", "app.js")), before);
});

test("rejects a linked source directory and an unexpected production domain", (t) => {
    const root = fixture(t);
    const other = fixture(t);
    rmSync(path.join(root, "js"), { recursive: true });
    symlinkSync(path.join(other, "js"), path.join(root, "js"), "junction");
    assert.throws(() => buildSite(root), /without links/);
    writeFileSync(path.join(other, "CNAME"), "unapproved.example");
    assert.throws(() => buildSite(other), /Unexpected production domain/);
});

test("deployment runs only for main in the production repository: on a push (merge) or a confirmed manual run", () => {
    const workflow = parse(readFileSync(path.join(repositoryRoot, ".github", "workflows", "ci-cd.yml"), "utf8"));
    const deployment = workflow.jobs["deploy-prod"];
    const production = { repository: "bradleynelson/elf-name-generator", ref: "refs/heads/main" };
    const runs = (github, inputs = {}) =>
        vm.runInNewContext(deployment.if, { github: { ...production, ...github }, inputs });
    assert.equal(runs({ event_name: "push" }), true);
    assert.equal(runs({ event_name: "workflow_dispatch" }, { confirm_production: true }), true);
    assert.equal(runs({ event_name: "workflow_dispatch" }, { confirm_production: false }), false);
    for (const github of [
        { repository: "bradleynelson/elf-name-generator-dev" },
        { repository: "someone/elf-name-generator" },
        { ref: "refs/heads/develop" },
        { ref: "refs/heads/feature/redesign-elves" },
        { event_name: "pull_request" },
        { event_name: "schedule" }
    ]) {
        assert.equal(runs({ event_name: "push", ...github }), false);
    }
    assert.equal(workflow.on.workflow_dispatch.inputs.confirm_production.default, false);
    assert.deepEqual(workflow.permissions, { contents: "read" });
    // Pages' own deployment: no write access to the repository's contents
    assert.deepEqual(deployment.permissions, { contents: "read", pages: "write", "id-token": "write" });
    assert.equal(deployment.environment.name, "github-pages");
    assert.equal(deployment.needs, "test");
    assert.equal(deployment.concurrency["cancel-in-progress"], false);
    assert.equal(workflow.jobs.test["timeout-minutes"], 15);
    assert.equal(workflow.jobs.test.concurrency["cancel-in-progress"], true);
    assert.equal(deployment["timeout-minutes"], 20);
    assert.equal(workflow.jobs["deploy-dev"], undefined);
    const upload = deployment.steps.find((step) => step.uses?.startsWith("actions/upload-pages-artifact@"));
    assert.equal(upload.with.path, "./dist");
    const order = (pattern) => deployment.steps.findIndex((step) => pattern.test(step.uses || step.run || ""));
    assert.ok(order(/release-site\.js check/) < order(/upload-pages-artifact/), "only checked files are packaged");
    assert.ok(order(/deploy-pages/) < order(/check-live-site\.js/), "the live site is checked after deploying");
    for (const job of [workflow.jobs.test, deployment]) {
        const checkout = job.steps.find((step) => step.uses?.startsWith("actions/checkout@"));
        assert.equal(checkout.with["persist-credentials"], false);
    }
    const testCommands = workflow.jobs.test.steps.map((step) => step.run || "").join("\n");
    assert.match(testCommands, /npm run check/);
    const checkRunner = readFileSync(path.join(repositoryRoot, "scripts", "check.js"), "utf8");
    for (const required of [
        "lint",
        "format:check",
        "check:duplication",
        "check:unused",
        "test:coverage",
        "test:release",
        "build:site",
        "check:release"
    ]) {
        assert.match(checkRunner, new RegExp(`"${required.replace(":", "\\:")}"`));
    }
    const deployCommands = deployment.steps.map((step) => step.run || "").join("\n");
    assert.match(deployCommands, /release-site\.js build/);
    assert.match(deployCommands, /release-site\.js check/);
    // every action is pinned to a full commit SHA
    for (const file of ["ci-cd.yml", "lighthouse.yml"]) {
        const jobs = parse(readFileSync(path.join(repositoryRoot, ".github", "workflows", file), "utf8")).jobs;
        for (const step of Object.values(jobs).flatMap((job) => job.steps)) {
            if (step.uses) assert.match(step.uses, /@[0-9a-f]{40}$/, `${file}: ${step.uses}`);
        }
    }
});

test("the live check expects every approved file served and every other tracked file hidden", () => {
    const tracked = ["index.html", "CNAME", "js/app.js", "package.json", "README.md", "tests/app.test.js"];
    const { served, hidden } = getLiveExpectations(["index.html", "CNAME", "js/app.js"], tracked);
    // CNAME is read by GitHub Pages for the domain, not served
    assert.deepEqual(served, ["index.html", "js/app.js"]);
    assert.deepEqual(hidden, ["README.md", "package.json", "tests/app.test.js"]);
});
