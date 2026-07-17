export class CriticalForgeError extends Error {
  constructor(message, options = {}) {
    super(message, options);
    this.name = this.constructor.name;
  }
}

export class EffectValidationError extends CriticalForgeError {
  constructor(result) {
    super(game.i18n.localize("PF2E_CRITICAL_FORGE.Errors.InvalidDefinition"));
    this.result = result;
  }
}

export class NotImplementedError extends CriticalForgeError {
  constructor() {
    super(game.i18n.localize("PF2E_CRITICAL_FORGE.Notifications.NotImplemented"));
  }
}

export class EffectDurationSplitError extends CriticalForgeError {
  constructor(count) {
    super(game.i18n.format("PF2E_CRITICAL_FORGE.Errors.DurationSplit", { count }));
    this.code = "EFFECT_DURATION_SPLIT_REQUIRED";
    this.count = count;
  }
}
