# Architecture


## Critical Forge domain layer

`critical-forge/` is now a headless domain subsystem above the Effect Engine. It owns card and pack schemas, registries, localization materialization, matching, and weighted selection. It does not own chat rendering, PF2e roll hooks, actor inspection, or document application. See [`CRITICAL_FORGE_ARCHITECTURE.md`](CRITICAL_FORGE_ARCHITECTURE.md).

## Core rules

1. The Effect Engine is initialized whenever the module is active.
2. Effect Forge and Critical Forge are optional consumers of the engine.
3. Disabling either GUI feature never disables the public API.
4. User interfaces use the same public API exposed to other modules.
5. Critical cards produce Effect Definitions, never raw PF2e Rule Elements.
6. Effects contain any number of components under one global duration.
7. Narrative card data and reusable mechanical effect profiles remain separate.
8. Public API behavior and schemas are versioned and documented.
9. Invalid external content fails locally and must not disable the module.
10. User-facing text is localized.
11. Internals may change; the documented API is the compatibility boundary.
12. Schema validation, rule analysis, compilation, and application remain separate stages.

## Data flow

```text
Effect Forge UI ─┐
Critical Forge ──┼── Public API
External module ─┘       │
                         ▼
                  Effect Builder
                         │
                         ▼
                 Effect Definition
                         │
                         ▼
                 Migration Engine
                         │
                 ┌───────┴────────┐
                 ▼                ▼
          Validation Engine    Compiler
                                  │
                                  ▼
                         PF2e Item Source
                                  │
                                  ▼
                         Application Service

Existing PF2e Item ── Item Definition Adapter ──► Effect Definition
        │                         │
        └── unmanaged rules ─────┴── preserved by Item update
```

## Subsystems

### Builder

Normalizes common input, clones caller-owned data, and returns deeply frozen Effect Definitions.

It does not decide whether a PF2e condition is meaningful for a target and does not create Rule Elements.

### Catalogs

```text
effect-engine/catalogs/
├─ selector-catalog.js
├─ condition-catalog.js
├─ damage-type-catalog.js
├─ resistance-type-catalog.js
├─ weakness-type-catalog.js
└─ immunity-type-catalog.js
```

The selector catalog is shared by the GUI and validator. The condition catalog resolves compendium UUIDs and identifies valued conditions. Damage, resistance, weakness, and immunity catalogs group their PF2e configuration entries for the GUI and expose the same metadata through the public API.

Catalogs are metadata services, not compilers.

### Migration Engine

`effect-engine/migration/` upgrades older Effect Definitions before validation or editing. Migrations are sequential, immutable, and versioned. Legacy data is migrated in memory; Foundry Items are only rewritten when the user explicitly saves them. Unsupported future versions fail safely instead of being guessed.

### Validation Engine

```text
effect-engine/validation/
├─ validation-engine.js
├─ validation-report.js
└─ validators/
   ├─ schema-validator.js
   ├─ rule-validator.js
   └─ compatibility-validator.js
```

Validation is synchronous in the current schema and produces machine-readable reports. It does not mutate definitions or create Foundry documents.

Validation phases stop after schema/component errors.

### Compiler

```text
effect-engine/compiler/
├─ effect-compiler.js
├─ pf2e-item-builder.js
├─ duration-builder.js
├─ rule-builder.js
└─ flag-builder.js
```

- `effect-compiler.js` validates and compiles registered components.
- component handlers produce abstract compiled components and Rule Elements.
- `rule-builder.js` collects Rule Elements.
- `duration-builder.js` translates global duration data.
- `flag-builder.js` creates origin and schema metadata.
- `pf2e-item-builder.js` assembles PF2e Effect Item source data.

Compilation may be asynchronous because catalogs can resolve compendium content.


### Item Definition Adapter

`effect-engine/item-definition-adapter.js` provides the reverse path from a PF2e Effect Item to an Effect Definition. It prefers a complete stored definition when all components are representable by the GUI and otherwise reconstructs supported components from native Rule Elements.

Rules that cannot be represented safely are classified as unmanaged. The application service appends them unchanged when the Item is updated. This prevents an editor round trip from destroying third-party or advanced PF2e automation.

Newly compiled Items store the complete source definition in module flags, while legacy Items remain readable through the Rule Element parser.

### Application Service

The application layer is the only engine layer that creates, updates, or deletes Foundry documents. It accepts compiled definitions through the public API and isolates document ownership and target normalization from the compiler.

### GUI

The GUI is a thin consumer:

- gathers user input;
- builds definitions through the public Builder;
- displays validation reports;
- requests compilation or application through the public API;
- tracks unsaved changes and protects destructive navigation;
- keeps component ordering and collapsed state as presentation-only data;
- links validation issues back to the affected component cards.

It does not duplicate PF2e compilation rules.

## Extension boundary

Third-party modules may register component handlers through `api.components`. A handler owns three responsibilities for its component type:

- component-level validation;
- compilation to an abstract component, including Rule Elements;
- a readable description.

Cross-component interactions belong in rule validators rather than individual component compilers.

## Test boundaries

The automated suite runs outside Foundry with a small deterministic mock of:

- `foundry.utils` clone, freeze, merge, and property helpers;
- `game.i18n`;
- `CONFIG.PF2E.skills`, damage types, and IWR type catalogs;
- the PF2e condition compendium.

This keeps Builder, validation, catalogs, and compiler tests fast and reproducible. Document creation and full Foundry UI behavior remain integration-test territory inside Foundry.
