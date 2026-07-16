import {
  API_VERSION,
  CARD_PACK_SCHEMA_VERSION,
  MODULE_ID,
  MODULE_VERSION
} from "../../constants.js";
import { normalizePackDefinition } from "../schema/card-normalizer.js";
import { validatePackDefinition } from "../schema/card-validator.js";
import { sanitizeIdentifier } from "./card-editor-model.js";

export const CARD_PACK_EXPORT_FORMAT = "pf2e-critical-forge.card-pack";
export const CARD_PACK_EXPORT_VERSION = 1;
export const CARD_PACK_IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export class CardPackTransferError extends Error {
  constructor(code, message, data = {}) {
    super(message);
    this.name = "CardPackTransferError";
    this.code = code;
    this.data = data;
  }
}

export function createCardPackExport(pack) {
  const normalized = normalizeAndValidate(pack);
  return {
    format: CARD_PACK_EXPORT_FORMAT,
    formatVersion: CARD_PACK_EXPORT_VERSION,
    generator: {
      moduleId: MODULE_ID,
      moduleVersion: MODULE_VERSION,
      apiVersion: API_VERSION,
      packSchemaVersion: CARD_PACK_SCHEMA_VERSION
    },
    pack: normalized
  };
}

export function serializeCardPackExport(pack) {
  return JSON.stringify(createCardPackExport(pack), null, 2);
}

export function parseCardPackImport(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new CardPackTransferError("CARD_PACK_IMPORT_EMPTY", "Card pack import is empty.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new CardPackTransferError("CARD_PACK_IMPORT_JSON_INVALID", error.message);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CardPackTransferError("CARD_PACK_IMPORT_OBJECT_REQUIRED", "Card pack import must contain an object.");
  }

  let rawPack = parsed;
  if ("format" in parsed || "pack" in parsed) {
    if (parsed.format !== CARD_PACK_EXPORT_FORMAT) {
      throw new CardPackTransferError("CARD_PACK_IMPORT_FORMAT_UNSUPPORTED", `Unsupported format: ${parsed.format}`);
    }
    if (parsed.formatVersion !== CARD_PACK_EXPORT_VERSION) {
      throw new CardPackTransferError("CARD_PACK_IMPORT_VERSION_UNSUPPORTED", `Unsupported format version: ${parsed.formatVersion}`);
    }
    rawPack = parsed.pack;
  }

  return normalizeAndValidate(rawPack);
}

export async function readCardPackImportFile(file) {
  if (!file || typeof file.text !== "function") {
    throw new CardPackTransferError("CARD_PACK_IMPORT_FILE_INVALID", "No readable JSON file was selected.");
  }
  if (Number(file.size ?? 0) > CARD_PACK_IMPORT_MAX_BYTES) {
    throw new CardPackTransferError("CARD_PACK_IMPORT_FILE_TOO_LARGE", "Card pack import exceeds 2 MB.");
  }
  return parseCardPackImport(await file.text());
}

export function buildCardPackExportFilename(pack) {
  return `${sanitizeIdentifier(pack?.id, "critical-card-pack")}.json`;
}

export function downloadCardPackExport(pack) {
  const data = serializeCardPackExport(pack);
  const filename = buildCardPackExportFilename(pack);
  const save = globalThis.foundry?.utils?.saveDataToFile;
  if (typeof save !== "function") {
    throw new CardPackTransferError("CARD_PACK_EXPORT_UNAVAILABLE", "Foundry file export is unavailable.");
  }
  save(data, "application/json", filename);
  return { data, filename };
}

function normalizeAndValidate(pack) {
  let normalized;
  try {
    normalized = normalizePackDefinition(pack);
  } catch (error) {
    throw new CardPackTransferError("CARD_PACK_NORMALIZATION_FAILED", error.message);
  }
  const validation = validatePackDefinition(normalized);
  if (!validation.valid) {
    throw new CardPackTransferError("CARD_PACK_VALIDATION_FAILED", "Card pack validation failed.", {
      issues: validation.issues
    });
  }
  return normalized;
}
