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



  registerChoiceSetting(SETTINGS.CRITICAL_HIT_BEHAVIOR, "CriticalHitBehavior", {
    disabled: "Disabled", prompt: "Prompt", automatic: "Automatic"
  }, "prompt");
  registerChoiceSetting(SETTINGS.CRITICAL_FUMBLE_BEHAVIOR, "CriticalFumbleBehavior", {
    disabled: "Disabled", prompt: "Prompt", automatic: "Automatic"
  }, "prompt");
  registerChoiceSetting(SETTINGS.CRITICAL_HIT_TRIGGER, "CriticalHitTrigger", {
    all: "All", natural: "Natural"
  }, "all");
  registerChoiceSetting(SETTINGS.CRITICAL_FUMBLE_TRIGGER, "CriticalFumbleTrigger", {
    all: "All", natural: "Natural"
  }, "all");
  registerChoiceSetting(SETTINGS.CRITICAL_CARD_PROFILE, "CriticalCardProfile", {
    relaxed: "Relaxed", balanced: "Balanced", dramatic: "Dramatic", brutal: "Brutal", custom: "Custom"
  }, "balanced");
  registerChoiceSetting(SETTINGS.CRITICAL_CARD_CUSTOM_TONE, "CriticalCardCustomTone", {
    any: "Any", humorous: "Humorous", neutral: "Neutral", serious: "Serious", dramatic: "Dramatic"
  }, "any");
  registerChoiceSetting(SETTINGS.CRITICAL_CARD_CUSTOM_IMPACT, "CriticalCardCustomImpact", {
    any: "Any", narrative: "Narrative", light: "Light", moderate: "Moderate", strong: "Strong"
  }, "any");
  game.settings.register(MODULE_ID, SETTINGS.CRITICAL_CARD_ALLOW_REDRAW, {
    name: "PF2E_CRITICAL_FORGE.Settings.CriticalCardAllowRedraw.Name",
    hint: "PF2E_CRITICAL_FORGE.Settings.CriticalCardAllowRedraw.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });
  game.settings.register(MODULE_ID, SETTINGS.CRITICAL_CARD_HISTORY_SIZE, {
    name: "PF2E_CRITICAL_FORGE.Settings.CriticalCardHistorySize.Name",
    hint: "PF2E_CRITICAL_FORGE.Settings.CriticalCardHistorySize.Hint",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: { min: 1, max: 50, step: 1 }
  });
  game.settings.register(MODULE_ID, SETTINGS.CRITICAL_CARD_RECENT_HISTORY, {
    name: "Critical Card Recent History",
    scope: "world",
    config: false,
    type: Object,
    default: { cardIds: [] }
  });
  game.settings.register(MODULE_ID, SETTINGS.CRITICAL_CUSTOM_CARD_PACKS, {
    name: "Critical Forge Custom Card Packs",
    scope: "world",
    config: false,
    type: Object,
    default: { storageVersion: 1, packs: [] }
  });

  game.settings.register(MODULE_ID, SETTINGS.EFFECT_FORGE_WINDOW_STATE, {
    name: "Effect Forge Window State",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

}


function registerChoiceSetting(key, label, choices, defaultValue) {
  game.settings.register(MODULE_ID, key, {
    name: `PF2E_CRITICAL_FORGE.Settings.${label}.Name`,
    hint: `PF2E_CRITICAL_FORGE.Settings.${label}.Hint`,
    scope: "world",
    config: true,
    type: String,
    choices: Object.fromEntries(Object.entries(choices).map(([value, suffix]) => [
      value,
      `PF2E_CRITICAL_FORGE.Settings.${label}.Choices.${suffix}`
    ])),
    default: defaultValue
  });
}
