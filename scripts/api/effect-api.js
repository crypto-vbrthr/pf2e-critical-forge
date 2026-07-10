import { validateEffectDefinition } from "../effect-engine/effect-validator.js";
import { compileEffectDefinition } from "../effect-engine/effect-compiler.js";
import { checkEffectCompatibility } from "../effect-engine/effect-compatibility.js";
import { NotImplementedError } from "../core/errors.js";

export function createEffectApi() {
  return Object.freeze({
    validate: (definition) => validateEffectDefinition(definition),
    compile: (definition, context = {}) => compileEffectDefinition(definition, context),
    checkCompatibility: (definition, target, options = {}) =>
      checkEffectCompatibility(definition, target, options),

    async createItem() {
      throw new NotImplementedError();
    },

    async apply() {
      throw new NotImplementedError();
    },

    async postToChat() {
      throw new NotImplementedError();
    },

    createDragData() {
      throw new NotImplementedError();
    }
  });
}
