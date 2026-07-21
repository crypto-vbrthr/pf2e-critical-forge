import {
  documentIdentity,
  extractRollOptionValues,
  firstDefined,
  getPath,
  normalizeSlug,
  uniqueSlugs
} from "./context-utils.js";

export function resolveSourceActor(input = {}, item = null) {
  return firstDefined(
    input.sourceActor,
    input.sourceToken?.actor,
    input.message?.speakerActor,
    input.message?.actor,
    item?.actor,
    input.strike?.item?.actor
  ) ?? null;
}

export function resolveTargetActor(input = {}) {
  return firstDefined(
    input.targetActor,
    input.targetToken?.actor,
    input.message?.target?.actor
  ) ?? null;
}

export function readActorContext(actor, {
  role,
  explicitTraits = [],
  rollOptions = [],
  token = null,
  flaggedReference = null
} = {}) {
  const prefix = role === "target" ? "target:trait" : "self:trait";
  const actorTraits = actor?.traits instanceof Set
    ? [...actor.traits]
    : getPath(actor, "system.traits.value") ?? actor?.traits ?? [];
  const traits = uniqueSlugs(
    explicitTraits,
    actorTraits,
    extractRollOptionValues(rollOptions, prefix)
  );

  const identity = documentIdentity(actor);
  const tokenIdentity = documentIdentity(token);
  const referenceActor = flaggedReference?.actor ?? null;
  const referenceToken = flaggedReference?.token ?? null;
  const level = finiteNumber(firstDefined(actor?.level, getPath(actor, "system.details.level.value")));
  const size = normalizeSlug(firstDefined(actor?.size, getPath(actor, "system.traits.size.value"))) || null;

  // A concrete Actor or Token resolved for this roll is authoritative. PF2e
  // context references are useful fallbacks, but they may still describe the
  // spell origin on saving-throw messages. Never let such a flag replace the
  // identity of the Actor that was actually resolved as the participant.
  const preferredActorUuid = identity?.uuid ?? normalizeReference(referenceActor) ?? null;
  const preferredTokenUuid = tokenIdentity?.uuid ?? normalizeReference(referenceToken) ?? null;

  return {
    actor,
    traits,
    metadata: {
      ...(identity ?? { id: null, uuid: null, name: null, type: null }),
      uuid: preferredActorUuid,
      level,
      size,
      token: preferredTokenUuid
    }
  };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeReference(value) {
  if (!value) return null;
  if (typeof value === "string") return value.trim() || null;
  return documentIdentity(value)?.uuid ?? null;
}
