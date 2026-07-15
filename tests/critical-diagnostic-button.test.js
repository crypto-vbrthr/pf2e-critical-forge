import assert from "node:assert/strict";
import test from "node:test";

const {
  findDiagnosticButtonHost,
  getRootElement,
  isChatApplication,
  isElementLike
} = await import("../scripts/critical-forge/diagnostics/critical-diagnostic-button.js");

function element({ id = "", matches = () => false, query = new Map() } = {}) {
  return {
    nodeType: 1,
    id,
    matches,
    querySelector(selector) {
      return query.get(selector) ?? null;
    }
  };
}

test("diagnostic button helper resolves an ApplicationV2 element after ready", () => {
  const root = element();
  assert.equal(getRootElement({ element: root }), root);
  assert.equal(isElementLike(root), true);
});

test("diagnostic button helper recognizes Foundry 14 ChatLog applications", () => {
  assert.equal(isChatApplication({ tabName: "chat" }), true);
  assert.equal(isChatApplication({ constructor: { name: "ChatLog" } }), true);
  assert.equal(isChatApplication({ tabName: "items" }), false);
});

test("diagnostic button helper does not classify a parent sidebar merely because it contains chat", () => {
  const nestedChat = element();
  const parent = element({ query: new Map([['[data-tab="chat"], #chat, .chat-log', nestedChat]]) });
  assert.equal(isChatApplication({ constructor: { name: "Sidebar" } }, parent), false);
});

test("diagnostic button host prefers the ApplicationV2 input part", () => {
  const input = element();
  const root = element({ query: new Map([['[data-application-part="input"]', input]]) });
  assert.equal(findDiagnosticButtonHost(root), input);
});

test("diagnostic button host refuses to fall back to the whole chat root", () => {
  const root = element();
  assert.equal(findDiagnosticButtonHost(root), null);
});
