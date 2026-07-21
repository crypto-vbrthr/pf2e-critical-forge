import { deepFreeze } from "../../utils.js";
import { normalizeSelectionContext } from "../../selection/card-matcher.js";
import { readActorContext, resolveSourceActor, resolveTargetActor } from "./actor-context-reader.js";
import { collectRollOptions, readAttackContext, resolveAttackItem } from "./attack-context-reader.js";
import { createAdapterReport, diagnostic } from "./context-diagnostics.js";
import { getPath, uniqueSlugs } from "./context-utils.js";
import { readRollResult, resolveCriticalCategory } from "./roll-result-reader.js";
import { readSaveContext } from "./save-context-reader.js";
import { createPf2eContextSnapshot } from "./pf2e-context-snapshot.js";

export const PF2E_CONTEXT_ADAPTER_VERSION = "1.3.0";

export function createPf2eSelectionContext(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    const context = normalizeSelectionContext({});
    const metadata = emptyMetadata();
    const diagnostics = [diagnostic("PF2E_CONTEXT_INPUT_INVALID", { severity: "error", path: "input" })];
    const snapshot = createPf2eContextSnapshot({ context, metadata, diagnostics });
    return createAdapterReport({ context, metadata, diagnostics, snapshot });
  }

  const diagnostics = [];
  const item = resolveAttackItem(input);
  const rollResult = readRollResult(input);
  const rollOptions = collectRollOptions(input, rollResult);
  const attack = readAttackContext(item, {
    input,
    rollOptions,
    damageRollFlag: rollResult.damageRollFlag,
    rollResult
  });
  const save = readSaveContext(input, rollResult, rollOptions);
  const resolvedCategory = resolveCriticalCategory(rollResult, { isSpell: attack.metadata.isSpell });
  rollResult.category = resolvedCategory.category;
  rollResult.categorySource = resolvedCategory.source;
  if (attack.metadata.isSpell && rollResult.rollFamily === "attack") rollResult.rollFamily = "spellAttack";

  const sourceActor = resolveSourceActor(input, item);
  const targetActor = resolveTargetActor(input);
  const references = actorReferences(rollResult.contextFlag, rollResult.rollFamily);
  const source = readActorContext(sourceActor, {
    role: "source",
    explicitTraits: input.sourceTraits,
    rollOptions,
    token: input.sourceToken ?? input.message?.token,
    flaggedReference: references.source
  });
  const target = readActorContext(targetActor, {
    role: "target",
    explicitTraits: input.targetTraits,
    rollOptions,
    token: input.targetToken ?? input.message?.target?.token,
    flaggedReference: references.target
  });

  const context = normalizeSelectionContext({
    category: rollResult.category ?? "",
    damageTypes: attack.damageTypes,
    weaponGroups: attack.weaponGroups,
    attackTraits: attack.attackTraits,
    saveTypes: save.saveTypes,
    spellTraditions: attack.spellTraditions,
    spellTraits: attack.spellTraits,
    sourceTraits: source.traits,
    targetTraits: target.traits,
    requiredTags: uniqueSlugs(input.requiredTags),
    excludedTags: uniqueSlugs(input.excludedTags)
  });

  if (!context.category) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_CATEGORY_UNRESOLVED", {
      severity: "error",
      path: "category",
      data: { degreeOfSuccess: rollResult.degree?.index ?? null, rollFamily: rollResult.rollFamily }
    }));
  }
  if (rollResult.degree && ![0, 3].includes(rollResult.degree.index)) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_OUTCOME_NOT_CRITICAL", {
      severity: "info",
      path: "degreeOfSuccess",
      data: { outcome: rollResult.degree.key }
    }));
  }
  const attackCategory = ["criticalHit", "criticalFumble", "spellCriticalHit", "spellCriticalFumble"].includes(context.category);
  if (attackCategory && !item) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_ITEM_UNRESOLVED", {
      severity: "info",
      path: "item"
    }));
  }
  if (context.category.startsWith("savingThrow") && !context.saveTypes.length) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_SAVE_TYPE_UNRESOLVED", {
      severity: "info",
      path: "saveTypes"
    }));
  }
  if (context.category.startsWith("spellCritical") && !attack.metadata.isSpell) {
    diagnostics.push(diagnostic("PF2E_CONTEXT_SPELL_UNRESOLVED", {
      severity: "warning",
      path: "spell"
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
  if (attackCategory && !context.damageTypes.length) {
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
      family: rollResult.rollFamily,
      identifier: rollResult.identifier,
      action: rollResult.action,
      dieResult: rollResult.dieResult,
      isNatural20: rollResult.isNatural20,
      isNatural1: rollResult.isNatural1
    },
    source: source.metadata,
    target: target.metadata,
    attack: attack.metadata,
    save: save.metadata,
    spell: {
      isSpell: attack.metadata.isSpell,
      rank: attack.metadata.spellRank,
      traditions: attack.spellTraditions,
      traits: attack.spellTraits
    },
    rollOptions,
    provenance: {
      category: rollResult.categorySource,
      damageTypes: attack.damageTypes.length ? "attack-or-spell" : null,
      weaponGroups: attack.weaponGroups.length ? "attack" : null,
      attackTraits: attack.attackTraits.length ? "attack" : null,
      saveTypes: save.saveTypes.length ? "saving-throw" : null,
      spellTraditions: attack.spellTraditions.length ? "spell" : null,
      spellTraits: attack.spellTraits.length ? "spell" : null,
      sourceTraits: source.traits.length ? "actor-or-roll-options" : null,
      targetTraits: target.traits.length ? "actor-or-roll-options" : null
    }
  });

  const snapshot = createPf2eContextSnapshot({
    input,
    context,
    metadata,
    diagnostics,
    sourceActor,
    targetActor,
    sourceToken: input.sourceToken ?? input.message?.token ?? null,
    targetToken: input.targetToken ?? input.message?.target?.token ?? null
  });

  return createAdapterReport({ context, metadata, diagnostics, snapshot });
}

function actorReferences(contextFlag, rollFamily) {
  if (!contextFlag) return { source: null, target: null };
  const root = actorReference(contextFlag);
  const origin = contextFlag.origin ?? null;
  const target = contextFlag.target ?? null;
  if (rollFamily === "savingThrow") {
    const roller = target && !sameActorReference(target, origin) ? target : root;
    const cause = origin ?? (root && !sameActorReference(root, roller) ? root : null);
    return {
      source: roller ?? root ?? null,
      target: cause ?? null
    };
  }
  return {
    source: origin ?? root ?? null,
    target: target ?? null
  };
}

function sameActorReference(left, right) {
  if (!left || !right) return false;
  const leftActor = referenceValue(left, "actor");
  const rightActor = referenceValue(right, "actor");
  if (leftActor && rightActor) return leftActor === rightActor;
  const leftToken = referenceValue(left, "token");
  const rightToken = referenceValue(right, "token");
  return Boolean(leftToken && rightToken && leftToken === rightToken);
}

function referenceValue(reference, key) {
  if (!reference) return null;
  if (typeof reference === "string") return key === "actor" ? reference : null;
  const value = reference[key];
  if (typeof value === "string") return value;
  return value?.uuid ?? value?.id ?? value?._id ?? null;
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
    roll: { type: null, family: null, identifier: null, action: null, dieResult: null, isNatural20: false, isNatural1: false },
    source: null,
    target: null,
    attack: null,
    save: null,
    spell: null,
    rollOptions: [],
    provenance: {}
  });
}
