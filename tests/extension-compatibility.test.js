import test from "node:test";
import assert from "node:assert/strict";
import {
  CRITICAL_EXTENSION_CONTRACT_VERSION,
  assertExtensionCompatibility,
  checkExtensionCompatibility,
  compareVersions,
  currentExtensionEnvironment,
  satisfiesVersionRequirement
} from "../scripts/critical-forge/extensions/extension-compatibility.js";

test("extension compatibility exposes a frozen versioned environment", () => {
  const environment = currentExtensionEnvironment();
  assert.equal(environment.extensionContractVersion, CRITICAL_EXTENSION_CONTRACT_VERSION);
  assert.equal(environment.cardSchemaVersion, 1);
  assert.equal(environment.cardPackSchemaVersion, 1);
  assert.equal(environment.capabilities.includes("extensions.conditionProviders"), true);
  assert.equal(Object.isFrozen(environment), true);
});

test("version requirements support exact, comparator, caret, tilde, and prerelease checks", () => {
  assert.equal(compareVersions("0.9.4-dev.6", "0.9.4-dev.5") > 0, true);
  assert.equal(compareVersions("0.9.4", "0.9.4-dev.6") > 0, true);
  assert.equal(satisfiesVersionRequirement("0.9.4", ">=0.9.4"), true);
  assert.equal(satisfiesVersionRequirement("0.9.8", "^0.9.4"), true);
  assert.equal(satisfiesVersionRequirement("0.10.0", "^0.9.4"), false);
  assert.equal(satisfiesVersionRequirement("1.4.9", "~1.4.2"), true);
  assert.equal(satisfiesVersionRequirement("1.5.0", "~1.4.2"), false);
});

test("compatible extension requirements return a structured report", () => {
  const report = checkExtensionCompatibility({
    apiVersion: ">=0.9.4",
    extensionContractVersion: ">=1",
    cardSchemaVersion: ">=1",
    capabilities: ["cards.multiDeckPacks", "extensions.diagnosticProviders"]
  });
  assert.equal(report.compatible, true);
  assert.deepEqual(report.errors, []);
  assert.equal(report.requirements.capabilities.length, 2);
});

test("missing capabilities and unsupported versions produce loadable diagnostics", () => {
  const report = checkExtensionCompatibility({
    apiVersion: ">=99.0.0",
    capabilities: ["future.impossibleCapability"]
  });
  assert.equal(report.compatible, false);
  assert.equal(report.errors.some((entry) => entry.code === "EXTENSION_VERSION_UNSUPPORTED"), true);
  assert.equal(report.errors.some((entry) => entry.code === "EXTENSION_CAPABILITY_MISSING"), true);
  assert.doesNotThrow(() => structuredClone(report));
});

test("assertCompatibility attaches the report to a stable error", () => {
  assert.throws(
    () => assertExtensionCompatibility({ capabilities: ["missing"] }),
    (error) => error.code === "EXTENSION_INCOMPATIBLE" && error.compatibility.compatible === false
  );
});
