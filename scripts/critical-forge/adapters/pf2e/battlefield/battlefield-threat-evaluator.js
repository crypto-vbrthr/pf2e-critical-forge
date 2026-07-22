import { getPath } from "../context-utils.js";

export const PF2E_BATTLEFIELD_THREAT_EVALUATOR_VERSION = "1.0.0";

const COUNTED_PERCEPTION_STATES = new Set(["observed", "concealed", "hidden"]);
const EXCLUDED_PERCEPTION_STATES = new Set(["undetected", "unnoticed"]);
const ALLIANCE_PARTY = "party";
const ALLIANCE_OPPOSITION = "opposition";

/**
 * Determine which scene tokens currently threaten the rolling actor with a
 * usable melee Strike. The returned object contains only serializable data and
 * is therefore safe to place in a Critical Context Snapshot.
 */
export function evaluatePf2eBattlefieldThreats({
  actor = null,
  token = null,
  scene = null,
  input = {},
  tokens = null,
  lineOfSightTest = null,
  perceptionResolver = null
} = {}) {
  const sourceToken = normalizeToken(token) ?? resolveActorToken(actor, scene);
  const sourceActor = actor ?? sourceToken?.actor ?? null;
  const resolvedScene = scene
    ?? sourceToken?.scene
    ?? sourceToken?.document?.parent
    ?? globalThis.canvas?.scene
    ?? null;

  if (!sourceActor || !sourceToken || !resolvedScene) {
    return freezeResult({
      count: null,
      evaluation: "not-evaluated",
      source: participantIdentity(sourceActor, sourceToken),
      threats: [],
      summary: {
        candidateCount: 0,
        evaluatedCount: 0,
        countedCount: 0,
        rejectedCount: 0,
        reason: !sourceActor ? "source-actor-unresolved" : !sourceToken ? "source-token-unresolved" : "scene-unresolved"
      }
    });
  }

  const sceneTokens = resolveSceneTokens(tokens, resolvedScene);
  const threats = [];
  for (const candidate of sceneTokens) {
    const candidateToken = normalizeToken(candidate);
    if (!candidateToken || sameToken(candidateToken, sourceToken)) continue;
    threats.push(evaluateThreat(candidateToken, sourceToken, {
      sourceActor,
      scene: resolvedScene,
      input,
      lineOfSightTest,
      perceptionResolver
    }));
  }

  const countedCount = threats.filter((entry) => entry.counted).length;
  return freezeResult({
    count: countedCount,
    evaluation: "scene-analysis",
    source: participantIdentity(sourceActor, sourceToken),
    threats,
    summary: {
      candidateCount: threats.length,
      evaluatedCount: threats.length,
      countedCount,
      rejectedCount: threats.length - countedCount,
      reason: null
    }
  });
}

export function evaluatePf2eThreatToken(candidateToken, sourceToken, options = {}) {
  const normalizedCandidate = normalizeToken(candidateToken);
  const normalizedSource = normalizeToken(sourceToken);
  if (!normalizedCandidate || !normalizedSource) {
    throw new TypeError("Both a candidate token and source token are required.");
  }
  return Object.freeze(evaluateThreat(normalizedCandidate, normalizedSource, options));
}

export function collectPf2eMeleeThreatAttacks(actor) {
  if (!actor) return Object.freeze([]);
  const attacks = [];
  const seen = new Set();
  const actions = collectionContents(getPath(actor, "system.actions"));

  for (const [index, action] of actions.entries()) {
    if (!action || action.type !== "strike" || action.ready === false) continue;
    const item = action.item ?? action.weapon ?? null;
    if (!isMeleeItem(item, action)) continue;
    const reach = resolveAttackReach(actor, item, action);
    if (!(reach > 0)) continue;
    const id = String(item?.id ?? item?._id ?? action.slug ?? action.id ?? `strike-${index}`);
    if (seen.has(id)) continue;
    seen.add(id);
    attacks.push({
      id,
      name: String(item?.name ?? action.label ?? action.name ?? id),
      reach,
      ready: true,
      source: "system-action"
    });
  }

  return Object.freeze(attacks.map((attack) => Object.freeze({ ...attack })));
}

