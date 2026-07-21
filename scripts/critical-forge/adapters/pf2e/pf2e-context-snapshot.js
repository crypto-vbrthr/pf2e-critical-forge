import { CriticalContextBuilder } from "../../context/context-builder.js";
import { getPath } from "./context-utils.js";

export const PF2E_CONTEXT_SNAPSHOT_PROVIDER_ID = "core-pf2e";
export const PF2E_CONTEXT_SNAPSHOT_PROVIDER_VERSION = "1.0.0";

export function createPf2eContextSnapshot({
  input = {},
  context = {},
  metadata = {},
  diagnostics = [],
  sourceActor = null,
  targetActor = null,
  sourceToken = null,
  targetToken = null
} = {}) {
  const message = input.message ?? {};
  const combat = input.combat ?? globalThis.game?.combat ?? null;
  const scene = sourceToken?.scene
    ?? sourceToken?.document?.parent
    ?? targetToken?.scene
    ?? targetToken?.document?.parent
    ?? globalThis.canvas?.scene
    ?? null;
  const selectedTargets = input.targetTokens ?? globalThis.game?.user?.targets ?? null;

  const builder = new CriticalContextBuilder({
    system: "pf2e",
    provider: PF2E_CONTEXT_SNAPSHOT_PROVIDER_ID,
    providerVersion: PF2E_CONTEXT_SNAPSHOT_PROVIDER_VERSION,
    capturedAt: input.contextTimestamp ?? message.timestamp ?? message.time ?? null
  });

  builder
    .setMessage({
      id: message.id ?? message._id,
      uuid: message.uuid,
      timestamp: message.timestamp ?? message.time,
      authorId: message.author?.id ?? message.user?.id ?? message.user,
      speaker: message.speaker?.alias ?? message.alias ?? null
    })
    .setRoll({
      category: context.category,
      family: metadata.roll?.family,
      type: metadata.roll?.type,
      identifier: metadata.roll?.identifier,
      action: metadata.roll?.action,
      outcome: metadata.outcome,
      degree: metadata.degreeOfSuccess?.index,
      dieResult: metadata.roll?.dieResult,
      isNatural20: metadata.roll?.isNatural20,
      isNatural1: metadata.roll?.isNatural1,
      saveType: metadata.save?.type ?? context.saveTypes?.[0] ?? null,
      dc: metadata.save?.dc
    })
    .setItem(metadata.attack ?? {})
    .setParticipant("source", participantSnapshot(sourceActor, sourceToken, metadata.source))
    .setParticipant("target", participantSnapshot(targetActor, targetToken, metadata.target))
    .setRoles({
      roller: "source",
      opponent: "target",
      legacySource: "source",
      legacyTarget: "target"
    })
    .setBattlefield({
      sceneId: scene?.id ?? scene?._id,
      sceneUuid: scene?.uuid,
      combatId: combat?.id ?? combat?._id,
      combatUuid: combat?.uuid,
      round: combat?.round,
      turn: combat?.turn,
      selectedTargetCount: collectionSize(selectedTargets),
      hostileThreatCount: input.hostileThreatCount,
      threatEvaluation: input.hostileThreatCount == null ? "not-evaluated" : "explicit"
    })
    .setSelection(context)
    .setProvenance({
      ...(metadata.provenance ?? {}),
      participants: {
        source: participantProvenance(sourceActor, sourceToken, metadata.source),
        target: participantProvenance(targetActor, targetToken, metadata.target)
      }
    });

  for (const entry of diagnostics) builder.addDiagnostic(entry);
  return builder.build();
}

function participantSnapshot(actor, token, metadata = {}) {
  const hp = getPath(actor, "system.attributes.hp") ?? {};
  return {
    id: metadata?.id ?? actor?.id ?? actor?._id,
    uuid: metadata?.uuid ?? actor?.uuid,
    tokenUuid: metadata?.token ?? token?.uuid ?? token?.document?.uuid,
    name: metadata?.name ?? actor?.name,
    type: metadata?.type ?? actor?.type,
    level: metadata?.level ?? actor?.level ?? getPath(actor, "system.details.level.value"),
    size: metadata?.size ?? actor?.size ?? getPath(actor, "system.traits.size.value"),
    traits: actorTraits(actor),
    hp: {
      current: hp.value,
      max: hp.max,
      temp: hp.temp
    },
    conditions: {
      wounded: conditionValue(actor, "wounded"),
      dying: conditionValue(actor, "dying"),
      frightened: conditionValue(actor, "frightened")
    },
    position: {
      x: token?.x ?? token?.document?.x,
      y: token?.y ?? token?.document?.y,
      elevation: token?.elevation ?? token?.document?.elevation
    },
    disposition: token?.document?.disposition ?? token?.disposition,
    defeated: token?.combatant?.defeated ?? token?.document?.combatant?.defeated ?? actor?.isDead
  };
}

function actorTraits(actor) {
  const traits = actor?.traits instanceof Set
    ? [...actor.traits]
    : getPath(actor, "system.traits.value") ?? actor?.traits ?? [];
  return Array.isArray(traits) ? traits : [...traits ?? []];
}

function conditionValue(actor, slug) {
  const direct = [
    getPath(actor, `system.attributes.${slug}.value`),
    getPath(actor, `system.conditions.${slug}.value`),
    getPath(actor, `system.attributes.${slug}`)
  ].find((value) => Number.isFinite(Number(value)));
  if (direct != null) return Number(direct);

  const candidates = [
    ...collectionContents(actor?.conditions),
    ...collectionContents(actor?.itemTypes?.condition)
  ];
  const condition = candidates.find((entry) => {
    const candidateSlug = String(entry?.slug ?? getPath(entry, "system.slug") ?? "").toLowerCase();
    return candidateSlug === slug;
  });
  if (!condition) return 0;
  const value = getPath(condition, "system.value.value")
    ?? getPath(condition, "system.value")
    ?? condition.value
    ?? 1;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function participantProvenance(actor, token, metadata = {}) {
  if (actor || token) return "resolved-document";
  if (metadata?.uuid || metadata?.token) return "pf2e-reference";
  return null;
}

function collectionContents(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  if (typeof collection.values === "function") return [...collection.values()];
  if (typeof collection[Symbol.iterator] === "function") return [...collection];
  return [];
}

function collectionSize(collection) {
  if (collection == null) return null;
  if (Number.isInteger(collection.size)) return collection.size;
  if (Array.isArray(collection)) return collection.length;
  if (Array.isArray(collection.contents)) return collection.contents.length;
  if (typeof collection[Symbol.iterator] === "function") return [...collection].length;
  return null;
}
