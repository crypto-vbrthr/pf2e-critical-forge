import { criticalContextProviderRegistry } from "../context/context-provider-registry.js";
import { criticalConditionProviderRegistry } from "../conditions/condition-provider-registry.js";
import { criticalDiagnosticProviderRegistry } from "../diagnostics/diagnostic-provider-registry.js";
import {
  createExtensionPackApi,
  listExtensionPacks,
  normalizeSourceModule,
  registerExtensionPack,
  registerExtensionPacks,
  unregisterExtensionPack,
  unregisterExtensionPacks
} from "./extension-pack-service.js";
import {
  CRITICAL_EXTENSION_CAPABILITIES,
  CRITICAL_EXTENSION_CONTRACT_VERSION,
  assertExtensionCompatibility,
  checkExtensionCompatibility,
  currentExtensionEnvironment
} from "./extension-compatibility.js";
import {
  criticalExtensionDiagnostics,
  recordExtensionFailure,
  recordExtensionSuccess
} from "./extension-diagnostics.js";
import { deepClone, deepFreeze, normalizeString } from "../utils.js";
import { conditionFieldDefinition } from "../editor/condition-editor-model.js";

export function createCriticalForgeExtensionApi(sourceModule, {
  version = null,
  requirements = {}
} = {}) {
  const owner = normalizeSourceModule(sourceModule);
  const extensionVersion = normalizeString(version) || null;
  const configuredRequirements = deepFreeze(deepClone(requirements ?? {}));
  const legacyPacks = createExtensionPackApi(owner);

  const ensureCompatible = (additional = {}) => assertCompatibility(owner, mergeRequirements(configuredRequirements, additional));
  const checkCompatible = (additional = {}) => checkExtensionCompatibility(mergeRequirements(configuredRequirements, additional));

  const controller = {
    sourceModule: owner,
    extensionVersion,
    contractVersion: CRITICAL_EXTENSION_CONTRACT_VERSION,
    requirements: configuredRequirements,
    checkCompatibility: checkCompatible,
    assertCompatible: ensureCompatible,

    registerPack: (pack, options = {}) => operation(owner, "pack", "register", [pack?.id], () => {
      ensureCompatible(options.requirements);
      return registerExtensionPack(owner, pack, options);
    }),
    registerPacks: (packs, options = {}) => operation(owner, "pack", "register-batch", ids(packs), () => {
      ensureCompatible(options.requirements);
      return registerExtensionPacks(owner, packs, options);
    }),
    unregisterPack: (packId) => operation(owner, "pack", "unregister", [packId], () => unregisterExtensionPack(owner, packId)),

    registerContextProvider: (provider, options = {}) => operation(owner, "context-provider", "register", [provider?.id], () => {
      ensureCompatible(options.requirements);
      return criticalContextProviderRegistry.register({ ...provider, sourceModule: owner, protected: false }, options);
    }),
    unregisterContextProvider: (system, providerId) => operation(owner, "context-provider", "unregister", [`${system}/${providerId}`], () =>
      criticalContextProviderRegistry.unregister(system, providerId, { sourceModule: owner })
    ),
    listContextProviders: () => deepFreeze(criticalContextProviderRegistry.list({ sourceModule: owner })),

    registerConditionProvider: (provider, options = {}) => operation(owner, "condition-provider", "register", [provider?.id], () => {
      ensureCompatible(options.requirements);
      assertConditionFieldOwnership(provider);
      return criticalConditionProviderRegistry.register({ ...provider, sourceModule: owner, protected: false }, options);
    }),
    unregisterConditionProvider: (providerId) => operation(owner, "condition-provider", "unregister", [providerId], () =>
      criticalConditionProviderRegistry.unregister(providerId, { sourceModule: owner })
    ),
    listConditionProviders: () => deepFreeze(criticalConditionProviderRegistry.list({ sourceModule: owner })),

    registerDiagnosticProvider: (provider, options = {}) => operation(owner, "diagnostic-provider", "register", [provider?.id], () => {
      ensureCompatible(options.requirements);
      return criticalDiagnosticProviderRegistry.register({ ...provider, sourceModule: owner, protected: false }, options);
    }),
    unregisterDiagnosticProvider: (providerId) => operation(owner, "diagnostic-provider", "unregister", [providerId], () =>
      criticalDiagnosticProviderRegistry.unregister(providerId, { sourceModule: owner })
    ),
    listDiagnosticProviders: () => deepFreeze(criticalDiagnosticProviderRegistry.list({ sourceModule: owner })),

    getPack: legacyPacks.getPack,
    listPacks: legacyPacks.listPacks,
    listRegistrations: () => listExtensionRegistrations(owner),
    diagnostics: Object.freeze({
      list: (options = {}) => criticalExtensionDiagnostics.list({ ...options, sourceModule: owner }),
      clear: () => criticalExtensionDiagnostics.clear({ sourceModule: owner })
    }),
    unregisterAll: () => operation(owner, "extension", "unregister-all", [], () => unregisterAllOwned(owner))
  };

  return Object.freeze(controller);
}

