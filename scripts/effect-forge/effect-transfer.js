import {
  API_VERSION,
  EFFECT_SCHEMA_VERSION,
  MODULE_ID,
  MODULE_VERSION
} from "../constants.js";
import {
  EffectMigrationError,
  migrateEffectDefinition
} from "../effect-engine/migration/migration-engine.js";

export const EFFECT_EXPORT_FORMAT = `${MODULE_ID}.effect`;
export const EFFECT_EXPORT_FORMAT_VERSION = 1;
export const MAX_EFFECT_IMPORT_BYTES = 2_000_000;

function clone(value) {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) {
    return globalThis.foundry.utils.deepClone(value);
  }
  return structuredClone(value);
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export class EffectTransferError extends Error {
  constructor(code, message, data = {}) {
    super(message);
    this.name = "EffectTransferError";
    this.code = code;
    this.data = data;
  }
}

export function createEffectExportPackage(definition, {
  unmanagedRules = [],
  exportedAt = new Date().toISOString(),
  moduleVersion = MODULE_VERSION,
  apiVersion = API_VERSION
} = {}) {
  if (!isObject(definition)) {
    throw new EffectTransferError(
      "IMPORT_DEFINITION_MISSING",
      "An Effect Definition object is required."
    );
  }
  if (!Array.isArray(unmanagedRules)) {
    throw new EffectTransferError(
      "IMPORT_UNMANAGED_RULES_INVALID",
      "Unmanaged rules must be an array."
    );
  }

  return {
    format: EFFECT_EXPORT_FORMAT,
    formatVersion: EFFECT_EXPORT_FORMAT_VERSION,
    exportedAt: String(exportedAt),
    generator: {
      moduleId: MODULE_ID,
      moduleVersion: String(moduleVersion),
      apiVersion: String(apiVersion),
      schemaVersion: EFFECT_SCHEMA_VERSION
    },
    definition: clone(definition),
    unmanagedRules: clone(unmanagedRules)
  };
}

export function serializeEffectExport(definition, options = {}) {
  return JSON.stringify(createEffectExportPackage(definition, options), null, 2);
}

function parseJson(value) {
  if (typeof value !== "string") return value;
  if (!value.trim()) {
    throw new EffectTransferError("IMPORT_EMPTY", "The import data is empty.");
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new EffectTransferError(
      "IMPORT_JSON_INVALID",
      "The selected data is not valid JSON.",
      { cause: error.message }
    );
  }
}

function isRawDefinition(value) {
  return isObject(value)
    && (Object.hasOwn(value, "components") || Object.hasOwn(value, "effects"));
}

export function parseEffectImport(value, {
  expectedSchemaVersion = EFFECT_SCHEMA_VERSION
} = {}) {
  const parsed = parseJson(value);
  if (!isObject(parsed)) {
    throw new EffectTransferError(
      "IMPORT_DOCUMENT_OBJECT",
      "The imported JSON must contain an object."
    );
  }

  let definition;
  let unmanagedRules = [];
  let sourceFormat;
  let envelope = null;

  if (isRawDefinition(parsed)) {
    definition = parsed;
    sourceFormat = "effect-definition";
  } else {
    if (parsed.format !== EFFECT_EXPORT_FORMAT) {
      throw new EffectTransferError(
        "IMPORT_FORMAT_UNSUPPORTED",
        "The JSON is not a supported Critical Forge effect export.",
        { actual: String(parsed.format ?? "") }
      );
    }
    if (parsed.formatVersion !== EFFECT_EXPORT_FORMAT_VERSION) {
      throw new EffectTransferError(
        "IMPORT_FORMAT_VERSION_UNSUPPORTED",
        "The effect export format version is not supported.",
        {
          actual: parsed.formatVersion,
          expected: EFFECT_EXPORT_FORMAT_VERSION
        }
      );
    }
    if (!isObject(parsed.definition)) {
      throw new EffectTransferError(
        "IMPORT_DEFINITION_MISSING",
        "The effect export does not contain an Effect Definition."
      );
    }
    if (parsed.unmanagedRules !== undefined && !Array.isArray(parsed.unmanagedRules)) {
      throw new EffectTransferError(
        "IMPORT_UNMANAGED_RULES_INVALID",
        "The exported unmanaged rules must be an array."
      );
    }

    definition = parsed.definition;
    unmanagedRules = parsed.unmanagedRules ?? [];
    sourceFormat = "critical-forge-export";
    envelope = parsed;
  }

  let migration;
  try {
    migration = migrateEffectDefinition(definition, { targetVersion: expectedSchemaVersion });
  } catch (error) {
    if (error instanceof EffectMigrationError) {
      throw new EffectTransferError(
        "IMPORT_SCHEMA_VERSION_UNSUPPORTED",
        "The Effect Definition schema version is not supported.",
        {
          actual: definition.schemaVersion ?? 0,
          expected: expectedSchemaVersion,
          migrationCode: error.code
        }
      );
    }
    throw error;
  }

  return {
    definition: clone(migration.definition),
    unmanagedRules: clone(unmanagedRules),
    sourceFormat,
    envelope: envelope ? clone(envelope) : null,
    migration: {
      fromVersion: migration.fromVersion,
      toVersion: migration.toVersion,
      migrated: migration.migrated,
      steps: clone(migration.steps),
      warnings: clone(migration.warnings)
    }
  };
}

export function effectDescriptionToPlainText(value) {
  const html = String(value ?? "");
  if (!html) return "";

  if (typeof document !== "undefined") {
    const container = document.createElement("div");
    container.innerHTML = html
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/p\s*>/gi, "\n");
    return String(container.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
  }

  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildEffectExportFilename(definition) {
  const source = String(definition?.name || definition?.id || "effect")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${source || "effect"}.pf2e-critical-forge.json`;
}

export async function readEffectImportFile(file, {
  maxBytes = MAX_EFFECT_IMPORT_BYTES
} = {}) {
  if (!file || typeof file.text !== "function") {
    throw new EffectTransferError("IMPORT_FILE_INVALID", "A readable JSON file is required.");
  }
  if (Number.isFinite(file.size) && file.size > maxBytes) {
    throw new EffectTransferError(
      "IMPORT_FILE_TOO_LARGE",
      "The selected effect file is too large.",
      { actual: file.size, maximum: maxBytes }
    );
  }
  return file.text();
}

export function downloadEffectExport(text, filename, {
  saveDataToFileFn = globalThis.foundry?.utils?.saveDataToFile
    ?? globalThis.saveDataToFile
} = {}) {
  if (typeof saveDataToFileFn !== "function") {
    throw new Error("Foundry file-download API is unavailable.");
  }

  saveDataToFileFn(
    String(text),
    "application/json;charset=utf-8",
    String(filename || "effect.pf2e-critical-forge.json")
  );
}