export function measurePf2eTokenDistance(sourceToken, targetToken, scene = null) {
  const source = tokenGeometry(sourceToken, scene);
  const target = tokenGeometry(targetToken, scene);
  const gridDistance = source.gridDistance;

  if (source.gridSize > 0 && target.gridSize > 0) {
    const dx = intervalCellDistance(source.leftCell, source.rightCell, target.leftCell, target.rightCell);
    const dy = intervalCellDistance(source.topCell, source.bottomCell, target.topCell, target.bottomCell);
    const dz = intervalCellDistance(source.bottomLayer, source.topLayer, target.bottomLayer, target.topLayer);
    return Object.freeze({
      value: Math.max(dx, dy, dz) * gridDistance,
      horizontal: Math.max(dx, dy) * gridDistance,
      vertical: dz * gridDistance,
      units: source.units,
      method: "occupied-grid-spaces"
    });
  }

  const separatedX = source.right <= target.left || target.right <= source.left;
  const separatedY = source.bottom <= target.top || target.bottom <= source.top;
  const gapX = Math.max(0, target.left - source.right, source.left - target.right);
  const gapY = Math.max(0, target.top - source.bottom, source.top - target.bottom);
  const scale = source.pixelsPerUnit > 0 ? source.pixelsPerUnit : 1;
  const dx = separatedX ? gapX / scale + gridDistance : 0;
  const dy = separatedY ? gapY / scale + gridDistance : 0;
  const vertical = intervalUnitDistance(source.elevation, source.topElevation, target.elevation, target.topElevation, gridDistance);
  return Object.freeze({
    value: Math.max(Math.hypot(dx, dy), vertical),
    horizontal: Math.hypot(dx, dy),
    vertical,
    units: source.units,
    method: "token-bounds"
  });
}

export function resolvePf2eThreatPerception(sourceActor, sourceToken, observerActor, observerToken, input = {}) {
  const explicit = explicitPerceptionState(input, observerActor, observerToken, sourceActor, sourceToken);
  if (explicit) return Object.freeze({ state: explicit, source: "explicit", knownPosition: COUNTED_PERCEPTION_STATES.has(explicit) });

  const statuses = actorStatuses(sourceActor);
  let state = "observed";
  let source = "default-observed";
  if (sourceToken?.document?.hidden === true || sourceToken?.hidden === true) {
    state = "unnoticed";
    source = "token-hidden";
  } else if (statuses.has("unnoticed")) {
    state = "unnoticed";
    source = "actor-status";
  } else if (statuses.has("undetected")) {
    state = "undetected";
    source = "actor-status";
  } else if (statuses.has("hidden")) {
    state = "hidden";
    source = "actor-status";
  } else if (statuses.has("concealed")) {
    state = "concealed";
    source = "actor-status";
  } else if (statuses.has("invisible")) {
    // Invisibility is relative in PF2e. Without an explicit relative state, the
    // conservative core fallback treats the square as unknown. A provider can
    // override this to "hidden" or "observed" for a creature that located it.
    state = "undetected";
    source = "invisible-fallback";
  }

  return Object.freeze({ state, source, knownPosition: COUNTED_PERCEPTION_STATES.has(state) });
}

export function testPf2eThreatLineOfSight(observerToken, sourceToken, {
  lineOfSightTest = null
} = {}) {
  if (typeof lineOfSightTest === "function") {
    const result = lineOfSightTest(observerToken, sourceToken);
    return normalizeLineOfSightResult(result, "provided-test");
  }

  const observer = normalizeToken(observerToken);
  const target = normalizeToken(sourceToken);
  const checker = observer?.checkCollision ?? observer?.object?.checkCollision;
  if (typeof checker !== "function") {
    return Object.freeze({ clear: null, blocked: null, method: "not-evaluated" });
  }

  try {
    const destination = tokenCenter(target);
    const origin = tokenCenter(observer);
    const collision = checker.call(observer, destination, { origin, type: "sight", mode: "any" });
    const blocked = Array.isArray(collision) ? collision.length > 0 : Boolean(collision);
    return Object.freeze({ clear: !blocked, blocked, method: "token-sight-collision" });
  } catch (error) {
    return Object.freeze({
      clear: null,
      blocked: null,
      method: "evaluation-failed",
      error: String(error?.message ?? error)
    });
  }
}

