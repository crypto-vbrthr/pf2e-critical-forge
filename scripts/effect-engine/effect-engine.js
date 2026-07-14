import { componentRegistry } from "./component-registry.js";
import { conditionComponent } from "./components/condition-component.js";
import { modifierComponent } from "./components/modifier-component.js";
import { persistentDamageComponent } from "./components/persistent-damage-component.js";
import { resistanceComponent } from "./components/resistance-component.js";

let initialized = false;

export function initializeEffectEngine() {
  if (initialized) return;

  componentRegistry.register(conditionComponent);
  componentRegistry.register(modifierComponent);
  componentRegistry.register(persistentDamageComponent);
  componentRegistry.register(resistanceComponent);

  initialized = true;
}

export function isEffectEngineInitialized() {
  return initialized;
}
