# PF2E Critical Forge

PF2E Critical Forge consists of two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: a localized card architecture with PF2e diagnostics and manually published preview-only result chat cards.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

Version `0.5.5-dev` adds the first **manual Critical Forge result preview**. A GM can select or drop an existing PF2e roll message, inspect the complete diagnostic report, and deliberately publish any eligible card as a localized preview-only chat card. The preview shows narrative text, effect target, duration, and mechanical components, but offers no apply action and changes no Actor.

The module targets **Foundry VTT 14** with **PF2e 8.1.2 or newer**.

The current engine includes:

- the complete Effect Engine and polished Effect Forge from the `0.4.0` release-candidate line;
- versioned Critical Card and Card Pack schemas;
- transactional Pack Registry and globally indexed Card Registry;
- localized title, description, and effect-name resolution with fallbacks;
- headless filter matching for damage types, weapon groups, attack traits, and actor traits;
- transparent candidate reports and weighted selection with injectable randomness;
- recent-card exclusion supplied by callers;
- conversion of card effect templates into immutable Effect Definitions;
- a small localized `core` architecture test pack;
- a public API for external card packs and selectors;
- a diagnostic PF2e Context Adapter for explicitly supplied messages, rolls, strikes, items, actors, tokens, and roll options;
- a GM-only manual diagnostic workbench for real PF2e chat messages;
- localized preview-only result chat cards published explicitly from eligible diagnostic candidates;
- structured preview flags reserved for later user-confirmed effect application;
- no automatic roll hooks, automatic card selection, effect application, or Actor changes for Critical Forge yet.

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

The suite covers the Effect Engine and Forge as well as card normalization, pack registration, matching, weighted selection, localization, Effect Definition materialization, diagnostic reports, effect summaries, and preview-chat publication data.

See [`docs/TESTING.md`](docs/TESTING.md) for the test layout and mocking strategy.

## Documentation

- [`docs/API.md`](docs/API.md): public API reference
- [`docs/CRITICAL_FORGE_ARCHITECTURE.md`](docs/CRITICAL_FORGE_ARCHITECTURE.md): headless Critical Forge subsystem boundaries
- [`docs/CARD_SCHEMA.md`](docs/CARD_SCHEMA.md): Critical Card data model and filter semantics
- [`docs/CARD_PACKS.md`](docs/CARD_PACKS.md): pack registration and extension model
- [`docs/CARD_SELECTION.md`](docs/CARD_SELECTION.md): candidate evaluation and weighted selection
- [`docs/PF2E_CONTEXT_ADAPTER.md`](docs/PF2E_CONTEXT_ADAPTER.md): PF2e document-to-context translation and diagnostics
- [`docs/CRITICAL_DIAGNOSTICS.md`](docs/CRITICAL_DIAGNOSTICS.md): manual chat-message diagnostic workbench and report format
- [`docs/CRITICAL_CARD_PREVIEW.md`](docs/CRITICAL_CARD_PREVIEW.md): manual preview-only result chat cards and stored message flags
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
