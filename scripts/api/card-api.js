import { CARD_PACK_SCHEMA_VERSION, CARD_SCHEMA_VERSION } from "../constants.js";
import { CARD_CATEGORIES } from "../critical-forge/constants.js";
import {
  criticalCardRegistry,
  criticalCardSelector,
  criticalPackRegistry,
  registerCriticalCard,
  registerCriticalPack,
  unregisterCriticalPack
} from "../critical-forge/critical-forge.js";
import { localizeCard, materializeCardEffect } from "../critical-forge/localization/card-localizer.js";
import { matchCard } from "../critical-forge/selection/card-matcher.js";
import { normalizeCardDefinition, normalizePackDefinition } from "../critical-forge/schema/card-normalizer.js";
import { validateCardDefinition, validatePackDefinition } from "../critical-forge/schema/card-validator.js";

export function createCardApi() {
  const resolveCard = (cardOrId) => {
    if (typeof cardOrId === "string") {
      const card = criticalCardRegistry.get(cardOrId);
      if (!card) throw new Error(`Unknown critical card: ${cardOrId}`);
      return card;
    }
    return normalizeCardDefinition(cardOrId);
  };

  return Object.freeze({
    schemaVersion: CARD_SCHEMA_VERSION,
    packSchemaVersion: CARD_PACK_SCHEMA_VERSION,
    categories: [...CARD_CATEGORIES],

    registerPack: (pack, options = {}) => registerCriticalPack(pack, options),
    unregisterPack: (packId) => unregisterCriticalPack(packId),
    getPack: (packId) => criticalPackRegistry.get(packId),
    listPacks: (options = {}) => criticalPackRegistry.list(options),
    validatePack: (pack) => safeValidate(pack, normalizePackDefinition, validatePackDefinition, "CARD_PACK_NORMALIZATION_FAILED"),

    registerCard: (card, options = {}) => registerCriticalCard(card, options),
    unregisterCard: (cardId) => criticalCardRegistry.unregister(cardId),
    get: (cardId) => criticalCardRegistry.get(cardId),
    list: (options = {}) => criticalCardRegistry.list(options),
    validate: (card) => safeValidate(card, normalizeCardDefinition, validateCardDefinition, "CARD_NORMALIZATION_FAILED"),

    match: (cardOrId, context = {}) => matchCard(resolveCard(cardOrId), context),
    candidates: (context, options = {}) => criticalCardSelector.candidates(context, options),
    select: (context, options = {}) => criticalCardSelector.select(context, options),
    localize: (cardOrId, options = {}) => localizeCard(resolveCard(cardOrId), options),
    materializeEffect: (cardOrId, options = {}) => materializeCardEffect(resolveCard(cardOrId), options)
  });
}

function safeValidate(value, normalize, validate, code) {
  try {
    return validate(normalize(value));
  } catch (error) {
    const issue = Object.freeze({
      severity: "error",
      code,
      data: { message: error.message }
    });
    return Object.freeze({
      valid: false,
      issues: [issue],
      errors: [issue],
      warnings: []
    });
  }
}