function evaluateThreat(candidateToken, sourceToken, {
  sourceActor = sourceToken?.actor ?? null,
  scene = sourceToken?.scene ?? sourceToken?.document?.parent ?? null,
  input = {},
  lineOfSightTest = null,
  perceptionResolver = null
} = {}) {
  const actor = candidateToken.actor ?? candidateToken.document?.actor ?? null;
  const identity = participantIdentity(actor, candidateToken);
  const rejectedBy = [];
  const sourceAlliance = actorAlliance(sourceActor);
  const candidateAlliance = actorAlliance(actor);
  const enemy = opposingAlliances(sourceAlliance, candidateAlliance, sourceActor, actor);
  if (!enemy) rejectedBy.push("alliance");

  const dead = actorIsDead(actor, candidateToken);
  if (dead) rejectedBy.push("dead");

  const canAttack = actorCanAttack(actor);
  if (!canAttack) rejectedBy.push("cannot-attack");

  const perception = typeof perceptionResolver === "function"
    ? normalizePerceptionResult(perceptionResolver(sourceActor, sourceToken, actor, candidateToken, input))
    : resolvePf2eThreatPerception(sourceActor, sourceToken, actor, candidateToken, input);
  if (!perception.knownPosition) rejectedBy.push("perception");

  const distance = measurePf2eTokenDistance(candidateToken, sourceToken, scene);
  const attacks = collectPf2eMeleeThreatAttacks(actor).map((attack) => ({
    ...attack,
    inRange: distance.value <= attack.reach + 1e-6
  }));
  if (attacks.length === 0) rejectedBy.push("no-melee-attack");
  const inRangeAttacks = attacks.filter((attack) => attack.inRange);
  if (attacks.length > 0 && inRangeAttacks.length === 0) rejectedBy.push("out-of-reach");

  const lineOfSight = testPf2eThreatLineOfSight(candidateToken, sourceToken, { lineOfSightTest });
  if (lineOfSight.blocked === true) rejectedBy.push("wall-blocked");

  const selectedAttack = inRangeAttacks
    .slice()
    .sort((left, right) => right.reach - left.reach || left.name.localeCompare(right.name))[0] ?? null;

  return {
    ...identity,
    alliance: candidateAlliance,
    sourceAlliance,
    enemy,
    dead,
    canAttack,
    perception,
    distance,
    lineOfSight,
    attacks,
    selectedAttack,
    counted: rejectedBy.length === 0,
    rejectedBy
  };
}

function resolveSceneTokens(tokens, scene) {
  if (tokens != null) return collectionContents(tokens);
  const canvas = globalThis.canvas;
  if (canvas?.scene && sameDocument(canvas.scene, scene)) {
    const placeables = canvas.tokens?.placeables;
    if (Array.isArray(placeables)) return placeables;
  }
  return collectionContents(scene?.tokens).map((token) => normalizeToken(token)).filter(Boolean);
}

function resolveActorToken(actor, scene) {
  const active = typeof actor?.getActiveTokens === "function" ? actor.getActiveTokens() : [];
  const matches = collectionContents(active)
    .map((token) => normalizeToken(token))
    .filter((token) => !scene || sameDocument(token?.scene ?? token?.document?.parent, scene));
  return matches.length === 1 ? matches[0] : null;
}

function normalizeToken(token) {
  if (!token) return null;
  if (token.object?.document) return token.object;
  return token;
}

function participantIdentity(actor, token) {
  return {
    tokenId: nullableString(token?.id ?? token?._id ?? token?.document?.id ?? token?.document?._id),
    tokenUuid: nullableString(token?.uuid ?? token?.document?.uuid),
    actorId: nullableString(actor?.id ?? actor?._id),
    actorUuid: nullableString(actor?.uuid),
    name: nullableString(token?.name ?? actor?.name) ?? "—"
  };
}

function actorAlliance(actor) {
  const value = actor?.alliance ?? getPath(actor, "system.details.alliance");
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized || null;
}

function opposingAlliances(left, right, leftActor, rightActor) {
  if ((left === ALLIANCE_PARTY && right === ALLIANCE_OPPOSITION)
    || (left === ALLIANCE_OPPOSITION && right === ALLIANCE_PARTY)) return true;
  if (left != null || right != null) return false;
  if (typeof rightActor?.isEnemyOf === "function") {
    try { return Boolean(rightActor.isEnemyOf(leftActor)); } catch { /* fall through */ }
  }
  return false;
}

function actorIsDead(actor, token) {
  if (!actor) return true;
  if (actor.isDead === true) return true;
  if (actorStatuses(actor).has("dead")) return true;
  return token?.combatant?.defeated === true
    || token?.document?.combatant?.defeated === true;
}

function actorCanAttack(actor) {
  if (!actor) return false;
  if (typeof actor.canAttack === "boolean") return actor.canAttack;
  if (typeof actor.canAct === "boolean" && !actor.canAct) return false;
  const statuses = actorStatuses(actor);
  return !["dead", "unconscious", "paralyzed"].some((status) => statuses.has(status));
}

