import { MODULE_ID, SETTINGS } from "./constants.js";
import { registerSettings } from "./settings.js";
import { initializeEffectEngine } from "./effect-engine/effect-engine.js";
import { initializePublicApi } from "./api/public-api.js";
import { initializeEffectForgeUi } from "./effect-forge/effect-forge.js";
import { initializeCriticalForge } from "./critical-forge/critical-forge.js";
import { initializeConditionCatalog } from "./effect-engine/catalogs/condition-catalog.js";

Hooks.once("init", () => {
  registerSettings();
  initializeEffectEngine();
  initializePublicApi();
});

Hooks.once("ready", async () => {
  const api = game.modules.get(MODULE_ID)?.api;

  try {
    await initializeConditionCatalog();
  } catch (error) {
    console.warn(`${MODULE_ID} | Condition catalog initialization failed; fallback metadata remains available.`, error);
  }

  if (game.settings.get(MODULE_ID, SETTINGS.ENABLE_EFFECT_FORGE)) {
    initializeEffectForgeUi();
  }

  if (game.settings.get(MODULE_ID, SETTINGS.ENABLE_CRITICAL_FORGE)) {
    initializeCriticalForge();
  }

  Hooks.callAll("pf2eCriticalForgeReady", api);
  console.info(`${MODULE_ID} | Ready`, {
    apiVersion: api?.version,
    schemaVersion: api?.schemaVersion,
    components: api?.components.list()
  });
});
