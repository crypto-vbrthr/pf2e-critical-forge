import {
  API_VERSION,
  EFFECT_SCHEMA_VERSION,
  MODULE_ID,
  MODULE_VERSION
} from "../constants.js";
import { componentRegistry } from "../effect-engine/component-registry.js";
import { createEffectApi } from "./effect-api.js";
import { openEffectForge } from "../effect-forge/effect-forge.js";
import {
  EffectBuilder,
  createEffectBuilder
} from "../effect-engine/builder/effect-builder.js";
import {
  CUSTOM_SELECTOR_VALUE,
  getSelectorDefinition,
  getSelectorGroups,
  isKnownSelector,
  isValidSelectorSyntax,
  listSelectorDefinitions
} from "../effect-engine/catalogs/selector-catalog.js";
import {
  getConditionDefinition,
  initializeConditionCatalog,
  isValuedCondition,
  listConditionDefinitions
} from "../effect-engine/catalogs/condition-catalog.js";
import {
  getDamageTypeDefinition,
  getDamageTypeGroups,
  isKnownDamageType,
  listDamageTypeDefinitions
} from "../effect-engine/catalogs/damage-type-catalog.js";

export function initializePublicApi() {
  const module = game.modules.get(MODULE_ID);
  if (!module) throw new Error(`Module ${MODULE_ID} is unavailable.`);

  const api = Object.freeze({
    version: API_VERSION,
    moduleVersion: MODULE_VERSION,
    schemaVersion: EFFECT_SCHEMA_VERSION,
    effects: createEffectApi(),

    builders: Object.freeze({
      effect: () => createEffectBuilder(),
      from: (definition) => EffectBuilder.from(definition)
    }),

    selectors: Object.freeze({
      customValue: CUSTOM_SELECTOR_VALUE,
      groups: (selected = null, options = {}) => getSelectorGroups(selected, options),
      list: () => listSelectorDefinitions(),
      get: (value) => getSelectorDefinition(value),
      has: (value) => isKnownSelector(value),
      isValidSyntax: (value) => isValidSelectorSyntax(value)
    }),

    conditions: Object.freeze({
      initialize: (options = {}) => initializeConditionCatalog(options),
      list: () => listConditionDefinitions(),
      get: (slug) => getConditionDefinition(slug),
      isValued: (slug) => isValuedCondition(slug)
    }),

    damageTypes: Object.freeze({
      groups: (selected = null) => getDamageTypeGroups(selected),
      list: () => listDamageTypeDefinitions(),
      get: (value) => getDamageTypeDefinition(value),
      has: (value) => isKnownDamageType(value)
    }),

    components: Object.freeze({
      register: (handler, options = {}) => componentRegistry.register(handler, options),
      unregister: (type) => componentRegistry.unregister(type),
      get: (type) => componentRegistry.get(type),
      list: () => componentRegistry.list()
    }),

    ui: Object.freeze({ openEffectForge }),

    cards: Object.freeze({
      registerPack() {
        throw new Error("Critical-card registration is planned for a later milestone.");
      },
      registerCard() {
        throw new Error("Critical-card registration is planned for a later milestone.");
      }
    })
  });

  module.api = api;
  return api;
}
