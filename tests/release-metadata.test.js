import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));

function flattenKeys(value, prefix = "", keys = new Set()) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) {
      flattenKeys(child, prefix ? `${prefix}.${key}` : key, keys);
    }
  } else {
    keys.add(prefix);
  }
  return keys;
}

test("release version metadata stays synchronized", () => {
  const manifest = readJson("module.json");
  const pkg = readJson("package.json");
  const constants = readFileSync(join(root, "scripts/constants.js"), "utf8");
  const runtimeVersion = constants.match(/MODULE_VERSION\s*=\s*"([^"]+)"/)?.[1];

  assert.equal(manifest.version, pkg.version);
  assert.equal(manifest.version, runtimeVersion);
  assert.match(manifest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/);
  assert.match(readFileSync(join(root, "README.md"), "utf8"), new RegExp(manifest.version.replaceAll(".", "\\.")));
  assert.match(readFileSync(join(root, "CHANGELOG.md"), "utf8"), new RegExp(`## ${manifest.version.replaceAll(".", "\\.")}`));
});

test("every path referenced by the Foundry manifest exists", () => {
  const manifest = readJson("module.json");
  const paths = [
    ...(manifest.esmodules ?? []),
    ...(manifest.styles ?? []),
    ...(manifest.languages ?? []).map((entry) => entry.path),
    manifest.license,
    manifest.readme
  ].filter(Boolean);

  for (const path of paths) assert.equal(existsSync(join(root, path)), true, path);
});

test("German and English localization trees have identical leaf keys", () => {
  const de = flattenKeys(readJson("lang/de.json"));
  const en = flattenKeys(readJson("lang/en.json"));
  assert.deepEqual([...de].sort(), [...en].sort());
});

test("release tree contains no common build or secret artifacts", () => {
  const forbiddenFiles = new Set([".DS_Store", "Thumbs.db", ".env"]);
  const sourceOnlyRootDirectories = new Set([".git", "node_modules", "coverage"]);
  const forbiddenDirectories = new Set([".git", "node_modules", "coverage"]);
  const violations = [];

  function walk(directory) {
    for (const name of readdirSync(directory)) {
      const full = join(directory, name);
      const path = relative(root, full);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        // These directories are normal in a development checkout but must never
        // be copied into a nested distributable module directory.
        if (directory === root && sourceOnlyRootDirectories.has(name)) continue;
        if (forbiddenDirectories.has(name)) violations.push(path);
        else walk(full);
      } else if (forbiddenFiles.has(name)) violations.push(path);
    }
  }

  walk(root);
  assert.deepEqual(violations, []);
});