export function createExtensionPublicApi() {
  return Object.freeze({
    contractVersion: CRITICAL_EXTENSION_CONTRACT_VERSION,
    capabilities: [...CRITICAL_EXTENSION_CAPABILITIES],
    environment: currentExtensionEnvironment(),
    checkCompatibility: (requirements = {}) => checkExtensionCompatibility(requirements),
    assertCompatible: (requirements = {}) => assertExtensionCompatibility(requirements),
    forModule: (sourceModule, options = {}) => createCriticalForgeExtensionApi(sourceModule, options),
    diagnostics: Object.freeze({
      list: (options = {}) => criticalExtensionDiagnostics.list(options),
      clear: (options = {}) => criticalExtensionDiagnostics.clear(options)
    })
  });
}

export function listExtensionRegistrations(sourceModule) {
  const owner = normalizeSourceModule(sourceModule);
  return deepFreeze({
    sourceModule: owner,
    packs: listExtensionPacks(owner),
    contextProviders: criticalContextProviderRegistry.list({ sourceModule: owner }),
    conditionProviders: criticalConditionProviderRegistry.list({ sourceModule: owner }),
    diagnosticProviders: criticalDiagnosticProviderRegistry.list({ sourceModule: owner })
  });
}

function unregisterAllOwned(owner) {
  const contextProviders = criticalContextProviderRegistry.list({ sourceModule: owner });
  const conditionProviders = criticalConditionProviderRegistry.list({ sourceModule: owner });
  const diagnosticProviders = criticalDiagnosticProviderRegistry.list({ sourceModule: owner });

  for (const provider of contextProviders) {
    criticalContextProviderRegistry.unregister(provider.system, provider.id, { sourceModule: owner });
  }
  for (const provider of conditionProviders) {
    criticalConditionProviderRegistry.unregister(provider.id, { sourceModule: owner });
  }
  for (const provider of diagnosticProviders) {
    criticalDiagnosticProviderRegistry.unregister(provider.id, { sourceModule: owner });
  }
  const packs = unregisterExtensionPacks(owner);

  return deepFreeze({
    sourceModule: owner,
    packsRemoved: packs.packsRemoved,
    cardsRemoved: packs.cardsRemoved,
    packIds: packs.packIds,
    contextProvidersRemoved: contextProviders.length,
    conditionProvidersRemoved: conditionProviders.length,
    diagnosticProvidersRemoved: diagnosticProviders.length
  });
}

function assertCompatibility(owner, requirements) {
  try {
    const report = assertExtensionCompatibility(requirements);
    recordExtensionSuccess({
      sourceModule: owner,
      resourceType: "compatibility",
      action: "check",
      code: "EXTENSION_COMPATIBLE",
      message: "Critical Forge extension requirements are satisfied.",
      data: { requirements: report.requirements }
    });
    return report;
  } catch (error) {
    recordExtensionFailure(error, {
      sourceModule: owner,
      resourceType: "compatibility",
      action: "check",
      code: "EXTENSION_INCOMPATIBLE"
    });
    throw error;
  }
}

function operation(owner, resourceType, action, resourceIds, callback) {
  try {
    const result = callback();
    recordExtensionSuccess({
      sourceModule: owner,
      resourceType,
      action,
      code: "EXTENSION_OPERATION_SUCCEEDED",
      message: `Critical Forge extension ${action} succeeded.`,
      resourceIds: cleanIds(resourceIds)
    });
    return result;
  } catch (error) {
    if (!error?.extensionDiagnostic) recordExtensionFailure(error, {
      sourceModule: owner,
      resourceType,
      action,
      resourceIds: cleanIds(resourceIds)
    });
    throw error;
  }
}

function assertConditionFieldOwnership(provider = {}) {
  const providerId = normalizeString(provider.id).toLowerCase();
  for (const field of provider.fields ?? []) {
    const existing = conditionFieldDefinition(field?.path);
    if (!existing) continue;
    if (existing.extension && existing.providerId === providerId) continue;
    const error = new Error(`Critical condition field already registered: ${field?.path}`);
    error.code = existing.extension ? "CONDITION_FIELD_CONFLICT" : "CONDITION_FIELD_CORE_CONFLICT";
    throw error;
  }
}

function mergeRequirements(base = {}, additional = {}) {
  if (!additional || typeof additional !== "object" || Array.isArray(additional)) return deepClone(base);
  return {
    ...deepClone(base),
    ...deepClone(additional),
    capabilities: [...new Set([...(base.capabilities ?? []), ...(additional.capabilities ?? [])])]
  };
}

function ids(packs) {
  return Array.isArray(packs) ? packs.map((pack) => pack?.id) : [];
}

function cleanIds(values = []) {
  return values.map((value) => normalizeString(value)).filter(Boolean);
}
