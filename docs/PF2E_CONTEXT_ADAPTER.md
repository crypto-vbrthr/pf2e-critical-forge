# PF2e Context Adapter

The PF2e Context Adapter is a headless translation boundary. It accepts PF2e/Foundry objects explicitly supplied by a caller and returns the neutral context consumed by Critical Forge card matching.

Adapter version `1.2.2` supports weapon attacks, spell attacks, and saving throws. The adapter itself does not register hooks, choose cards, render HTML, or apply effects. The separate automation service supplies newly created PF2e messages to it.

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
    category: "savingThrowCriticalFailure",
    damageTypes: [],
    weaponGroups: [],
    attackTraits: [],
    saveTypes: ["reflex"],
    spellTraditions: ["arcane"],
    spellTraits: ["fire"],
    sourceTraits: ["human", "humanoid"],
    targetTraits: [],
    requiredTags: [],
    excludedTags: []
  },
  metadata: {
    adapter: "pf2e",
    adapterVersion: "1.2.2",
    degreeOfSuccess: {
      index: 0,
      key: "criticalFailure",
      slug: "critical-failure"
    },
    roll: {
      family: "savingThrow",
      dieResult: 1,
      isNatural20: false,
      isNatural1: true
    },
    source: {},
    target: {},
    attack: {},
    save: {
      type: "reflex"
    },
    spell: {
      isSpell: true,
      rank: 3,
      traditions: ["arcane"],
      traits: ["fire"]
    },
    rollOptions: [],
    provenance: {}
  },
  diagnostics: [],
  errors: [],
  warnings: [],
  information: []
}
```

Only `context` is consumed by the card selector. `metadata` and diagnostics are for inspection, logs, chat presentation, and debugging.

## Category mapping

```text
attack + critical success       → criticalHit
attack + critical failure       → criticalFumble
spell attack + critical success → spellCriticalHit
spell attack + critical failure → spellCriticalFumble
save + critical success         → savingThrowCriticalSuccess
save + critical failure         → savingThrowCriticalFailure
```

Ordinary success and failure intentionally produce no card category.

## Input precedence

Explicit fields supplied by the caller are combined with discovered PF2e data. The adapter can read:

- degree of success and natural d20 value from explicit values, a CheckRoll, or PF2e chat flags;
- roll family from message context, roll identifiers, actions, and roll options;
- damage types from weapon data, spell data, selected versatile/modular damage, NPC melee damage rolls, damage-message flags, or roll options;
- weapon groups and native attack traits from the item, strike, or roll options;
- synthetic `melee`, `ranged`, and `spell` attack traits;
- saving-throw type (`fortitude`, `reflex`, or `will`);
- spell traditions, spell traits, and spell rank when a spell item/context is available;
- source and target traits from Actors or roll options;
- actor identity, level, size, token references, item identity, range mode, and alternative usage.

A selected versatile or modular damage type replaces the weapon's base damage type for the primary attack context.

## Source and target semantics

For weapon and spell attacks, the attack origin is the source and the attacked creature is the target. For saving throws, the rolling creature is the source; the originating Actor/effect is the target when PF2e records it. This lets a save-success card benefit the roller while a save-failure card can affect either side.

## Diagnostic codes

- `PF2E_CONTEXT_INPUT_INVALID`
- `PF2E_CONTEXT_CATEGORY_UNRESOLVED`
- `PF2E_CONTEXT_OUTCOME_NOT_CRITICAL`
- `PF2E_CONTEXT_ITEM_UNRESOLVED`
- `PF2E_CONTEXT_SOURCE_UNRESOLVED`
- `PF2E_CONTEXT_TARGET_UNRESOLVED`
- `PF2E_CONTEXT_DAMAGE_TYPES_EMPTY`
- `PF2E_CONTEXT_SAVE_TYPE_UNRESOLVED`
- `PF2E_CONTEXT_SPELL_UNRESOLVED`

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

The adapter and selector remain separate so callers can inspect, amend, cache, or reject a context before selection.

## Natural d20 metadata

The adapter stores the unmodified d20 result independently from the final degree of success:

```js
report.metadata.roll = {
  dieResult: 20,
  isNatural20: true,
  isNatural1: false
};
```

Trigger policies use both values. Natural scope never treats a natural 20/1 as sufficient unless the final degree is also the matching critical result.
