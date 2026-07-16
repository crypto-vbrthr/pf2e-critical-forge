import {
  CARD_PACK_SCHEMA_VERSION,
  CARD_SCHEMA_VERSION,
  EFFECT_SCHEMA_VERSION,
  MODULE_ID
} from "../../constants.js";
import { deepClone, normalizeString, normalizeStringArray } from "../utils.js";

const DEFAULT_PACK_ID = "my-critical-cards";

export function createEditablePack({ id = DEFAULT_PACK_ID, title = "My Critical Cards" } = {}) {
  const packId = sanitizeIdentifier(id, DEFAULT_PACK_ID);
  return {
    schemaVersion: CARD_PACK_SCHEMA_VERSION,
    id: packId,
    titleKey: userLocalizationKey(packId, "Pack.Title"),
    descriptionKey: userLocalizationKey(packId, "Pack.Description"),
    fallbackTitle: title,
    fallbackDescription: "Custom Critical Forge card pack.",
    version: "1.0.0",
    sourceModule: `${MODULE_ID}:world`,
    priority: 10,
    enabled: true,
    metadata: { managedBy: MODULE_ID, editorVersion: 1 },
    cards: []
  };
}

export function createEditableCard({ packId, id = null, title = "New Critical Card", usedIds = [] } = {}) {
  const normalizedPackId = sanitizeIdentifier(packId, DEFAULT_PACK_ID);
  const fallbackId = `${normalizedPackId}.card-${randomSuffix()}`;
  const cardId = ensureUniqueIdentifier(id ?? fallbackId, usedIds, fallbackId);
  return {
    schemaVersion: CARD_SCHEMA_VERSION,
    id: cardId,
    packId: normalizedPackId,
    category: "criticalHit",
    tone: "neutral",
    impact: "narrative",
    titleKey: userLocalizationKey(cardId, "Title"),
    descriptionKey: userLocalizationKey(cardId, "Description"),
    fallbackTitle: title,
    fallbackDescription: "Describe the critical result.",
    weight: 1,
    tags: [],
    filters: emptyFilters(),
    effect: null,
    metadata: { managedBy: MODULE_ID }
  };
}

export function cloneCardToPack(card, packId, { id = null, titleSuffix = " Copy", usedIds = [] } = {}) {
  const clone = deepClone(card);
  const destination = sanitizeIdentifier(packId, DEFAULT_PACK_ID);
  const base = id ?? `${destination}.${lastIdentifierSegment(card?.id ?? "card")}-${randomSuffix()}`;
  clone.id = ensureUniqueIdentifier(base, usedIds, `${destination}.card-${randomSuffix()}`);
  clone.packId = destination;
  clone.titleKey = userLocalizationKey(clone.id, "Title");
  clone.descriptionKey = userLocalizationKey(clone.id, "Description");
  clone.fallbackTitle = `${card?.fallbackTitle ?? card?.id ?? "Card"}${titleSuffix}`;
  clone.metadata = { ...(clone.metadata ?? {}), managedBy: MODULE_ID, clonedFrom: card?.id ?? null };
  if (clone.effect) {
    clone.effect.nameKey = userLocalizationKey(clone.id, "EffectName");
    clone.effect.fallbackName = clone.effect.fallbackName ?? clone.fallbackTitle;
    clone.effect.definition = deepClone(clone.effect.definition ?? {});
    clone.effect.definition.schemaVersion ??= EFFECT_SCHEMA_VERSION;
    delete clone.effect.definition.name;
  }
  return clone;
}

export function ensurePackCardOwnership(pack) {
  const result = deepClone(pack);
  result.cards = (result.cards ?? []).map((card) => ({ ...card, packId: result.id }));
  return result;
}

export function parseDelimitedList(value) {
  return normalizeStringArray(String(value ?? "")
    .split(/[\n,;]+/u)
    .map((entry) => entry.trim())
    .filter(Boolean));
}

export function formatDelimitedList(value) {
  return Array.isArray(value) ? value.join(", ") : "";
}

export function isEditorManagedPack(pack) {
  return pack?.metadata?.managedBy === MODULE_ID;
}

export function sanitizeIdentifier(value, fallback = "custom") {
  const normalized = normalizeString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/gu, "-")
    .replace(/^[^a-z0-9]+/u, "")
    .replace(/-+/gu, "-")
    .replace(/[-._]+$/u, "");
  return normalized || fallback;
}

export function ensureUniqueIdentifier(value, usedIds = [], fallback = "custom") {
  const used = new Set(Array.from(usedIds ?? [], (entry) => String(entry)));
  const base = sanitizeIdentifier(value, fallback);
  if (!used.has(base)) return base;

  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function userLocalizationKey(identifier, suffix) {
  const token = sanitizeIdentifier(identifier, "custom").replace(/[^a-z0-9]+/gu, "_").toUpperCase();
  return `PF2E_CRITICAL_FORGE.UserContent.${token}.${suffix}`;
}

function emptyFilters() {
  return {
    damageTypes: [],
    weaponGroups: [],
    attackTraits: [],
    saveTypes: [],
    spellTraditions: [],
    spellTraits: [],
    sourceTraits: [],
    targetTraits: [],
    excludedSourceTraits: [],
    excludedTargetTraits: []
  };
}

function lastIdentifierSegment(value) {
  return sanitizeIdentifier(String(value).split(".").pop(), "card");
}

function randomSuffix() {
  const random = globalThis.foundry?.utils?.randomID?.(6) ?? Math.random().toString(36).slice(2, 8);
  return String(random).toLowerCase();
}