function actorStatuses(actor) {
  const statuses = new Set();
  for (const status of collectionContents(actor?.statuses)) statuses.add(String(status?.slug ?? status ?? "").toLowerCase());
  for (const condition of [
    ...collectionContents(actor?.conditions),
    ...collectionContents(actor?.itemTypes?.condition)
  ]) {
    const slug = condition?.slug ?? getPath(condition, "system.slug") ?? condition?.id;
    if (slug) statuses.add(String(slug).toLowerCase());
  }
  return statuses;
}

function isMeleeItem(item, action) {
  if (item?.isMelee === true) return true;
  if (typeof item?.isOfType === "function") {
    try { if (item.isOfType("melee")) return true; } catch { /* fall through */ }
  }
  if (String(item?.type ?? "").toLowerCase() === "melee") return true;
  if (action?.melee === true) return true;
  if (String(item?.type ?? "").toLowerCase() === "weapon") {
    const range = getPath(item, "system.range") ?? getPath(item, "system.range.increment");
    return range == null || range === "";
  }
  return false;
}

function resolveAttackReach(actor, item, action) {
  if (typeof actor?.getReach === "function") {
    try {
      const value = Number(actor.getReach({ action: "attack", weapon: item ?? null }));
      if (Number.isFinite(value) && value > 0) return value;
    } catch { /* use data fallbacks */ }
  }
  const direct = [item?.reach, action?.reach, getPath(item, "system.reach")]
    .map(Number)
    .find((value) => Number.isFinite(value) && value > 0);
  if (direct) return direct;
  const traits = new Set(collectionContents(getPath(item, "system.traits.value")).map(String));
  const numeric = [...traits].map((trait) => /^reach-(\d{1,3})$/u.exec(trait)?.[1]).find(Boolean);
  if (numeric) return Number(numeric);
  const base = Number(getPath(actor, "system.attributes.reach.base"));
  if (traits.has("reach") && Number.isFinite(base)) return base + 5;
  return Number.isFinite(base) && base > 0 ? base : 5;
}

function tokenGeometry(token, scene) {
  const normalized = normalizeToken(token);
  const document = normalized?.document ?? normalized ?? {};
  const sceneGrid = scene?.grid ?? normalized?.scene?.grid ?? normalized?.document?.parent?.grid ?? globalThis.canvas?.scene?.grid ?? {};
  const gridSize = finiteNumber(sceneGrid.size ?? globalThis.canvas?.grid?.size) ?? 0;
  const gridDistance = finiteNumber(sceneGrid.distance ?? globalThis.canvas?.dimensions?.distance) ?? 5;
  const units = nullableString(sceneGrid.units ?? globalThis.canvas?.scene?.grid?.units) ?? "ft";
  const widthSpaces = positiveNumber(document.width ?? normalized?.width) ?? 1;
  const heightSpaces = positiveNumber(document.height ?? normalized?.height) ?? 1;
  const left = finiteNumber(normalized?.x ?? document.x) ?? 0;
  const top = finiteNumber(normalized?.y ?? document.y) ?? 0;
  const widthPixels = gridSize > 0 ? widthSpaces * gridSize : positiveNumber(normalized?.w ?? normalized?.bounds?.width) ?? widthSpaces;
  const heightPixels = gridSize > 0 ? heightSpaces * gridSize : positiveNumber(normalized?.h ?? normalized?.bounds?.height) ?? heightSpaces;
  const right = left + widthPixels;
  const bottom = top + heightPixels;
  const elevation = finiteNumber(normalized?.elevation ?? document.elevation) ?? 0;
  const actorHeight = positiveNumber(normalized?.actor?.dimensions?.height)
    ?? Math.max(widthSpaces, heightSpaces) * gridDistance;
  const topElevation = elevation + actorHeight;

  return {
    left,
    right,
    top,
    bottom,
    elevation,
    topElevation,
    gridSize,
    gridDistance,
    units,
    pixelsPerUnit: gridSize > 0 && gridDistance > 0 ? gridSize / gridDistance : 1,
    leftCell: gridSize > 0 ? Math.floor(left / gridSize) : 0,
    rightCell: gridSize > 0 ? Math.max(Math.floor(left / gridSize), Math.ceil(right / gridSize) - 1) : 0,
    topCell: gridSize > 0 ? Math.floor(top / gridSize) : 0,
    bottomCell: gridSize > 0 ? Math.max(Math.floor(top / gridSize), Math.ceil(bottom / gridSize) - 1) : 0,
    bottomLayer: gridDistance > 0 ? Math.floor(elevation / gridDistance) : 0,
    topLayer: gridDistance > 0 ? Math.max(Math.floor(elevation / gridDistance), Math.ceil(topElevation / gridDistance) - 1) : 0
  };
}

