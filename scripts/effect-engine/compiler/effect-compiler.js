import { componentRegistry } from "../component-registry.js";
import { validateEffectDefinition } from "../effect-validator.js";
import { EffectValidationError } from "../../core/errors.js";

export async function compileEffectDefinition(definition, context = {}) {
  const validation = validateEffectDefinition(definition);
  if (!validation.valid) throw new EffectValidationError(validation);

  const cloned = foundry.utils.deepClone(definition);
  const components = [];
  for (const [index, component] of cloned.components.entries()) {
    const handler = componentRegistry.get(component.type);
    components.push(await handler.compile(component, {
      ...context,
      definition: cloned,
      index,
      duration: cloned.duration ?? null
    }));
  }

  return Object.freeze({
    schemaVersion: cloned.schemaVersion,
    id: cloned.id ?? null,
    name: cloned.name,
    description: cloned.description ?? "",
    img: cloned.img ?? "icons/svg/aura.svg",
    duration: cloned.duration ?? { value: -1, unit: "unlimited", expiry: null },
    components,
    application: cloned.application ?? {},
    metadata: cloned.metadata ?? {},
    validation
  });
}
