# PF2E Critical Forge

PF2E Critical Forge consists of two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: planned on-demand critical-hit and fumble results.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

Version `0.3.1-dev` extends the editing workflow with drag-and-drop. PF2e Effect Items can be dropped into the GUI from the world, an Actor, or a compendium, translated back into supported components, updated in place where writable, or saved as a new Item. Unsupported Rule Elements are preserved unchanged instead of being discarded.

The current engine includes:

- versioned Effect Definitions;
- a fluent immutable Builder API;
- structured schema, rule, and compatibility validation;
- stable validation codes and severities;
- central selector, condition, damage, resistance, weakness, immunity, and movement catalogs;
- `condition`, `modifier`, `persistentDamage`, `resistance`, `weakness`, `immunity`, `fastHealing`, `regeneration`, `temporaryHitPoints`, `movement`, and `baseSpeed` components;
- compilation to native PF2e Effect Items and Rule Elements;
- world Item creation, in-place Item updates, Actor/Token application, and removal by definition ID;
- round-trip loading from stored definitions and compatible PF2e Rule Elements;
- drag-and-drop loading of world, embedded Actor, and compendium effects;
- preservation of unsupported or advanced Rule Elements during updates;
- a resizable, localized, component-based GM interface;
- an extension API for third-party components.

## API access

```js
const api = game.modules.get("pf2e-critical-forge")?.api;

console.log(api.version);
console.log(api.schemaVersion);
console.log(api.effects);
```

The API is available whenever the module is active, even when both user-facing Forge features are disabled.

## Opening Effect Forge

The normal entry point is the **Open Effect Forge** button in the Items Directory. For diagnostics or macros:

```js
game.modules.get("pf2e-critical-forge")?.api.ui.openEffectForge();

// Open an existing Item directly
await game.modules.get("pf2e-critical-forge")?.api.ui.openEffectForge(item);
```

## Automated tests

The repository contains dependency-free tests using the Node test runner:

```bash
npm test
npm run test:coverage
```

The suite covers the Builder, catalogs, Validation Engine, compiler, PF2e Rule Elements, Item source generation, Item round-tripping, drag-and-drop resolution, unmanaged-rule preservation, and the valued/non-valued condition boundary.

See [`docs/TESTING.md`](docs/TESTING.md) for the test layout and mocking strategy.

## Documentation

- [`docs/API.md`](docs/API.md): public API reference
- [`docs/EDITING_ITEMS.md`](docs/EDITING_ITEMS.md): loading, updating, and preserving existing Effect Items
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
