# Critical Context Engine

Version `0.9.4-dev.5` retains the snapshot/provider foundation, Condition Engine, and visual authoring layer. Multi-Deck packs are additive and continue to use Critical Card and Card Pack schema version `1`.

The context snapshot now also drives requested deck resolution through the existing neutral category and save-type fields. Scene-based threat analysis and Against All Odds remain outside this phase.

## Pipeline

```text
PF2e / Foundry input
        ↓
Context Provider Registry
        ↓
PF2e Context Provider
        ├── legacy Selection Context
        ├── adapter Metadata
        ├── structured Diagnostics
        └── immutable Runtime Snapshot
                    ↓
             Condition Engine
                    ↓
       card eligibility + evidence
```

The selector continues to use the legacy neutral `report.context` for filter matching and now receives `report.snapshot` separately for optional card conditions. Cards without conditions do not require a snapshot.

## Runtime snapshot

Current snapshot schema version: `1`.

```js
const report = api.cards.createContext(input, { system: "pf2e" });

console.log(report.context);  // unchanged card-selection context
console.log(report.snapshot); // new immutable runtime snapshot
```

The snapshot contains only serializable plain data:

```js
{
  schemaVersion: 1,
  system: "pf2e",
  provider: "core-pf2e",
  providerVersion: "1.0.0",
  capturedAt: 1234567890,
  message: {},
  roll: {
    category: "savingThrowCriticalSuccess",
    family: "savingThrow",
    outcome: "criticalSuccess",
    saveType: "will",
    dc: 31
  },
  item: {},
  participants: {
    source: {
      uuid: "Actor.defender",
      tokenUuid: "Scene.scene.Token.defender",
      name: "Defender",
      level: 10,
      traits: ["human", "humanoid"],
      hp: { current: 42, max: 100, temp: 0, ratio: 0.42 },
      conditions: { wounded: 1, dying: 0, frightened: 0 },
      position: { x: 100, y: 200, elevation: 0 }
    },
    target: {}
  },
  roles: {
    roller: "source",
    opponent: "target",
    legacySource: "source",
    legacyTarget: "target"
  },
  battlefield: {
    sceneUuid: "Scene.scene",
    combatUuid: "Combat.combat",
    round: 4,
    turn: 2,
    selectedTargetCount: 1,
    hostileThreatCount: null,
    threatEvaluation: "not-evaluated"
  },
  selection: {},
  provenance: {},
  diagnostics: []
}
```

For saving throws, `source` remains the creature that rolled the save and `target` remains the originating hostile Actor or effect when known. The explicit role aliases make that legacy convention visible without changing existing card behavior.

`hostileThreatCount` is intentionally `null` in this phase unless a caller supplies an explicit value. Scene-based threat detection belongs to a later implementation step and is never guessed.

## Builder API

Providers can create compatible immutable snapshots through the public builder:

```js
const builder = api.cards.contexts.createBuilder({
  system: "my-system",
  provider: "my-provider",
  providerVersion: "1.0.0"
});

const snapshot = builder
  .setRoll({ category: "criticalHit", family: "attack" })
  .setParticipant("source", {
    uuid: actor.uuid,
    name: actor.name,
    level: 7,
    hp: { current: 30, max: 60 }
  })
  .setRoles({ roller: "source", opponent: "target" })
  .setSelection({ category: "criticalHit" })
  .build();
```

`build()` returns a deeply frozen, JSON-serializable object. Foundry documents must not be stored in the snapshot.

## Provider registry

The built-in provider is registered as:

```text
system:  pf2e
id:      core-pf2e
version: 1.0.0
```

Public API:

```js
api.cards.contexts.snapshotVersion;
api.cards.contexts.listProviders({ system: "pf2e" });
api.cards.contexts.getProvider("pf2e", "core-pf2e");
api.cards.contexts.resolve(input, { system: "pf2e" });
```

An extension can register an additive provider:

```js
api.cards.contexts.registerProvider({
  id: "my-provider",
  system: "pf2e",
  version: "1.0.0",
  priority: 10,
  sourceModule: "my-module",
  createContext(input) {
    return createCompatibleContextReport(input);
  }
});
```

The highest-priority provider is the default for a system. A caller can request a specific provider with `providerId`. Duplicate provider IDs require `{ replace: true }`. The built-in `core-pf2e` provider is protected and cannot be replaced or unregistered through the public registry.

Providers must return a report compatible with the existing adapter contract:

```js
{
  valid: true,
  context: {},
  metadata: {},
  snapshot: {},
  diagnostics: [],
  errors: [],
  warnings: [],
  information: []
}
```

## Capability detection

```js
api.cards.capabilities.contextSnapshots; // true
api.cards.capabilities.contextProviders; // true
api.cards.capabilities.contextConditions; // true in phase 2
api.cards.capabilities.multiDeckPacks; // true in phase 5
```

Extensions should test capabilities rather than infer them from module-version strings.

## Compatibility guarantees

- Critical Card schema remains `1`.
- Critical Card Pack schema remains `1`.
- Existing context fields and source/target semantics remain unchanged.
- Existing packs need no migration.
- The selector uses runtime snapshots only for cards that explicitly declare `conditions`.
- Reference-only chat contexts still produce a complete snapshot with unknown values represented by `null` rather than invented data.
- The diagnostic report includes the snapshot and the exact condition evidence that affected eligible-card calculation.
- Redraws reuse the original stored snapshot rather than reading changed Actor or scene state.
- Missing fields are represented as unavailable evidence and never guessed.
