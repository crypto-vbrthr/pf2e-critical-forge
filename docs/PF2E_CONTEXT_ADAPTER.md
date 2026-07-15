# PF2e Context Adapter

The PF2e Context Adapter is a headless translation boundary. It accepts PF2e/Foundry objects explicitly supplied by a caller and returns the neutral context consumed by Critical Forge card matching.

It does not register hooks, render chat cards, choose a card, or apply effects.

## API

```js
const api = game.modules.get("pf2e-critical-forge")?.api;

const report = api.cards.adapters.pf2e.createContext({
  message,
  roll,
  item,
  strike,
  sourceActor,
  targetActor,
  sourceToken,
  targetToken
});
```

Equivalent generic entry point:

```js
const report = api.cards.createContext(input, { system: "pf2e" });
```

## Result

```js
{
  valid: true,
  context: {
    category: "criticalHit",
    damageTypes: ["slashing"],
    weaponGroups: ["sword"],
    attackTraits: ["agile", "finesse"],
    sourceTraits: ["human", "humanoid"],
    targetTraits: ["undead"],
    requiredTags: [],
    excludedTags: []
  },
  metadata: {
    adapter: "pf2e",
    adapterVersion: "1.0.0",
    degreeOfSuccess: {
      index: 3,
      key: "criticalSuccess",
      slug: "critical-success"
    },
    source: {},
    target: {},
    attack: {},
    rollOptions: [],
    provenance: {}
  },
  diagnostics: [],
  errors: [],
  warnings: [],
  information: []
}
```

Only `context` is consumed by the card selector. `metadata` and diagnostics are for inspection, logs, future chat presentation, and debugging.

## Input precedence

Explicit fields supplied by the caller are combined with discovered PF2e data. The adapter can read:

- degree of success from explicit values, a CheckRoll, or PF2e chat flags;
- damage types from weapon data, selected versatile/modular damage, NPC melee damage rolls, damage-message flags, or roll options;
- weapon groups and attack traits from the item, strike, or roll options;
- source and target traits from Actors or `self:trait:*` and `target:trait:*` roll options;
- actor identity, level, size, and token references;
- item identity, weapon category, base item, range mode, and alternative usage.

A selected versatile or modular damage type replaces the weapon's base damage type for the primary attack context.

## Degree of success mapping

```text
3 / criticalSuccess → criticalHit
0 / criticalFailure → criticalFumble
```

Ordinary success and failure intentionally produce no card category. The report is therefore invalid for selection and includes `PF2E_CONTEXT_OUTCOME_NOT_CRITICAL` plus `PF2E_CONTEXT_CATEGORY_UNRESOLVED`.

## Diagnostic codes

- `PF2E_CONTEXT_INPUT_INVALID`: the adapter input is not an object.
- `PF2E_CONTEXT_CATEGORY_UNRESOLVED`: no explicit or critical roll category could be determined.
- `PF2E_CONTEXT_OUTCOME_NOT_CRITICAL`: the detected roll was a normal success or failure.
- `PF2E_CONTEXT_ITEM_UNRESOLVED`: no attack item was supplied or exposed by the message/strike.
- `PF2E_CONTEXT_SOURCE_UNRESOLVED`: no source Actor or source UUID was available.
- `PF2E_CONTEXT_TARGET_UNRESOLVED`: no target Actor or target UUID was available.
- `PF2E_CONTEXT_DAMAGE_TYPES_EMPTY`: no damage type could be determined; generic cards remain usable.

Missing optional data is informational. Only errors make `report.valid` false.

## Selection pipeline

```js
const adapted = api.cards.adapters.pf2e.createContext({
  message,
  sourceActor,
  targetActor
});

if (adapted.valid) {
  const result = api.cards.select(adapted.context, {
    excludeCardIds: recentlyUsed,
    random: Math.random
  });
}
```

The adapter and selector remain separate so callers can inspect, amend, cache, or reject a context before card selection.
