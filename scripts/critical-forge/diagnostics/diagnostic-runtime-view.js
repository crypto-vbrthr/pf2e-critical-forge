export function prepareRuntimeContextView(snapshot) {
  const roller = snapshotParticipant(snapshot, snapshot?.roles?.roller);
  const opponent = snapshotParticipant(snapshot, snapshot?.roles?.opponent);
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
    threatEvaluation: snapshot?.battlefield?.threatEvaluation ?? "—"
  });
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
