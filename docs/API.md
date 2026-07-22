# Effect Engine API

## Obtaining the API

```js
const api = game.modules.get("pf2e-critical-forge")?.api;
```

The API is published during Foundry's `init` hook and remains available regardless of the Effect Forge and Critical Forge settings.

The Effect Forge and manual Critical Forge diagnostics can be opened through the UI API:

```js
api.ui.openEffectForge();
await api.ui.openEffectForge(item);
api.ui.openCriticalDiagnostics();
await api.ui.openCriticalDiagnostics(message);
```

For module integrations, prefer the ready hook:

```js
Hooks.on("pf2eCriticalForgeReady", (api) => {
  console.log(api.version, api.schemaVersion);
});
```

## Version information

```js
api.version        // public API version
api.moduleVersion  // installed module version
api.schemaVersion          // supported Effect Definition schema version
api.cardSchemaVersion      // supported Critical Card schema version
api.cardPackSchemaVersion  // supported Critical Card Pack schema version
api.cards.contexts.snapshotVersion // Critical runtime snapshot schema
```

Consumers should branch on `api.version` and `api.cards.capabilities` for API capabilities, on `api.schemaVersion` when importing stored Effect Definitions, and on `api.cards.contexts.snapshotVersion` when persisting runtime snapshots.

## Effects

### `api.effects.migrate(definition, options?)`

Migrates an older Effect Definition to the current schema without mutating the supplied object. Definitions without `schemaVersion` are treated as legacy schema version `0`.

```js
const migration = api.effects.migrate(oldDefinition);

console.log(migration.migrated);
console.log(migration.definition);
```

Return shape:

```js
{
  definition: EffectDefinition,
  fromVersion: 0,
  toVersion: 2,
  migrated: true,
  steps: [],
  warnings: []
}
```

Future schema versions and missing migration paths reject with `EffectMigrationError`. See [`MIGRATIONS.md`](MIGRATIONS.md).

### `api.effects.analyze(definition, context?)`

Runs the structured Validation Engine without compiling or mutating the definition.

```js
const report = api.effects.analyze(definition, {
  target: actor
});
```

Return shape:

```js
{
  valid: true,
  issues: [],
  errors: [],
  warnings: [],
  hints: [],
  information: []
}
```

Each issue contains:

```js
{
  severity: "error" | "warning" | "hint" | "info",
  code: "STABLE_MACHINE_CODE",
  messageKey: "Validation.Rules.SomeMessage",
  message: null,
  data: {},
  componentIndex: 0
}
```

Use `code` for program logic. `messageKey` and localized messages are presentation details.

### `api.effects.validate(definition)`

Compatibility wrapper around the structured analyzer. It returns localized string arrays while retaining the structured `issues` array.

```js
const validation = api.effects.validate(definition);

if (!validation.valid) {
  ui.notifications.error(validation.errors.join("\n"));
}
```

The supplied definition is never mutated.

### `api.effects.compile(definition, context?)`

Validates and compiles the definition into an abstract representation. Component durations are resolved before native Item sources are built.

```js
const compiled = await api.effects.compile(definition);
```

Important fields:

```js
{
  definition: { /* immutable schema-2 Effect Definition */ },
  schemaVersion: 2,
  id: "example.effect",
  name: "Example Effect",
  duration: { value: 2, unit: "rounds", expiry: "turn-end" },
  components: [
    {
      kind: "condition",
      rules: [{ key: "GrantItem", uuid: "..." }],
      componentIndex: 0,
      duration: { value: 1, unit: "rounds", expiry: "turn-end" },
      durationSource: "component"
    }
  ],
  durationGroups: [
    {
      index: 0,
      duration: { value: 1, unit: "rounds", expiry: "turn-end" },
      componentIndexes: [0],
      components: []
    }
  ],
  requiresDurationSplit: false,
  validation: { valid: true, ... }
}
```

`durationSource` is `"global"` when the component inherits the Effect Definition duration and `"component"` when it declares an override. Components with the same effective duration share a group.

Compilation is asynchronous because condition UUIDs and metadata may need to be resolved from the PF2e condition compendium.

Invalid definitions reject with `EffectValidationError`. The complete validation result is available as `error.result`.

```js
try {
  await api.effects.compile(definition);
} catch (error) {
  console.error(error.result);
}
```

