import test from "node:test";
import assert from "node:assert/strict";
import {
  collectPf2eMeleeThreatAttacks,
  evaluatePf2eBattlefieldThreats,
  measurePf2eTokenDistance,
  resolvePf2eThreatPerception
} from "../scripts/critical-forge/adapters/pf2e/battlefield/battlefield-threat-evaluator.js";

function scene({ size = 100, distance = 5, units = "ft" } = {}) {
  return { id: "scene", uuid: "Scene.scene", grid: { size, distance, units }, tokens: [] };
}

function actor(id, {
  alliance = "opposition",
  canAttack = true,
  isDead = false,
  statuses = [],
  attacks = [],
  baseReach = 5,
  height = 5
} = {}) {
  const actor = {
    id,
    uuid: `Actor.${id}`,
    name: id,
    alliance,
    canAttack,
    isDead,
    statuses: new Set(statuses),
    dimensions: { height },
    system: {
      details: { alliance },
      attributes: { reach: { base: baseReach } },
      actions: []
    },
    getReach({ weapon } = {}) {
      return weapon?.reach ?? baseReach;
    }
  };
  actor.system.actions = attacks.map((entry, index) => ({
    type: "strike",
    ready: entry.ready ?? true,
    item: {
      id: entry.id ?? `${id}-attack-${index}`,
      name: entry.name ?? `Attack ${index + 1}`,
      type: entry.type ?? "melee",
      isMelee: entry.melee ?? entry.type !== "ranged",
      reach: entry.reach ?? baseReach,
      system: { traits: { value: entry.traits ?? [] }, range: entry.type === "ranged" ? { increment: 30 } : null },
      isOfType(type) { return type === this.type; }
    }
  }));
  return actor;
}

function token(id, actor, scene, {
  x = 0,
  y = 0,
  width = 1,
  height = 1,
  elevation = 0,
  hidden = false,
  defeated = false,
  blocked = false
} = {}) {
  const document = {
    id,
    uuid: `Scene.scene.Token.${id}`,
    x,
    y,
    width,
    height,
    elevation,
    hidden,
    parent: scene,
    combatant: { defeated }
  };
  const result = {
    id,
    uuid: document.uuid,
    name: actor.name,
    actor,
    x,
    y,
    elevation,
    document,
    scene,
    combatant: document.combatant,
    checkCollision() { return blocked; },
    getCenterPoint() {
      return { x: x + width * scene.grid.size / 2, y: y + height * scene.grid.size / 2, elevation };
    }
  };
  document.object = result;
  return result;
}

test("scene analysis counts an observed opposition token with an in-range ready melee Strike", () => {
  const map = scene();
  const hero = actor("hero", { alliance: "party", attacks: [{ reach: 5 }] });
  const goblin = actor("goblin", { alliance: "opposition", attacks: [{ name: "Dogslicer", reach: 5 }] });
  const heroToken = token("hero", hero, map, { x: 0, y: 0 });
  const goblinToken = token("goblin", goblin, map, { x: 100, y: 0 });

  const report = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, goblinToken] });

  assert.equal(report.evaluation, "scene-analysis");
  assert.equal(report.count, 1);
  assert.equal(report.threats[0].counted, true);
  assert.equal(report.threats[0].distance.value, 5);
  assert.equal(report.threats[0].selectedAttack.name, "Dogslicer");
});

test("only the party-versus-opposition pairing counts as hostile", () => {
  const map = scene();
  const hero = actor("hero", { alliance: "party" });
  const heroToken = token("hero", hero, map);
  const ally = token("ally", actor("ally", { alliance: "party", attacks: [{ reach: 5 }] }), map, { x: 100 });
  const neutral = token("neutral", actor("neutral", { alliance: null, attacks: [{ reach: 5 }] }), map, { x: 0, y: 100 });
  const enemy = token("enemy", actor("enemy", { alliance: "opposition", attacks: [{ reach: 5 }] }), map, { x: 100, y: 100 });

  const report = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, ally, neutral, enemy] });

  assert.equal(report.count, 1);
  assert.equal(report.threats.find((entry) => entry.actorId === "ally").rejectedBy.includes("alliance"), true);
  assert.equal(report.threats.find((entry) => entry.actorId === "neutral").rejectedBy.includes("alliance"), true);
});

test("dead, defeated, and unable-to-attack actors do not threaten", () => {
  const map = scene();
  const hero = actor("hero", { alliance: "party" });
  const heroToken = token("hero", hero, map);
  const dead = token("dead", actor("dead", { isDead: true, attacks: [{ reach: 5 }] }), map, { x: 100 });
  const defeated = token("defeated", actor("defeated", { attacks: [{ reach: 5 }] }), map, { x: 0, y: 100, defeated: true });
  const unable = token("unable", actor("unable", { canAttack: false, attacks: [{ reach: 5 }] }), map, { x: 100, y: 100 });

  const report = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, dead, defeated, unable] });

  assert.equal(report.count, 0);
  assert.equal(report.threats.find((entry) => entry.actorId === "dead").rejectedBy.includes("dead"), true);
  assert.equal(report.threats.find((entry) => entry.actorId === "defeated").rejectedBy.includes("dead"), true);
  assert.equal(report.threats.find((entry) => entry.actorId === "unable").rejectedBy.includes("cannot-attack"), true);
});

