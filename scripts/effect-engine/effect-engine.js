import { componentRegistry } from "./component-registry.js";
import { conditionComponent } from "./components/condition-component.js";
import { modifierComponent } from "./components/modifier-component.js";
import { persistentDamageComponent } from "./components/persistent-damage-component.js";
import { resistanceComponent } from "./components/resistance-component.js";
import { weaknessComponent } from "./components/weakness-component.js";
import { immunityComponent } from "./components/immunity-component.js";
import { fastHealingComponent } from "./components/fast-healing-component.js";
import { regenerationComponent } from "./components/regeneration-component.js";
import { temporaryHitPointsComponent } from "./components/temporary-hit-points-component.js";

let initialized = false;

export function initializeEffectEngine() {
  if (initialized) return;

  componentRegistry.register(conditionComponent);
  componentRegistry.register(modifierComponent);
  componentRegistry.register(persistentDamageComponent);
  componentRegistry.register(resistanceComponent);
  componentRegistry.register(weaknessComponent);
  componentRegistry.register(immunityComponent);
  componentRegistry.register(fastHealingComponent);
  componentRegistry.register(regenerationComponent);
  componentRegistry.register(temporaryHitPointsComponent);

  initialized = true;
}

export function isEffectEngineInitialized() {
  return initialized;
}
