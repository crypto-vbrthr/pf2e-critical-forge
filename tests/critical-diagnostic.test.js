import test from "node:test";
import assert from "node:assert/strict";
import { installFoundryMock, assertDeepFrozen } from "./helpers/foundry-mock.js";

installFoundryMock();

const { diagnosePf2eCriticalInput } = await import(
  "../scripts/critical-forge/diagnostics/critical-diagnostic-service.js"
);

const card = Object.freeze({
  id: "test.card",
  packId: "test",
  category: "criticalHit",
  titleKey: "TEST.Title",
  descriptionKey: "TEST.Description",
  fallbackTitle: "Test Card",
  fallbackDescription: "Diagnostic card",
  weight: 2,
  tags: [],
  filters: {},
  effect: null
});

test("diagnostic service combines context adaptation and candidate evaluation", () => {
  const report = diagnosePf2eCriticalInput(
    { any: "input" },
    {
      createContext: () => ({
        valid: true,
        context: {
          category: "criticalHit",
          damageTypes: ["slashing"],
          weaponGroups: [],
          attackTraits: [],
          sourceTraits: [],
          targetTraits: [],
          requiredTags: [],
          excludedTags: []
        },
        metadata: { outcome: "criticalSuccess" },
        snapshot: { schemaVersion: 1, provider: "test" },
        diagnostics: []
      }),
      selector: {
        candidates: (_context, options) => {
          assert.equal(options.snapshot.provider, "test");
          return ({
          eligible: [{
            card,
            eligible: true,
            rejectedBy: [],
            matchedFilters: [{ filter: "damageTypes", values: ["slashing"] }],
            conditionEvaluation: { configured: false, matched: true, available: true, counts: {}, root: null },
            specificity: 1,
            baseWeight: 2,
            effectiveWeight: 4
          }],
          rejected: [],
          totalWeight: 4
        });
        }
      },
      localize: () => ({
        id: card.id,
        packId: card.packId,
        category: card.category,
        title: "Testkarte",
        description: "Diagnosekarte",
        effectName: null
      })
    }
  );

  assert.equal(report.valid, true);
  assert.equal(report.counts.eligible, 1);
  assert.equal(report.eligible[0].localized.title, "Testkarte");
  assert.equal(report.eligible[0].effectiveWeight, 4);
  assert.equal(report.snapshot.schemaVersion, 1);
  assertDeepFrozen(report);
});

test("invalid adapter reports do not evaluate card candidates", () => {
  let called = false;
  const report = diagnosePf2eCriticalInput({}, {
    createContext: () => ({
      valid: false,
      context: {
        category: "",
        damageTypes: [],
        weaponGroups: [],
        attackTraits: [],
        sourceTraits: [],
        targetTraits: [],
        requiredTags: [],
        excludedTags: []
      },
      metadata: {},
      diagnostics: [{ severity: "error", code: "NO_CATEGORY", path: "category", data: {} }]
    }),
    selector: {
      candidates: () => {
        called = true;
        throw new Error("should not run");
      }
    }
  });

  assert.equal(report.valid, false);
  assert.equal(called, false);
  assert.equal(report.eligible.length, 0);
  assert.equal(report.diagnostics[0].code, "NO_CATEGORY");
});