### `api.effects.toItemSource(definition, context?)`

Compiles a guaranteed single-duration Effect Definition into one PF2e Effect Item source without creating a Foundry document.

```js
const source = await api.effects.toItemSource(definition);
```

When the definition contains different effective component durations, this method throws `EffectDurationSplitError` with code `EFFECT_DURATION_SPLIT_REQUIRED`. It never drops a duration group silently.

### `api.effects.toItemSources(definition, context?)`

Returns every PF2e Effect Item source required for one logical definition.

```js
const sources = await api.effects.toItemSources(definition);
```

The returned array always contains at least one source. Distinct effective durations produce linked sources with:

- a matching Item-level duration;
- only the Rule Elements belonging to that duration;
- the complete source definition in `flags.pf2e-critical-forge.definition`;
- `durationSegment` metadata identifying the bundle and component indexes.

See [`COMPONENT_DURATIONS.md`](COMPONENT_DURATIONS.md).

### `api.effects.createItem(definition, options?)`

Creates the complete logical effect as world-level PF2e Effect Items and returns the primary Item for backward compatibility.

```js
const primary = await api.effects.createItem(definition, {
  renderSheet: true,
  unmanagedRules: loaded?.unmanagedRules ?? []
});
```

When component durations differ, sibling Items are created as well.

### `api.effects.createItems(definition, options?)`

Creates the same world-level bundle and returns every created Item.

```js
const items = await api.effects.createItems(definition, {
  renderSheet: true,
  unmanagedRules: loaded?.unmanagedRules ?? []
});
```

Only the primary sheet is opened. Unmanaged Rule Elements are attached to the primary segment only.

### `api.effects.readItem(item)`

Reads an existing PF2e Effect Item and reconstructs an editable Effect Definition.

```js
const loaded = await api.effects.readItem(item);

console.log(loaded.definition);
console.log(loaded.unmanagedRules);
```

Unsupported or advanced Rule Elements are returned in `unmanagedRules` so callers can preserve them during an update. See [`EDITING_ITEMS.md`](EDITING_ITEMS.md).

### `api.effects.createExport(definition, options?)`

Creates a portable export envelope without serializing it.

```js
const exported = api.effects.createExport(definition, {
  unmanagedRules: loaded?.unmanagedRules ?? []
});
```

### `api.effects.serializeExport(definition, options?)`

Creates the same versioned export package as formatted JSON.

```js
const json = api.effects.serializeExport(definition, {
  unmanagedRules: loaded?.unmanagedRules ?? []
});
```

### `api.effects.parseImport(value, options?)`

Parses either a Critical Forge export package or a raw Effect Definition.

```js
const imported = api.effects.parseImport(json);
const report = api.effects.analyze(imported.definition);
```

Return shape:

```js
{
  definition: EffectDefinition,
  unmanagedRules: RuleElementSource[],
  sourceFormat: "critical-forge-export" | "effect-definition",
  envelope: object | null,
  migration: {
    fromVersion: 0,
    toVersion: 2,
    migrated: true,
    steps: [],
    warnings: []
  }
}
```

Parsing checks transfer versions, migrates supported older schemas, and deliberately leaves rule validation to `analyze()`. See [`IMPORT_EXPORT.md`](IMPORT_EXPORT.md).

### `api.effects.updateItem(item, definition, options?)`

Compiles the supplied definition and updates an existing writable PF2e Effect Item.

```js
await api.effects.updateItem(item, loaded.definition, {
  unmanagedRules: loaded.unmanagedRules,
  render: false
});
```

For a multi-duration definition, the selected Item becomes the primary segment. Existing siblings with the same bundle ID are removed and the current duration groups are recreated. The complete definition remains readable from every new segment.

### `api.effects.apply(definition, targets, options?)`

Creates the logical effect as embedded PF2e Effect Items on one or more Actor or Token targets.

```js
const created = await api.effects.apply(definition, [actorA, tokenB], {
  unmanagedRules: loaded?.unmanagedRules ?? []
});
```

The returned array contains every created duration segment across all targets. Targets may be supplied as Actors, Tokens, TokenDocuments, or arrays supported by the application service.

### `api.effects.remove(definitionId, targets)`

Removes generated effects whose module flag contains the supplied Effect Definition ID.

```js
await api.effects.remove("example.shaken-nerves", [actor]);
```

