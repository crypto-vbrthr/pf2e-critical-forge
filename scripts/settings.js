import { MODULE_ID, SETTINGS } from "./constants.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.ENABLE_EFFECT_FORGE, {
    name: "PF2E_CRITICAL_FORGE.Settings.EnableEffectForge.Name",
    hint: "PF2E_CRITICAL_FORGE.Settings.EnableEffectForge.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });

  game.settings.register(MODULE_ID, SETTINGS.ENABLE_CRITICAL_FORGE, {
    name: "PF2E_CRITICAL_FORGE.Settings.EnableCriticalForge.Name",
    hint: "PF2E_CRITICAL_FORGE.Settings.EnableCriticalForge.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true
  });
}
