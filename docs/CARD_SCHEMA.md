# Critical Card Schema

Critical Forge cards are immutable, versioned data objects. They contain localization keys, matching metadata, selection weight, and an optional Effect Engine template. They do not contain Foundry chat markup or roll-hook logic.

## Card Definition

```js
{
  schemaVersion: 1,
  id: "core.spell-hit.arcane-resonance",
  packId: "core",
  category: "spellCriticalHit",
  deckType: "attack",
  tone: "dramatic",
  impact: "moderate",

  titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.SpellHit.ArcaneResonance.Title",
  descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.SpellHit.ArcaneResonance.Description",
  fallbackTitle: "Arcane Resonance",
  fallbackDescription: "Residual magic continues to crackle through the target.",

  weight: 2,
  tags: ["spell", "energy"],

  filters: {
    damageTypes: [],
    weaponGroups: [],
    attackTraits: ["spell"],
    excludedAttackTraits: [],
    saveTypes: [],
    spellTraditions: ["arcane"],
    spellTraits: [],
    sourceTraits: [],
    targetTraits: [],
    excludedSourceTraits: [],
    excludedTargetTraits: []
  },

  conditions: {
    type: "group",
    mode: "all",
    conditions: [
      {
        type: "condition",
        field: "participants.source.hp.ratio",
        operator: "lte",
        value: 0.5
      }
    ]
  },

  effect: {
    target: "target",
    nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.SpellHit.ArcaneResonance.Name",
    fallbackName: "Arcane Resonance",
    definition: {
      schemaVersion: 2,
      duration: { value: 1, unit: "rounds", expiry: "turn-end" },
      components: []
    }
  },

  metadata: {}
}
```

## Categories

Schema version 1 supports six categories:

- `criticalHit`
- `criticalFumble`
- `spellCriticalHit`
- `spellCriticalFumble`
- `savingThrowCriticalSuccess`
- `savingThrowCriticalFailure`

The four newer categories are additive values within the existing schema. Existing packs remain compatible because unknown or omitted filter arrays normalize safely.

## Deck assignment

`deckType` is optional in Critical Card schema version `1` and accepts:

- `default`
- `attack`
- `fortitude`
- `reflex`
- `will`

An omitted value normalizes to `default`. The `attack` deck accepts the four attack and spell-attack categories. The three save decks accept `savingThrowCriticalSuccess` and `savingThrowCriticalFailure`; their Fortitude, Reflex, or Will identity comes from the deck itself. `default` accepts every category because it is the compatibility and fallback deck.

Deck assignment is resolved per pack before filters and conditions. It is not a filter, tag, specificity bonus, or weight multiplier. See [`MULTI_DECK_PACKS.md`](MULTI_DECK_PACKS.md).

## Tone and impact

Every card carries two independent presentation and selection attributes:

- `tone`: `neutral`, `serious`, `dramatic`, or `humorous`;
- `impact`: `narrative`, `light`, `moderate`, or `strong`.

They do not alter the Effect Definition. Selection profiles use them only as weight multipliers, so a non-preferred card remains eligible unless another filter rejects it. Cards that omit these fields normalize to `neutral` and either `moderate` for mechanical cards or `narrative` for effect-free cards.

## Localization

`titleKey`, `descriptionKey`, and `effect.nameKey` are stable localization keys. Fallback values keep external packs usable while a translation is missing. The card itself is never rewritten when the active Foundry language changes.

## Filter semantics

- `damageTypes` and `weaponGroups`: at least one listed value must match.
- `attackTraits`, `saveTypes`, `spellTraditions`, `spellTraits`, `sourceTraits`, and `targetTraits`: every listed value must be present.
- `excludedAttackTraits`, `excludedSourceTraits`, and `excludedTargetTraits`: no listed value may be present.
- Empty arrays do not restrict a card.

`excludedAttackTraits: ["spell"]` is useful for ranged or otherwise generic attack cards that must never match spell attacks. `saveTypes` normally contains `fortitude`, `reflex`, or `will`. `spellTraditions` normally contains `arcane`, `divine`, `occult`, or `primal`. `spellTraits` stores normalized PF2e spell trait slugs.

## Effect template

The effect template deliberately omits `name`. `materializeEffect()` resolves `nameKey` in the active language and creates a complete immutable Effect Definition. `target` determines whether runtime application affects the rolling/source creature or the opposing/target creature.

For saving throws, the rolling creature is the source and the originating effect Actor is the target when PF2e provides both references. Narrative-only cards may set `effect: null`.


## Runtime conditions

`conditions` is optional in Critical Card schema version `1`. Omitted or `null` conditions preserve the historical behavior and never require a runtime snapshot. A conditioned card is eligible only when its canonical condition tree matches the immutable snapshot supplied to the selector.

A tree is either a leaf or a group:

```js
// Leaf
{
  type: "condition",
  field: "roll.saveType",
  operator: "eq",
  value: "reflex"
}

// Provider-defined field with persistent editor operand type
{
  type: "condition",
  field: "provider.danger.score",
  operator: "exists",
  valueType: "number"
}

// Nested group
{
  type: "group",
  mode: "all",
  conditions: [
    { field: "participants.source.hp.ratio", operator: "lte", value: 0.5 },
    {
      mode: "any",
      conditions: [
        { field: "battlefield.hostileThreatCount", operator: "gte", value: 3 },
        { field: "participants.target.level", operator: "gte", value: 13 }
      ]
    }
  ]
}
```

Normalization adds explicit `type` values and freezes the complete tree. Supported modes are `all` and `any`. Supported operators are `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `contains`, `notContains`, `exists`, and `notExists`.

Field paths address serializable snapshot data, for example:

- `roll.saveType`
- `roll.dc`
- `participants.source.level`
- `participants.source.hp.ratio`
- `participants.source.conditions.wounded`
- `participants.target.level`
- `participants.target.traits`
- `battlefield.hostileThreatCount`

A missing field fails every comparison except `notExists`. The evaluator records that field as unavailable rather than substituting a guessed value. Conditions affect eligibility only; they do not increase specificity or selection weight. See [`CONDITION_ENGINE.md`](CONDITION_ENGINE.md). Phase 3 exposes this same canonical tree in the Card Pack Editor; visual editing and synthetic testing do not create a second schema or change legacy cards. See [`CARD_EDITOR.md`](CARD_EDITOR.md).
