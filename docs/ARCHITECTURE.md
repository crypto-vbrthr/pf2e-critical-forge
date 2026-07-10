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