test("only ready melee attacks are considered and reach is evaluated per attack", () => {
  const combatant = actor("combatant", {
    attacks: [
      { name: "Bow", type: "ranged", melee: false, reach: 30 },
      { name: "Stowed Spear", reach: 10, ready: false },
      { name: "Longspear", reach: 10, ready: true }
    ]
  });
  const attacks = collectPf2eMeleeThreatAttacks(combatant);
  assert.deepEqual(attacks.map((entry) => entry.name), ["Longspear"]);
  assert.equal(attacks[0].reach, 10);

  const map = scene();
  const hero = actor("hero", { alliance: "party" });
  const heroToken = token("hero", hero, map);
  const enemyToken = token("combatant", combatant, map, { x: 200 });
  const report = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, enemyToken] });
  assert.equal(report.threats[0].distance.value, 10);
  assert.equal(report.count, 1);
});

test("concealed and hidden positions count, while undetected and unnoticed positions do not", () => {
  const map = scene();
  const enemy = actor("enemy", { attacks: [{ reach: 5 }] });
  const enemyToken = token("enemy", enemy, map, { x: 100 });

  for (const [state, expected] of [["observed", true], ["concealed", true], ["hidden", true], ["undetected", false], ["unnoticed", false]]) {
    const hero = actor(`hero-${state}`, { alliance: "party", statuses: [state] });
    const heroToken = token(`hero-${state}`, hero, map);
    const report = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, enemyToken] });
    assert.equal(report.threats[0].counted, expected, state);
    assert.equal(report.threats[0].perception.state, state);
  }
});

test("invisibility without a relative state is conservative, but an explicit hidden or observed state counts", () => {
  const map = scene();
  const hero = actor("hero", { alliance: "party", statuses: ["invisible"] });
  const enemy = actor("enemy", { attacks: [{ reach: 5 }] });
  const heroToken = token("hero", hero, map);
  const enemyToken = token("enemy", enemy, map, { x: 100 });

  const unresolved = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, enemyToken] });
  assert.equal(unresolved.count, 0);
  assert.equal(unresolved.threats[0].perception.source, "invisible-fallback");

  const explicit = evaluatePf2eBattlefieldThreats({
    actor: hero,
    token: heroToken,
    scene: map,
    tokens: [heroToken, enemyToken],
    input: { threatPerceptionStates: { [enemyToken.uuid]: "hidden" } }
  });
  assert.equal(explicit.count, 1);
  assert.equal(explicit.threats[0].perception.source, "explicit");
});

test("a sight-blocking wall excludes an otherwise valid threat", () => {
  const map = scene();
  const hero = actor("hero", { alliance: "party" });
  const enemy = actor("enemy", { attacks: [{ reach: 5 }] });
  const heroToken = token("hero", hero, map);
  const enemyToken = token("enemy", enemy, map, { x: 100, blocked: true });

  const report = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, enemyToken] });
  assert.equal(report.count, 0);
  assert.equal(report.threats[0].lineOfSight.blocked, true);
  assert.equal(report.threats[0].rejectedBy.includes("wall-blocked"), true);
});

test("distance uses occupied grid spaces for large and tiny tokens and includes elevation", () => {
  const map = scene();
  const largeActor = actor("large", { height: 10 });
  const mediumActor = actor("medium", { height: 5 });
  const large = token("large", largeActor, map, { x: 0, y: 0, width: 2, height: 2 });
  const adjacent = token("adjacent", mediumActor, map, { x: 200, y: 100 });
  const tiny = token("tiny", mediumActor, map, { x: 250, y: 250, width: 0.5, height: 0.5 });
  const tinyNeighbor = token("tiny-neighbor", mediumActor, map, { x: 300, y: 200 });
  const airborne = token("airborne", mediumActor, map, { x: 0, y: 0, elevation: 10 });

  assert.equal(measurePf2eTokenDistance(large, adjacent, map).value, 5);
  assert.equal(measurePf2eTokenDistance(tiny, tinyNeighbor, map).value, 5);
  assert.equal(measurePf2eTokenDistance(large, airborne, map).value, 5);
});

test("perception resolver treats a GM-hidden source token as unnoticed", () => {
  const map = scene();
  const hero = actor("hero", { alliance: "party" });
  const enemy = actor("enemy", { attacks: [{ reach: 5 }] });
  const heroToken = token("hero", hero, map, { hidden: true });
  const enemyToken = token("enemy", enemy, map, { x: 100 });
  const perception = resolvePf2eThreatPerception(hero, heroToken, enemy, enemyToken);
  assert.equal(perception.state, "unnoticed");
  assert.equal(perception.knownPosition, false);
});

test("missing token or scene leaves threat evaluation unavailable instead of guessing zero", () => {
  const report = evaluatePf2eBattlefieldThreats({ actor: actor("hero", { alliance: "party" }) });
  assert.equal(report.count, null);
  assert.equal(report.evaluation, "not-evaluated");
  assert.equal(report.summary.reason, "source-token-unresolved");
});

test("a ranged-only actor does not gain a phantom melee threat from generic actor reach", () => {
  const map = scene();
  const hero = actor("hero-ranged-only", { alliance: "party" });
  const archer = actor("archer-ranged-only", {
    alliance: "opposition",
    attacks: [{ name: "Shortbow", type: "ranged", melee: false, reach: 30 }],
    baseReach: 5
  });
  const heroToken = token("hero-ranged-only", hero, map);
  const archerToken = token("archer-ranged-only", archer, map, { x: 100 });

  const report = evaluatePf2eBattlefieldThreats({ actor: hero, token: heroToken, scene: map, tokens: [heroToken, archerToken] });
  assert.equal(report.count, 0);
  assert.equal(report.threats[0].rejectedBy.includes("no-melee-attack"), true);
});
