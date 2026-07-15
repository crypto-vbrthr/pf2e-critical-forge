import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const fail = (message) => {
  console.error(`RELEASE CHECK FAILED: ${message}`);
  process.exitCode = 1;
};
const pass = (message) => console.log(`✓ ${message}`);

const manifest = readJson("module.json");
const pkg = readJson("package.json");
const constants = readFileSync(join(root, "scripts/constants.js"), "utf8");
const moduleVersion = constants.match(/MODULE_VERSION\s*=\s*"([^"]+)"/)?.[1];
const apiVersion = constants.match(/API_VERSION\s*=\s*"([^"]+)"/)?.[1];
const schemaVersion = Number(constants.match(/EFFECT_SCHEMA_VERSION\s*=\s*(\d+)/)?.[1]);

if (manifest.version === pkg.version && pkg.version === moduleVersion) pass(`version metadata agrees on ${manifest.version}`);
else fail(`version mismatch: manifest=${manifest.version}, package=${pkg.version}, constants=${moduleVersion}`);

if (!String(manifest.version).includes("-dev")) pass("release version contains no development suffix");
else fail("release version still contains a development suffix");

if (manifest.compatibility?.minimum === "14" && manifest.compatibility?.verified === "14") pass("Foundry 14 compatibility is explicit");
else fail("Foundry compatibility must declare minimum and verified version 14");

const pf2e = manifest.relationships?.systems?.find((entry) => entry.id === "pf2e");
if (pf2e?.compatibility?.minimum === "8.1.2") pass("PF2e minimum version is 8.1.2");
else fail("PF2e minimum version must be 8.1.2 for the Foundry 14 release line");

const referenced = [
  ...(manifest.esmodules ?? []),
  ...(manifest.styles ?? []),
  ...(manifest.languages ?? []).map((entry) => entry.path),
  manifest.license,
  manifest.readme
].filter(Boolean);
for (const path of referenced) {
  if (!existsSync(join(root, path))) fail(`manifest path does not exist: ${path}`);
}
if (!process.exitCode) pass(`${referenced.length} manifest paths exist`);

const flatten = (value, prefix = "", result = new Set()) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, child] of Object.entries(value)) flatten(child, prefix ? `${prefix}.${key}` : key, result);
  } else result.add(prefix);
  return result;
};
const deKeys = flatten(readJson("lang/de.json"));
const enKeys = flatten(readJson("lang/en.json"));
const missingDe = [...enKeys].filter((key) => !deKeys.has(key));
const missingEn = [...deKeys].filter((key) => !enKeys.has(key));
if (!missingDe.length && !missingEn.length) pass(`localization parity (${deKeys.size} keys)`);
else fail(`localization mismatch; missing DE: ${missingDe.join(", ") || "none"}; missing EN: ${missingEn.join(", ") || "none"}`);

const forbiddenNames = new Set([".DS_Store", "Thumbs.db", ".env"]);
const sourceOnlyRootDirs = new Set([".git", "node_modules", "coverage"]);
const forbiddenDirs = new Set([".git", "node_modules", "coverage"]);
const allFiles = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(root, full);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // A repository checkout may legitimately contain these at its root.
      // They are skipped during source-tree checks and excluded from release archives.
      if (dir === root && sourceOnlyRootDirs.has(name)) continue;
      if (forbiddenDirs.has(name)) fail(`forbidden release directory: ${rel}`);
      else walk(full);
    } else {
      allFiles.push(rel);
      if (forbiddenNames.has(name)) fail(`forbidden release file: ${rel}`);
    }
  }
}
walk(root);
if (!process.exitCode) pass(`archive hygiene (${allFiles.length} files checked)`);

for (const file of allFiles.filter((path) => path.endsWith(".js") || path.endsWith(".mjs"))) {
  try {
    execFileSync(process.execPath, ["--check", join(root, file)], { stdio: "pipe" });
  } catch (error) {
    fail(`JavaScript syntax error in ${file}: ${error.stderr?.toString() ?? error.message}`);
  }
}
if (!process.exitCode) pass("all JavaScript files pass node --check");

const readme = readFileSync(join(root, "README.md"), "utf8");
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");
if (readme.includes(`Version \`${manifest.version}\``) && changelog.includes(`## ${manifest.version}`)) pass("README and changelog identify the candidate version");
else fail("README or changelog does not identify the candidate version");

if (Number.isInteger(schemaVersion) && apiVersion) pass(`API ${apiVersion}; Effect Definition schema ${schemaVersion}`);
else fail("API or schema version could not be read from constants.js");

if (process.exitCode) process.exit(process.exitCode);
console.log("Release-specific checks passed.");
