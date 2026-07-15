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

  return {
    actor,
    traits,
    metadata: {
      ...(identity ?? { id: null, uuid: null, name: null, type: null }),
      uuid: identity?.uuid ?? referenceActor ?? null,
      level,
      size,
      token: tokenIdentity?.uuid ?? referenceToken ?? null
    }
  };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
