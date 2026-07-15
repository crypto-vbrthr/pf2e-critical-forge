# Critical Card Schema

Critical Forge cards are immutable, versioned data objects. They contain localization keys, matching metadata, selection weight, and an optional Effect Engine template. They do not contain Foundry chat markup or roll-hook logic.

## Card Definition

```js
{
  schemaVersion: 1,
  id: "core.slashing.deep-cut",
  packId: "core",
  category: "criticalHit",
  tone: "dramatic",
  impact: "moderate",

  titleKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Slashing.DeepCut.Title",
  descriptionKey: "PF2E_CRITICAL_FORGE.CriticalForge.Cards.Slashing.DeepCut.Description",
  fallbackTitle: "Deep Cut",
  fallbackDescription: "The blade opens a wound that refuses to close.",

  weight: 2,
  tags: ["physical", "bleed"],

  filters: {
    damageTypes: ["slashing"],
    weaponGroups: [],
    attackTraits: [],
    sourceTraits: [],
    targetTraits: [],
    excludedSourceTraits: [],
    excludedTargetTraits: ["incorporeal"]
  },

  effect: {
    target: "target",
    nameKey: "PF2E_CRITICAL_FORGE.CriticalForge.Effects.Slashing.DeepCut.Name",
    fallbackName: "Deep Cut",
    definition: {
      schemaVersion: 1,
      duration: { value: -1, unit: "unlimited", expiry: null },
      components: [
        { type: "persistentDamage", formula: "1d6", damageType: "bleed" }
      ]
    }
  },

  metadata: {}
}
```

## Categories

The first schema supports:

- `criticalHit`
- `criticalFumble`

Additional categories require a future card-schema migration rather than ad-hoc string parsing.

## Tone and impact

Every card carries two independent presentation and selection attributes:

- `tone`: `neutral`, `serious`, `dramatic`, or `humorous`;
- `impact`: `narrative`, `light`, `moderate`, or `strong`.

They do not alter the Effect Definition. Selection profiles use them only as weight multipliers, so a non-preferred card remains eligible unless another filter rejects it. Cards that omit these additive fields normalize to `neutral` and either `moderate` for mechanical cards or `narrative` for effect-free cards.

## Localization

`titleKey`, `descriptionKey`, and `effect.nameKey` are stable localization keys. Fallback values keep external packs usable while a translation is missing. The card itself is never rewritten when the active Foundry language changes.

## Filter semantics

- `damageTypes` and `weaponGroups`: at least one listed value must match.
- `attackTraits`, `sourceTraits`, and `targetTraits`: every listed value must be present.
- `excludedSourceTraits` and `excludedTargetTraits`: no listed value may be present.
- Empty arrays do not restrict a card.

## Effect template

The effect template deliberately omits `name`. `materializeEffect()` resolves `nameKey` in the active language and creates a complete immutable Effect Definition. `target` determines whether a future runtime applies the result to the attack source or target.

Narrative-only cards may set `effect: null`.
