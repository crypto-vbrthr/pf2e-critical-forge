import { componentRegistry } from "./component-registry.js";
import { conditionComponent } from "./components/condition-component.js";
import { modifierComponent } from "./components/modifier-component.js";

let initialized = false;

export function initializeEffectEngine() {
  if (initialized) return;

  componentRegistry.register(conditionComponent);
  componentRegistry.register(modifierComponent);

  initialized = true;
}

export function isEffectEngineInitialized() {
  return initialized;
}