### `api.effects.checkCompatibility(definition, target, options?)`

Performs structural and target-aware compatibility checks. Target-specific PF2e immunity and resistance analysis is an extension point and is intentionally still limited in the current milestone.

## Effect Builder

The Builder is the supported construction path for new definitions.

### `api.builders.effect()`

```js
const definition = api.builders
  .effect()
  .setId("example.shaken-nerves")
  .setName("Erschütterte Nerven")
  .setDescription("<p>Das Ziel ist verängstigt und mental verwundbar.</p>")
  .setImage("icons/svg/terror.svg")
  .setDuration(2, "rounds", "turn-end")
  .addCondition("frightened", 2, {
    duration: { value: 1, unit: "rounds", expiry: "turn-end" }
  })
  .addModifier({
    selector: "will",
    value: -1,
    modifierType: "circumstance"
  })
  .setMetadata({
    originModule: "example-module",
    originFeature: "critical-hit"
  })
  .build();
```

`build()` returns a cloned and deeply frozen definition.

### `api.builders.from(definition)`

Creates a Builder from a deep clone of an existing definition.

```js
const longer = api.builders
  .from(definition)
  .setDuration(3, "rounds", "turn-end")
  .build();
```

The original object is not mutated.

### Builder methods

| Method | Purpose |
|---|---|
| `setId(id)` | Sets a stable definition ID or `null`. |
| `setName(name)` | Sets and trims the display name. |
| `setDescription(html)` | Stores description HTML. |
| `setImage(path)` | Sets an image, falling back to `icons/svg/aura.svg`. |
| `setDuration(value, unit, expiry)` | Sets the global duration. |
| `setApplication(data)` | Replaces application metadata with a clone. |
| `setMetadata(data)` | Replaces metadata with a clone. |
| `mergeMetadata(data)` | Deep-merges metadata without mutating the source. |
| `addComponent(component)` | Adds an arbitrary registered component. |
| `addCondition(slug, value?, options?)` | Adds a PF2e condition component; `options.duration` is an optional override. |
| `addModifier(options)` | Adds a modifier component; all component option objects accept optional `duration`. |
| `addPersistentDamage(options)` | Adds persistent damage with `formula`, `damageType`, and optional `dc`. |
| `addResistance(options)` | Adds resistance with `resistanceType` and positive integer `value`. |
| `addWeakness(options)` | Adds weakness with `weaknessType` and positive integer `value`. |
| `addImmunity(options)` | Adds immunity with `immunityType`. |
| `addFastHealing(options)` | Adds fast healing with a positive integer `value`. |
| `addRegeneration(options)` | Adds regeneration with positive integer `value` and `deactivatedBy` damage types. |
| `addTemporaryHitPoints(options)` | Adds a one-time grant of temporary Hit Points with a positive integer `value`. |
| `addMovement(options)` | Adds a Speed modifier with `movementType`, non-zero integer `value`, and `modifierType`. |
| `addBaseSpeed(options)` | Grants climb, burrow, fly, or swim Speed with `movementType` and positive integer `value`. |
| `setComponentDuration(index, value, unit, expiry)` | Adds or replaces a duration override on one component. |
| `clearComponentDuration(index)` | Removes a component override so it inherits the global duration. |
| `clearComponents()` | Removes all components. |
| `removeComponent(index)` | Removes one component or throws `RangeError`. |
| `build()` | Returns the immutable Effect Definition. |

Every built-in component object accepts optional `duration: { value, unit, expiry }`. Omit it to inherit the global duration. See [`COMPONENT_DURATIONS.md`](COMPONENT_DURATIONS.md).

Persistent-damage example:

```js
const bleeding = api.builders
  .effect()
  .setName("Bleeding Wound")
  .setDuration(-1, "unlimited", null)
  .addPersistentDamage({
    formula: "1d6",
    damageType: "bleed",
    dc: 17
  })
  .addResistance({
    resistanceType: "fire",
    value: 5
  })
  .addFastHealing({ value: 2 })
  .addRegeneration({ value: 5, deactivatedBy: ["acid", "fire"] })
  .addTemporaryHitPoints({ value: 7 })
  .addMovement({ movementType: "land", value: 10, modifierType: "status" })
  .addBaseSpeed({ movementType: "fly", value: 30 })
  .build();
```

## Selector catalog

