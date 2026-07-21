import { deepFreeze } from "../utils.js";

export const CRITICAL_CONTEXT_SNAPSHOT_VERSION = 1;

/**
 * Builds the immutable, serializable runtime snapshot used by diagnostics and
 * future context-aware card selection. The builder deliberately accepts only
 * plain values; Foundry documents must be reduced to snapshots by an adapter.
 */
export class CriticalContextBuilder {
  #data;

  constructor({
    system,
    provider,
    providerVersion = null,
    capturedAt = null,
    schemaVersion = CRITICAL_CONTEXT_SNAPSHOT_VERSION
  } = {}) {
    this.#data = {
      schemaVersion: positiveInteger(schemaVersion, CRITICAL_CONTEXT_SNAPSHOT_VERSION),
      system: normalizedIdentifier(system, "unknown"),
      provider: normalizedIdentifier(provider, "unknown"),
      providerVersion: nullableString(providerVersion),
      capturedAt: finiteNumber(capturedAt),
      message: emptyMessage(),
      roll: emptyRoll(),
      item: emptyItem(),
      participants: {},
      roles: emptyRoles(),
      battlefield: emptyBattlefield(),
      selection: {},
      provenance: {},
      diagnostics: []
    };
  }

  setMessage(message = {}) {
    this.#data.message = {
      id: nullableString(message.id),
      uuid: nullableString(message.uuid),
      timestamp: finiteNumber(message.timestamp),
      authorId: nullableString(message.authorId),
      speaker: nullableString(message.speaker)
    };
    return this;
  }

  setRoll(roll = {}) {
    this.#data.roll = {
      category: nullableString(roll.category),
      family: nullableString(roll.family),
      type: nullableString(roll.type),
      identifier: nullableString(roll.identifier),
      action: nullableString(roll.action),
      outcome: nullableString(roll.outcome),
      degree: finiteNumber(roll.degree),
      dieResult: finiteNumber(roll.dieResult),
      isNatural20: Boolean(roll.isNatural20),
      isNatural1: Boolean(roll.isNatural1),
      saveType: nullableString(roll.saveType),
      dc: finiteNumber(roll.dc)
    };
    return this;
  }

  setItem(item = {}) {
    this.#data.item = {
      id: nullableString(item.id),
      uuid: nullableString(item.uuid),
      name: nullableString(item.name),
      type: nullableString(item.type),
      category: nullableString(item.category),
      baseItem: nullableString(item.baseItem),
      rangeIncrement: finiteNumber(item.rangeIncrement),
      isMelee: nullableBoolean(item.isMelee),
      isRanged: nullableBoolean(item.isRanged),
      isSpell: Boolean(item.isSpell),
      spellRank: finiteNumber(item.spellRank)
    };
    return this;
  }

  setParticipant(role, participant = {}) {
    const key = normalizedIdentifier(role);
    if (!key) throw new TypeError("A context participant role is required.");
    this.#data.participants[key] = normalizeParticipant(participant, key);
    return this;
  }

  setRoles(roles = {}) {
    this.#data.roles = {
      roller: nullableString(roles.roller),
      opponent: nullableString(roles.opponent),
      legacySource: nullableString(roles.legacySource),
      legacyTarget: nullableString(roles.legacyTarget)
    };
    return this;
  }

  setBattlefield(battlefield = {}) {
    this.#data.battlefield = {
      sceneId: nullableString(battlefield.sceneId),
      sceneUuid: nullableString(battlefield.sceneUuid),
      combatId: nullableString(battlefield.combatId),
      combatUuid: nullableString(battlefield.combatUuid),
      round: finiteNumber(battlefield.round),
      turn: finiteNumber(battlefield.turn),
      selectedTargetCount: nonNegativeInteger(battlefield.selectedTargetCount),
      hostileThreatCount: nonNegativeInteger(battlefield.hostileThreatCount),
      threatEvaluation: nullableString(battlefield.threatEvaluation) ?? "not-evaluated"
    };
    return this;
  }

  setSelection(selection = {}) {
    this.#data.selection = plainClone(selection);
    return this;
  }

  setProvenance(provenance = {}) {
    this.#data.provenance = plainClone(provenance);
    return this;
  }

  addDiagnostic(entry = {}) {
    this.#data.diagnostics.push({
      severity: nullableString(entry.severity) ?? "info",
      code: nullableString(entry.code) ?? "CRITICAL_CONTEXT_DIAGNOSTIC",
      path: nullableString(entry.path),
      data: plainClone(entry.data ?? {})
    });
    return this;
  }

  build() {
    return deepFreeze(plainClone(this.#data));
  }
}

export function createCriticalContextBuilder(options = {}) {
  return new CriticalContextBuilder(options);
}

function normalizeParticipant(participant, role) {
  const hp = participant.hp ?? {};
  const current = finiteNumber(hp.current);
  const max = finiteNumber(hp.max);
  const ratio = finiteNumber(hp.ratio)
    ?? (current != null && max != null && max > 0 ? current / max : null);
  const conditions = participant.conditions ?? {};
  const position = participant.position ?? {};

  return {
    role,
    id: nullableString(participant.id),
    uuid: nullableString(participant.uuid),
    tokenUuid: nullableString(participant.tokenUuid),
    name: nullableString(participant.name),
    type: nullableString(participant.type),
    level: finiteNumber(participant.level),
    size: nullableString(participant.size),
    traits: uniqueStrings(participant.traits),
    hp: {
      current,
      max,
      temp: finiteNumber(hp.temp) ?? 0,
      ratio: ratio == null ? null : clamp(ratio, 0, 1)
    },
    conditions: {
      wounded: nonNegativeInteger(conditions.wounded) ?? 0,
      dying: nonNegativeInteger(conditions.dying) ?? 0,
      frightened: nonNegativeInteger(conditions.frightened) ?? 0
    },
    position: {
      x: finiteNumber(position.x),
      y: finiteNumber(position.y),
      elevation: finiteNumber(position.elevation)
    },
    disposition: finiteNumber(participant.disposition),
    defeated: nullableBoolean(participant.defeated)
  };
}

function emptyMessage() {
  return { id: null, uuid: null, timestamp: null, authorId: null, speaker: null };
}

function emptyRoll() {
  return {
    category: null,
    family: null,
    type: null,
    identifier: null,
    action: null,
    outcome: null,
    degree: null,
    dieResult: null,
    isNatural20: false,
    isNatural1: false,
    saveType: null,
    dc: null
  };
}

function emptyItem() {
  return {
    id: null,
    uuid: null,
    name: null,
    type: null,
    category: null,
    baseItem: null,
    rangeIncrement: null,
    isMelee: null,
    isRanged: null,
    isSpell: false,
    spellRank: null
  };
}

function emptyRoles() {
  return { roller: null, opponent: null, legacySource: null, legacyTarget: null };
}

function emptyBattlefield() {
  return {
    sceneId: null,
    sceneUuid: null,
    combatId: null,
    combatUuid: null,
    round: null,
    turn: null,
    selectedTargetCount: null,
    hostileThreatCount: null,
    threatEvaluation: "not-evaluated"
  };
}

function plainClone(value) {
  if (value === undefined) return undefined;
  return structuredClone(value);
}

function uniqueStrings(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.map((entry) => String(entry ?? "").trim()).filter(Boolean))];
}

function normalizedIdentifier(value, fallback = "") {
  const result = String(value ?? "").trim().toLowerCase();
  return result || fallback;
}

function nullableString(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function nullableBoolean(value) {
  return typeof value === "boolean" ? value : null;
}

function finiteNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveInteger(value, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function nonNegativeInteger(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}
