import { EFFECT_SCHEMA_VERSION } from "../../constants.js";
import { deepClone } from "../utils.js";
import { userLocalizationKey } from "./card-editor-model.js";

export function cardEffectToForgeDefinition(card) {
  const template = deepClone(card?.effect?.definition ?? {});
  return {
    schemaVersion: template.schemaVersion ?? EFFECT_SCHEMA_VERSION,
    id: template.id ?? `critical-forge.${card.id}`,
    name: card?.effect?.fallbackName ?? card?.fallbackTitle ?? card?.id ?? "Critical Card Effect",
    description: template.description ?? card?.fallbackDescription ?? "",
    img: template.img ?? "icons/svg/aura.svg",
    duration: template.duration ?? { value: 1, unit: "rounds", expiry: "turn-end" },
    components: template.components ?? [],
    application: template.application ?? {},
    metadata: template.metadata ?? {}
  };
}

export function forgeDefinitionToCardEffect(card, definition, {
  target = null,
  nameKey = null,
  fallbackName = null
} = {}) {
  const template = deepClone(definition ?? {});
  delete template.name;
  return {
    target: target ?? card?.effect?.target ?? "target",
    nameKey: nameKey ?? card?.effect?.nameKey ?? userLocalizationKey(card?.id ?? "custom", "EffectName"),
    fallbackName: fallbackName ?? card?.effect?.fallbackName ?? card?.fallbackTitle ?? "Critical Card Effect",
    definition: template
  };
}
