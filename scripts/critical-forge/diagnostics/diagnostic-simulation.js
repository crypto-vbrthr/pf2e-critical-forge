import { analyzeEffectDefinition } from "../../effect-engine/validation/validation-engine.js";
import { criticalCardRegistry } from "../critical-forge.js";
import { materializeCardEffect } from "../localization/card-localizer.js";
import { summarizeCriticalEffectDefinition } from "../presentation/critical-card-preview.js";
import { deepClone, deepFreeze } from "../utils.js";

export async function simulateDiagnosticCard(cardOrId, {
  input = {},
  materializeEffectFn = materializeCardEffect,
  analyzeFn = analyzeEffectDefinition,
  summarizeFn = summarizeCriticalEffectDefinition
} = {}) {
  const card = typeof cardOrId === "string" ? criticalCardRegistry.get(cardOrId) : cardOrId;
  if (!card) return failure("CRITICAL_DIAGNOSTIC_CARD_UNAVAILABLE");

  const materialized = materializeEffectFn(card);
  if (!materialized?.definition) {
    return deepFreeze({
      valid: true,
      code: null,
      cardId: card.id,
      targetRole: materialized?.target ?? null,
      targetActorUuid: null,
      targetActorName: null,
      status: "narrative-only",
      definition: null,
      summary: null,
      validation: null,
      mutatedDocuments: false
    });
  }

  const targetRole = materialized.target;
  const actor = targetRole === "source"
    ? input?.sourceActor ?? input?.sourceToken?.actor ?? null
    : input?.targetActor ?? input?.targetToken?.actor ?? null;
  if (!actor) {
    return failure("CRITICAL_DIAGNOSTIC_SIMULATION_TARGET_UNRESOLVED", {
      cardId: card.id,
      targetRole,
      definition: deepClone(materialized.definition)
    });
  }

  const validation = analyzeFn(materialized.definition, { target: actor });
  return deepFreeze({
    valid: Boolean(validation?.valid),
    code: validation?.valid ? null : "CRITICAL_DIAGNOSTIC_SIMULATION_EFFECT_INVALID",
    cardId: card.id,
    targetRole,
    targetActorUuid: actor.uuid ?? actor.id ?? null,
    targetActorName: actor.name ?? null,
    status: validation?.valid ? "ready" : "invalid",
    definition: deepClone(materialized.definition),
    summary: summarizeFn(materialized.definition),
    validation: deepClone(validation ?? null),
    mutatedDocuments: false
  });
}

function failure(code, extra = {}) {
  return deepFreeze({
    valid: false,
    code,
    status: "failed",
    mutatedDocuments: false,
    ...deepClone(extra)
  });
}
