# PF2E Critical Forge

PF2E Critical Forge consists of two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: a localized card system for critical attacks, spell attacks, and saving throws, with configurable automation and GM-confirmed effect application.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

Version `0.9.4-dev.7.1` keeps the **PF2e battlefield threat evaluation** from Phase 7 and improves its diagnostic presentation with a high-contrast Forge-themed threat panel. Runtime snapshots can now determine which Party/Opposition tokens immediately threaten the executing Actor through a ready, in-range melee Strike, known position, and clear attack path. Diagnostics explains every counted or rejected token. Existing packs, explicit threat-count providers, and all schema-version-1 cards and packs continue to work without migration.

The module targets **Foundry VTT 14** with **PF2e 8.1.2 or newer**.

The current module includes:

- the complete Effect Engine and polished Effect Forge from the `0.4.0` release-candidate line;
- optional duration overrides on every Effect component, compiled into linked native PF2e Effect Item bundles when durations differ;
- versioned Critical Card and Card Pack schemas;
- transactional Pack Registry, globally indexed Card Registry, and rollback-safe world-pack persistence;
- localized title, description, and effect-name resolution with fallbacks;
- a 96-card localized core test library:
  - 30 critical weapon hits;
  - 18 critical weapon fumbles;
  - 12 critical spell hits;
  - 12 critical spell fumbles;
  - 12 critically successful saving throws;
  - 12 critically failed saving throws;
- a GM-only Card Pack Editor for world-managed packs, five fixed deck tabs, cards, filters, tone, impact, weights, fallback text, localization keys, per-pack activation, and visual nested context conditions;
- filters for damage types, weapon groups, required or excluded attack traits, save types, spell traditions, spell traits, source traits, and target traits;
- direct mechanical-effect editing through a dedicated Effect Forge handoff;
- portable card-pack JSON import and export through files or the clipboard;
- headless per-pack deck resolution, filter matching, optional snapshot conditions, tone/impact profile weighting, and transparent candidate reports;
- a PF2e Context Adapter, immutable runtime snapshots, and a GM-only Diagnostics 2.0 workbench with pipeline reports, session history, replay, simulation, and JSON export;
- localized result cards with configurable `blind`, `gm`, `public`, or `self` visibility;
- independent behavior and natural-roll trigger settings for all six supported critical categories;
- redrawable cards with bounded draw history and no immediate repeats;
- GM-confirmed effect application to the stored source or target Actor;
- target re-resolution, target-aware validation, duplicate protection, and application audit flags;
- a primary-GM-owned `createChatMessage` hook that detects supported PF2e critical rolls, asks or draws according to world settings, and never applies effects automatically.
- a versioned module-bound extension contract with capability checks, ownership isolation, transactional Multi-Deck pack registration, Context/Condition/Diagnostic Providers, and structured conflict diagnostics;
- an additive Context Provider API and public Condition Engine API with capability detection for context-sensitive extensions.
- automatic PF2e melee-threat analysis using alliances, ready Strike reach, occupied token spaces, elevation, relative perception, and wall collision, with complete per-token diagnostic evidence.

## API access

```js
const api = game.modules.get("pf2e-critical-forge")?.api;

console.log(api.version);
console.log(api.schemaVersion);
console.log(api.effects);
console.log(api.cards);
```

The API is available whenever the module is active. Critical card registries are initialized regardless of whether the optional Critical Forge UI is enabled.

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

The suite covers the Effect Engine and Forge, component-duration inheritance and native Item splitting, Item-bundle updates, card normalization, Multi-Deck resolution and legacy fallback, Card Pack Editor deck actions and round-trips, the visual condition model and simulator, pack activation, rollback-safe world persistence, external extension contracts and provider lifecycles, spell/save filters, PF2e context adaptation, battlefield melee-threat evaluation, nested condition normalization/evaluation/validation, natural-roll trigger policies, automatic supported-roll processing, diagnostics, redraw history, result-card visibility, target resolution, validation, duplicate protection, and manual effect application.

See [`docs/TESTING.md`](docs/TESTING.md) for the test layout and mocking strategy.

## Documentation

- [`docs/API.md`](docs/API.md): public API reference
- [`docs/CRITICAL_FORGE_ARCHITECTURE.md`](docs/CRITICAL_FORGE_ARCHITECTURE.md): Critical Forge subsystem boundaries
- [`docs/CARD_SCHEMA.md`](docs/CARD_SCHEMA.md): Critical Card data model and filter semantics
- [`docs/CARD_PACKS.md`](docs/CARD_PACKS.md): pack registration and extension model
- [`docs/MULTI_DECK_PACKS.md`](docs/MULTI_DECK_PACKS.md): attack/save deck resolution, legacy fallback, authoring, and extension guidance
- [`docs/EXTENSION_CONTRACT.md`](docs/EXTENSION_CONTRACT.md): versioned compatibility checks, bound ownership, providers, and registration diagnostics
- [`docs/EXTENSION_MODULES.md`](docs/EXTENSION_MODULES.md): complete optional-module integration contract and example
- [`docs/CARD_EDITOR.md`](docs/CARD_EDITOR.md): visual pack editor, protected templates, Effect Forge handoff, and JSON transfer
- [`docs/CARD_SELECTION.md`](docs/CARD_SELECTION.md): candidate evaluation and weighted selection
- [`docs/CORE_CARD_LIBRARY.md`](docs/CORE_CARD_LIBRARY.md): bundled 96-card test-library matrix and content boundaries
- [`docs/CONTEXT_ENGINE.md`](docs/CONTEXT_ENGINE.md): runtime snapshots, Context Builder, provider registry, resolver, and compatibility guarantees
- [`docs/BATTLEFIELD_THREATS.md`](docs/BATTLEFIELD_THREATS.md): Party/Opposition melee-threat rules, reach, perception, walls, diagnostics, and public API
- [`docs/CONDITION_ENGINE.md`](docs/CONDITION_ENGINE.md): card conditions, operators, evaluation evidence, API, and compatibility rules
- [`docs/PF2E_CONTEXT_ADAPTER.md`](docs/PF2E_CONTEXT_ADAPTER.md): PF2e document-to-context translation and diagnostics
- [`docs/CRITICAL_DIAGNOSTICS.md`](docs/CRITICAL_DIAGNOSTICS.md): manual chat-message diagnostic workbench and report format
- [`docs/CRITICAL_CARD_PREVIEW.md`](docs/CRITICAL_CARD_PREVIEW.md): result chat cards, visibility, stored flags, redraws, and effect application
- [`docs/CRITICAL_AUTOMATION.md`](docs/CRITICAL_AUTOMATION.md): live PF2e roll hook, prompt/automatic behavior, ownership, and audit flags
- [`docs/EDITING_ITEMS.md`](docs/EDITING_ITEMS.md): loading, updating, and preserving existing Effect Items
- [`docs/IMPORT_EXPORT.md`](docs/IMPORT_EXPORT.md): portable JSON files, clipboard transfer, and API helpers
- [`docs/EFFECT_SCHEMA.md`](docs/EFFECT_SCHEMA.md): Effect Definition schema
- [`docs/COMPONENT_DURATIONS.md`](docs/COMPONENT_DURATIONS.md): component inheritance, native Item bundles, and API behavior
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