```js
api.selectors.list();
api.selectors.groups("will");
api.selectors.get("athletics");
api.selectors.has("saving-throw");
api.selectors.isValidSyntax("my-module-special-check");
api.selectors.customValue;
```

The catalog is shared by the GUI, validator, and public API. See [`SELECTORS.md`](SELECTORS.md).

## Condition catalog

```js
await api.conditions.initialize();

api.conditions.isValued("frightened"); // true
api.conditions.isValued("prone");      // false
api.conditions.get("frightened");
api.conditions.list();
```

The PF2e condition compendium is the primary metadata source. A fallback valued-condition set keeps Builder and validation behavior available before compendia finish loading.

The compiler emits a `badge-value` alteration only when the resolved condition is valued.

## Damage-type catalog

```js
api.damageTypes.list();
api.damageTypes.groups("bleed");
api.damageTypes.groups(["acid", "fire"]);
api.damageTypes.get("fire");
api.damageTypes.has("spirit");
```

The catalog combines `CONFIG.PF2E.damageTypes` with standard fallback metadata. The GUI and persistent-damage validator consume the same catalog. See [`DAMAGE_TYPES.md`](DAMAGE_TYPES.md).


## Resistance-type catalog

```js
api.resistanceTypes.list();
api.resistanceTypes.groups("fire");
api.resistanceTypes.get("physical");
api.resistanceTypes.has("all-damage");
```

The catalog reads `CONFIG.PF2E.resistanceTypes` and supplements it with stable fallbacks for standard damage types, broad damage categories, and common damage sources. GUI options are grouped to keep the list navigable. See [`RESISTANCE_TYPES.md`](RESISTANCE_TYPES.md).

## Component extension API

### `api.components.register(handler, options?)`

Required handler shape:

```js
{
  type: "my-module.special-component",

  validate(component, context) {
    return {
      errors: [],
      warnings: []
    };
  },

  async compile(component, context) {
    return {
      kind: "my-module.special-component",
      rules: []
    };
  },

  describe(component, context) {
    return "Readable summary";
  }
}
```

Rules:

- `type` must be a non-empty unique string.
- Third-party types should be namespaced.
- `validate`, `compile`, and `describe` are required functions.
- `compile` may be asynchronous.
- Compiled Rule Elements belong in a `rules` array.
- Register during `pf2eCriticalForgeReady` unless early registration is specifically required.

```js
Hooks.on("pf2eCriticalForgeReady", (api) => {
  api.components.register(handler);
});
```

Other methods:

```js
api.components.get(type);
api.components.list();
api.components.unregister(type);
```

## User interface

```js
api.ui.openEffectForge();
```

This opens the GM-only Effect Forge window independently of sidebar integration.

## Weakness catalog and Builder method

```js
const definition = api.builders
  .effect()
  .setName("Feuerempfindlich")
  .setDuration(10, "minutes", "turn-end")
  .addWeakness({ weaknessType: "fire", value: 5 })
  .build();

api.weaknessTypes.list();
api.weaknessTypes.groups("fire");
api.weaknessTypes.get("physical");
api.weaknessTypes.has("splash-damage");
```


## Immunity catalog and Builder method

```js
const definition = api.builders
  .effect()
  .setName("Flammenkörper")
  .setDuration(10, "minutes", "turn-end")
  .addImmunity({ immunityType: "fire" })
  .build();

api.immunityTypes.list();
api.immunityTypes.groups("frightened");
api.immunityTypes.get("fire");
api.immunityTypes.has("emotion");
```


## Fast-healing Builder method

```js
const definition = api.builders
  .effect()
  .setName("Regenerierender Segen")
  .setDuration(1, "minutes", "turn-end")
  .addFastHealing({ value: 4 })
  .build();
```

The compiler emits `{ key: "FastHealing", value: 4 }`. The current built-in component accepts a positive integer. See [`FAST_HEALING.md`](FAST_HEALING.md).


## Regeneration component

```js
const trollBlood = api.builders
  .effect()
  .setName("Troll Blood")
  .setDuration(1, "minutes", "turn-end")
  .addRegeneration({
    value: 5,
    deactivatedBy: ["acid", "fire"]
  })
  .build();
```

The compiler emits `{ key: "FastHealing", value: 5, type: "regeneration", deactivatedBy: ["acid", "fire"] }`. See [`REGENERATION.md`](REGENERATION.md).


