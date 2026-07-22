# Critical Forge Extension API

The normative Phase-6 contract is documented in [`EXTENSION_CONTRACT.md`](EXTENSION_CONTRACT.md). This document summarizes the intended architecture.

## Principle

Extension modules contribute content and context while Critical Forge remains responsible for normalization, validation, selection, diagnostics, presentation, and effect application. Extensions must not patch Critical Forge internals.

## Registration

```js
Hooks.once("pf2eCriticalForgeReady", (forge) => {
  const extension = forge.extensions.forModule("my-extension", {
    version: "1.0.0",
    requirements: {
      apiVersion: ">=0.9.4",
      extensionContractVersion: ">=1",
      capabilities: ["cards.multiDeckPacks"]
    }
  });

  extension.assertCompatible();
  extension.registerPacks(PACKS);
});
```

The historical pack-only controller remains valid:

```js
forge.cards.extensions.forModule("my-extension").registerPacks(PACKS);
```

## Resources

A bound extension may own:

- Critical Card packs, including specialized attack/Fortitude/Reflex/Will decks;
- Context Providers that build runtime snapshots;
- Condition Providers that publish typed snapshot fields to the Card Editor;
- Diagnostic Providers that add serializable evidence to evaluation reports.

Every resource id must be globally unique. Namespace ids and snapshot paths with the Foundry module id.

## Compatibility

Use requirements rather than guessing by module version alone. The contract can check:

- module version;
- public API version;
- extension contract version;
- Effect, Card, and Card Pack schema versions;
- named capabilities.

Unsupported requirements fail before registries are changed.

## Ownership and transactions

The bound controller may replace or remove only resources registered by the same module id. Pack batches are atomic. Provider collisions leave existing providers untouched. `unregisterAll()` removes only the bound module's resources.

## Diagnostics

Registration operations are recorded in a session-only journal. Errors contain stable codes and attach the matching record as `error.extensionDiagnostic`.

Diagnostic Providers are isolated. A provider exception becomes provider evidence with `status: "error"` and does not stop the core diagnostic pipeline.

## Compatibility guarantee

Version `0.9.4-dev.6` does not change Critical Card schema `1`, Critical Card Pack schema `1`, Effect Definition schema `2`, or public API version `0.9.4`. Existing packs and pack-only extension modules require no migration.


## Battlefield threat capability

Version `0.9.4-dev.7` exposes `cards.battlefieldThreatEvaluation` to compatibility checks. Extensions may consume the built-in snapshot field `battlefield.hostileThreatCount` or call `api.cards.battlefield` helpers. The core evaluator and explicit compatibility override are documented in [`BATTLEFIELD_THREATS.md`](BATTLEFIELD_THREATS.md).
