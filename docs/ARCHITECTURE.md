# Architecture

## Core rules

1. The Effect Engine is always initialized while the module is active.
2. Effect Forge and Critical Forge are optional consumers of the engine.
3. Disabling either GUI feature never disables the public Effect Engine API.
4. User interfaces use the same public API exposed to other modules.
5. Critical cards produce Effect Definitions, never raw PF2e Rule Elements.
6. Effects contain any number of components.
7. A global duration applies to all components unless a component explicitly overrides it.
8. Narrative data and mechanical effect profiles remain separate.
9. Public API behavior and schemas are versioned and documented.
10. Invalid external content must fail locally and must not disable the module.
11. All user-facing text is localized.
12. Internals may change; the documented API is the compatibility boundary.

## Layers

```text
Effect Forge UI ─┐
                  ├── Public API ── Effect Engine ── PF2e compiler/application
Critical Forge ──┤
External modules ┘
```

## Initial milestone

Version `0.1.0-dev` implements schema validation, component registration, abstract compilation, settings, API publication, and a small diagnostic UI.

Concrete PF2e Item creation and Actor application are deliberately isolated behind API methods so they can be implemented without changing the external contract.


## Compiler structure

```text
effect-engine/compiler/
├─ effect-compiler.js
├─ pf2e-item-builder.js
├─ duration-builder.js
├─ rule-builder.js
└─ flag-builder.js
```

- `effect-compiler.js` validates definitions and compiles components.
- `rule-builder.js` collects Rule Elements.
- `duration-builder.js` translates the global duration.
- `flag-builder.js` creates origin and schema metadata.
- `pf2e-item-builder.js` assembles the PF2e Effect Item source.


## Builder layer

```text
Effect Forge UI / external module
        ↓
Effect Builder
        ↓
Effect Definition
        ↓
Validator and compiler
```

The Builder is the supported construction path for new Effect Definitions. It clones input data, normalizes common component data, and returns immutable definitions. The GUI uses the same public Builder API as external modules.


## Validation Engine

```text
Effect Definition
├─ Schema Validator
├─ Rule Validator
└─ Compatibility Validator
```

Validation produces structured reports and never compiles or mutates the definition. Public issue codes are suitable for other modules to make automated decisions.