## Temporary Hit Points component

```js
const definition = api.builders
  .effect()
  .setName("Protective Vitality")
  .setDuration(1, "minutes", "turn-end")
  .addTemporaryHitPoints({ value: 5 })
  .build();
```

The compiler emits `{ key: "TempHP", value: 5 }`. See [`TEMPORARY_HIT_POINTS.md`](TEMPORARY_HIT_POINTS.md).


## Movement catalog and Builder method

```js
const fleet = api.builders
  .effect()
  .setName("Fleet Step")
  .setDuration(1, "minutes", "turn-end")
  .addMovement({
    movementType: "land",
    value: 10,
    modifierType: "status"
  })
  .build();

api.movementTypes.list();
api.movementTypes.groups("fly");
api.movementTypes.get("swim");
api.movementTypes.has("burrow");
api.movementTypes.selector("land"); // "land-speed"
```

See [`MOVEMENT.md`](MOVEMENT.md) for supported movement modes and stacking behavior.


## Base Speed catalog and Builder method

```js
const wings = api.builders
  .effect()
  .setName("Borrowed Wings")
  .setDuration(10, "minutes", "turn-end")
  .addBaseSpeed({
    movementType: "fly",
    value: 30
  })
  .build();

api.baseSpeedTypes.list();
api.baseSpeedTypes.groups("fly");
api.baseSpeedTypes.get("swim");
api.baseSpeedTypes.has("land");      // false
api.baseSpeedTypes.selector("fly"); // "fly"
```

The compiler emits `{ key: "BaseSpeed", selector: "fly", value: 30 }`. See [`BASE_SPEED.md`](BASE_SPEED.md).


## Critical cards

Critical Forge card architecture, the PF2e Context Adapter, runtime Context Engine, manual diagnostics, configurable result chat cards, card profiles, trigger policies, automatic attack, spell-attack, and saving-throw processing, redraws, GM-confirmed effect application, world-persistent custom packs, and external pack registration are available through `api.cards`. Version `0.9.4-dev.5` adds per-pack `default`, `attack`, `fortitude`, `reflex`, and `will` decks while retaining all existing APIs and schema-version-1 pack compatibility.

Capability detection:

```js
api.cards.capabilities.contextSnapshots; // true
api.cards.capabilities.contextProviders; // true
api.cards.capabilities.contextConditions; // true
api.cards.capabilities.conditionEditor; // true
api.cards.capabilities.multiDeckPacks; // true
```

### Multi-Deck helpers

```js
api.cards.deckTypes;                    // default, attack, fortitude, reflex, will
api.cards.decks.types;
api.cards.decks.specializedTypes;       // attack, fortitude, reflex, will
api.cards.decks.requested(context);      // requested deck for a neutral context
api.cards.decks.resolvePack(packOrId, "reflex");
api.cards.decks.listPackTypes(packOrId, { populatedOnly: true });
api.cards.decks.supportsCategory("savingThrowCriticalSuccess", "will");
```

Deck resolution is per pack. A populated requested deck is used first, then that pack's `default` deck, then no cards from that pack. The helpers do not mutate or register pack data. See [`MULTI_DECK_PACKS.md`](MULTI_DECK_PACKS.md).

### Condition editor helpers

```js
api.cards.conditions.valueTypes; // string, number, boolean, stringArray

const editor = api.cards.conditions.editor;

editor.fieldTypes;
editor.fields;
editor.getField("participants.source.hp.ratio");
editor.operatorsForField("participants.source.level");
editor.analyzeContradictions(tree);
editor.createTestSnapshot({ sourceHpRatio: 0.4, saveType: "reflex" });
editor.evaluateTest(tree, { sourceHpRatio: 0.4, saveType: "reflex" });
```

The catalog is descriptive and frozen. `evaluateTest()` uses the production Condition Engine against a synthetic serializable snapshot and never accesses Foundry documents. Provider-defined field paths remain supported even when they are not present in the built-in catalog. The editor stores optional `valueType` metadata (`string`, `number`, `boolean`, or `stringArray`) so custom operands remain stable even for unary conditions.

### Profiles and trigger policies

```js
api.cards.tones;
api.cards.impacts;
api.cards.profiles.ids;

const profile = api.cards.profiles.resolve("brutal");
const multiplier = api.cards.profiles.multiplier(cardId, profile);

const policy = api.cards.triggers.configured("criticalHit");
const trigger = api.cards.triggers.evaluate(contextReport, policy);
```

