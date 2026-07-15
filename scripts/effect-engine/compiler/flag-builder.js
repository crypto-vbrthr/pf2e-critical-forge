import { EFFECT_SCHEMA_VERSION, MODULE_ID } from "../../constants.js";

export function buildEffectFlags(compiled) {
  const definition = compiled.definition
    ? foundry.utils.deepClone(compiled.definition)
    : {
        schemaVersion: compiled.schemaVersion,
        id: compiled.id,
        name: compiled.name,
        description: compiled.description,
        img: compiled.img,
        duration: compiled.duration,
        components: [],
        application: compiled.application,
        metadata: compiled.metadata
      };

  return {
    [MODULE_ID]: {
      schemaVersion: EFFECT_SCHEMA_VERSION,
      definitionId: compiled.id,
      definition,
      originModule: compiled.metadata?.originModule ?? MODULE_ID,
      originFeature: compiled.metadata?.originFeature ?? "effect-engine"
    }
  };
}
