import {
  CARD_PACK_SCHEMA_VERSION,
  CARD_SCHEMA_VERSION,
  EFFECT_SCHEMA_VERSION
} from "../../constants.js";
import { analyzeEffectDefinition } from "../../effect-engine/validation/validation-engine.js";
import { CARD_CATEGORIES, CARD_ID_PATTERN, EFFECT_TARGETS } from "../constants.js";
import { CARD_FILTER_KEYS } from "./card-normalizer.js";

function issue(code, data = {}, severity = "error") {
  return Object.freeze({ severity, code, data: structuredClone(data) });
}

function report(issues) {
  const errors = issues.filter((entry) => entry.severity === "error");
  const warnings = issues.filter((entry) => entry.severity === "warning");
  return Object.freeze({
    valid: errors.length === 0,
    issues: [...issues],
    errors,
    warnings
  });
}

export function validateCardDefinition(card) {
  const issues = [];

  if (!card || typeof card !== "object" || Array.isArray(card)) {
    return report([issue("CARD_DEFINITION_INVALID")]);
  }

  if (card.schemaVersion !== CARD_SCHEMA_VERSION) {
    issues.push(issue("CARD_SCHEMA_VERSION_UNSUPPORTED", {
      actual: card.schemaVersion,
      expected: CARD_SCHEMA_VERSION
    }));
  }

  for (const [field, value] of [["id", card.id], ["packId", card.packId]]) {
    if (typeof value !== "string" || !CARD_ID_PATTERN.test(value)) {
      issues.push(issue("CARD_IDENTIFIER_INVALID", { field, value }));
    }
  }

  if (!CARD_CATEGORIES.includes(card.category)) {
    issues.push(issue("CARD_CATEGORY_INVALID", { category: card.category }));
  }

  for (const field of ["titleKey", "descriptionKey"]) {
    if (typeof card[field] !== "string" || !card[field].trim()) {
      issues.push(issue("CARD_LOCALIZATION_KEY_MISSING", { field }));
    }
  }

  if (!Number.isFinite(card.weight) || card.weight <= 0) {
    issues.push(issue("CARD_WEIGHT_INVALID", { weight: card.weight }));
  }

  if (!Array.isArray(card.tags) || card.tags.some((tag) => typeof tag !== "string" || !tag)) {
    issues.push(issue("CARD_TAGS_INVALID"));
  }

  for (const key of CARD_FILTER_KEYS) {
    const values = card.filters?.[key];
    if (!Array.isArray(values) || values.some((value) => typeof value !== "string" || !value)) {
      issues.push(issue("CARD_FILTER_INVALID", { filter: key }));
    }
  }

  if (card.effect != null) validateEffect(card, issues);
  return report(issues);
}

export function validatePackDefinition(pack) {
  const issues = [];

  if (!pack || typeof pack !== "object" || Array.isArray(pack)) {
    return report([issue("CARD_PACK_INVALID")]);
  }

  if (pack.schemaVersion !== CARD_PACK_SCHEMA_VERSION) {
    issues.push(issue("CARD_PACK_SCHEMA_VERSION_UNSUPPORTED", {
      actual: pack.schemaVersion,
      expected: CARD_PACK_SCHEMA_VERSION
    }));
  }

  if (typeof pack.id !== "string" || !CARD_ID_PATTERN.test(pack.id)) {
    issues.push(issue("CARD_PACK_ID_INVALID", { id: pack.id }));
  }

  for (const field of ["titleKey", "descriptionKey", "version", "sourceModule"]) {
    if (typeof pack[field] !== "string" || !pack[field].trim()) {
      issues.push(issue("CARD_PACK_FIELD_MISSING", { field }));
    }
  }

  if (!Number.isFinite(pack.priority)) {
    issues.push(issue("CARD_PACK_PRIORITY_INVALID", { priority: pack.priority }));
  }

  if (!Array.isArray(pack.cards)) {
    issues.push(issue("CARD_PACK_CARDS_INVALID"));
  } else {
    const ids = new Set();
    for (const card of pack.cards) {
      const cardReport = validateCardDefinition(card);
      if (!cardReport.valid) {
        issues.push(issue("CARD_PACK_CARD_INVALID", {
          cardId: card?.id ?? null,
          issues: cardReport.issues
        }));
      }
      if (ids.has(card.id)) issues.push(issue("CARD_PACK_DUPLICATE_CARD", { cardId: card.id }));
      ids.add(card.id);
      if (card.packId !== pack.id) {
        issues.push(issue("CARD_PACK_ID_MISMATCH", { cardId: card.id, cardPackId: card.packId }));
      }
    }
  }

  return report(issues);
}

function validateEffect(card, issues) {
  const effect = card.effect;
  if (!EFFECT_TARGETS.includes(effect.target)) {
    issues.push(issue("CARD_EFFECT_TARGET_INVALID", { target: effect.target }));
  }
  if (typeof effect.nameKey !== "string" || !effect.nameKey.trim()) {
    issues.push(issue("CARD_EFFECT_NAME_KEY_MISSING"));
  }
  if (!effect.definition || typeof effect.definition !== "object" || Array.isArray(effect.definition)) {
    issues.push(issue("CARD_EFFECT_DEFINITION_INVALID"));
    return;
  }

  const candidate = {
    schemaVersion: effect.definition.schemaVersion ?? EFFECT_SCHEMA_VERSION,
    id: effect.definition.id ?? `critical-forge.${card.id}`,
    name: effect.fallbackName ?? effect.nameKey ?? card.fallbackTitle ?? card.titleKey,
    description: effect.definition.description ?? card.fallbackDescription ?? "",
    img: effect.definition.img ?? "icons/svg/aura.svg",
    duration: effect.definition.duration,
    components: effect.definition.components ?? [],
    application: effect.definition.application ?? {},
    metadata: effect.definition.metadata ?? {}
  };
  const effectReport = analyzeEffectDefinition(candidate);
  if (!effectReport.valid) {
    issues.push(issue("CARD_EFFECT_DEFINITION_INVALID", { issues: effectReport.issues }));
  }
}