`scope: "natural"` requires a natural 20 plus final critical success for hits, or a natural 1 plus final critical failure for fumbles.

### Automatic supported-roll processing

```js
const result = await api.cards.automation.processMessage(message);
const audit = api.cards.automation.inspectMessage(message);
const isAttack = api.cards.automation.isAttackReport(report, input);
const isSave = api.cards.automation.isSavingThrowReport(report, input);
const isSupported = api.cards.automation.isSupportedReport(report, input);
```

`processMessage()` performs the same primary-GM, supported-message, trigger-policy, profile, recent-history, prompt, and publication pipeline used by the Foundry hook. It never applies a mechanical effect. See [`CRITICAL_AUTOMATION.md`](CRITICAL_AUTOMATION.md).

### Registration and lookup

```js
api.cards.registerPack(packDefinition);
api.cards.registerCard(cardDefinition);

api.cards.get("my-pack.slashing.result");
api.cards.list({ category: "criticalHit" });
api.cards.getPack("my-pack");
api.cards.listPacks();
```

Pack registration is transactional. A legacy root `cards` array becomes the `default` deck; optional `pack.decks` authoring input is flattened and indexed during normalization. Use `{ replace: true }` to replace an existing pack only after the complete replacement has validated. The low-level methods are retained for advanced integrations and internal use. Optional modules should prefer the ownership-safe extension API.

### Extension card-pack modules

```js
Hooks.once("pf2eCriticalForgeReady", (api) => {
  const extension = api.cards.extensions.forModule("my-critical-expansion");
  extension.registerPacks([darkFantasyPack, heroicPack]);
});
```

The bound controller exposes:

```js
extension.sourceModule;
extension.registerPack(pack, { replace: false });
extension.registerPacks(packs, { replace: false });
extension.getPack(packId);
extension.listPacks();
extension.unregisterPack(packId);
extension.unregisterAll();
```

Direct equivalents are available under `api.cards.extensions.registerPack(sourceModule, ...)` and related methods. The recommended controller prevents the extension from replacing or removing packs owned by another source. Batch registration is atomic. Supplied `sourceModule` and editor-ownership metadata are overridden with the bound module id.

```js
Hooks.on(api.cards.extensions.changedHook, (change) => {
  console.log(change.action, change.sourceModule, change.packIds);
});
```

The change-hook name is `pf2eCriticalForgePacksChanged`. See [`EXTENSION_MODULES.md`](EXTENSION_MODULES.md).

### Validation

```js
const cardReport = api.cards.validate(cardDefinition);
const packReport = api.cards.validatePack(packDefinition);
```

Reports contain stable codes in `issues`, `errors`, and `warnings`.


### PF2e Context Adapter

The adapter translates explicitly supplied PF2e data into the plain selection context consumed by the card selector. It does not register hooks or select a card by itself.

```js
const report = api.cards.adapters.pf2e.createContext({
  message,
  roll,
  item,
  strike,
  sourceActor,
  targetActor,
  sourceToken,
  targetToken
});

console.log(report.valid);
console.log(report.context);  // unchanged selector input
console.log(report.snapshot); // new immutable runtime snapshot
console.log(report.diagnostics);
```

The generic entry point is equivalent:

```js
const report = api.cards.createContext(input, { system: "pf2e" });
```

`report.context` contains only the neutral fields used by card matching. `report.metadata` preserves diagnostic details such as degree of success, actor level and size, item identity, range mode, and roll options. `report.snapshot` contains the serializable runtime state used by diagnostics and optional card conditions. Missing optional data produces structured information entries rather than exceptions. A missing critical category is an error because the resulting context cannot be selected.

See [`PF2E_CONTEXT_ADAPTER.md`](PF2E_CONTEXT_ADAPTER.md).

### Context Builder and providers

```js
const snapshot = api.cards.contexts
  .createBuilder({ system: "pf2e", provider: "my-provider", providerVersion: "1.0.0" })
  .setRoll({ category: "criticalHit", family: "attack" })
  .setParticipant("source", { uuid: actor.uuid, name: actor.name, level: actor.level })
  .setRoles({ roller: "source", opponent: "target" })
  .setSelection({ category: "criticalHit" })
  .build();
```

