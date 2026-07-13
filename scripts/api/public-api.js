import {
  API_VERSION,
  EFFECT_SCHEMA_VERSION,
  MODULE_ID,
  MODULE_VERSION
} from "../constants.js";
import { componentRegistry } from "../effect-engine/component-registry.js";
import { createEffectApi } from "./effect-api.js";
import { openEffectForge } from "../effect-forge/effect-forge.js";

export function initializePublicApi() {
  const module = game.modules.get(MODULE_ID);
  if (!module) throw new Error(`Module ${MODULE_ID} is unavailable.`);

  const api = Object.freeze({
    version: API_VERSION,
    moduleVersion: MODULE_VERSION,
    schemaVersion: EFFECT_SCHEMA_VERSION,
    effects: createEffectApi(),
    components: Object.freeze({
      register: (handler, options = {}) => componentRegistry.register(handler, options),
      unregister: (type) => componentRegistry.unregister(type),
      get: (type) => componentRegistry.get(type),
      list: () => componentRegistry.list()
    }),
    ui: Object.freeze({ openEffectForge }),
    cards: Object.freeze({
      registerPack() { throw new Error("Critical-card registration is planned for a later milestone."); },
      registerCard() { throw new Error("Critical-card registration is planned for a later milestone."); }
    })
  });

  module.api = api;
  return api;
}
