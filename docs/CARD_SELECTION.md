# Critical Card Selection

The selection service is headless and deterministic when supplied with a deterministic random function. It does not inspect Foundry chat messages, actors, strikes, or tokens. A future PF2e adapter will convert those documents into a plain selection context.

## Context

```js
{
  category: "criticalHit",
  damageTypes: ["slashing"],
  weaponGroups: ["sword"],
  attackTraits: ["agile"],
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
- `effectiveWeight`

`effectiveWeight` is calculated as:

```text
baseWeight × (1 + specificity)
```

This gives a matching specialized card more weight than a generic fallback while preserving explicit pack weighting.

## Selection

```js
const result = api.cards.select(context, {
  excludeCardIds: recentlyUsed,
  random: Math.random
});

console.log(result.selected);
console.log(result.eligible);
console.log(result.rejected);
```

The returned report makes the choice auditable. Repetition prevention is supplied by the caller through `excludeCardIds`; the architecture stores no campaign history by itself.
