# PF2E Critical Forge

PF2E Critical Forge consists of two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: planned on-demand critical-hit and fumble results.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

Version `0.2.8-dev` adds movement modifiers as the tenth built-in effect component. It supports all Speeds or a specific movement mode and compiles through PF2e's native Speed selectors on a `FlatModifier` Rule Element.

The current engine includes:

- versioned Effect Definitions;
- a fluent immutable Builder API;
- structured schema, rule, and compatibility validation;
- stable validation codes and severities;
- a central PF2e selector catalog with grouped selectors and dynamic skills;
- a central damage-type catalog backed by `CONFIG.PF2E.damageTypes`;
- a central resistance-type catalog backed by `CONFIG.PF2E.resistanceTypes`;
- a central weakness-type catalog backed by `CONFIG.PF2E.weaknessTypes`;
- a grouped immunity-type catalog backed by `CONFIG.PF2E.immunityTypes`;
- a PF2e condition catalog that distinguishes valued and non-valued conditions;
- `condition`, `modifier`, `persistentDamage`, `resistance`, `weakness`, `immunity`, `fastHealing`, `regeneration`, `temporaryHitPoints`, and `movement` components;
- compilation to PF2e `GrantItem`, `FlatModifier`, `Resistance`, `Weakness`, `Immunity`, `FastHealing`, and `TempHP` Rule Elements, including persistent-damage and recovery-DC alterations;
- PF2e Effect Item source generation;
- world Item creation, Actor/Token application, and removal by definition ID;
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
```

## Automated tests

The repository contains dependency-free tests using the Node test runner:

```bash
npm test
npm run test:coverage
```

The suite covers the Builder, selector and condition catalogs, Validation Engine, compiler, PF2e Rule Elements, Item source generation, and the valued/non-valued condition boundary.

See [`docs/TESTING.md`](docs/TESTING.md) for the test layout and mocking strategy.

## Documentation

- [`docs/API.md`](docs/API.md): public API reference
- [`docs/EFFECT_SCHEMA.md`](docs/EFFECT_SCHEMA.md): Effect Definition schema
- [`docs/VALIDATION.md`](docs/VALIDATION.md): report format, phases, and issue codes
- [`docs/SELECTORS.md`](docs/SELECTORS.md): selector catalog and custom selectors
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
