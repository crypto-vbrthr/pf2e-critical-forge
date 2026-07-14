import test from "node:test";
import assert from "node:assert/strict";

import {
  captureScrollState,
  restoreScrollState
} from "../scripts/effect-forge/view-state.js";

function scrollElement({
  key,
  top = 0,
  left = 0,
  scrollHeight = 0,
  clientHeight = 0,
  scrollWidth = 0,
  clientWidth = 0,
  anchor
}) {
  return {
    dataset: {
      scrollKey: key,
      ...(anchor ? { scrollAnchor: anchor } : {})
    },
    scrollTop: top,
    scrollLeft: left,
    scrollHeight,
    clientHeight,
    scrollWidth,
    clientWidth
  };
}

function rootWith(...elements) {
  return {
    querySelectorAll() {
      return elements;
    }
  };
}

test("scroll state restores the exact editor and preview position", () => {
  const editorBefore = scrollElement({
    key: "editor",
    top: 260,
    left: 0,
    scrollHeight: 1200,
    clientHeight: 600
  });
  const previewBefore = scrollElement({
    key: "definition-preview",
    top: 90,
    left: 44,
    scrollHeight: 900,
    clientHeight: 300,
    scrollWidth: 1000,
    clientWidth: 500
  });

  const state = captureScrollState(rootWith(editorBefore, previewBefore));

  const editorAfter = scrollElement({
    key: "editor",
    scrollHeight: 1500,
    clientHeight: 600
  });
  const previewAfter = scrollElement({
    key: "definition-preview",
    scrollHeight: 1200,
    clientHeight: 300,
    scrollWidth: 1300,
    clientWidth: 500
  });

  restoreScrollState(rootWith(editorAfter, previewAfter), state);

  assert.equal(editorAfter.scrollTop, 260);
  assert.equal(previewAfter.scrollTop, 90);
  assert.equal(previewAfter.scrollLeft, 44);
});

test("component list stays near the bottom when a component is appended", () => {
  const before = scrollElement({
    key: "components",
    top: 380,
    scrollHeight: 800,
    clientHeight: 400,
    anchor: "bottom"
  });

  const state = captureScrollState(rootWith(before));
  const after = scrollElement({
    key: "components",
    scrollHeight: 1100,
    clientHeight: 400,
    anchor: "bottom"
  });

  restoreScrollState(rootWith(after), state);

  assert.equal(after.scrollTop, 680);
});

test("non-bottom positions remain stable and are clamped when content shrinks", () => {
  const before = scrollElement({
    key: "components",
    top: 150,
    scrollHeight: 1000,
    clientHeight: 400,
    anchor: "bottom"
  });

  const state = captureScrollState(rootWith(before));
  const after = scrollElement({
    key: "components",
    scrollHeight: 500,
    clientHeight: 400,
    anchor: "bottom"
  });

  restoreScrollState(rootWith(after), state);

  assert.equal(after.scrollTop, 100);
});
