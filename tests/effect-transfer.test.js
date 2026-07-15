import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";
import { shakenNerves } from "./fixtures/effects.js";

installFoundryMock();

const {
  EFFECT_EXPORT_FORMAT,
  EFFECT_EXPORT_FORMAT_VERSION,
  EffectTransferError,
  buildEffectExportFilename,
  createEffectExportPackage,
  downloadEffectExport,
  effectDescriptionToPlainText,
  parseEffectImport,
  readEffectImportFile,
  serializeEffectExport
} = await import("../scripts/effect-forge/effect-transfer.js");

test("export packages contain a portable envelope without mutating source data", () => {
  const definition = shakenNerves();
  const unmanagedRules = [{ key: "Aura", radius: 10, effects: [] }];
  const exported = createEffectExportPackage(definition, {
    unmanagedRules,
    exportedAt: "2026-07-15T08:00:00.000Z",
    moduleVersion: "test-module",
    apiVersion: "test-api"
  });

  assert.equal(exported.format, EFFECT_EXPORT_FORMAT);
  assert.equal(exported.formatVersion, EFFECT_EXPORT_FORMAT_VERSION);
  assert.equal(exported.exportedAt, "2026-07-15T08:00:00.000Z");
  assert.equal(exported.generator.moduleVersion, "test-module");
  assert.deepEqual(exported.definition, definition);
  assert.deepEqual(exported.unmanagedRules, unmanagedRules);
  assert.notEqual(exported.definition, definition);
  assert.notEqual(exported.unmanagedRules, unmanagedRules);
});

test("serialized exports round-trip definitions and unmanaged rules", () => {
  const definition = shakenNerves();
  const unmanagedRules = [{ key: "Aura", radius: 15, effects: [] }];
  const json = serializeEffectExport(definition, {
    unmanagedRules,
    exportedAt: "2026-07-15T08:00:00.000Z"
  });
  const imported = parseEffectImport(json);

  assert.equal(imported.sourceFormat, "critical-forge-export");
  assert.deepEqual(imported.definition, definition);
  assert.deepEqual(imported.unmanagedRules, unmanagedRules);
  assert.equal(imported.envelope.format, EFFECT_EXPORT_FORMAT);
});

test("raw Effect Definitions remain valid import input", () => {
  const definition = shakenNerves();
  const imported = parseEffectImport(JSON.stringify(definition));

  assert.equal(imported.sourceFormat, "effect-definition");
  assert.deepEqual(imported.definition, definition);
  assert.deepEqual(imported.unmanagedRules, []);
  assert.equal(imported.envelope, null);
});

test("invalid JSON and unsupported versions return stable error codes", () => {
  assert.throws(
    () => parseEffectImport("{not-json}"),
    (error) => error instanceof EffectTransferError && error.code === "IMPORT_JSON_INVALID"
  );

  assert.throws(
    () => parseEffectImport({ format: EFFECT_EXPORT_FORMAT, formatVersion: 999, definition: {} }),
    (error) => error instanceof EffectTransferError && error.code === "IMPORT_FORMAT_VERSION_UNSUPPORTED"
  );

  assert.throws(
    () => parseEffectImport({ ...shakenNerves(), schemaVersion: 999 }),
    (error) => error instanceof EffectTransferError && error.code === "IMPORT_SCHEMA_VERSION_UNSUPPORTED"
  );
});

test("export filenames are filesystem-friendly and deterministic", () => {
  assert.equal(
    buildEffectExportFilename({ name: "Erschütterte Nerven: Stufe 2!" }),
    "erschutterte-nerven-stufe-2.pf2e-critical-forge.json"
  );
  assert.equal(buildEffectExportFilename({ name: "***" }), "effect.pf2e-critical-forge.json");
});

test("HTML descriptions are converted to editable plain text", () => {
  assert.equal(
    effectDescriptionToPlainText("<p>Erste Zeile<br>Zweite Zeile</p>"),
    "Erste Zeile\nZweite Zeile"
  );
});

test("file imports enforce the configured size limit", async () => {
  await assert.rejects(
    () => readEffectImportFile({ size: 101, text: async () => "{}" }, { maxBytes: 100 }),
    (error) => error instanceof EffectTransferError && error.code === "IMPORT_FILE_TOO_LARGE"
  );

  assert.equal(
    await readEffectImportFile({ size: 2, text: async () => "{}" }, { maxBytes: 100 }),
    "{}"
  );
});

test("JSON exports use Foundry's file-download utility instead of opening a Blob URL", () => {
  const calls = [];

  downloadEffectExport("{\n  \"ok\": true\n}", "test-effect.json", {
    saveDataToFileFn: (...args) => calls.push(args)
  });

  assert.deepEqual(calls, [[
    "{\n  \"ok\": true\n}",
    "application/json;charset=utf-8",
    "test-effect.json"
  ]]);
});
