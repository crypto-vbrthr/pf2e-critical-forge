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
