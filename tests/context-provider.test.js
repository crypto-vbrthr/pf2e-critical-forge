import test from "node:test";
import assert from "node:assert/strict";
import { ContextProviderRegistry } from "../scripts/critical-forge/context/context-provider-registry.js";
import { resolveCriticalContext } from "../scripts/critical-forge/context/context-resolver.js";

function provider(id, priority, result = id) {
  return {
    id,
    system: "pf2e",
    version: "1.0.0",
    priority,
    createContext: (input) => ({ result, input })
  };
}

test("context provider registry resolves the highest-priority provider", () => {
  const registry = new ContextProviderRegistry();
  registry.register(provider("fallback", 0));
  registry.register(provider("preferred", 10));

  assert.equal(registry.get("pf2e").id, "preferred");
  assert.deepEqual(resolveCriticalContext({ roll: 1 }, { system: "pf2e", registry }), {
    result: "preferred",
    input: { roll: 1 }
  });
});

test("context provider registry supports explicit providers and replacement", () => {
  const registry = new ContextProviderRegistry();
  registry.register(provider("custom", 1, "first"));
  assert.throws(() => registry.register(provider("custom", 2)), /already registered/);

  registry.register(provider("custom", 2, "replacement"), { replace: true });
  assert.equal(registry.get("pf2e", "custom").priority, 2);
  assert.equal(resolveCriticalContext({}, { system: "pf2e", providerId: "custom", registry }).result, "replacement");
  assert.equal(registry.unregister("pf2e", "custom"), true);
  assert.equal(registry.get("pf2e", "custom"), null);
});

test("context provider registry rejects malformed providers", () => {
  const registry = new ContextProviderRegistry();
  assert.throws(() => registry.register(null), /must be an object/);
  assert.throws(() => registry.register({ id: "Bad Id", system: "pf2e", createContext() {} }), /Invalid/);
  assert.throws(() => registry.register({ id: "valid", system: "pf2e" }), /requires createContext/);
  assert.throws(() => resolveCriticalContext({}, { system: "other", registry }), /Unsupported/);
});

test("context provider registry protects built-in-style providers", () => {
  const registry = new ContextProviderRegistry();
  registry.register({ ...provider("core", 0), protected: true });
  assert.throws(() => registry.register(provider("core", 10), { replace: true }), /Protected/);
  assert.equal(registry.unregister("pf2e", "core"), false);
  assert.equal(registry.get("pf2e", "core").protected, true);
});
