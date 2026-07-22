# Critical Condition Engine

Version `0.9.4-dev.6` retains the generic, document-agnostic eligibility engine and adds typed extension field providers to its visual authoring layer. Against All Odds and scene-based threat analysis remain deliberately outside this phase.

## Design guarantees

- Existing cards with no `conditions` behave exactly as before.
- Critical Card and Card Pack schema versions remain `1`.
- Conditions gate eligibility but do not change specificity, profile multipliers, or weight.
- Every decision produces immutable diagnostic evidence.
- Missing values are reported as unavailable and are never guessed.
- The engine reads plain serializable snapshots, never Foundry documents.
- Redraws reuse the original stored snapshot.

## Canonical data model

A leaf compares one snapshot field:

```js
{
  type: "condition",
  field: "participants.source.hp.ratio",
  operator: "lte",
  value: 0.5
}
```

Provider-defined custom paths may additionally retain an editor operand type:

```js
{
  type: "condition",
  field: "provider.danger.score",
  operator: "exists",
  valueType: "number"
}
```

`valueType` is optional and may be `string`, `number`, `boolean`, or `stringArray`. It guides visual authoring and survives unary operators that do not carry a `value`; runtime evaluation still compares the actual serialized value and does not coerce snapshot fields from this metadata.

A group combines leaves or other groups:

```js
{
  type: "group",
  mode: "all",
  conditions: [
    { field: "participants.source.hp.ratio", operator: "lte", value: 0.5 },
    {
      mode: "any",
      conditions: [
        { field: "roll.saveType", operator: "eq", value: "reflex" },
        { field: "battlefield.hostileThreatCount", operator: "gte", value: 3 }
      ]
    }
  ]
}
```

Input may omit explicit `type` fields. Normalization adds them, clones values, and deeply freezes the result. `entries` is accepted as an input alias for a group's `conditions`.

## Group modes

- `all`: every child must match. An empty `all` group matches.
- `any`: at least one child must match. An empty `any` group does not match.

## Operators

| Operator | Meaning |
|---|---|
| `eq` | equal values, including numeric normalization |
| `neq` | unequal values |
| `lt` | actual number is lower |
| `lte` | actual number is lower or equal |
| `gt` | actual number is greater |
| `gte` | actual number is greater or equal |
| `contains` | array/set contains all expected entries, or string contains text |
| `notContains` | inverse of `contains` |
| `exists` | field resolves to a non-null value |
| `notExists` | field is missing or null |

Numeric operators require a finite configured operand. `exists` and `notExists` do not store a `value`.

## Snapshot fields

Field paths use dot notation. Typical Phase-1 snapshot fields include:

```text
roll.category
roll.family
roll.outcome
roll.saveType
roll.dc
participants.source.level
participants.source.traits
participants.source.hp.current
participants.source.hp.max
participants.source.hp.temp
participants.source.hp.ratio
participants.source.conditions.wounded
participants.source.conditions.dying
participants.source.conditions.frightened
participants.target.level
participants.target.traits
battlefield.round
battlefield.turn
battlefield.selectedTargetCount
battlefield.hostileThreatCount
```

Providers may add compatible serializable fields. Package authors should test `api.cards.capabilities.contextConditions` and document any provider-specific requirements.

`null` is treated as unavailable. Thus a Phase-1 `battlefield.hostileThreatCount: null` fails `gte 3` and produces `reason: "field-unavailable"`; it does not become zero. `notExists` can intentionally match that state.

## Evaluation report

```js
{
  configured: true,
  matched: false,
  available: false,
  counts: {
    groups: 1,
    conditions: 2,
    matched: 1,
    failed: 1,
    unavailable: 1
  },
  root: {
    type: "group",
    mode: "all",
    matched: false,
    available: false,
    conditions: [
      {
        type: "condition",
        field: "battlefield.hostileThreatCount",
        operator: "gte",
        expected: 3,
        actual: null,
        fieldAvailable: false,
        available: false,
        matched: false,
        reason: "field-unavailable"
      }
    ]
  }
}
```

Stable reasons currently include `matched`, `value-mismatch`, `field-unavailable`, and `operator-unsupported`. Diagnostics render the same report used by the selector.

## Validation and safety

Validation rejects:

- malformed or empty field paths;
- prototype-related path segments (`__proto__`, `prototype`, `constructor`);
- unsupported group modes, operators, or custom-field value types;
- missing comparison values;
- non-numeric operands for numeric operators;
- null operands for contains operators;
- nesting deeper than 12 levels;
- trees larger than 250 nodes.

Card validation wraps condition errors under `CARD_CONDITIONS_INVALID` while preserving the detailed child report.

## Public API

```js
const conditions = game.modules.get("pf2e-critical-forge")?.api.cards.conditions;

conditions.modes;
conditions.operators;
conditions.emptyGroup("all");
conditions.normalize(tree);
conditions.validate(tree);
conditions.evaluate(tree, snapshot);
conditions.resolveField(snapshot, "participants.source.hp.ratio");
```

Matching and selection accept the snapshot separately from the legacy context:

```js
const report = api.cards.createContext(input, { system: "pf2e" });

const candidates = api.cards.candidates(report.context, {
  snapshot: report.snapshot
});

const selection = api.cards.select(report.context, {
  snapshot: report.snapshot,
  random: Math.random
});
```

## Diagnostics and preview persistence

The diagnostic workbench displays every condition leaf for eligible and rejected cards with field, operator, expected value, actual value, and status. Its copied JSON contains the untouched evaluation tree.

Preview flag version `4` stores `runtimeSnapshot`. A redraw passes that stored snapshot back into selection. Older preview version `3` flags without a snapshot continue to redraw legacy cards; conditioned cards are unavailable when their required data cannot be proven.

## Card Editor authoring layer

Phase 3 exposes the canonical condition tree through a visual builder. It provides nested `all`/`any` groups, a typed snapshot-field catalog, operator filtering, provider-defined custom paths with explicit operand types, contradiction warnings, and a synthetic test workbench. The UI calls the same normalizer and evaluator used during live selection; it does not maintain a second condition language.

Imported or extension-authored trees remain canonical data. Opening them in the editor does not migrate the schema, and cards with `conditions: null` remain on the legacy unconditional path. See [`CARD_EDITOR.md`](CARD_EDITOR.md).

## Condition Providers

Version `0.9.4-dev.6` adds typed field publication for extension snapshots:

```js
extension.registerConditionProvider({
  id: "my-expansion.fields",
  fields: [{
    path: "extensions.myExpansion.dangerScore",
    type: "number",
    fallbackLabel: "Danger score",
    fallbackGroup: "My Expansion"
  }]
});
```

Registered fields appear dynamically in the visual Card Editor and use the existing Condition Engine for safe resolution and evaluation. Supported provider types are `string`, `number`, `boolean`, `stringArray`, and `enum`. Providers cannot shadow core fields or fields owned by another provider.
