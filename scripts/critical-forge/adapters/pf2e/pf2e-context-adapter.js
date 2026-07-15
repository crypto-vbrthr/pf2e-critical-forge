import { deepFreeze } from "../../utils.js";
import { normalizeSelectionContext } from "../../selection/card-matcher.js";
import { readActorContext, resolveSourceActor, resolveTargetActor } from "./actor-context-reader.js";
import { collectRollOptions, readAttackContext, resolveAttackItem } from "./attack-context-reader.js";
import { createAdapterReport, diagnostic } from "./context-diagnostics.js";
import { getPath, uniqueSlugs } from "./context-utils.js";
import { readRollResult } from "./roll-result-reader.js";

export const PF2E_CONTEXT_ADAPTER_VERSION = "1.0.0";

export function createPf2eSelectionContext(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    const context = normalizeSelectionContext({});
    return createAdapterReport({
      context,
      metadata: emptyMetadata(),
      diagnostics: [diagnostic("PF2E_CONTEXT_INPUT_INVALID", { severity: "error", path: "input" })]
    });
  }

  const diagnostics = [];
  const rollResult = readRollResult(input);
  const rollOptions = collectRollOptions(input, rollResult);
  const item = resolveAttackItem(input);
  const attack = readAttackContext(item, {
    input,
    rollOptions,
    damageRollFlag: rollResult.damageRollFlag
  });
  const sourceActor = resolveSourceActor(input, item);
  const targetActor = resolveTargetActor(input);
  const sourceReference = actorReference(rollResult.contextFlag) ?? rollResult.contextFlag?.origin ?? null;
  const targetReference = rollResult.contextFlag?.target ?? null;
  const source = readActorContext(sourceActor, {
    role: "source",
    explicitTraits: input.sourceTraits,
    rollOptions,
    token: input.sourceToken ?? input.message?.token,
    flaggedReference: sourceReference
  });
  const target = readActorContext(targetActor, {
    role: "target",
    explicitTraits: input.targetTraits,
    rollOptions,
    token: input.targetToken ?? input.message?.target?.token,
    flaggedReference: targetReference
  });

  const context = normalizeSelectionContext({
    category: rollResult.category ?? "",
    damageTypes: attack.damageTypes,
    weaponGroups: attack.weaponGroups,
    attackTraits: attack.attackTraits,
    sourceTraits: source.traits,
    targetTraits: target.traits,
    requiredTags: uniqueSlugs(input.requiredTags),
    excludedTags: uniqueSlugs(input.excludedTags)
  });

  if (!context.category) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_CATEGORY_UNRESOLVED", {
      severity: "error",
      path: "category",
      data: { degreeOfSuccess: rollResult.degree?.index ?? null }
    }));
  }
  if (rollResult.degree && ![0, 3].includes(rollResult.degree.index)) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_OUTCOME_NOT_CRITICAL", {
      severity: "info",
      path: "degreeOfSuccess",
      data: { outcome: rollResult.degree.key }
    }));
  }
  if (!item) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_ITEM_UNRESOLVED", {
      severity: "info",
      path: "item"
    }));
  }
  if (!sourceActor && !source.metadata.uuid) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_SOURCE_UNRESOLVED", {
      severity: "info",
      path: "sourceActor"
    }));
  }
  if (!targetActor && !target.metadata.uuid) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_TARGET_UNRESOLVED", {
      severity: "info",
      path: "targetActor"
    }));
  }
  if (!context.damageTypes.length) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_DAMAGE_TYPES_EMPTY", {
      severity: "info",
      path: "damageTypes"
    }));
  }

  const metadata = deepFreeze({
    adapter: "pf2e",
    adapterVersion: PF2E_CONTEXT_ADAPTER_VERSION,
    degreeOfSuccess: rollResult.degree,
    outcome: rollResult.degree?.key ?? null,
    roll: {
      type: rollResult.rollType,
      identifier: rollResult.identifier,
      action: rollResult.action,
      dieResult: rollResult.dieResult,
      isNatural20: rollResult.isNatural20,
      isNatural1: rollResult.isNatural1
    },
    source: source.metadata,
    target: target.metadata,
    attack: attack.metadata,
    rollOptions,
    provenance: {
      category: rollResult.categorySource,
      damageTypes: attack.damageTypes.length ? "attack" : null,
      weaponGroups: attack.weaponGroups.length ? "attack" : null,
      attackTraits: attack.attackTraits.length ? "attack" : null,
      sourceTraits: source.traits.length ? "actor-or-roll-options" : null,
      targetTraits: target.traits.length ? "actor-or-roll-options" : null
    }
  });

  return createAdapterReport({ context, metadata, diagnostics });
}

function actorReference(contextFlag) {
  if (!contextFlag) return null;
  const actor = getPath(contextFlag, "actor");
  const token = getPath(contextFlag, "token");
  return actor || token ? { actor, token } : null;
}

function emptyMetadata() {
  return deepFreeze({
    adapter: "pf2e",
    adapterVersion: PF2E_CONTEXT_ADAPTER_VERSION,
    degreeOfSuccess: null,
    outcome: null,
    roll: { type: null, identifier: null, action: null, dieResult: null, isNatural20: false, isNatural1: false },
    source: null,
    target: null,
    attack: null,
    rollOptions: [],
    provenance: {}
  });
}
