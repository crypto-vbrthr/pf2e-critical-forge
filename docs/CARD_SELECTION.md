# Critical Card Selection

The selection service is headless and deterministic when supplied with a deterministic random function. It does not inspect Foundry chat messages, actors, strikes, or tokens. The PF2e Context Adapter converts explicitly supplied PF2e documents and roll data into this plain selection context. The selector itself remains document-agnostic.

## Context

```js
{
  category: "criticalHit",
  damageTypes: ["slashing"],
  weaponGroups: ["sword"],
  attackTraits: ["agile"],
  saveTypes: [],
  spellTraditions: [],
  spellTraits: [],
  sourceTraits: ["humanoid"],
  targetTraits: ["undead"],
  requiredTags: [],
  excludedTags: []
}
```

## Candidate evaluation

Each card receives:

- `eligible`
- `rejectedBy`
- `matchedFilters`
- `specificity`
- `baseWeight`
- `unprofiledWeight`
- `profileMultiplier`
- `effectiveWeight`

Without a profile, `effectiveWeight` is:

```text
baseWeight × (1 + specificity)
```

With a profile it becomes:

```text
baseWeight × (1 + specificity) × toneMultiplier × impactMultiplier
```

The built-in profiles are `relaxed`, `balanced`, `dramatic`, `brutal`, and `custom`. They bias the draw rather than hard-filtering cards.

## Selection

```js
const result = api.cards.select(context, {
  excludeCardIds: recentlyUsed,
  profile: "dramatic",
  random: Math.random
});

console.log(result.selected);
console.log(result.eligible);
console.log(result.rejected);
```

A card may combine positive and negative attack filters. For example, `attackTraits: ["ranged"]` together with `excludedAttackTraits: ["spell"]` matches ranged weapon attacks but rejects ranged spell attacks.

The returned report makes the choice auditable. Repetition prevention is supplied by the caller through `excludeCardIds`; the architecture stores no campaign history by itself.

## Building a context from PF2e data

```js
const report = api.cards.adapters.pf2e.createContext({
  message,
  item,
  sourceActor,
  targetActor
});

if (report.valid) {
  const selection = api.cards.select(report.context);
}
```

The adapter is optional. External modules may continue constructing the neutral context directly.


## Trigger policy

The selection service does not subscribe to Foundry rolls. The separate trigger-policy service decides whether an already adapted critical result should be ignored, prompt the GM, or draw automatically:

```js
const policy = api.cards.triggers.configured(report.context.category);
const trigger = api.cards.triggers.evaluate(report, policy);
```

For `scope: "natural"`, a success-category card requires both a natural 20 and a final critical success; a failure-category card requires both a natural 1 and a final critical failure. A natural die result that only upgrades the roll to a normal success or failure does not trigger a card.
