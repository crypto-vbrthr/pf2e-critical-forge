import {
  CARD_PACK_SCHEMA_VERSION,
  CARD_SCHEMA_VERSION,
  EFFECT_SCHEMA_VERSION
} from "../../constants.js";
import { deepClone, deepFreeze, normalizeString, normalizeStringArray } from "../utils.js";
import { normalizeConditionTree } from "../conditions/condition-normalizer.js";

const FILTER_KEYS = Object.freeze([
  "damageTypes",
  "weaponGroups",
  "attackTraits",
  "excludedAttackTraits",
  "saveTypes",
  "spellTraditions",
  "spellTraits",
  "sourceTraits",
  "targetTraits",
  "excludedSourceTraits",
  "excludedTargetTraits"
]);

export function normalizeCardDefinition(card, { packId = null } = {}) {
  if (!card || typeof card !== "object" || Array.isArray(card)) {
    throw new TypeError("Critical card definition must be an object.");
  }

  const normalizedFilters = {};
  for (const key of FILTER_KEYS) {
    normalizedFilters[key] = normalizeStringArray(card.filters?.[key] ?? []);
  }

  const normalizedEffect = normalizeEffectTemplate(card.effect);
  const normalized = {
    schemaVersion: Number(card.schemaVersion ?? CARD_SCHEMA_VERSION),
    id: normalizeString(card.id),
    packId: normalizeString(packId ?? card.packId),
    category: normalizeString(card.category),
    tone: normalizeString(card.tone, "neutral"),
    impact: normalizeString(card.impact, normalizedEffect ? "moderate" : "narrative"),
    titleKey: normalizeString(card.titleKey),
    descriptionKey: normalizeString(card.descriptionKey),
    fallbackTitle: normalizeString(card.fallbackTitle) || null,
    fallbackDescription: normalizeString(card.fallbackDescription) || null,
    weight: Number(card.weight ?? 1),
    tags: normalizeStringArray(card.tags ?? []),
    filters: normalizedFilters,
    conditions: normalizeConditionTree(card.conditions),
    effect: normalizedEffect,
    metadata: deepClone(card.metadata ?? {})
  };

  return deepFreeze(normalized);
}

export function normalizePackDefinition(pack) {
  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    throw new TypeError("Critical card pack must be an object.");
  }

  const id = normalizeString(pack.id);
  const cards = Array.isArray(pack.cards)
    ? pack.cards.map((card) => normalizeCardDefinition(card, { packId: id }))
    : [];

  return deepFreeze({
    schemaVersion: Number(pack.schemaVersion ?? CARD_PACK_SCHEMA_VERSION),
    id,
    titleKey: normalizeString(pack.titleKey),
    descriptionKey: normalizeString(pack.descriptionKey),
    fallbackTitle: normalizeString(pack.fallbackTitle) || null,
    fallbackDescription: normalizeString(pack.fallbackDescription) || null,
    version: normalizeString(pack.version, "1.0.0"),
    sourceModule: normalizeString(pack.sourceModule),
    priority: Number(pack.priority ?? 0),
    enabled: pack.enabled !== false,
    metadata: deepClone(pack.metadata ?? {}),
    cards
  });
}

function normalizeEffectTemplate(effect) {
  if (effect == null) return null;
  if (typeof effect !== "object" || Array.isArray(effect)) {
    throw new TypeError("Card effect must be an object or null.");
  }

  const definition = deepClone(effect.definition ?? {});
  definition.schemaVersion = Number(definition.schemaVersion ?? EFFECT_SCHEMA_VERSION);
  definition.id = normalizeString(definition.id) || null;
  delete definition.name;

  return {
    target: normalizeString(effect.target, "target"),
    nameKey: normalizeString(effect.nameKey),
    fallbackName: normalizeString(effect.fallbackName) || null,
    definition
  };
}

export const CARD_FILTER_KEYS = FILTER_KEYS;
