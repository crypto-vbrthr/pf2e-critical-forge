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
├─ card-api.test.js
├─ card-condition-integration.test.js
├─ card-editor-roundtrip.test.js
├─ card-localization.test.js
├─ card-pack-editor-app.test.js
├─ card-pack-editor.test.js
├─ card-pack-store.test.js
├─ card-profile-trigger.test.js
├─ card-registry.test.js
├─ card-schema.test.js
├─ card-selection.test.js
├─ catalogs.test.js
├─ chat-message-resolver.test.js
├─ compiler.test.js
├─ condition-editor-model.test.js
├─ condition-engine.test.js
├─ component-duration.test.js
├─ context-builder.test.js
├─ context-provider.test.js
├─ core-card-library.test.js
├─ critical-architecture.test.js
├─ critical-card-application.test.js
├─ critical-card-preview.test.js
├─ critical-card-redraw.test.js
├─ critical-diagnostic-button.test.js
├─ critical-diagnostic.test.js
├─ critical-roll-automation.test.js
├─ diagnostic-2-ui.test.js
├─ diagnostic-condition-ui.test.js
├─ diagnostic-history.test.js
├─ diagnostic-replay.test.js
├─ diagnostic-report.test.js
├─ diagnostic-runtime-view.test.js
├─ diagnostic-simulation.test.js
├─ duration-bundle-hooks.test.js
├─ effect-forge-card-handoff.test.js
├─ effect-item-drop.test.js
├─ effect-transfer.test.js
├─ extension-pack-api.test.js
├─ extension-pack-integration.test.js
├─ gui-state.test.js
├─ item-editing.test.js
├─ migration.test.js
├─ pf2e-context-adapter.test.js
├─ pf2e-context-snapshot.test.js
├─ release-metadata.test.js
├─ validation.test.js
├─ view-state.test.js
├─ fixtures/
│  └─ effects.js
└─ helpers/
   └─ foundry-mock.js
```

The suite contains 275 tests covering:

- Builder normalization, cloning, immutable output, and invalid input;
- selector, condition, damage, IWR, and movement catalogs;
- all eleven built-in component validators and compilers;
- optional component-duration inheritance and overrides across every built-in component type;
- duration grouping, native PF2e Item-bundle generation, manual Actor-drop expansion, bundle updates, and complete removal;
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
- headless PF2e context translation from weapon attacks, spell attacks, saving throws, chat flags, items, actors, tokens, and roll options;
- immutable runtime-snapshot normalization, participant health and conditions, reference-only fallbacks, battlefield placeholders, Context Provider priority/replacement/protection, and public Context Builder/Resolver capabilities;
- optional immutable card conditions, nested `all`/`any` groups, all ten operators, safe field resolution, schema validation, eligibility gating, full diagnostic evidence, automation snapshot propagation, redraw snapshot reuse, and editor/import/export preservation;
- the visual condition-tree model, typed and provider-defined fields, type-dependent operator controls, contradiction analysis, synthetic snapshot simulation, Card Pack Editor action wiring, and dirty-state isolation for test inputs;
- manual diagnostic candidate evaluation, versioned evaluation reports, three-phase pipeline status, session history, snapshot/current replay comparison, JSON export, safe effect simulation, actual application audits, runtime-snapshot presentation data, chat-message discovery, Item UUID resolution, target handling, and drop validation;
- localized critical-card effect summaries, preview presentation data, ChatMessage payloads, structured preview flags, and public preview APIs;
- the complete card-editor roundtrip from protected template through Effect Forge, JSON transfer, persistence, selection, preview, and compilation;
- deterministic collision-free IDs for new cards, duplicated cards, duplicated packs, and imported protected packs;
- dedicated spell/save categories, filters, natural-result trigger semantics, automatic processing, localization, and core-card compilation;
- pack activation semantics, transactional world-setting rollback, protected-data startup guards, module-bound extension ownership, atomic multi-pack registration, change hooks, and optional extension-module lifecycles.

Coverage is a diagnostic rather than a release gate. Version `0.9.4-dev.4` measures 92.80% line coverage across all files loaded by the Node coverage run, including the Effect Engine, Critical Forge domain, Card Pack Editor application services and condition model, the 96-card core library, PF2e attack/spell/save adaptation, diagnostics, automatic roll pipeline, result-card visibility, manual application services, and extension-pack integration.

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

- final browser rendering, layout, focus, and resizing of `ApplicationV2` windows;
- sidebar button injection;
- FilePicker behavior;
- actual PF2e Actor embedded Item creation;
- token ownership and permission behavior;
- interaction with third-party modules;
- final visual rendering of Critical Forge preview chat cards.

Those paths should be checked in a Foundry test world using a short release checklist. Automated Foundry integration tests can be added later without replacing the fast Node suite.


## Critical Forge architecture tests

- `card-schema.test.js`: card/pack normalization and validation
- `card-pack-editor.test.js`: editor defaults, cloning, ID collision handling, transfer parsing, and Effect Forge bridging
- `card-editor-roundtrip.test.js`: protected-template to live-preview and compiler integration
- `card-pack-store.test.js`: world persistence, pack activation, protected-data guards, and transactional live-registry rollback
- `extension-pack-integration.test.js`: optional-module registration, activation, replacement rollback, selection, and removal
- `core-card-library.test.js`: bundled-card matrix, profile distribution, localization coverage, stable ids, and pack validity
- `card-registry.test.js`: pack ownership, duplicate protection, and filtering
- `card-selection.test.js`: matching semantics, candidate reports, and deterministic weighting
- `condition-engine.test.js`: normalization, validation, safe field access, nested groups, operators, and evaluation evidence
- `card-condition-integration.test.js`: schema, selector, legacy compatibility, and snapshot eligibility
- `diagnostic-condition-ui.test.js`: diagnostic formatting and template coverage
- `card-localization.test.js`: translation fallbacks and Effect Definition materialization
- `critical-card-preview.test.js`: effect summaries, preview data, ChatMessage payloads, and no-application boundaries
- `pf2e-context-adapter.test.js`: PF2e document readers, diagnostics, and neutral context output

The Critical Forge tests remain headless and inject random/localization functions where deterministic behavior matters.

`quality:check` runs the full test suite and the release metadata, localization, syntax, and archive-hygiene checks while permitting a development version suffix. `release:check` remains strict and rejects `-dev` versions.

## Critical trigger and redraw tests

The suite includes deterministic checks for profile multipliers, natural-20/natural-1 trigger semantics, extraction of the d20 result independently from the final degree, bounded redraw history, alternative selection, and the guard that prevents redrawing an applied card.
