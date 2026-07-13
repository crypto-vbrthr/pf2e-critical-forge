import { buildPf2eDuration } from "./duration-builder.js";
import { buildEffectFlags } from "./flag-builder.js";
import { collectRuleElements } from "./rule-builder.js";

export function buildPf2eEffectSource(compiled) {
  return {
    name: compiled.name,
    type: "effect",
    img: compiled.img,
    system: {
      description: { value: compiled.description ?? "", gm: "" },
      rules: collectRuleElements(compiled.components),
      slug: null,
      traits: { value: [], otherTags: [] },
      level: { value: 1 },
      duration: buildPf2eDuration(compiled.duration),
      start: { value: 0, initiative: null },
      badge: null,
      tokenIcon: { show: true },
      unidentified: false
    },
    flags: buildEffectFlags(compiled)
  };
}
