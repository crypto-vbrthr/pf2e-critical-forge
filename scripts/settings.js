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
    default: false,
    requiresReload: true
  });
  game.settings.register(MODULE_ID, SETTINGS.CRITICAL_CARD_VISIBILITY, {
    name: "PF2E_CRITICAL_FORGE.Settings.CriticalCardVisibility.Name",
    hint: "PF2E_CRITICAL_FORGE.Settings.CriticalCardVisibility.Hint",
    scope: "world",
    config: true,
    type: String,
    choices: {
      blind: "PF2E_CRITICAL_FORGE.Settings.CriticalCardVisibility.Choices.Blind",
      gm: "PF2E_CRITICAL_FORGE.Settings.CriticalCardVisibility.Choices.Gm",
      public: "PF2E_CRITICAL_FORGE.Settings.CriticalCardVisibility.Choices.Public",
      self: "PF2E_CRITICAL_FORGE.Settings.CriticalCardVisibility.Choices.Self"
    },
    default: "blind"
  });

  game.settings.register(MODULE_ID, SETTINGS.EFFECT_FORGE_WINDOW_STATE, {
    name: "Effect Forge Window State",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

}
