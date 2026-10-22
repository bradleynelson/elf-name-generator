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

test("versions every local script, stylesheet and data reference, and nothing else", (t) => {
    const root = fixture(t);
    buildSite(root);
    const read = (file) => readFileSync(path.join(root, "dist", file), "utf8");
    const html = read("index.html");
    const version = html.match(/href="style\.css\?v=([0-9a-f]{10})"/)?.[1];
    assert.ok(version, "stylesheet link carries a version");
    assert.match(html, new RegExp(`src="js/app\\.js\\?v=${version}"`));
    assert.match(html, new RegExp(`href="data/elfNames\\.json\\?v=${version}"`));
    assert.match(html, /href="favicon\.ico"/);
    assert.match(read("js/app.js"), new RegExp(`from "\\./core/ElfNameGenerator\\.js\\?v=${version}"`));
    assert.match(read("js/app.js"), new RegExp(`"data/drowNames\\.json\\?v=${version}"`));
    assert.match(read("js/core/DrowNameGenerator.js"), new RegExp(`from "\\./random\\.js\\?v=${version}"`));
    // a changed script means a new version, so cached copies of the old release are never reused
    writeFileSync(path.join(root, "js", "ui.js"), `${readFileSync(path.join(root, "js", "ui.js"), "utf8")}\n// changed`);
    rmSync(path.join(root, "dist"), { recursive: true });
    buildSite(root);
    assert.doesNotMatch(read("index.html"), new RegExp(`\\?v=${version}`));
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

test("deployment requires production repository, main, manual dispatch and explicit confirmation", () => {
    const workflow = parse(readFileSync(path.join(repositoryRoot, ".github", "workflows", "ci-cd.yml"), "utf8"));
    const deployment = workflow.jobs["deploy-prod"];
    const allowed = {
        github: {
            repository: "bradleynelson/elf-name-generator",
            ref: "refs/heads/main",
            event_name: "workflow_dispatch"
        },
        inputs: { confirm_production: true }
    };
    assert.equal(vm.runInNewContext(deployment.if, allowed), true);
    for (const github of [
        { repository: "bradleynelson/elf-name-generator-dev" },
        { repository: "someone/elf-name-generator" },
        { ref: "refs/heads/develop" },
        { event_name: "push" },
        { event_name: "pull_request" }
    ]) {
        assert.equal(
            vm.runInNewContext(deployment.if, { ...allowed, github: { ...allowed.github, ...github } }),
            false
        );
    }
    assert.equal(vm.runInNewContext(deployment.if, { ...allowed, inputs: { confirm_production: false } }), false);
    assert.equal(workflow.on.workflow_dispatch.inputs.confirm_production.default, false);
    assert.deepEqual(workflow.permissions, { contents: "read" });
    assert.deepEqual(deployment.permissions, { contents: "write" });
    assert.equal(deployment.environment.name, "production");
    assert.equal(deployment.needs, "test");
    assert.equal(deployment.concurrency["cancel-in-progress"], false);
    assert.equal(workflow.jobs["deploy-dev"], undefined);
    const publish = deployment.steps.find((step) => step.uses?.startsWith("peaceiris/actions-gh-pages@"));
    assert.equal(publish.with.publish_dir, "./dist");
    assert.equal(publish.with.cname, "espruar.com");
    for (const job of [workflow.jobs.test, deployment]) {
        const checkout = job.steps.find((step) => step.uses?.startsWith("actions/checkout@"));
        assert.equal(checkout.with["persist-credentials"], false);
        const commands = job.steps.map((step) => step.run || "").join("\n");
        assert.match(commands, /(?:build:site|release-site\.js build)/);
        assert.match(commands, /(?:check:release|release-site\.js check)/);
    }
});
