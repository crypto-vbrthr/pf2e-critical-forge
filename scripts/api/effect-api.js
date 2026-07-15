import { validateEffectDefinition } from "../effect-engine/effect-validator.js";
import { analyzeEffectDefinition } from "../effect-engine/validation/validation-engine.js";
import { compileEffectDefinition } from "../effect-engine/compiler/effect-compiler.js";
import { checkEffectCompatibility } from "../effect-engine/effect-compatibility.js";
import {
  applyEffectToTargets,
  createWorldEffectItem,
  updateEffectItem,
  removeEffectsByDefinitionId
} from "../effect-engine/effect-application.js";
import { buildPf2eEffectSource } from "../effect-engine/compiler/pf2e-item-builder.js";
import { NotImplementedError } from "../core/errors.js";
import { extractEffectDefinitionFromItem } from "../effect-engine/item-definition-adapter.js";
import { migrateEffectDefinition } from "../effect-engine/migration/migration-engine.js";
import {
  createEffectExportPackage,
  parseEffectImport,
  serializeEffectExport
} from "../effect-forge/effect-transfer.js";

export function createEffectApi() {
  return Object.freeze({
    migrate: (definition, options = {}) => migrateEffectDefinition(definition, options),
    validate: (definition) => validateEffectDefinition(definition),
    analyze: (definition, context = {}) => analyzeEffectDefinition(definition, context),
    compile: (definition, context = {}) => compileEffectDefinition(definition, context),

    async toItemSource(definition, context = {}) {
      const compiled = await compileEffectDefinition(definition, context);
      return buildPf2eEffectSource(compiled);
    },

    createItem: (definition, options = {}) => createWorldEffectItem(definition, options),
    readItem: (item) => extractEffectDefinitionFromItem(item),
    createExport: (definition, options = {}) => createEffectExportPackage(definition, options),
    serializeExport: (definition, options = {}) => serializeEffectExport(definition, options),
    parseImport: (value, options = {}) => parseEffectImport(value, options),
    updateItem: (item, definition, options = {}) => updateEffectItem(item, definition, options),
    apply: (definition, targets, options = {}) => applyEffectToTargets(definition, targets, options),
    remove: (definitionId, targets) => removeEffectsByDefinitionId(definitionId, targets),
    checkCompatibility: (definition, target, options = {}) =>
      checkEffectCompatibility(definition, target, options),

    async postToChat() { throw new NotImplementedError(); },
    createDragData() { throw new NotImplementedError(); }
  });
}
