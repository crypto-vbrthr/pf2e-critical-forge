import { CARD_PACK_SCHEMA_VERSION, CARD_SCHEMA_VERSION } from "../constants.js";
import { CARD_CATEGORIES } from "../critical-forge/constants.js";
import {
  CARD_DECK_TYPES,
  SPECIALIZED_CARD_DECK_TYPES,
  categorySupportsCardDeck,
  listPackDeckTypes,
  resolvePackCardDeck,
  resolveRequestedCardDeck
} from "../critical-forge/decks/card-deck.js";
import { CONDITION_GROUP_MODES, CONDITION_OPERATORS, CONDITION_VALUE_TYPES } from "../critical-forge/conditions/condition-constants.js";
import { normalizeConditionTree, emptyConditionGroup } from "../critical-forge/conditions/condition-normalizer.js";
import { validateConditionTree } from "../critical-forge/conditions/condition-validator.js";
import { evaluateConditionTree, resolveConditionField } from "../critical-forge/conditions/condition-evaluator.js";
import {
  CONDITION_FIELD_CATALOG,
  CONDITION_FIELD_TYPES,
  analyzeConditionContradictions,
  conditionFieldDefinition,
  conditionOperatorsForField,
  createConditionTestSnapshot,
  evaluateConditionEditorTest,
  listConditionFieldDefinitions
} from "../critical-forge/editor/condition-editor-model.js";
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
import {
  CRITICAL_CONTEXT_SNAPSHOT_VERSION,
  createCriticalContextBuilder
} from "../critical-forge/context/context-builder.js";
import { criticalContextProviderRegistry } from "../critical-forge/context/context-provider-registry.js";
import { criticalConditionProviderRegistry } from "../critical-forge/conditions/condition-provider-registry.js";
import { criticalDiagnosticProviderRegistry } from "../critical-forge/diagnostics/diagnostic-provider-registry.js";
import { resolveCriticalContext } from "../critical-forge/context/context-resolver.js";
import { diagnosePf2eCriticalInput } from "../critical-forge/diagnostics/critical-diagnostic-service.js";
import {
  CRITICAL_DIAGNOSTIC_REPORT_VERSION,
  createDiagnosticEvaluationReport,
  createDiagnosticReportExport,
  serializeDiagnosticEvaluationReport
} from "../critical-forge/diagnostics/diagnostic-report.js";
import { criticalDiagnosticHistory } from "../critical-forge/diagnostics/diagnostic-history.js";
import { replayDiagnosticSnapshot } from "../critical-forge/diagnostics/diagnostic-replay.js";
import { simulateDiagnosticCard } from "../critical-forge/diagnostics/diagnostic-simulation.js";
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
import {
  CARD_IMPACTS,
  CARD_PROFILE_IDS,
  CARD_TONES,
  cardProfileMultiplier,
  configuredCardProfile,
  listCardProfiles,
  resolveCardProfile
} from "../critical-forge/profile/card-profile.js";
import {
  CRITICAL_TRIGGER_BEHAVIORS,
  CRITICAL_TRIGGER_SCOPES,
  configuredTriggerPolicy,
  evaluateCriticalTrigger
} from "../critical-forge/trigger/critical-trigger-policy.js";
import { redrawCriticalCard } from "../critical-forge/presentation/critical-card-redraw.js";
import {
  createCardPackExport,
  parseCardPackImport,
  serializeCardPackExport
} from "../critical-forge/editor/card-pack-transfer.js";
import {
  deleteCustomCardPack,
  hydrateRegisteredPack,
  listHydratedRegisteredPacks,
  listStoredCustomPacks,
  saveCustomCardPack
} from "../critical-forge/editor/card-pack-store.js";
import {
  CRITICAL_ROLL_AUTOMATION_VERSION,
  getCriticalRollAutomationData,
  isAttackCriticalReport,
  isSavingThrowReport,
  isSupportedCriticalReport,
  processCriticalChatMessage
} from "../critical-forge/automation/critical-roll-automation.js";
import {
  createExtensionPackApi,
  CRITICAL_FORGE_PACKS_CHANGED_HOOK,
  listExtensionPacks,
  registerExtensionPack,
  registerExtensionPacks,
  unregisterExtensionPack,
  unregisterExtensionPacks
} from "../critical-forge/extensions/extension-pack-service.js";
import { createCriticalForgeExtensionApi } from "../critical-forge/extensions/extension-service.js";
import { CRITICAL_EXTENSION_CONTRACT_VERSION } from "../critical-forge/extensions/extension-compatibility.js";

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
    capabilities: Object.freeze({
      contextSnapshots: true,
      contextProviders: true,
      contextConditions: true,
      conditionEditor: true,
      diagnosticReports: true,
      diagnosticHistory: true,
      diagnosticSimulation: true,
      multiDeckPacks: true,
      extensionContracts: true,
      conditionProviders: true,
      diagnosticProviders: true,
      registrationDiagnostics: true
    }),
    categories: [...CARD_CATEGORIES],
    deckTypes: [...CARD_DECK_TYPES],
    decks: Object.freeze({
      types: [...CARD_DECK_TYPES],
      specializedTypes: [...SPECIALIZED_CARD_DECK_TYPES],
      requested: (context = {}) => resolveRequestedCardDeck(context),
      resolvePack: (packOrId, requestedDeckType) => {
        const pack = typeof packOrId === "string" ? criticalPackRegistry.get(packOrId) : packOrId;
        return resolvePackCardDeck(pack, requestedDeckType);
      },
      listPackTypes: (packOrId, options = {}) => {
        const pack = typeof packOrId === "string" ? criticalPackRegistry.get(packOrId) : packOrId;
        return listPackDeckTypes(pack, options);
      },
      supportsCategory: (category, deckType) => categorySupportsCardDeck(category, deckType)
    }),
    tones: [...CARD_TONES],
    impacts: [...CARD_IMPACTS],
    profiles: Object.freeze({
      ids: [...CARD_PROFILE_IDS],
      list: () => listCardProfiles(),
      resolve: (profile = null) => resolveCardProfile(profile),
      configured: () => configuredCardProfile(),
      multiplier: (cardOrId, profile = null) => cardProfileMultiplier(resolveCard(cardOrId), profile)
    }),
    triggers: Object.freeze({
      behaviors: [...CRITICAL_TRIGGER_BEHAVIORS],
      scopes: [...CRITICAL_TRIGGER_SCOPES],
      evaluate: (report, policy = {}) => evaluateCriticalTrigger(report, policy),
      configured: (category) => configuredTriggerPolicy(category)
    }),
    automation: Object.freeze({
      version: CRITICAL_ROLL_AUTOMATION_VERSION,
      processMessage: (message, options = {}) => processCriticalChatMessage(message, options),
      inspectMessage: (message) => getCriticalRollAutomationData(message),
      isAttackReport: (report, input = {}) => isAttackCriticalReport(report, input),
      isSavingThrowReport: (report, input = {}) => isSavingThrowReport(report, input),
      isSupportedReport: (report, input = {}) => isSupportedCriticalReport(report, input)
    }),

    registerPack: (pack, options = {}) => registerCriticalPack(pack, options),
    unregisterPack: (packId) => unregisterCriticalPack(packId),
    extensions: Object.freeze({
      changedHook: CRITICAL_FORGE_PACKS_CHANGED_HOOK,
      contractVersion: CRITICAL_EXTENSION_CONTRACT_VERSION,
      forModule: (sourceModule, options = {}) => createCriticalForgeExtensionApi(sourceModule, options),
      registerPack: (sourceModule, pack, options = {}) => registerExtensionPack(sourceModule, pack, options),
      registerPacks: (sourceModule, packs, options = {}) => registerExtensionPacks(sourceModule, packs, options),
      unregisterPack: (sourceModule, packId) => unregisterExtensionPack(sourceModule, packId),
      unregisterAll: (sourceModule) => unregisterExtensionPacks(sourceModule),
      listPacks: (sourceModule) => listExtensionPacks(sourceModule)
    }),
    getPack: (packId) => criticalPackRegistry.get(packId),
    listPacks: (options = {}) => criticalPackRegistry.list(options),
    validatePack: (pack) => safeValidate(pack, normalizePackDefinition, validatePackDefinition, "CARD_PACK_NORMALIZATION_FAILED"),
    packEditor: Object.freeze({
      list: () => listHydratedRegisteredPacks(),
      get: (packId) => hydrateRegisteredPack(packId),
      listCustom: () => listStoredCustomPacks(),
      save: (pack, options = {}) => saveCustomCardPack(pack, options),
      remove: (packId) => deleteCustomCardPack(packId),
      createExport: (pack) => createCardPackExport(pack),
      serialize: (pack) => serializeCardPackExport(pack),
      parseImport: (text) => parseCardPackImport(text)
    }),

    registerCard: (card, options = {}) => registerCriticalCard(card, options),
    unregisterCard: (cardId) => criticalCardRegistry.unregister(cardId),
    get: (cardId) => criticalCardRegistry.get(cardId),
    list: (options = {}) => criticalCardRegistry.list(options),
    validate: (card) => safeValidate(card, normalizeCardDefinition, validateCardDefinition, "CARD_NORMALIZATION_FAILED"),

    match: (cardOrId, context = {}, options = {}) => matchCard(resolveCard(cardOrId), context, options),
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
    redrawPreview: (message, options = {}) => redrawCriticalCard(message, options),
    summarizeEffect: (definition, options = {}) => summarizeCriticalEffectDefinition(definition, options),

    conditions: Object.freeze({
      modes: [...CONDITION_GROUP_MODES],
      operators: [...CONDITION_OPERATORS],
      valueTypes: [...CONDITION_VALUE_TYPES],
      emptyGroup: (mode = "all") => emptyConditionGroup(mode),
      normalize: (tree) => normalizeConditionTree(tree),
      validate: (tree) => {
        try {
          return validateConditionTree(normalizeConditionTree(tree));
        } catch (error) {
          const entry = Object.freeze({
            severity: "error",
            code: "CARD_CONDITION_NORMALIZATION_FAILED",
            path: "conditions",
            data: { message: error.message }
          });
          return Object.freeze({ valid: false, issues: [entry], errors: [entry], warnings: [] });
        }
      },
      evaluate: (tree, snapshot) => evaluateConditionTree(normalizeConditionTree(tree), snapshot),
      resolveField: (snapshot, field) => resolveConditionField(snapshot, field),
      providers: Object.freeze({
        register: (provider, options = {}) => criticalConditionProviderRegistry.register(provider, options),
        unregister: (providerId, options = {}) => criticalConditionProviderRegistry.unregister(providerId, options),
        get: (providerId) => criticalConditionProviderRegistry.get(providerId),
        list: (options = {}) => criticalConditionProviderRegistry.list(options),
        listFields: (options = {}) => criticalConditionProviderRegistry.listFields(options)
      }),
      editor: Object.freeze({
        fieldTypes: Object.freeze({ ...CONDITION_FIELD_TYPES }),
        get fields() { return Object.freeze(listConditionFieldDefinitions().map((entry) => Object.freeze({ ...entry }))); },
        getField: (path) => conditionFieldDefinition(path),
        operatorsForField: (path, type = null) => conditionOperatorsForField(path, type),
        analyzeContradictions: (tree) => analyzeConditionContradictions(normalizeConditionTree(tree)),
        createTestSnapshot: (input = {}) => createConditionTestSnapshot(input),
        evaluateTest: (tree, input = {}) => evaluateConditionEditorTest(normalizeConditionTree(tree), input)
      })
    }),

    createContext: (input, options = {}) => resolveCriticalContext(input, options),
    contexts: Object.freeze({
      snapshotVersion: CRITICAL_CONTEXT_SNAPSHOT_VERSION,
      createBuilder: (options = {}) => createCriticalContextBuilder(options),
      resolve: (input, options = {}) => resolveCriticalContext(input, options),
      registerProvider: (provider, options = {}) => criticalContextProviderRegistry.register(provider, options),
      unregisterProvider: (system, providerId) => criticalContextProviderRegistry.unregister(system, providerId),
      getProvider: (system, providerId = null) => criticalContextProviderRegistry.get(system, providerId),
      listProviders: (options = {}) => criticalContextProviderRegistry.list(options)
    }),
    diagnose: (input, { system = "pf2e", ...options } = {}) => {
      if (system !== "pf2e") throw new Error(`Unsupported Critical Forge diagnostic adapter: ${system}`);
      return diagnosePf2eCriticalInput(input, options);
    },
    diagnostics: Object.freeze({
      reportVersion: CRITICAL_DIAGNOSTIC_REPORT_VERSION,
      listMessages: (options = {}) => listDiagnosticMessages(options),
      resolveMessageInput: (message, options = {}) => resolveDiagnosticMessageInput(message, options),
      createReport: (diagnostic, options = {}) => createDiagnosticEvaluationReport(diagnostic, options),
      serializeReport: (report, options = {}) => serializeDiagnosticEvaluationReport(report, options),
      createExport: (report) => createDiagnosticReportExport(report),
      replaySnapshot: (report, options = {}) => replayDiagnosticSnapshot(report, options),
      simulateCard: (cardOrId, options = {}) => simulateDiagnosticCard(cardOrId, options),
      providers: Object.freeze({
        register: (provider, options = {}) => criticalDiagnosticProviderRegistry.register(provider, options),
        unregister: (providerId, options = {}) => criticalDiagnosticProviderRegistry.unregister(providerId, options),
        get: (providerId) => criticalDiagnosticProviderRegistry.get(providerId),
        list: (options = {}) => criticalDiagnosticProviderRegistry.list(options)
      }),
      history: Object.freeze({
        list: (options = {}) => criticalDiagnosticHistory.list(options),
        get: (reportId) => criticalDiagnosticHistory.get(reportId),
        record: (report) => criticalDiagnosticHistory.record(report),
        clear: () => criticalDiagnosticHistory.clear()
      })
    }),
    adapters: Object.freeze({
      pf2e: Object.freeze({
        version: PF2E_CONTEXT_ADAPTER_VERSION,
        snapshotVersion: CRITICAL_CONTEXT_SNAPSHOT_VERSION,
        createContext: (input) => createPf2eSelectionContext(input),
        createSnapshot: (input) => createPf2eSelectionContext(input).snapshot
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
