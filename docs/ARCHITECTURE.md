# Architecture


## Critical Forge domain layer

`critical-forge/` is now a headless domain subsystem above the Effect Engine. It owns card and pack schemas, registries, localization materialization, matching, and weighted selection. It does not own chat rendering, PF2e roll hooks, actor inspection, or document application. See [`CRITICAL_FORGE_ARCHITECTURE.md`](CRITICAL_FORGE_ARCHITECTURE.md).

## Core rules

1. The Effect Engine is initialized whenever the module is active.
2. Effect Forge and Critical Forge are optional consumers of the engine.
3. Disabling either GUI feature never disables the public API.
4. User interfaces use the same public API exposed to other modules.
5. Critical cards produce Effect Definitions, never raw PF2e Rule Elements.
6. Effects contain any number of components; each component may inherit the global duration or override it.
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
                    Duration Grouping
                                  │
                                  ▼
                    PF2e Item Source Bundle
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
├─ duration-grouper.js
├─ rule-builder.js
└─ flag-builder.js
```

- `effect-compiler.js` validates and compiles registered components.
- component handlers produce abstract compiled components and Rule Elements.
- `rule-builder.js` collects Rule Elements.
- `duration-builder.js` translates PF2e Item duration data.
- `duration-grouper.js` resolves inherited or overridden component durations and groups compiled components by effective duration.
- `flag-builder.js` creates origin and schema metadata.
- `pf2e-item-builder.js` assembles one PF2e Effect Item source per duration group and links the sources as one logical bundle.

Compilation may be asynchronous because catalogs can resolve compendium content.


### Item Definition Adapter

`effect-engine/item-definition-adapter.js` provides the reverse path from a PF2e Effect Item to an Effect Definition. It prefers a complete stored definition when all components are representable by the GUI and otherwise reconstructs supported components from native Rule Elements.

Rules that cannot be represented safely are classified as unmanaged. The application service appends them unchanged when the Item is updated. This prevents an editor round trip from destroying third-party or advanced PF2e automation.

Every generated duration segment stores the complete source definition in module flags, so opening any segment restores the logical effect. Legacy Items remain readable through the Rule Element parser.

### Application Service

The application layer is the only engine layer that creates, updates, or deletes Foundry documents. It accepts compiled definitions through the public API, creates all required duration segments, replaces stale siblings during updates, and isolates document ownership and target normalization from the compiler.

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


## Critical Context Engine boundary

Phase 1 added the immutable observation layer now consumed by Phase 2:

```text
Context Provider Registry → Context Resolver → Adapter Report
                                           ├─ Selection Context
                                           ├─ Metadata / Diagnostics
                                           └─ Runtime Snapshot
```

The layer remains additive. Existing filters continue to use the pre-existing selection context; optional card conditions use the runtime snapshot separately. Cards without conditions follow the original path. See [`CONTEXT_ENGINE.md`](CONTEXT_ENGINE.md).


## Phase-2 Condition Engine boundary

The Condition Engine lives between immutable runtime snapshots and card eligibility. It is split into normalization, validation, field resolution/evaluation, selector integration, and diagnostic presentation. It accepts plain serializable data only and never reads Foundry documents.

```text
Context Provider → Runtime Snapshot → Condition Engine → Card Matcher → Selector
                                      └──────────────→ Diagnostic evidence
```

The neutral selection context and existing filters remain intact. A condition is an optional eligibility gate, not a weight source. Preview schema `4` stores the snapshot so redraws remain tied to the original roll context. Phase 3 adds a presentation-only Card Editor layer that edits and simulates the same canonical tree; runtime matching remains inside the Condition Engine.


## Multi-Deck boundary

Multi-Deck resolution is additive to Critical Card and Card Pack schema version `1`. The normalized pack owns one deterministic deck index, while the selector derives a requested deck from the neutral category/save context and resolves a specialized or default deck independently per pack. Cards outside the active deck are rejected before normal filters and conditions, and deck choice never changes specificity or weight.

## Diagnostics 2.0 boundary

Diagnostics 2.0 introduces a serializable report layer above the existing adapter and selector. It does not move matching rules into the UI. The report service freezes context, candidate evidence, selection, simulation, and application audit data. The session-history service stores only cloned reports, and the simulation service calls validation but never the Effect Engine application path.

## Extension contract layer

Version `0.9.4-dev.6` adds an ownership and compatibility boundary above the existing registries:

```text
Foundry extension module
  -> Extension compatibility check
  -> Bound extension controller
  -> Pack / Context / Condition / Diagnostic registries
  -> Structured registration journal
```

The controller is an adapter, not a second runtime. Pack normalization, Context resolution, Condition evaluation, diagnostic reporting, and card selection continue to be owned by their existing domain services. Legacy low-level APIs remain available, while new modules should use the bound controller for isolation and conflict evidence.


## Phase-7 battlefield threat boundary

The PF2e battlefield evaluator lives under `critical-forge/adapters/pf2e/battlefield/`. It reads PF2e Actor/Token/Scene state at context-capture time and immediately reduces it to plain immutable evidence. Card selection, the Condition Engine, Diagnostics 2.0, and extension modules consume only the snapshot result; they never retain Foundry documents or recompute threat rules independently. See [`BATTLEFIELD_THREATS.md`](BATTLEFIELD_THREATS.md).
