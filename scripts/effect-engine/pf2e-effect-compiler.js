import { MODULE_ID, EFFECT_SCHEMA_VERSION } from "../constants.js";

function normalizeDuration(duration) {
  if (!duration || duration.unit === "unlimited") {
    return { value: -1, unit: "unlimited", expiry: null, sustained: false };
  }

  return {
    value: duration.value,
    unit: duration.unit,
    expiry: duration.expiry ?? "turn-end",
    sustained: false
  };
}

export function buildPf2eEffectSource(compiled) {
  return {
    name: compiled.name,
    type: "effect",
    img: compiled.img,
    system: {
      description: { value: compiled.description ?? "", gm: "" },
      rules: foundry.utils.deepClone(compiled.rules),
      slug: null,
      traits: { value: [], otherTags: [] },
      level: { value: 1 },
      duration: normalizeDuration(compiled.duration),
      start: { value: 0, initiative: null },
      badge: null,
      tokenIcon: { show: true },
      unidentified: false
    },
    flags: {
      [MODULE_ID]: {
        schemaVersion: EFFECT_SCHEMA_VERSION,
        definitionId: compiled.id,
        originModule: compiled.metadata?.originModule ?? MODULE_ID,
        originFeature: compiled.metadata?.originFeature ?? "effect-engine"
      }
    }
  };
}
