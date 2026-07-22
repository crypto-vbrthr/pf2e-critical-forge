# Critical Forge Extension Contract

Version `0.9.4-dev.6` stabilizes the public extension surface without changing Critical Card schema `1`, Critical Card Pack schema `1`, or Effect Definition schema `2`.

The contract is additive. Existing modules that only call `forge.cards.extensions.forModule(moduleId).registerPack(...)` continue to work. New extensions should use the bound controller exposed through `forge.extensions.forModule(...)` or the compatible alias under `forge.cards.extensions.forModule(...)`.

## Ready hook

Register extensions after Critical Forge announces that all core registries and APIs are ready:

```js
Hooks.once("pf2eCriticalForgeReady", (forge) => {
  const extension = forge.extensions.forModule("against-all-odds", {
    version: "1.0.0",
    requirements: {
      apiVersion: ">=0.9.4",
      extensionContractVersion: ">=1",
      cardSchemaVersion: ">=1",
      cardPackSchemaVersion: ">=1",
      capabilities: [
        "cards.contextConditions",
        "cards.multiDeckPacks",
        "extensions.conditionProviders",
        "extensions.diagnosticProviders"
      ]
    }
  });

  extension.assertCompatible();
  extension.registerPacks(PACKS);
});
```

The controller owns every registration it creates. It may replace or remove only resources owned by the same Foundry module id.

## Compatibility report

```js
const report = forge.extensions.checkCompatibility({
  apiVersion: ">=0.9.4",
  extensionContractVersion: ">=1",
  capabilities: ["cards.multiDeckPacks"]
});
```

The immutable report contains:

```js
{
  compatible: true,
  requirements: {},
  available: {
    moduleVersion: "0.9.4-dev.6",
    apiVersion: "0.9.4",
    extensionContractVersion: 1,
    effectSchemaVersion: 2,
    cardSchemaVersion: 1,
    cardPackSchemaVersion: 1,
    capabilities: []
  },
  issues: [],
  errors: [],
  warnings: []
}
```

Supported version expressions are exact versions plus `>`, `>=`, `<`, `<=`, `^`, and `~`. Pre-release identifiers are compared deterministically.

`assertCompatible()` throws `EXTENSION_INCOMPATIBLE` and attaches the complete report as `error.compatibility`.

## Bound controller

```js
const extension = forge.extensions.forModule("my-critical-expansion", {
  version: "1.2.0",
  requirements: { capabilities: ["extensions.contracts"] }
});
```

The controller provides:

```js
extension.checkCompatibility();
extension.assertCompatible();

extension.registerPack(pack);
extension.registerPacks(packs, { replace: true });
extension.unregisterPack(packId);
extension.listPacks();
extension.getPack(packId);

extension.registerContextProvider(provider);
extension.unregisterContextProvider(system, providerId);
extension.listContextProviders();

extension.registerConditionProvider(provider);
extension.unregisterConditionProvider(providerId);
extension.listConditionProviders();

extension.registerDiagnosticProvider(provider);
extension.unregisterDiagnosticProvider(providerId);
extension.listDiagnosticProviders();

extension.listRegistrations();
extension.unregisterAll();
```

`unregisterAll()` removes only the bound module's packs and providers.

## Multi-Deck packs

The existing pack contract remains valid:

```js
{
  id: "my-expansion.legacy",
  cards: [/* historical default deck */]
}
```

A specialized extension may instead provide:

```js
{
  id: "my-expansion.heroic",
  decks: {
    attack: { cards: ATTACK_CARDS },
    fortitude: { cards: FORTITUDE_CARDS },
    reflex: { cards: REFLEX_CARDS },
    will: { cards: WILL_CARDS }
  }
}
```

Registration is transactional. Invalid categories, duplicate pack ids, duplicate card ids, foreign ownership, and global card collisions leave the previous registry state unchanged.

## Context Provider

