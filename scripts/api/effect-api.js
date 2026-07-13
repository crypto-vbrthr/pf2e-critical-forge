import { validateEffectDefinition } from "../effect-engine/effect-validator.js";
import { analyzeEffectDefinition } from "../effect-engine/validation/validation-engine.js";
import { compileEffectDefinition } from "../effect-engine/compiler/effect-compiler.js";
import { checkEffectCompatibility } from "../effect-engine/effect-compatibility.js";
import {
  applyEffectToTargets,
  createWorldEffectItem,
  removeEffectsByDefinitionId
} from "../effect-engine/effect-application.js";
import { buildPf2eEffectSource } from "../effect-engine/compiler/pf2e-item-builder.js";
import { NotImplementedError } from "../core/errors.js";

export function createEffectApi() {
  return Object.freeze({
    validate: (definition) => validateEffectDefinition(definition),
    analyze: (definition, context = {}) => analyzeEffectDefinition(definition, context),
    compile: (definition, context = {}) => compileEffectDefinition(definition, context),

    async toItemSource(definition, context = {}) {
      const compiled = await compileEffectDefinition(definition, context);
      return buildPf2eEffectSource(compiled);
    },

    createItem: (definition, options = {}) => createWorldEffectItem(definition, options),
    apply: (definition, targets, options = {}) => applyEffectToTargets(definition, targets, options),
    remove: (definitionId, targets) => removeEffectsByDefinitionId(definitionId, targets),
    checkCompatibility: (definition, target, options = {}) =>
      checkEffectCompatibility(definition, target, options),

    async postToChat() { throw new NotImplementedError(); },
    createDragData() { throw new NotImplementedError(); }
  });
}
