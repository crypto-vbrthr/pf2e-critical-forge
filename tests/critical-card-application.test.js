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
