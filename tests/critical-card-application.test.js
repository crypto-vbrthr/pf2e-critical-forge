import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();
game.user = { id: "gm-1", name: "Game Master", isGM: true };
game.actors = new Map();

const {
  applyCriticalCardEffect,
  inspectCriticalCardApplication,
  resolveCriticalCardEffectTarget
} = await import("../scripts/critical-forge/presentation/critical-card-application.js");

function createActor() {
  return {
    id: "actor-1",
    uuid: "Actor.actor-1",
    name: "Goblin",
    documentName: "Actor"
  };
}

function createMessage(actor, { status = "pending" } = {}) {
  return {
    id: "message-1",
    uuid: "ChatMessage.message-1",
    flags: {
      "pf2e-critical-forge": {
        criticalCardPreview: {
          metadata: {
            source: { id: "source-1", uuid: "Actor.source-1", token: null, name: "Valeros" },
            target: { id: actor.id, uuid: actor.uuid, token: "Scene.scene.Token.token-1", name: actor.name }
          },
          effect: {
            target: "target",
            definition: {
              schemaVersion: 2,
              id: "test.effect",
              name: "Test Effect",
              duration: { value: 1, unit: "rounds", expiry: "turn-end" },
              components: [{ type: "condition", slug: "off-guard" }]
            }
          },
          application: {
            status,
            appliedAt: null,
            appliedBy: null,
            targetActorUuid: null,
            targetActorName: null,
            createdEffectIds: []
          }
        }
      }
    }
  };
}

test("effect target resolution prefers the stored token reference", async () => {
  const actor = createActor();
  const preview = createMessage(actor).flags["pf2e-critical-forge"].criticalCardPreview;
  const calls = [];
  const target = await resolveCriticalCardEffectTarget(preview, {
    fromUuidFn: async (uuid) => {
      calls.push(uuid);
      return { documentName: "Token", actor };
    }
  });

  assert.equal(target.actor, actor);
  assert.equal(target.role, "target");
  assert.equal(target.reference, "Scene.scene.Token.token-1");
  assert.deepEqual(calls, ["Scene.scene.Token.token-1"]);
});

test("manual application validates, applies once, and stores an audit status", async () => {
  const actor = createActor();
  const message = createMessage(actor);
  let applications = 0;
  let update = null;

  const result = await applyCriticalCardEffect(message, {
    user: game.user,
    fromUuidFn: async () => ({ documentName: "Token", actor }),
    analyzeFn: () => ({ valid: true, errors: [], warnings: [] }),
    applyEffectFn: async (definition, target) => {
      applications += 1;
      assert.equal(definition.id, "test.effect");
      assert.equal(target, actor);
      return [
        { id: "effect-1", uuid: "Actor.actor-1.Item.effect-1" },
        { id: "effect-2", uuid: "Actor.actor-1.Item.effect-2" }
      ];
    },
    updateMessageFn: async (_message, application) => {
      update = application;
      message.flags["pf2e-critical-forge"].criticalCardPreview.application = application;
    },
    now: () => 123456
  });

  assert.equal(result.valid, true);
  assert.equal(applications, 1);
  assert.equal(update.status, "applied");
  assert.equal(update.appliedAt, 123456);
  assert.deepEqual(update.appliedBy, { id: "gm-1", name: "Game Master" });
  assert.equal(update.targetActorUuid, "Actor.actor-1");
  assert.deepEqual(update.createdEffectIds, [
    "Actor.actor-1.Item.effect-1",
    "Actor.actor-1.Item.effect-2"
  ]);

  const duplicate = await applyCriticalCardEffect(message, {
    user: game.user,
    fromUuidFn: async () => ({ documentName: "Token", actor }),
    analyzeFn: () => ({ valid: true }),
    applyEffectFn: async () => {
      applications += 1;
      return [];
    }
  });
  assert.equal(duplicate.valid, false);
  assert.equal(duplicate.code, "CRITICAL_CARD_ALREADY_APPLIED");
  assert.equal(applications, 1);
});

test("application is blocked for non-GM users", async () => {
  const actor = createActor();
  const report = await inspectCriticalCardApplication(createMessage(actor), {
    user: { id: "player-1", name: "Player", isGM: false },
    fromUuidFn: async () => ({ documentName: "Token", actor }),
    analyzeFn: () => ({ valid: true })
  });

  assert.equal(report.valid, false);
  assert.equal(report.code, "CRITICAL_CARD_APPLY_GM_ONLY");
});

test("application is blocked when the stored target no longer resolves", async () => {
  const actor = createActor();
  const report = await inspectCriticalCardApplication(createMessage(actor), {
    user: game.user,
    fromUuidFn: async () => null,
    analyzeFn: () => ({ valid: true })
  });

  assert.equal(report.valid, false);
  assert.equal(report.code, "CRITICAL_CARD_TARGET_UNRESOLVED");
});

test("application is blocked when target-aware validation fails", async () => {
  const actor = createActor();
  const report = await inspectCriticalCardApplication(createMessage(actor), {
    user: game.user,
    fromUuidFn: async () => ({ documentName: "Token", actor }),
    analyzeFn: () => ({ valid: false, errors: [{ code: "TEST_ERROR" }] })
  });

  assert.equal(report.valid, false);
  assert.equal(report.code, "CRITICAL_CARD_EFFECT_INVALID");
  assert.equal(report.validation.errors[0].code, "TEST_ERROR");
});

