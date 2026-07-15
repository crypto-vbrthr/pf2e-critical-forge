# PF2E Critical Forge

PF2E Critical Forge consists of two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: a localized card architecture with PF2e diagnostics, configurable result-chat visibility, and manual GM-confirmed effect application.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

Version `0.5.7-dev` adds the **trigger and card-profile architecture** that will drive the later automatic roll hook. Critical hits and fumbles can be configured independently for all critical results or only natural 20/1 results that actually end as a critical success/failure. Cards now carry tone and impact metadata, selection can use relaxed, balanced, dramatic, brutal, or custom weighting profiles, and an unapplied chat card can be redrawn without immediately repeating recent cards.

The module targets **Foundry VTT 14** with **PF2e 8.1.2 or newer**.

The current engine includes:

- the complete Effect Engine and polished Effect Forge from the `0.4.0` release-candidate line;
- versioned Critical Card and Card Pack schemas;
- transactional Pack Registry and globally indexed Card Registry;
- localized title, description, and effect-name resolution with fallbacks;
- headless filter matching, tone/impact profile weighting, and transparent candidate reports;
- a diagnostic PF2e Context Adapter and GM-only manual workbench for real chat messages;
- localized result cards with configurable `blind`, `gm`, `public`, or `self` visibility;
- configurable trigger policies for all critical results or natural 20/1 final critical outcomes;
- redrawable cards with bounded draw history and no immediate repeats;
- GM-confirmed effect application to the stored source or target Actor;
- target re-resolution, target-aware validation, duplicate protection, and application audit flags;
- no automatic roll hook yet; trigger and automatic/prompt behavior are currently exposed as tested policy services and world settings.

## API access

```js
const api = game.modules.get("pf2e-critical-forge")?.api;

console.log(api.version);
console.log(api.schemaVersion);
console.log(api.effects);
console.log(api.cards);
```

The API is available whenever the module is active. Critical card registries are initialized regardless of whether the optional Critical Forge diagnostic UI is enabled.

## Opening Forge tools

The normal entry point is the **Open Effect Forge** button in the Items Directory. For diagnostics or macros:

```js
game.modules.get("pf2e-critical-forge")?.api.ui.openEffectForge();

// Open an existing Item directly
await game.modules.get("pf2e-critical-forge")?.api.ui.openEffectForge(item);

// Open the manual Critical Forge diagnostic workbench
game.modules.get("pf2e-critical-forge")?.api.ui.openCriticalDiagnostics();
```

## Automated tests

The repository contains dependency-free tests using the Node test runner:

```bash
npm test
npm run test:coverage
npm run quality:check
```

The suite covers the Effect Engine and Forge as well as card normalization, profile weighting, natural-roll trigger policies, diagnostics, redraw history, result-card visibility, target resolution, validation, duplicate protection, and manual effect application.

See [`docs/TESTING.md`](docs/TESTING.md) for the test layout and mocking strategy.

## Documentation

- [`docs/API.md`](docs/API.md): public API reference
- [`docs/CRITICAL_FORGE_ARCHITECTURE.md`](docs/CRITICAL_FORGE_ARCHITECTURE.md): headless Critical Forge subsystem boundaries
- [`docs/CARD_SCHEMA.md`](docs/CARD_SCHEMA.md): Critical Card data model and filter semantics
- [`docs/CARD_PACKS.md`](docs/CARD_PACKS.md): pack registration and extension model
- [`docs/CARD_SELECTION.md`](docs/CARD_SELECTION.md): candidate evaluation and weighted selection
- [`docs/PF2E_CONTEXT_ADAPTER.md`](docs/PF2E_CONTEXT_ADAPTER.md): PF2e document-to-context translation and diagnostics
- [`docs/CRITICAL_DIAGNOSTICS.md`](docs/CRITICAL_DIAGNOSTICS.md): manual chat-message diagnostic workbench and report format
- [`docs/CRITICAL_CARD_PREVIEW.md`](docs/CRITICAL_CARD_PREVIEW.md): manual result chat cards, visibility, stored flags, and effect application
- [`docs/EDITING_ITEMS.md`](docs/EDITING_ITEMS.md): loading, updating, and preserving existing Effect Items
- [`docs/IMPORT_EXPORT.md`](docs/IMPORT_EXPORT.md): portable JSON files, clipboard transfer, and API helpers
- [`docs/EFFECT_SCHEMA.md`](docs/EFFECT_SCHEMA.md): Effect Definition schema
- [`docs/VALIDATION.md`](docs/VALIDATION.md): report format, phases, and issue codes
- [`docs/SELECTORS.md`](docs/SELECTORS.md): selector catalog and custom selectors
- [`docs/BASE_SPEED.md`](docs/BASE_SPEED.md): granting climb, burrow, fly, and swim Speeds
- [`docs/DAMAGE_TYPES.md`](docs/DAMAGE_TYPES.md): damage-type catalog and groups
- [`docs/RESISTANCE_TYPES.md`](docs/RESISTANCE_TYPES.md): resistance-type catalog and groups
- [`docs/WEAKNESS_TYPES.md`](docs/WEAKNESS_TYPES.md): weakness-type catalog and groups
- [`docs/IMMUNITY_TYPES.md`](docs/IMMUNITY_TYPES.md): immunity-type catalog and groups
- [`docs/FAST_HEALING.md`](docs/FAST_HEALING.md): fast-healing component behavior and Rule Element output
- [`docs/REGENERATION.md`](docs/REGENERATION.md): regeneration values, deactivation types, and Rule Element output
- [`docs/TEMPORARY_HIT_POINTS.md`](docs/TEMPORARY_HIT_POINTS.md): temporary Hit Points and native `TempHP` output
- [`docs/MOVEMENT.md`](docs/MOVEMENT.md): Speed modifiers, selectors, and stacking behavior
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md): complete examples
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): subsystem boundaries
- [`docs/TESTING.md`](docs/TESTING.md): local test execution and conventions
- [`docs/RELEASE_CANDIDATE.md`](docs/RELEASE_CANDIDATE.md): historical Effect Forge RC scope and manual test matrix
- [`RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md): final packaging and publication checklist
