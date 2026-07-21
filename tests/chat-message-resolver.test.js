import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  diagnosticMessageLabel,
  listDiagnosticMessages,
  resolveDiagnosticMessageInput,
  resolveDroppedChatMessage
} = await import("../scripts/critical-forge/diagnostics/chat-message-resolver.js");

test("diagnostic message list keeps roll messages and sorts newest first", () => {
  const messages = {
    contents: [
      { id: "old", timestamp: 10, rolls: [{}], speaker: { alias: "A" } },
      { id: "text", timestamp: 30, rolls: [], speaker: { alias: "B" } },
      { id: "new", timestamp: 20, flags: { pf2e: { context: { outcome: "criticalSuccess" } } }, speaker: { alias: "C" } }
    ]
  };

  const result = listDiagnosticMessages({ messages });
  assert.deepEqual(result.map((entry) => entry.id), ["new", "old"]);
  assert.match(result[0].label, /C/);
});

test("resolver combines message, origin item, speaker actor, and one selected target", async () => {
  const sourceActor = { id: "source", name: "Source" };
  const targetActor = { id: "target", name: "Target" };
  const item = { id: "weapon", actor: sourceActor };
  const targetToken = { id: "target-token", actor: targetActor };
  const message = {
    id: "message",
    speaker: { actor: "source" },
    flags: { pf2e: { context: { origin: { item: "Actor.source.Item.weapon" } } } },
    rolls: [{ degreeOfSuccess: 3 }]
  };

  const result = await resolveDiagnosticMessageInput(message, {
    targetTokens: new Set([targetToken]),
    actors: { get: (id) => id === "source" ? sourceActor : null },
    fromUuidFn: async (uuid) => uuid === "Actor.source.Item.weapon" ? item : null,
    canvas: null,
    user: null
  });

  assert.equal(result.input.item, item);
  assert.equal(result.input.sourceActor, sourceActor);
  assert.equal(result.input.targetActor, targetActor);
  assert.equal(result.input.targetToken, targetToken);
  assert.equal(result.diagnostics.length, 0);
});

test("resolver refuses to choose among multiple selected targets", async () => {
  const message = { id: "message", rolls: [{}] };
  const result = await resolveDiagnosticMessageInput(message, {
    targetTokens: [{ id: "a" }, { id: "b" }],
    fromUuidFn: null,
    canvas: null,
    user: null
  });

  assert.equal(result.input.targetToken, null);
  assert.deepEqual(result.diagnostics.map((entry) => entry.code), [
    "CRITICAL_DIAGNOSTIC_MULTIPLE_TARGETS",
    "CRITICAL_DIAGNOSTIC_TARGET_NOT_SELECTED"
  ]);
});


test("resolver prefers target references stored in PF2e message context", async () => {
  const sourceActor = { id: "source", name: "Source" };
  const targetActor = { id: "target", name: "Target" };
  const targetTokenDocument = { id: "target-token", actor: targetActor, object: { id: "target-token", actor: targetActor } };
  const message = {
    id: "flagged-target",
    speaker: { actor: "source" },
    flags: {
      pf2e: {
        context: {
          type: "attack-roll",
          origin: { actor: "Actor.source" },
          target: { actor: "Actor.target", token: "Scene.scene.Token.target-token" }
        }
      }
    },
    rolls: [{ degreeOfSuccess: 3 }]
  };
  const documents = new Map([
    ["Actor.source", sourceActor],
    ["Actor.target", targetActor],
    ["Scene.scene.Token.target-token", targetTokenDocument]
  ]);
  const result = await resolveDiagnosticMessageInput(message, {
    targetTokens: [],
    actors: { get: () => null },
    fromUuidFn: async (uuid) => documents.get(uuid) ?? null,
    canvas: null,
    user: null
  });

  assert.equal(result.input.sourceActor, sourceActor);
  assert.equal(result.input.targetActor, targetActor);
  assert.equal(result.input.targetToken.id, "target-token");
  assert.equal(result.diagnostics.length, 0);
});


