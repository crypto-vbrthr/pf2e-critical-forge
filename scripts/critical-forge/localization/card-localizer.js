import { EFFECT_SCHEMA_VERSION } from "../../constants.js";
import { EffectBuilder } from "../../effect-engine/builder/effect-builder.js";
import { analyzeEffectDefinition } from "../../effect-engine/validation/validation-engine.js";
import { deepClone } from "../utils.js";

function defaultLocalize(key) {
  const localized = globalThis.game?.i18n?.localize?.(key);
  return localized && localized !== key ? localized : null;
}

function resolveText(key, fallback, localize) {
  return localize(key) ?? fallback ?? key;
}

export function localizeCard(card, { localize = defaultLocalize } = {}) {
  return Object.freeze({
    id: card.id,
    packId: card.packId,
    category: card.category,
    title: resolveText(card.titleKey, card.fallbackTitle, localize),
    description: resolveText(card.descriptionKey, card.fallbackDescription, localize),
    effectName: card.effect
      ? resolveText(card.effect.nameKey, card.effect.fallbackName, localize)
      : null
  });
}

export function materializeCardEffect(card, { localize = defaultLocalize } = {}) {
  if (!card.effect) return null;
  const localized = localizeCard(card, { localize });
  const template = deepClone(card.effect.definition);
  const source = {
    schemaVersion: template.schemaVersion ?? EFFECT_SCHEMA_VERSION,
    id: template.id ?? `critical-forge.${card.id}`,
    name: localized.effectName,
    description: template.description ?? localized.description,
    img: template.img ?? "icons/svg/aura.svg",
    duration: template.duration,
    components: template.components ?? [],
    application: template.application ?? {},
    metadata: {
      ...(template.metadata ?? {}),
      criticalForge: {
        cardId: card.id,
        packId: card.packId,
        effectTarget: card.effect.target
      }
    }
  };
  const definition = EffectBuilder.from(source).build();
  const validation = analyzeEffectDefinition(definition);
  if (!validation.valid) {
    const error = new Error(`Critical card effect is invalid: ${card.id}`);
    error.validation = validation;
    throw error;
  }
  return Object.freeze({ target: card.effect.target, definition });
}