test("critical save-success application follows the PF2e target roller instead of the spellcaster", async () => {
  const { resolveDiagnosticMessageInput } = await import("../scripts/critical-forge/diagnostics/chat-message-resolver.js");
  const { createPf2eSelectionContext } = await import("../scripts/critical-forge/adapters/pf2e/pf2e-context-adapter.js");

  const caster = {
    id: "caster-save",
    uuid: "Actor.caster-save",
    name: "Caster",
    documentName: "Actor",
    system: { traits: { value: ["human"] } }
  };
  const defender = {
    id: "defender-save",
    uuid: "Actor.defender-save",
    name: "Defender",
    documentName: "Actor",
    system: { traits: { value: ["elf"] } }
  };
  const casterToken = { id: "caster-token-save", uuid: "Scene.scene.Token.caster-token-save", actor: caster };
  const defenderToken = { id: "defender-token-save", uuid: "Scene.scene.Token.defender-token-save", actor: defender };
  const documents = new Map([
    [caster.uuid, caster],
    [defender.uuid, defender],
    [casterToken.uuid, { ...casterToken, object: casterToken }],
    [defenderToken.uuid, { ...defenderToken, object: defenderToken }]
  ]);
  const sourceMessage = {
    id: "save-message-live",
    uuid: "ChatMessage.save-message-live",
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
          actor: caster.uuid,
          token: casterToken.uuid,
          origin: { actor: caster.uuid, token: casterToken.uuid },
          target: { actor: defender.uuid, token: defenderToken.uuid }
        }
      }
    },
    rolls: [{ degreeOfSuccess: 3, options: { type: "saving-throw", identifier: "will" } }]
  };

  const resolved = await resolveDiagnosticMessageInput(sourceMessage, {
    targetTokens: [],
    actors: { get: (id) => id === caster.id ? caster : id === defender.id ? defender : null },
    fromUuidFn: async (uuid) => uuid === sourceMessage.uuid ? sourceMessage : documents.get(uuid) ?? null,
    canvas: null,
    user: null
  });
  const report = createPf2eSelectionContext(resolved.input);
  assert.equal(report.context.category, "savingThrowCriticalSuccess");
  assert.equal(report.metadata.source.uuid, defender.uuid);
  assert.equal(report.metadata.target.uuid, caster.uuid);

  const message = {
    id: "preview-save-live",
    uuid: "ChatMessage.preview-save-live",
    flags: {
      "pf2e-critical-forge": {
        criticalCardPreview: {
          category: report.context.category,
          sourceMessageUuid: sourceMessage.uuid,
          metadata: {
            ...report.metadata,
            source: { id: caster.id, uuid: caster.uuid, token: casterToken.uuid, name: caster.name }
          },
          effect: {
            target: "source",
            definition: {
              schemaVersion: 2,
              id: "save-success.boon",
              name: "Save Success Boon",
              duration: { value: 1, unit: "rounds", expiry: "turn-end" },
              components: [{ type: "modifier", selector: "will", value: 1, modifierType: "circumstance", predicate: [] }]
            }
          },
          application: { status: "pending" }
        }
      }
    }
  };

  let appliedTo = null;
  const result = await applyCriticalCardEffect(message, {
    user: game.user,
    fromUuidFn: async (uuid) => uuid === sourceMessage.uuid ? sourceMessage : documents.get(uuid) ?? null,
    analyzeFn: () => ({ valid: true, errors: [], warnings: [] }),
    applyEffectFn: async (_definition, actor) => {
      appliedTo = actor;
      return { id: "effect-save" };
    },
    updateMessageFn: async () => null
  });

  assert.equal(result.valid, true);
  assert.equal(appliedTo, defender);
  assert.notEqual(appliedTo, caster);
});

test("a correct stored save roller is not replaced by an ambiguous live re-resolution", async () => {
  const caster = { id: "caster-stored", uuid: "Actor.caster-stored", name: "Caster", documentName: "Actor" };
  const defender = { id: "defender-stored", uuid: "Actor.defender-stored", name: "Defender", documentName: "Actor" };
  const sourceMessage = { id: "source-save-stored", uuid: "ChatMessage.source-save-stored" };
  const documents = new Map([
    [sourceMessage.uuid, sourceMessage],
    [caster.uuid, caster],
    [defender.uuid, defender]
  ]);
  const previewData = {
    category: "savingThrowCriticalSuccess",
    sourceMessageUuid: sourceMessage.uuid,
    metadata: {
      source: { id: defender.id, uuid: defender.uuid, token: null, name: defender.name },
      target: { id: caster.id, uuid: caster.uuid, token: null, name: caster.name }
    },
    effect: { target: "source" }
  };

  const result = await resolveCriticalCardEffectTarget(previewData, {
    fromUuidFn: async (uuid) => documents.get(uuid) ?? null,
    actors: { get: (id) => id === caster.id ? caster : id === defender.id ? defender : null },
    resolveMessageInputFn: async () => ({
      // Simulate the ambiguous PF2e shape that exposes the caster as the
      // generic message actor during a later re-read.
      input: { sourceActor: caster, sourceToken: null }
    })
  });

  assert.equal(result.actor, defender);
  assert.equal(result.resolvedBy, "preview-metadata");
});
