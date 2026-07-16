# PF2E Critical Forge

PF2E Critical Forge consists of two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: a localized card architecture with PF2e diagnostics, configurable result-chat visibility, and manual GM-confirmed effect application.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

Version `0.6.2-dev` hardens the Critical Card Pack Editor with deterministic collision-free card IDs and a full regression path from protected core-card template through Effect Forge editing, JSON export/import, world persistence, live selection, chat preview, and Effect Engine compilation.

The module targets **Foundry VTT 14** with **PF2e 8.1.2 or newer**.

The current engine includes:

- the complete Effect Engine and polished Effect Forge from the `0.4.0` release-candidate line;
- versioned Critical Card and Card Pack schemas;
- transactional Pack Registry and globally indexed Card Registry;
- localized title, description, and effect-name resolution with fallbacks;
- a 48-card core test library covering slashing, piercing, bludgeoning, generic hits, melee fumbles, ranged fumbles, and generic fumbles;
- a GM-only Card Pack Editor for world-managed packs, cards, filters, tone, impact, weights, fallback text, and localization keys;
- direct mechanical-effect editing through a dedicated Effect Forge handoff;
- portable card-pack JSON import and export through files or the clipboard;
- headless filter matching, tone/impact profile weighting, and transparent candidate reports;
- a diagnostic PF2e Context Adapter and GM-only manual workbench for real chat messages;
- localized result cards with configurable `blind`, `gm`, `public`, or `self` visibility;
- configurable trigger policies for all critical results or natural 20/1 final critical outcomes;
- redrawable cards with bounded draw history and no immediate repeats;
- GM-confirmed effect application to the stored source or target Actor;
- target re-resolution, target-aware validation, duplicate protection, and application audit flags;
- a primary-GM-owned `createChatMessage` hook that detects PF2e critical attack rolls, asks or draws according to world settings, and never applies effects automatically.

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

// Open the Critical Card Pack Editor
game.modules.get("pf2e-critical-forge")?.api.ui.openCardPackEditor();
```

## Automated tests

The repository contains dependency-free tests using the Node test runner:

```bash
npm test
npm run test:coverage
npm run quality:check
```

The suite covers the Effect Engine and Forge as well as card normalization, pack-editor models, card-pack transfer, Effect Forge handoff, profile weighting, natural-roll trigger policies, automatic attack-message processing, diagnostics, redraw history, result-card visibility, target resolution, validation, duplicate protection, and manual effect application.

See [`docs/TESTING.md`](docs/TESTING.md) for the test layout and mocking strategy.

## Documentation

- [`docs/API.md`](docs/API.md): public API reference
- [`docs/CRITICAL_FORGE_ARCHITECTURE.md`](docs/CRITICAL_FORGE_ARCHITECTURE.md): headless Critical Forge subsystem boundaries
- [`docs/CARD_SCHEMA.md`](docs/CARD_SCHEMA.md): Critical Card data model and filter semantics
- [`docs/CARD_PACKS.md`](docs/CARD_PACKS.md): pack registration and extension model
- [`docs/CARD_EDITOR.md`](docs/CARD_EDITOR.md): visual pack editor, protected templates, Effect Forge handoff, and JSON transfer
- [`docs/CARD_SELECTION.md`](docs/CARD_SELECTION.md): candidate evaluation and weighted selection
- [`docs/CORE_CARD_LIBRARY.md`](docs/CORE_CARD_LIBRARY.md): bundled 48-card test-library matrix and content boundaries
- [`docs/PF2E_CONTEXT_ADAPTER.md`](docs/PF2E_CONTEXT_ADAPTER.md): PF2e document-to-context translation and diagnostics
- [`docs/CRITICAL_DIAGNOSTICS.md`](docs/CRITICAL_DIAGNOSTICS.md): manual chat-message diagnostic workbench and report format
- [`docs/CRITICAL_CARD_PREVIEW.md`](docs/CRITICAL_CARD_PREVIEW.md): result chat cards, visibility, stored flags, redraws, and effect application
- [`docs/CRITICAL_AUTOMATION.md`](docs/CRITICAL_AUTOMATION.md): live PF2e attack-roll hook, prompt/automatic behavior, ownership, and audit flags
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
