# Core Test Card Library

Version `0.7.0-dev` expands the deliberately balanced playtest library from 48 to 72 localized cards. The cards are complete enough to exercise filtering, profiles, redraw history, localization, chat presentation, and effect application, but their prose and weighting remain playtest material.

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
- 6 critical spell-hit cards
- 6 critical spell-fumble cards
- 6 critically successful saving-throw cards
- 6 critically failed saving-throw cards

## Tone distribution

- neutral: 11
- serious: 20
- dramatic: 21
- humorous: 20

## Impact distribution

- narrative: 12
- light: 26
- moderate: 22
- strong: 12

The distribution is intentionally broad rather than perfectly symmetrical. Relaxed, balanced, dramatic, brutal, and custom profiles therefore have enough material to produce visibly different draws.

## Context filters

The PF2e Context Adapter supplies stable `melee`, `ranged`, and `spell` attack traits when those modes can be resolved. It also supplies saving-throw types, spell traditions, and native spell traits. Core cards use these stable fields instead of depending on private strike or spell objects.

## Content boundaries

- Strong effects are generally short-lived.
- Persistent-damage cards exclude obviously unsuitable targets where practical.
- Narrative cards never create an Effect Item.
- The library avoids instant death, forced item destruction, permanent injuries, and effects that bypass normal encounter expectations.
- Saving-throw cards treat the roller as the effect source and may affect either that creature or the originating creature.
- Text and weighting may change after playtesting. Card IDs remain stable whenever possible so draw history and external references survive editorial revisions.