function intervalCellDistance(leftStart, leftEnd, rightStart, rightEnd) {
  if (leftEnd < rightStart) return rightStart - leftEnd;
  if (rightEnd < leftStart) return leftStart - rightEnd;
  return 0;
}

function intervalUnitDistance(leftStart, leftEnd, rightStart, rightEnd, baseDistance) {
  if (leftEnd <= rightStart) return rightStart - leftEnd + baseDistance;
  if (rightEnd <= leftStart) return leftStart - rightEnd + baseDistance;
  return 0;
}

function tokenCenter(token) {
  if (typeof token?.getCenterPoint === "function") return token.getCenterPoint();
  if (token?.center && Number.isFinite(token.center.x) && Number.isFinite(token.center.y)) return token.center;
  const geometry = tokenGeometry(token, token?.scene ?? token?.document?.parent ?? null);
  return { x: (geometry.left + geometry.right) / 2, y: (geometry.top + geometry.bottom) / 2, elevation: geometry.elevation };
}

function explicitPerceptionState(input, observerActor, observerToken, sourceActor, sourceToken) {
  const source = input?.threatPerceptionStates ?? input?.perceptionStates ?? null;
  if (!source) return null;
  if (typeof source === "function") {
    return normalizePerceptionState(source({ observerActor, observerToken, sourceActor, sourceToken }));
  }
  const keys = [
    observerToken?.uuid,
    observerToken?.document?.uuid,
    observerToken?.id,
    observerToken?.document?.id,
    observerActor?.uuid,
    observerActor?.id
  ].filter(Boolean).map(String);
  for (const key of keys) {
    const value = source instanceof Map ? source.get(key) : source[key];
    const normalized = normalizePerceptionState(value);
    if (normalized) return normalized;
  }
  return null;
}

function normalizePerceptionResult(value) {
  if (typeof value === "string") {
    const state = normalizePerceptionState(value) ?? "undetected";
    return Object.freeze({ state, source: "provided-resolver", knownPosition: COUNTED_PERCEPTION_STATES.has(state) });
  }
  const state = normalizePerceptionState(value?.state) ?? "undetected";
  return Object.freeze({
    state,
    source: nullableString(value?.source) ?? "provided-resolver",
    knownPosition: typeof value?.knownPosition === "boolean" ? value.knownPosition : COUNTED_PERCEPTION_STATES.has(state)
  });
}

function normalizePerceptionState(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "visible") return "observed";
  if (normalized === "unseen") return "undetected";
  return COUNTED_PERCEPTION_STATES.has(normalized) || EXCLUDED_PERCEPTION_STATES.has(normalized) ? normalized : null;
}

function normalizeLineOfSightResult(value, method) {
  if (typeof value === "boolean") return Object.freeze({ clear: value, blocked: !value, method });
  if (value && typeof value === "object") {
    const clear = typeof value.clear === "boolean" ? value.clear : typeof value.blocked === "boolean" ? !value.blocked : null;
    return Object.freeze({
      clear,
      blocked: clear == null ? null : !clear,
      method: nullableString(value.method) ?? method,
      ...(value.error ? { error: String(value.error) } : {})
    });
  }
  return Object.freeze({ clear: null, blocked: null, method });
}

function sameToken(left, right) {
  const leftId = left?.uuid ?? left?.document?.uuid ?? left?.id ?? left?.document?.id;
  const rightId = right?.uuid ?? right?.document?.uuid ?? right?.id ?? right?.document?.id;
  return Boolean(leftId && rightId && String(leftId) === String(rightId)) || left === right;
}

function sameDocument(left, right) {
  if (!left || !right) return false;
  const leftId = left.uuid ?? left.id ?? left._id;
  const rightId = right.uuid ?? right.id ?? right._id;
  return Boolean(leftId && rightId && String(leftId) === String(rightId)) || left === right;
}

function collectionContents(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (Array.isArray(collection.contents)) return collection.contents;
  if (typeof collection.values === "function") return [...collection.values()];
  if (typeof collection[Symbol.iterator] === "function") return [...collection];
  return [];
}

function freezeResult(result) {
  return Object.freeze(structuredClone(result));
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number != null && number > 0 ? number : null;
}

function nullableString(value) {
  const normalized = String(value ?? "").trim();
  return normalized || null;
}
