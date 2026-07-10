import { MODULE_ID, SETTINGS } from "./constants.js";
import { registerSettings } from "./settings.js";
import { initializeEffectEngine } from "./effect-engine/effect-engine.js";
import { initializePublicApi } from "./api/public-api.js";
import { initializeEffectForgeUi } from "./effect-forge/effect-forge.js";
import { initializeCriticalForge } from "./critical-forge/critical-forge.js";

Hooks.once("init", () => {
  registerSettings();
  initializeEffectEngine();
  initializePublicApi();
});

Hooks.once("ready", () => {
  const api = game.modules.get(MODULE_ID)?.api;

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
