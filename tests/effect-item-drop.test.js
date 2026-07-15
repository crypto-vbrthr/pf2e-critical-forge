import test from "node:test";
import assert from "node:assert/strict";
import {
  getEffectItemDragData,
  isItemDragData,
  resolveDroppedEffectItem
} from "../scripts/effect-forge/effect-item-drop.js";

test("drag data uses Foundry TextEditor parser when available", () => {
  const event = { marker: true };
  const parsed = getEffectItemDragData(event, {
    textEditor: {
      getDragEventData(received) {
        assert.equal(received, event);
        return { type: "Item", uuid: "Item.effect-1" };
      }
    }
  });

  assert.deepEqual(parsed, { type: "Item", uuid: "Item.effect-1" });
});

test("drag data falls back to text/plain JSON", () => {
  const event = {
    dataTransfer: {
      getData(type) {
        assert.equal(type, "text/plain");
        return JSON.stringify({ type: "Item", id: "effect-2" });
      }
    }
  };

  assert.deepEqual(getEffectItemDragData(event, { textEditor: {} }), {
    type: "Item",
    id: "effect-2"
  });
});

test("Item drag payloads are recognized", () => {
  assert.equal(isItemDragData({ type: "Item" }), true);
  assert.equal(isItemDragData({ documentName: "Item" }), true);
  assert.equal(isItemDragData({ type: "Actor" }), false);
});

test("world Effect Items resolve by id", async () => {
  const item = { id: "effect-3", documentName: "Item", type: "effect" };
  const result = await resolveDroppedEffectItem(
    { type: "Item", id: item.id },
    {
      fromUuidFn: null,
      worldItems: new Map([[item.id, item]])
    }
  );

  assert.equal(result.status, "ok");
  assert.equal(result.item, item);
});

test("embedded and compendium effects resolve by UUID", async () => {
  const item = { id: "effect-4", documentName: "Item", type: "effect" };
  let receivedUuid = null;
  const result = await resolveDroppedEffectItem(
    { type: "Item", uuid: "Actor.actor-1.Item.effect-4" },
    {
      async fromUuidFn(uuid) {
        receivedUuid = uuid;
        return item;
      },
      worldItems: null
    }
  );

  assert.equal(receivedUuid, "Actor.actor-1.Item.effect-4");
  assert.equal(result.status, "ok");
  assert.equal(result.item, item);
});

test("non-effect Items and unsupported documents return precise statuses", async () => {
  const nonEffect = { id: "weapon-1", documentName: "Item", type: "weapon" };
  const worldItems = new Map([[nonEffect.id, nonEffect]]);

  assert.deepEqual(
    await resolveDroppedEffectItem(
      { type: "Actor", id: "actor-1" },
      { fromUuidFn: null, worldItems }
    ),
    { status: "unsupported", item: null }
  );

  const wrongType = await resolveDroppedEffectItem(
    { type: "Item", id: nonEffect.id },
    { fromUuidFn: null, worldItems }
  );
  assert.equal(wrongType.status, "not-effect");
  assert.equal(wrongType.item, nonEffect);

  assert.deepEqual(
    await resolveDroppedEffectItem(
      { type: "Item", id: "missing" },
      { fromUuidFn: null, worldItems }
    ),
    { status: "not-found", item: null }
  );
});