Provider operations:

```js
api.cards.contexts.listProviders({ system: "pf2e" });
api.cards.contexts.getProvider("pf2e", "core-pf2e");
api.cards.contexts.resolve(input, { system: "pf2e", providerId: "core-pf2e" });
api.cards.contexts.registerProvider(provider, { replace: false });
api.cards.contexts.unregisterProvider("pf2e", "my-provider");
```

The highest-priority provider is used by default. Providers return the existing context-report contract plus an optional snapshot. The built-in `core-pf2e` provider is protected against replacement and removal. See [`CONTEXT_ENGINE.md`](CONTEXT_ENGINE.md).

### Manual diagnostics

Analyze PF2e input and evaluate candidates without choosing a card:

```js
const diagnostic = api.cards.diagnose({
  message,
  sourceActor,
  targetActor
});

console.log(diagnostic.context);
console.log(diagnostic.diagnostics);
console.log(diagnostic.eligible);
console.log(diagnostic.rejected);
```

Resolve a real ChatMessage with the current user's target selection before diagnosing it:

```js
const resolved = await api.cards.diagnostics.resolveMessageInput(message);
const diagnostic = api.cards.diagnose(resolved.input);
```

Recent PF2e roll messages can be listed with:

```js
api.cards.diagnostics.listMessages({ limit: 50 });
```

The GM-only workbench can be opened with `api.ui.openCriticalDiagnostics(message?)`. It never performs a weighted selection or applies a card. A GM may explicitly publish one eligible candidate as a result chat card and, in a second deliberate step, apply its stored effect. See [`CRITICAL_DIAGNOSTICS.md`](CRITICAL_DIAGNOSTICS.md).


### Runtime Condition Engine

```js
api.cards.conditions.modes;      // ["all", "any"]
api.cards.conditions.operators;  // eq, neq, lt, lte, gt, gte, contains, notContains, exists, notExists

const normalized = api.cards.conditions.normalize({
  mode: "all",
  conditions: [
    { field: "participants.source.hp.ratio", operator: "lte", value: 0.5 }
  ]
});

const validation = api.cards.conditions.validate(normalized);
const evaluation = api.cards.conditions.evaluate(normalized, report.snapshot);
const resolved = api.cards.conditions.resolveField(
  report.snapshot,
  "participants.source.hp.ratio"
);
const empty = api.cards.conditions.emptyGroup("all");
```

All returned trees and reports are immutable. Unsafe prototype-path segments, malformed field paths, unsupported operators, invalid numeric operands, excessive nesting, and excessive node counts are rejected. Missing snapshot fields are reported as unavailable and are never guessed. See [`CONDITION_ENGINE.md`](CONDITION_ENGINE.md).

### Matching and selection

```js
const context = {
  category: "criticalHit",
  damageTypes: ["slashing"],
  weaponGroups: ["sword"],
  attackTraits: ["ranged"],
  saveTypes: [],
  spellTraditions: [],
  spellTraits: [],
  sourceTraits: ["humanoid"],
  targetTraits: ["undead"]
};

// A card definition can exclude contexts through:
// filters.excludedAttackTraits = ["spell"]

const candidates = api.cards.candidates(context, { snapshot: report.snapshot });
const result = api.cards.select(context, {
  snapshot: report.snapshot,
  excludeCardIds: ["core.generic.off-balance"],
  random: Math.random
});
```

The selection result contains `requestedDeckType`, the selected card, and eligible/rejected candidate reports. Each candidate records its assigned `deckType` and resolved `activeDeckType`. Deck resolution occurs before filters and optional conditions. Conditions read only `options.snapshot`; filters continue to read the supplied neutral context. The selector never reads Foundry documents directly.

### Localization

```js
const presentation = api.cards.localize("core.slashing.deep-cut");
console.log(presentation.title, presentation.description);
```

A custom localizer can be supplied for tests or non-Foundry consumers.

### Effect materialization

```js
const result = api.cards.materializeEffect("core.slashing.deep-cut");

console.log(result.target);      // "target" or "source"
console.log(result.definition);  // immutable Effect Definition
```

Narrative-only cards return `null`. Materialization does not create or apply Foundry documents.

### Manual result previews

Prepare localized preview data without creating a Foundry document:

```js
const preview = api.cards.preparePreview("core.slashing.deep-cut", {
  context,
  metadata,
  sourceMessage
});
```

