const THREAT_REJECTION_KEYS = Object.freeze({
  alliance: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonAlliance",
  dead: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonDead",
  "cannot-attack": "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonCannotAttack",
  perception: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonPerception",
  "no-melee-attack": "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonNoMeleeAttack",
  "out-of-reach": "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonOutOfReach",
  "wall-blocked": "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonWallBlocked"
});

const THREAT_PERCEPTION_KEYS = Object.freeze({
  observed: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.PerceptionObserved",
  concealed: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.PerceptionConcealed",
  hidden: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.PerceptionHidden",
  undetected: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.PerceptionUndetected",
  unnoticed: "PF2E_CRITICAL_FORGE.CriticalDiagnostic.PerceptionUnnoticed"
});

export function prepareRuntimeContextView(snapshot) {
  const roller = snapshotParticipant(snapshot, snapshot?.roles?.roller);
  const opponent = snapshotParticipant(snapshot, snapshot?.roles?.opponent);
  const hostileThreats = prepareHostileThreats(snapshot?.battlefield?.hostileThreats);
  const threatSummary = snapshot?.battlefield?.threatSummary ?? {};
  return Object.freeze({
    hasSnapshot: Boolean(snapshot),
    snapshotVersion: snapshot?.schemaVersion ?? "—",
    snapshotProvider: snapshot
      ? `${snapshot.provider}${snapshot.providerVersion ? ` ${snapshot.providerVersion}` : ""}`
      : "—",
    rollFamily: snapshot?.roll?.family ?? "—",
    saveType: snapshot?.roll?.saveType ?? "—",
    rollerName: roller?.name ?? "—",
    rollerLevel: displayNumber(roller?.level),
    rollerHp: displayHp(roller?.hp),
    rollerHpRatio: displayRatio(roller?.hp?.ratio),
    opponentName: opponent?.name ?? "—",
    opponentLevel: displayNumber(opponent?.level),
    hostileThreatCount: displayNumber(snapshot?.battlefield?.hostileThreatCount),
    threatEvaluation: snapshot?.battlefield?.threatEvaluation ?? "—",
    hostileThreats,
    hasHostileThreatDetails: hostileThreats.length > 0,
    threatCandidateCount: displayNumber(threatSummary.candidateCount),
    threatCountedCount: displayNumber(threatSummary.countedCount),
    threatRejectedCount: displayNumber(threatSummary.rejectedCount),
    threatSummaryReason: threatSummary.reason ?? null
  });
}

function prepareHostileThreats(threats) {
  if (!Array.isArray(threats)) return Object.freeze([]);
  return Object.freeze(threats.map((threat) => {
    const rejectedBy = Array.isArray(threat?.rejectedBy) ? threat.rejectedBy : [];
    const distance = displayDistance(threat?.distance);
    const selectedAttack = threat?.selectedAttack ?? null;
    return Object.freeze({
      tokenId: threat?.tokenId ?? null,
      actorId: threat?.actorId ?? null,
      name: threat?.name ?? "—",
      counted: Boolean(threat?.counted),
      statusClass: threat?.counted ? "valid" : "invalid",
      statusKey: threat?.counted
        ? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatCounted"
        : "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatRejected",
      alliance: displayAlliance(threat?.sourceAlliance, threat?.alliance),
      enemy: Boolean(threat?.enemy),
      dead: Boolean(threat?.dead),
      canAttack: Boolean(threat?.canAttack),
      perceptionKey: THREAT_PERCEPTION_KEYS[threat?.perception?.state]
        ?? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.PerceptionUnknown",
      perceptionSource: threat?.perception?.source ?? "—",
      knownPosition: Boolean(threat?.perception?.knownPosition),
      distance,
      attackName: selectedAttack?.name ?? "—",
      attackReach: selectedAttack ? displayMeasure(selectedAttack.reach, threat?.distance?.units) : "—",
      lineOfSightKey: lineOfSightKey(threat?.lineOfSight),
      lineOfSightMethod: threat?.lineOfSight?.method ?? "—",
      rejectionKeys: Object.freeze(rejectedBy.map((reason) => THREAT_REJECTION_KEYS[reason]
        ?? "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatReasonUnknown")),
      hasRejections: rejectedBy.length > 0
    });
  }));
}

function snapshotParticipant(snapshot, role) {
  if (!snapshot || !role) return null;
  return snapshot.participants?.[role] ?? null;
}

function displayNumber(value) {
  return Number.isFinite(Number(value)) ? String(Number(value)) : "—";
}

function displayHp(hp) {
  if (!hp || hp.current == null || hp.max == null) return "—";
  const temp = Number(hp.temp ?? 0);
  return temp > 0 ? `${hp.current} / ${hp.max} (+${temp})` : `${hp.current} / ${hp.max}`;
}

function displayRatio(value) {
  return Number.isFinite(Number(value)) ? `${Math.round(Number(value) * 100)} %` : "—";
}

function displayAlliance(source, candidate) {
  return `${source ?? "—"} ↔ ${candidate ?? "—"}`;
}

function displayDistance(distance) {
  if (!distance || !Number.isFinite(Number(distance.value))) return "—";
  return displayMeasure(distance.value, distance.units);
}

function displayMeasure(value, units) {
  if (!Number.isFinite(Number(value))) return "—";
  return `${Number(value)} ${units ?? "ft"}`;
}

function lineOfSightKey(lineOfSight) {
  if (lineOfSight?.blocked === true) return "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatLineBlocked";
  if (lineOfSight?.clear === true) return "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatLineClear";
  return "PF2E_CRITICAL_FORGE.CriticalDiagnostic.ThreatLineUnknown";
}
