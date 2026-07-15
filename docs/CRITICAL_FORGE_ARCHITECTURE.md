# Critical Forge Architecture

Version 0.5.0 introduces the headless Critical Forge domain layer. It deliberately contains no chat cards, roll hooks, directory buttons, actor inspection, or automatic effect application.

```text
PF2e adapter (future)
        │
        ▼
Selection Context
        │
        ▼
Card Matcher → Candidate Report → Weighted Selector
        │
        ▼
Localized Card / Materialized Effect Definition
        │
        ▼
Chat presentation and user decision (future)
        │
        ▼
Effect Engine
```

## Subsystems

```text
critical-forge/
├─ core/                 bundled architecture test pack
├─ localization/         key resolution and Effect materialization
├─ registry/             pack and card registries
├─ schema/               normalization and validation
├─ selection/            matching and weighted selection
├─ constants.js
├─ critical-forge.js     singleton composition and registration service
└─ utils.js
```

## Boundary rules

- Cards contain no rendered HTML.
- The selector consumes plain JavaScript data only.
- The selector never reads Foundry documents directly.
- Card registration is independent from the Critical Forge world setting.
- Localization happens only when a consumer asks for presentation data.
- Mechanical consequences remain Effect Definitions and are handled by the Effect Engine.
- No effect is applied automatically in this milestone.

## Future adapters

Later versions may add separate adapters for PF2e strikes, spells, and other checks. Those adapters must produce the same selection context instead of adding PF2e document knowledge to the card domain.
