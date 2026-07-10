# PF2E Critical Forge

PF2E Critical Forge is being developed as two optional user-facing tools built on one always-available Effect Engine:

- **Effect Forge**: a GM interface for building reusable PF2e effects.
- **Critical Forge**: on-demand critical-hit and fumble results.
- **Effect Engine API**: an always-loaded public API for this and other modules.

## Status

`0.1.0-dev` is the initial architecture release. It provides:

- independent settings for Effect Forge and Critical Forge;
- an always-loaded public API;
- versioned effect definitions;
- a component registry;
- initial `condition` and `modifier` components;
- validation and abstract compilation;
- a minimal GM-only Effect Forge window;
- developer documentation.

Actor application and concrete PF2e Rule Element compilation are intentionally scheduled for the next milestone.

## API access

```js
const api = game.modules.get("pf2e-critical-forge")?.api;
console.log(api.version);
console.log(api.effects);
```

See [`docs/API.md`](docs/API.md), [`docs/EFFECT_SCHEMA.md`](docs/EFFECT_SCHEMA.md), and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
