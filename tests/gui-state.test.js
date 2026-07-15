import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock } from "./helpers/foundry-mock.js";

installFoundryMock();

const {
  attachComponentUiState,
  createEditorSnapshot,
  duplicateComponent,
  moveComponent,
  normalizeWindowState,
  stripComponentUiState,
  toggleComponentCollapsed
} = await import("../scripts/effect-forge/gui-state.js");

test("component UI state stays outside exported component data", () => {
  const component = attachComponentUiState({
    type: "resistance",
    resistanceType: "fire",
    value: 5
  }, { uiId: "ui-1", collapsed: true });

  assert.equal(component._uiId, "ui-1");
  assert.equal(component._collapsed, true);
  assert.deepEqual(stripComponentUiState(component), {
    type: "resistance",
    resistanceType: "fire",
    value: 5
  });
});

test("components can be duplicated, reordered, and collapsed", () => {
  const components = [
    attachComponentUiState({ type: "fastHealing", value: 2 }, { uiId: "a" }),
    attachComponentUiState({ type: "immunity", immunityType: "fire" }, { uiId: "b" })
  ];

  assert.equal(duplicateComponent(components, 0), true);
  assert.equal(components.length, 3);
  assert.notEqual(components[1]._uiId, "a");
  assert.deepEqual(stripComponentUiState(components[1]), {
    type: "fastHealing",
    value: 2
  });

  assert.equal(moveComponent(components, 2, "up"), true);
  assert.equal(components[1]._uiId, "b");
  assert.equal(toggleComponentCollapsed(components, 1), true);
  assert.equal(components[1]._collapsed, true);
});

test("editor snapshots ignore transient component presentation state", () => {
  const first = {
    state: {
      effectName: "Test",
      components: [attachComponentUiState(
        { type: "immunity", immunityType: "fire" },
        { uiId: "a", collapsed: false }
      )]
    },
    unmanagedRules: []
  };
  const second = structuredClone(first);
  second.state.components[0]._collapsed = true;
  second.state.components[0]._uiId = "different";

  assert.equal(createEditorSnapshot(first), createEditorSnapshot(second));
});

test("window state is numeric and respects minimum dimensions", () => {
  assert.deepEqual(normalizeWindowState({
    width: "500",
    height: 300,
    left: "25",
    top: 40
  }), {
    width: 720,
    height: 540,
    left: 25,
    top: 40
  });

  assert.deepEqual(normalizeWindowState(null), {});
});
