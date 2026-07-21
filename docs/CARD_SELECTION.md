# Critical Card Selection

The selection service is headless and deterministic when supplied with a deterministic random function. It does not inspect Foundry chat messages, actors, strikes, or tokens. The PF2e Context Adapter converts explicitly supplied PF2e documents and roll data into a plain selection context plus an immutable runtime snapshot. The selector remains document-agnostic.

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

## Deck resolution

The selector derives one requested deck from the neutral context:

- attack and spell-attack categories request `attack`;
- saving-throw categories request `fortitude`, `reflex`, or `will` when exactly one normalized save type is known;
- ambiguous or unsupported contexts request `default`.

Resolution then occurs independently for every enabled pack. A populated requested deck is active for that pack. If it is absent, a populated `default` deck is active. If neither exists, all cards from that pack are rejected by deck resolution. This order prevents a specialized Reflex deck from leaking into Fortitude or Will rolls while allowing unrelated legacy packs to remain in the same global candidate pool.

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
- `conditionEvaluation`
- `requestedDeckType`
- `activeDeckType`

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
  snapshot: report.snapshot,
  excludeCardIds: recentlyUsed,
  profile: "dramatic",
  random: Math.random
});

console.log(result.requestedDeckType);
console.log(result.selected);
console.log(result.eligible);
console.log(result.rejected);
```

A card may combine positive and negative attack filters. For example, `attackTraits: ["ranged"]` together with `excludedAttackTraits: ["spell"]` matches ranged weapon attacks but rejects ranged spell attacks.

The returned report makes the choice auditable. Rejected entries identify `deckType` when their assigned deck is not the pack's active deck. Repetition prevention is supplied by the caller through `excludeCardIds`; the architecture stores no campaign history by itself.

## Building a context from PF2e data

```js
const report = api.cards.adapters.pf2e.createContext({
  message,
  item,
  sourceActor,
  targetActor
});

if (report.valid) {
  const selection = api.cards.select(report.context, { snapshot: report.snapshot });
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


## Condition evaluation

Filters continue to match the neutral selection context. Optional card conditions are evaluated separately against `options.snapshot`:

```js
const match = api.cards.match(card, report.context, {
  snapshot: report.snapshot
});

console.log(match.conditionEvaluation.configured);
console.log(match.conditionEvaluation.matched);
console.log(match.conditionEvaluation.root);
```

A conditioned card with no matching snapshot is rejected with `rejectedBy: ["conditions"]`. A legacy card with no conditions remains eligible and reports `configured: false, matched: true`. Every condition leaf records its field, operator, expected value, actual value, availability, result, and stable reason.

Conditions do not add specificity and therefore do not alter weight. They are gates, not multipliers. The automatic pipeline and diagnostics pass the snapshot produced for the same roll. Redraws reuse the snapshot stored with the original preview, so a later HP or battlefield change does not rewrite history.
