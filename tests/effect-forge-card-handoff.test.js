import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = readFileSync(
  join(root, "templates/effect-forge/effect-forge-app.hbs"),
  "utf8"
);

test("external Effect Forge mode exposes the return-to-card action", () => {
  assert.match(template, /data-action="commitExternal"/);
  assert.match(template, /EffectForge\.ExternalCommit/);
  assert.match(template, /EffectForge\.ExternalCommitHint/);
});

test("world Item and Token actions remain in the non-external footer branch", () => {
  const externalStart = template.indexOf("{{#if externalMode}}", template.indexOf("<footer"));
  const externalElse = template.indexOf("{{else}}", externalStart);
  const footerBranchEnd = template.indexOf(
    "{{/if}}\n\n    <button type=\"button\" data-action=\"closeWindow\">",
    externalElse
  );
  const externalBranch = template.slice(externalStart, externalElse);
  const normalBranch = template.slice(externalElse, footerBranchEnd);

  assert.match(externalBranch, /data-action="commitExternal"/);
  assert.doesNotMatch(externalBranch, /data-action="createItem"/);
  assert.doesNotMatch(externalBranch, /data-action="updateItem"/);
  assert.doesNotMatch(externalBranch, /data-action="applySelected"/);

  assert.match(normalBranch, /data-action="createItem"/);
  assert.match(normalBranch, /data-action="updateItem"/);
  assert.match(normalBranch, /data-action="applySelected"/);
});
