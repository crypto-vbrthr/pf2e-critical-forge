# PF2E Critical Forge

PF2E Critical Forge consists of two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: planned on-demand critical-hit and fumble results.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

Version `0.2.1-dev` adds resistance as the fourth built-in effect component. Resistance types are grouped, read from PF2e configuration when available, validated centrally, and compiled to native `Resistance` Rule Elements.

The current engine includes:

- versioned Effect Definitions;
- a fluent immutable Builder API;
- structured schema, rule, and compatibility validation;
- stable validation codes and severities;
- a central PF2e selector catalog with grouped selectors and dynamic skills;
- a central damage-type catalog backed by `CONFIG.PF2E.damageTypes`;
- a central resistance-type catalog backed by `CONFIG.PF2E.resistanceTypes`;
- a PF2e condition catalog that distinguishes valued and non-valued conditions;
- `condition`, `modifier`, `persistentDamage`, and `resistance` components;
- compilation to PF2e `GrantItem`, `FlatModifier`, and `Resistance` Rule Elements, including persistent-damage and recovery-DC alterations;
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
- [`docs/EXAMPLES.md`](docs/EXAMPLES.md): complete examples
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): subsystem boundaries
- [`docs/TESTING.md`](docs/TESTING.md): local test execution and conventions
