import { EFFECT_SCHEMA_VERSION, MODULE_ID } from "../../constants.js";

export function buildEffectFlags(compiled) {
  return {
    [MODULE_ID]: {
      schemaVersion: EFFECT_SCHEMA_VERSION,
      definitionId: compiled.id,
      definition: {
        schemaVersion: compiled.schemaVersion,
        id: compiled.id,
        name: compiled.name,
        description: compiled.description,
        img: compiled.img,
        duration: compiled.duration,
        application: compiled.application,
        metadata: compiled.metadata
      },
      originModule: compiled.metadata?.originModule ?? MODULE_ID,
      originFeature: compiled.metadata?.originFeature ?? "effect-engine"
    }
  };
}
