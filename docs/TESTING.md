# Testing

PF2E Critical Forge uses the built-in Node test runner and has no development dependencies.

## Requirements

- Node.js 20 or newer
- npm, bundled with Node.js

## Commands

Run the suite:

```bash
npm test
```

Run the suite with Node's experimental coverage report:

```bash
npm run test:coverage
```

The test command forces single-file concurrency so shared Foundry-style globals remain deterministic.

## Current suite

```text
tests/
├─ builder.test.js
├─ catalogs.test.js
├─ compiler.test.js
├─ validation.test.js
├─ fixtures/
│  └─ effects.js
└─ helpers/
   └─ foundry-mock.js
```

The suite contains 30 tests covering:

- Builder normalization and immutable output;
- cloning existing definitions without mutation;
- component list operations and invalid Builder input;
- dynamic PF2e skill selectors and selector syntax;
- condition metadata loaded from `pf2e.conditionitems`;
- valued conditions producing `badge-value` alterations;
- non-valued conditions omitting those alterations;
- modifier compilation to `FlatModifier`;
- persistent-damage Builder normalization and input rejection;
- damage-type catalog grouping and dynamically registered types;
- persistent-damage `GrantItem`, formula, damage type, and optional recovery-DC alterations;
- persistent-damage validation codes and duplicate-type stacking warnings;
- PF2e Effect Item duration, Rule Elements, and origin flags;
- compiler rejection through `EffectValidationError`;
- frightened/status stacking warnings;
- frightened/circumstance compatibility information;
- legacy values on non-valued conditions;
- custom and malformed selectors;
- schema short-circuit behavior;
- target context reaching the compatibility validator.

At `0.2.0-dev`, the measured line coverage of the files loaded by the suite is above 90%. Coverage is a diagnostic, not a release gate yet.

## Foundry mock

`tests/helpers/foundry-mock.js` installs a deliberately small global environment:

```js
globalThis.foundry
globalThis.game
globalThis.CONFIG
```

Only APIs used by the tested modules are implemented. The mock should not grow into a second Foundry implementation.

When production code needs a new Foundry helper:

1. decide whether the behavior belongs in a pure internal helper instead;
2. add the smallest deterministic mock necessary;
3. add a test that proves the expected contract.

## Condition compendium fixture

Compiler tests use a fake `pf2e.conditionitems` pack with explicit UUID and `system.value.isValued` metadata. This verifies the boundary that caused non-valued conditions to fail previously.

Example:

```js
createConditionPack([
  {
    slug: "frightened",
    isValued: true,
    uuid: "Compendium.pf2e.conditionitems.Item.frightened"
  },
  {
    slug: "prone",
    isValued: false,
    uuid: "Compendium.pf2e.conditionitems.Item.prone"
  },
  {
    slug: "persistent-damage",
    isValued: false,
    uuid: "Compendium.pf2e.conditionitems.Item.persistent-damage"
  }
]);
```

## Adding tests for a component

A new component should normally receive tests for:

1. Builder or raw schema shape;
2. valid and invalid component validation;
3. compilation output;
4. resulting PF2e Rule Element data;
5. relevant cross-component validation interactions;
6. edge cases that previously caused a bug.

Prefer behavior-oriented assertions over snapshots. Explicit Rule Element assertions make accidental PF2e data-shape changes easier to diagnose.

## What remains a Foundry integration test

The Node suite does not attempt to prove:

- `ApplicationV2` rendering and resizing;
- sidebar button injection;
- FilePicker behavior;
- actual PF2e Actor embedded Item creation;
- token ownership and permission behavior;
- interaction with third-party modules.

Those paths should be checked in a Foundry test world using a short release checklist. Automated Foundry integration tests can be added later without replacing the fast Node suite.
