# Core Test Card Library

Version `0.9.4-dev.2` freezes the deliberately balanced 96-card playtest library. The four spell-attack and saving-throw categories contain generic fallbacks and focused results for repeated table use, while their prose and weighting remain playtest material.

## Composition

- 30 critical weapon-hit cards
  - 8 slashing
  - 8 piercing
  - 8 bludgeoning
  - 6 generic
- 18 critical weapon-fumble cards
  - 6 melee
  - 6 ranged
  - 6 generic
- 12 critical spell-hit cards
- 12 critical spell-fumble cards
- 12 critically successful saving-throw cards
- 12 critically failed saving-throw cards

## Tone distribution

- neutral: 17
- serious: 28
- dramatic: 28
- humorous: 23

## Impact distribution

- narrative: 15
- light: 34
- moderate: 31
- strong: 16

The distribution is intentionally broad rather than perfectly symmetrical. Relaxed, balanced, dramatic, brutal, and custom profiles therefore have enough material to produce visibly different draws.

## Expanded spell pools

Every spell category retains four generic fallback cards even when no tradition or spell trait can be resolved. Focused cards add results for:

- arcane, divine, occult, and primal traditions;
- acid, cold, electricity, fire, light, and mental spell traits;
- caster boons, target vulnerabilities, sensory disruption, magical backlash, and short-lived control effects.

A spell attack with both a known tradition and a matching spell trait therefore draws from a wider pool without making generic cards disappear.

## Expanded saving-throw pools

Each save type now has two focused cards in both the critical-success and critical-failure categories:

- Reflex
- Fortitude
- Will

Generic fallback cards remain available for incomplete PF2e message context. Critically failed saves against recognized arcane, divine, occult, or primal spells additionally qualify for a spell-specific vulnerability result.

## Context filters

The PF2e Context Adapter supplies stable `melee`, `ranged`, and `spell` attack traits when those modes can be resolved. It also supplies saving-throw types, spell traditions, and native spell traits. Core cards use these stable fields instead of depending on private strike or spell objects.

## Content boundaries

- Strong effects are generally short-lived.
- Persistent-damage cards exclude obviously unsuitable targets where practical.
- Narrative cards never create an Effect Item.
- The library avoids instant death, forced item destruction, permanent injuries, and effects that bypass normal encounter expectations.
- Saving-throw cards treat the roller as the effect source and may affect either that creature or the originating creature.
- Text and weighting may change after playtesting. Card IDs remain stable whenever possible so draw history and external references survive editorial revisions.
