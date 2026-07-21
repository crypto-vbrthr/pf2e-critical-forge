import { deepFreeze, normalizeString } from "../utils.js";

export const CARD_DECK_TYPES = Object.freeze([
  "default",
  "attack",
  "fortitude",
  "reflex",
  "will"
]);

export const SPECIALIZED_CARD_DECK_TYPES = Object.freeze(
  CARD_DECK_TYPES.filter((type) => type !== "default")
);

const ATTACK_CATEGORIES = new Set([
  "criticalHit",
  "criticalFumble",
  "spellCriticalHit",
  "spellCriticalFumble"
]);

const SAVE_CATEGORIES = new Set([
  "savingThrowCriticalSuccess",
  "savingThrowCriticalFailure"
]);

const SAVE_TYPE_ALIASES = Object.freeze({
  fortitude: "fortitude",
  fort: "fortitude",
  reflex: "reflex",
  ref: "reflex",
  will: "will"
});

export function normalizeCardDeckType(value, fallback = "default") {
  const normalized = normalizeString(value, fallback).toLowerCase();
  return CARD_DECK_TYPES.includes(normalized) ? normalized : normalized;
}

export function isCardDeckType(value) {
  return CARD_DECK_TYPES.includes(String(value ?? ""));
}

export function resolveRequestedCardDeck(context = {}) {
  const category = String(context?.category ?? "").trim();
  if (ATTACK_CATEGORIES.has(category)) return "attack";
  if (!SAVE_CATEGORIES.has(category)) return "default";

  const saveTypes = Array.isArray(context?.saveTypes) ? context.saveTypes : [];
  const normalized = [...new Set(saveTypes
    .map((value) => SAVE_TYPE_ALIASES[String(value ?? "").trim().toLowerCase()] ?? null)
    .filter(Boolean))];
  return normalized.length === 1 ? normalized[0] : "default";
}

export function categorySupportsCardDeck(category, deckType) {
  const normalizedDeck = String(deckType ?? "default");
  if (normalizedDeck === "default") return true;
  if (normalizedDeck === "attack") return ATTACK_CATEGORIES.has(String(category ?? ""));
  return SAVE_CATEGORIES.has(String(category ?? ""));
}

export function createPackDeckIndex(cards = []) {
  const byType = Object.fromEntries(CARD_DECK_TYPES.map((type) => [type, []]));
  for (const card of cards ?? []) {
    const type = normalizeCardDeckType(card?.deckType, "default");
    if (!(type in byType)) byType[type] = [];
    byType[type].push(String(card?.id ?? ""));
  }

  const result = {};
  for (const type of CARD_DECK_TYPES) {
    result[type] = deepFreeze({
      type,
      cardIds: Object.freeze([...byType[type]])
    });
  }
  return deepFreeze(result);
}

export function listPackDeckTypes(pack, { populatedOnly = true } = {}) {
  return CARD_DECK_TYPES.filter((type) => {
    if (!populatedOnly) return true;
    return (pack?.decks?.[type]?.cardIds?.length ?? 0) > 0;
  });
}

export function resolvePackCardDeck(pack, requestedDeckType) {
  const requested = normalizeCardDeckType(requestedDeckType, "default");
  if ((pack?.decks?.[requested]?.cardIds?.length ?? 0) > 0) return requested;
  if ((pack?.decks?.default?.cardIds?.length ?? 0) > 0) return "default";
  return null;
}

export function deckTypeForCategory(category, saveType = null) {
  if (ATTACK_CATEGORIES.has(String(category ?? ""))) return "attack";
  if (!SAVE_CATEGORIES.has(String(category ?? ""))) return "default";
  return SAVE_TYPE_ALIASES[String(saveType ?? "").trim().toLowerCase()] ?? "default";
}