Publish one explicitly chosen card as a ChatMessage:

```js
const result = await api.cards.publishPreview("core.slashing.deep-cut", {
  context,
  metadata,
  sourceMessage
});

console.log(result.preview);
console.log(result.message);
```

The message contains localized narrative and effect summaries plus structured flags under `flags.pf2e-critical-forge.criticalCardPreview`. Cards with a mechanical consequence expose a GM-only apply action that re-resolves and revalidates the stored target before changing an Actor.

Effect Definitions can be summarized independently:

```js
const summary = api.cards.summarizeEffect(definition);
```

`api.cards.previewVersion` identifies the stored preview-flag shape. See [`CRITICAL_CARD_PREVIEW.md`](CRITICAL_CARD_PREVIEW.md).


### Result-card visibility and application

```js
await api.cards.publishPreview(cardId, {
  context,
  metadata,
  sourceMessage,
  visibilityMode: api.cards.visibilityModes.BLIND
});

const inspection = await api.cards.inspectPreviewApplication(message);
const target = await api.cards.resolvePreviewTarget(previewFlag);
const result = await api.cards.applyPreviewEffect(message);
const redraw = await api.cards.redrawPreview(message);
```

Supported visibility values are `blind`, `gm`, `public`, and `self`. Invalid values normalize to `blind`. Application is GM-only and records an audit status in the ChatMessage flags.

## Card Pack Editor API

```js
await api.ui.openCardPackEditor();
await api.ui.openEffectForgeDefinition(definition, {
  onCommit: async (updatedDefinition) => {}
});

const editor = api.cards.packEditor;
editor.list();
editor.get("core");
editor.listCustom();
await editor.save(pack, { previousId: null });
await editor.remove("my-critical-cards");
const json = editor.serialize(pack);
const imported = editor.parseImport(json);
```

World-managed packs are persisted through Foundry settings and registered into the same runtime registries used by automatic card selection.


## Diagnostics 2.0 API

Version `0.9.4-dev.5` retains versioned evaluation reports and adds deck evidence without replacing `api.cards.diagnose`, `listMessages`, or `resolveMessageInput`.

```js
const resolved = await api.cards.diagnostics.resolveMessageInput(message);
const diagnostic = api.cards.diagnose(resolved.input);
const report = api.cards.diagnostics.createReport(diagnostic, {
  sourceMessage: message,
  resolverDiagnostics: resolved.diagnostics
});

api.cards.diagnostics.history.record(report);
const repeated = api.cards.diagnostics.replaySnapshot(report);
const simulated = await api.cards.diagnostics.simulateCard(cardId, { input: resolved.input });
const json = api.cards.diagnostics.serializeReport(report);
```

Capability flags are `diagnosticReports`, `diagnosticHistory`, and `diagnosticSimulation`. The diagnostic report schema version is available as `api.cards.diagnostics.reportVersion`.

## Extension contract (0.9.4-dev.6)

The top-level extension API is available as:

```js
api.extensions.contractVersion;       // 1
api.extensions.capabilities;
api.extensions.environment;
api.extensions.checkCompatibility(requirements);
api.extensions.assertCompatible(requirements);
api.extensions.forModule(moduleId, options);
api.extensions.diagnostics.list(options);
```

`api.cards.extensions.forModule(moduleId, options)` is a compatible alias that returns the same ownership-bound controller. Historical direct pack methods remain available.

A controller can register packs plus Context, Condition, and Diagnostic Providers:

```js
const extension = api.extensions.forModule("my-expansion", {
  version: "1.0.0",
  requirements: {
    apiVersion: ">=0.9.4",
    extensionContractVersion: ">=1",
    capabilities: ["cards.multiDeckPacks"]
  }
});

extension.registerPacks(packs);
extension.registerContextProvider(provider);
extension.registerConditionProvider(provider);
extension.registerDiagnosticProvider(provider);
```

Provider discovery is also exposed through:

```js
api.cards.contexts.listProviders();
api.cards.conditions.providers.list();
api.cards.conditions.providers.listFields();
api.cards.diagnostics.providers.list();
```

The complete contract, supported requirement expressions, ownership rules, provider definitions, and diagnostic codes are documented in [`EXTENSION_CONTRACT.md`](EXTENSION_CONTRACT.md).
