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
import {
  createPf2eSelectionContext,
  PF2E_CONTEXT_ADAPTER_VERSION
} from "../critical-forge/adapters/pf2e/pf2e-context-adapter.js";
import { diagnosePf2eCriticalInput } from "../critical-forge/diagnostics/critical-diagnostic-service.js";
import {
  listDiagnosticMessages,
  resolveDiagnosticMessageInput
} from "../critical-forge/diagnostics/chat-message-resolver.js";
import {
  prepareCriticalCardPreview,
  publishCriticalCardPreview,
  summarizeCriticalEffectDefinition,
  CRITICAL_CARD_PREVIEW_VERSION,
  CRITICAL_CARD_VISIBILITY_MODES,
  normalizeVisibilityMode
} from "../critical-forge/presentation/critical-card-preview.js";
import {
  applyCriticalCardEffect,
  inspectCriticalCardApplication,
  resolveCriticalCardEffectTarget
} from "../critical-forge/presentation/critical-card-application.js";

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
    materializeEffect: (cardOrId, options = {}) => materializeCardEffect(resolveCard(cardOrId), options),
    previewVersion: CRITICAL_CARD_PREVIEW_VERSION,
    preparePreview: (cardOrId, options = {}) => prepareCriticalCardPreview(resolveCard(cardOrId), options),
    publishPreview: (cardOrId, options = {}) => publishCriticalCardPreview(resolveCard(cardOrId), options),
    visibilityModes: CRITICAL_CARD_VISIBILITY_MODES,
    normalizeVisibilityMode,
    inspectPreviewApplication: (message, options = {}) => inspectCriticalCardApplication(message, options),
    resolvePreviewTarget: (previewData, options = {}) => resolveCriticalCardEffectTarget(previewData, options),
    applyPreviewEffect: (message, options = {}) => applyCriticalCardEffect(message, options),
    summarizeEffect: (definition, options = {}) => summarizeCriticalEffectDefinition(definition, options),

    createContext: (input, { system = "pf2e" } = {}) => {
      if (system !== "pf2e") throw new Error(`Unsupported Critical Forge context adapter: ${system}`);
      return createPf2eSelectionContext(input);
    },
    diagnose: (input, { system = "pf2e", ...options } = {}) => {
      if (system !== "pf2e") throw new Error(`Unsupported Critical Forge diagnostic adapter: ${system}`);
      return diagnosePf2eCriticalInput(input, options);
    },
    diagnostics: Object.freeze({
      listMessages: (options = {}) => listDiagnosticMessages(options),
      resolveMessageInput: (message, options = {}) => resolveDiagnosticMessageInput(message, options)
    }),
    adapters: Object.freeze({
      pf2e: Object.freeze({
        version: PF2E_CONTEXT_ADAPTER_VERSION,
        createContext: (input) => createPf2eSelectionContext(input)
      })
    })
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