```js
extension.registerContextProvider({
  id: "my-expansion.context",
  system: "pf2e",
  version: "1.0.0",
  priority: 50,
  createContext(input, options) {
    return buildMyContext(input, options);
  }
});
```

A provider must contain `id`, `system`, and synchronous `createContext(input, options)`. The highest-priority provider is selected unless a provider id is requested explicitly.

Extensions cannot replace the protected `core-pf2e` provider, another module's provider, or an unowned low-level provider.

## Condition Provider

A Condition Provider publishes typed snapshot fields to the visual Card Editor. It does not replace Condition Engine evaluation; cards still resolve values through ordinary safe field paths.

```js
extension.registerConditionProvider({
  id: "my-expansion.fields",
  version: "1.0.0",
  fields: [
    {
      path: "extensions.myExpansion.dangerScore",
      type: "number",
      labelKey: "MY_EXPANSION.Fields.DangerScore",
      fallbackLabel: "Danger score",
      groupKey: "MY_EXPANSION.Fields.Group",
      fallbackGroup: "My Expansion"
    },
    {
      path: "extensions.myExpansion.tier",
      type: "enum",
      values: ["low", "high"],
      fallbackLabel: "Danger tier",
      fallbackGroup: "My Expansion"
    }
  ]
});
```

Supported types are `string`, `number`, `boolean`, `stringArray`, and `enum`. Enum fields require a non-empty `values` array.

Provider fields appear immediately in `forge.cards.conditions.editor.fields`. An extension cannot shadow a core field such as `roll.category` or a field owned by another provider.

## Diagnostic Provider

A Diagnostic Provider adds serializable extension evidence to every versioned evaluation report:

```js
extension.registerDiagnosticProvider({
  id: "my-expansion.diagnostics",
  version: "1.0.0",
  priority: 20,
  inspect(diagnostic, options) {
    return {
      dangerScore: diagnostic.snapshot?.extensions?.myExpansion?.dangerScore ?? null,
      matchedTheme: "bloodied"
    };
  }
});
```

`inspect` must be synchronous and return serializable data. Results appear in:

```js
report.extensions.diagnostics
report.phases.context.extensionProviders
```

The Diagnostics GUI shows each provider as a collapsible section. A failing provider is isolated as `status: "error"`; it does not invalidate context resolution, card selection, or other providers.

## Registration diagnostics

Every bound operation is written to a session-only diagnostic journal:

```js
extension.diagnostics.list();
extension.diagnostics.list({ status: "error" });
extension.diagnostics.clear();

forge.extensions.diagnostics.list({ sourceModule: "my-expansion" });
```

Each entry contains source module, resource type, action, status, stable code, message, resource ids, and structured data. A thrown registration error also exposes the same entry as `error.extensionDiagnostic`.

Important conflict codes include:

- `EXTENSION_PACK_CONFLICT`
- `EXTENSION_PACK_OWNERSHIP`
- `EXTENSION_CARD_CONFLICT`
- `CONTEXT_PROVIDER_CONFLICT`
- `CONTEXT_PROVIDER_OWNERSHIP`
- `CONDITION_PROVIDER_CONFLICT`
- `CONDITION_FIELD_CONFLICT`
- `CONDITION_FIELD_CORE_CONFLICT`
- `DIAGNOSTIC_PROVIDER_CONFLICT`
- `DIAGNOSTIC_PROVIDER_OWNERSHIP`
- `EXTENSION_INCOMPATIBLE`

The journal is deliberately not persisted in world settings.

## Legacy compatibility

The following remain supported without migration:

```js
forge.cards.extensions.forModule(moduleId).registerPack(pack);
forge.cards.extensions.registerPack(moduleId, pack);
forge.cards.registerPack(pack);
forge.cards.contexts.registerProvider(provider);
```

The low-level APIs remain available for compatibility and core tooling. Third-party modules should prefer the bound controller because it supplies ownership isolation, compatibility checks, and structured diagnostics.
