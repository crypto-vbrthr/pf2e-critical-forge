import { MODULE_ID, SETTINGS } from "./constants.js";
import { registerSettings } from "./settings.js";
import { initializeEffectEngine } from "./effect-engine/effect-engine.js";
import { initializePublicApi } from "./api/public-api.js";
import { initializeEffectForgeUi } from "./effect-forge/effect-forge.js";
import { initializeCriticalForge } from "./critical-forge/critical-forge.js";
import { initializeCriticalDiagnosticUi } from "./critical-forge/diagnostics/critical-diagnostic-ui.js";
import { initializeCriticalCardApplicationUi } from "./critical-forge/presentation/critical-card-application.js";
import { initializeCriticalCardRedrawUi } from "./critical-forge/presentation/critical-card-redraw.js";
import { initializeCriticalRollAutomation } from "./critical-forge/automation/critical-roll-automation.js";
import { initializeConditionCatalog } from "./effect-engine/catalogs/condition-catalog.js";
import { initializeCustomCardPacks } from "./critical-forge/editor/card-pack-store.js";
import { initializeDurationBundleHooks } from "./effect-engine/duration-bundle-hooks.js";

Hooks.once("init", () => {
  registerSettings();
  initializeEffectEngine();
  initializeCriticalForge();
  initializePublicApi();
  initializeDurationBundleHooks();
});

Hooks.once("ready", async () => {
  const api = game.modules.get(MODULE_ID)?.api;

  try {
    await initializeConditionCatalog();
  } catch (error) {
    console.warn(`${MODULE_ID} | Condition catalog initialization failed; fallback metadata remains available.`, error);
  }

  try {
    await initializeCustomCardPacks();
  } catch (error) {
    console.error(`${MODULE_ID} | Custom Critical Forge card packs could not be loaded.`, error);
  }

  if (game.settings.get(MODULE_ID, SETTINGS.ENABLE_EFFECT_FORGE)) {
    initializeEffectForgeUi();
  }

  if (game.settings.get(MODULE_ID, SETTINGS.ENABLE_CRITICAL_FORGE)) {
    initializeCriticalDiagnosticUi();
    initializeCriticalCardApplicationUi();
    initializeCriticalCardRedrawUi();
    initializeCriticalRollAutomation();
  }

  Hooks.callAll("pf2eCriticalForgeReady", api);
  console.info(`${MODULE_ID} | Ready`, {
    apiVersion: api?.version,
    schemaVersion: api?.schemaVersion,
    components: api?.components.list(),
    criticalCardPacks: api?.cards.listPacks().length,
    criticalCards: api?.cards.list().length
  });
});