test("saving throw resolver keeps the rolling creature as source when the message still points at the caster", async () => {
  const caster = {
    id: "caster",
    uuid: "Actor.caster",
    name: "Caster",
    documentName: "Actor"
  };
  const defender = {
    id: "defender",
    uuid: "Actor.defender",
    name: "Defender",
    documentName: "Actor"
  };
  const casterToken = { id: "caster-token", actor: caster };
  const defenderToken = { id: "defender-token", actor: defender };
  const defenderTokenDocument = {
    id: "defender-token",
    uuid: "Scene.scene.Token.defender-token",
    actor: defender,
    object: defenderToken
  };
  const message = {
    id: "spell-save",
    speaker: { actor: caster.id, token: casterToken.id },
    speakerActor: caster,
    actor: caster,
    token: casterToken,
    flags: {
      pf2e: {
        context: {
          type: "saving-throw",
          statistic: "will",
          outcome: "criticalSuccess",
          actor: defender.uuid,
          token: defenderTokenDocument.uuid,
          origin: { actor: caster.uuid }
        }
      }
    },
    rolls: [{ degreeOfSuccess: 3 }]
  };
  const documents = new Map([
    [caster.uuid, caster],
    [defender.uuid, defender],
    [defenderTokenDocument.uuid, defenderTokenDocument]
  ]);

  const result = await resolveDiagnosticMessageInput(message, {
    targetTokens: [],
    actors: { get: (id) => id === caster.id ? caster : id === defender.id ? defender : null },
    fromUuidFn: async (uuid) => documents.get(uuid) ?? null,
    canvas: null,
    user: null
  });

  assert.equal(result.input.sourceActor, defender);
  assert.equal(result.input.sourceToken, defenderToken);
  assert.equal(result.input.targetActor, caster);
  assert.equal(result.diagnostics.length, 0);
});

test("dropped ChatMessage resolves by UUID or collection id", async () => {
  const byUuid = { id: "uuid-message" };
  assert.equal(
    await resolveDroppedChatMessage(
      { type: "ChatMessage", uuid: "ChatMessage.uuid-message" },
      { fromUuidFn: async () => byUuid, messages: null }
    ),
    byUuid
  );

  const byId = { id: "id-message" };
  assert.equal(
    await resolveDroppedChatMessage(
      { documentName: "ChatMessage", id: "id-message" },
      { fromUuidFn: null, messages: { get: (id) => id === "id-message" ? byId : null } }
    ),
    byId
  );

  await assert.rejects(
    resolveDroppedChatMessage({ type: "Actor", id: "actor" }, { fromUuidFn: null, messages: null }),
    (error) => error.code === "CRITICAL_DIAGNOSTIC_DROP_NOT_CHAT_MESSAGE"
  );
});

test("diagnostic labels include speaker, action, and outcome", () => {
  const label = diagnosticMessageLabel({
    speaker: { alias: "Valeros" },
    flags: { pf2e: { context: { action: "Longsword", outcome: "criticalSuccess" } } }
  });
  assert.equal(label, "Valeros · Longsword · criticalSuccess");
});

test("saving throw resolver treats PF2e context.target as the roller when the root context still belongs to the caster", async () => {
  const caster = {
    id: "caster-live",
    uuid: "Actor.caster-live",
    name: "Caster",
    documentName: "Actor"
  };
  const defender = {
    id: "defender-live",
    uuid: "Actor.defender-live",
    name: "Defender",
    documentName: "Actor"
  };
  const casterToken = { id: "caster-token-live", uuid: "Scene.scene.Token.caster-token-live", actor: caster };
  const defenderToken = { id: "defender-token-live", uuid: "Scene.scene.Token.defender-token-live", actor: defender };
  const casterTokenDocument = { ...casterToken, object: casterToken };
  const defenderTokenDocument = { ...defenderToken, object: defenderToken };
  const message = {
    id: "spell-save-live-shape",
    speaker: { actor: caster.id, token: casterToken.id },
    speakerActor: caster,
    actor: caster,
    token: casterToken,
    flags: {
      pf2e: {
        context: {
          type: "saving-throw",
          statistic: "reflex",
          outcome: "criticalSuccess",
          actor: caster.uuid,
          token: casterToken.uuid,
          origin: { actor: caster.uuid, token: casterToken.uuid },
          target: { actor: defender.uuid, token: defenderToken.uuid }
        }
      }
    },
    rolls: [{ degreeOfSuccess: 3 }]
  };
  const documents = new Map([
    [caster.uuid, caster],
    [defender.uuid, defender],
    [casterToken.uuid, casterTokenDocument],
    [defenderToken.uuid, defenderTokenDocument]
  ]);

  const result = await resolveDiagnosticMessageInput(message, {
    targetTokens: [],
    actors: { get: (id) => id === caster.id ? caster : id === defender.id ? defender : null },
    fromUuidFn: async (uuid) => documents.get(uuid) ?? null,
    canvas: null,
    user: null
  });

  assert.equal(result.input.sourceActor, defender);
  assert.equal(result.input.sourceToken, defenderToken);
  assert.equal(result.input.targetActor, caster);
  assert.equal(result.input.targetToken, casterToken);
  assert.equal(result.diagnostics.length, 0);
});
