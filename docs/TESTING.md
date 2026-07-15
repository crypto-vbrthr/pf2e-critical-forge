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
npm run quality:check
```

The test command forces single-file concurrency so shared Foundry-style globals remain deterministic.

## Current suite

```text
tests/
├─ builder.test.js
├─ catalogs.test.js
├─ compiler.test.js
├─ effect-item-drop.test.js
├─ effect-transfer.test.js
├─ gui-state.test.js
├─ item-editing.test.js
├─ migration.test.js
├─ pf2e-context-adapter.test.js
├─ release-metadata.test.js
├─ validation.test.js
├─ view-state.test.js
├─ fixtures/
│  └─ effects.js
└─ helpers/
   └─ foundry-mock.js
```

The suite contains 119 tests covering:

- Builder normalization, cloning, immutable output, and invalid input;
- selector, condition, damage, IWR, and movement catalogs;
- all eleven built-in component validators and compilers;
- valued and non-valued condition behavior;
- PF2e Effect Item duration, Rule Elements, complete definition flags, and origin metadata;
- structured validation, cross-component stacking diagnostics, and compatibility context;
- drag-and-drop parsing and resolution for world, embedded, and compendium Effect Items;
- portable export-package round-trips, raw-definition imports, filenames, descriptions, and file-size guards;
- legacy schema migration, future-version rejection, and automatic migration during import;
- presentation-only component UI state, duplication, reordering, collapsing, and editor snapshots;
- window-state normalization, scroll restoration, and component-list bottom anchoring;
- loading newly generated Items from their stored Effect Definition;
- reconstructing legacy and compatible foreign Items from PF2e Rule Elements;
- preserving unsupported Rule Elements during an Item update;
- updating only Forge-managed Item fields;
- synchronized release metadata, manifest paths, localization parity, and archive hygiene;
- headless PF2e context translation from rolls, chat flags, weapons, NPC attacks, actors, tokens, and roll options.

Coverage is a diagnostic rather than a release gate. The headless Critical Forge tests are included in the same report as the Effect Engine and Effect Forge tests.

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


## Critical Forge architecture tests

- `card-schema.test.js`: card/pack normalization and validation
- `card-registry.test.js`: pack ownership, duplicate protection, and filtering
- `card-selection.test.js`: matching semantics, candidate reports, and deterministic weighting
- `card-localization.test.js`: translation fallbacks and Effect Definition materialization
- `pf2e-context-adapter.test.js`: PF2e document readers, diagnostics, and neutral context output

The Critical Forge tests remain headless and inject random/localization functions where deterministic behavior matters.

`quality:check` runs the full test suite and the release metadata, localization, syntax, and archive-hygiene checks while permitting a development version suffix. `release:check` remains strict and rejects `-dev` versions.
