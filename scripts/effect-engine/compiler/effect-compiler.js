import { componentRegistry } from "../component-registry.js";
import { validateEffectDefinition } from "../effect-validator.js";
import { EffectValidationError } from "../../core/errors.js";
import { normalizeDuration } from "../builder/duration-builder.js";
import {
  groupCompiledComponents,
  resolveComponentDuration
} from "./duration-grouper.js";

export async function compileEffectDefinition(definition, context = {}) {
  const validation = validateEffectDefinition(definition);
  if (!validation.valid) throw new EffectValidationError(validation);

  const cloned = foundry.utils.deepClone(definition);
  const globalDuration = foundry.utils.deepClone(normalizeDuration(cloned.duration));
  const components = [];

  for (const [index, component] of cloned.components.entries()) {
    const handler = componentRegistry.get(component.type);
    const resolved = resolveComponentDuration(component, globalDuration);
    const compiled = await handler.compile(component, {
      ...context,
      definition: cloned,
      index,
      duration: resolved.duration,
      globalDuration,
      durationSource: resolved.source
    });

    components.push(Object.freeze({
      ...compiled,
      componentIndex: index,
      duration: foundry.utils.deepFreeze(foundry.utils.deepClone(resolved.duration)),
      durationSource: resolved.source
    }));
  }

  const durationGroups = groupCompiledComponents(components, globalDuration);

  return Object.freeze({
    definition: foundry.utils.deepFreeze(foundry.utils.deepClone(cloned)),
    schemaVersion: cloned.schemaVersion,
    id: cloned.id ?? null,
    name: cloned.name,
    description: cloned.description ?? "",
    img: cloned.img ?? "icons/svg/aura.svg",
    duration: foundry.utils.deepFreeze(foundry.utils.deepClone(globalDuration)),
    components: Object.freeze(components),
    durationGroups: Object.freeze(durationGroups),
    requiresDurationSplit: durationGroups.length > 1,
    application: cloned.application ?? {},
    metadata: cloned.metadata ?? {},
    validation
  });
}
