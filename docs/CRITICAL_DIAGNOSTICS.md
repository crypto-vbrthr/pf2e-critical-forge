# Critical Forge Diagnostics

Version `0.9.4-dev.1` extends the manual GM workbench with the Phase-1 runtime context snapshot. It remains the primary instrument for testing PF2e participant resolution, context acquisition, candidate determination, and later card application. Eligible cards can be deliberately published as manual result chat cards.

The diagnostic itself applies no effect, creates no Item, and changes no Actor. The separate automation service may process supported rolls according to world settings.

## Opening the workbench

Enable **Critical Forge** in module settings and reload the world. A persistent microscope button appears directly below the Chat input. The launcher is attached only to the actual ChatLog input part and is also inserted into a popped-out ChatLog.

The public entry point is:

```js
const api = game.modules.get("pf2e-critical-forge")?.api;
api.ui.openCriticalDiagnostics();
```

A known ChatMessage can be analyzed immediately:

```js
await api.ui.openCriticalDiagnostics(message);
```

## Input workflow

A GM can:

- choose one of the recent PF2e roll messages;
- analyze the latest suitable roll message;
- drag a ChatMessage into the drop zone;
- select exactly one target Token before analysis to supply target traits and metadata.

The message resolver attempts to supply:

- the ChatMessage and primary roll;
- its attack Item, including a PF2e origin Item UUID when present;
- the speaker Actor and source Token;
- the single currently targeted Token and Actor.

No target is a valid diagnostic state. Multiple targets are never reduced to an arbitrary first target.

## Displayed results

The workbench shows:

- critical category, roll family, natural die, and degree of success;
- damage types, weapon groups, attack traits, save types, spell traditions, spell traits, source traits, and target traits;
- rejection reasons for positive and negative filters, including `excludedAttackTraits`;
- structured adapter and resolver diagnostics;
- every eligible card with matched filters, specificity, base weight, and effective weight;
- every rejected card with stable rejection reasons;
- raw normalized selection context and adapter metadata;
- runtime provider and snapshot-schema version;
- rolling Actor and opponent identities, levels, HP totals and ratio, save type, combat references, and battlefield evaluation status;
- the complete raw runtime snapshot;
- a copyable JSON report containing context, metadata, snapshot, diagnostics, and candidate decisions.

Candidate evaluation is deterministic. No weighted random selection occurs.

Each eligible card also offers **Preview in chat**. That action publishes exactly the chosen card. It does not choose a different candidate and does not apply the card effect. See [`CRITICAL_CARD_PREVIEW.md`](CRITICAL_CARD_PREVIEW.md).

## Headless API

```js
const diagnostic = api.cards.diagnose({
  category: "criticalHit",
  damageTypes: ["slashing"],
  targetTraits: ["humanoid"]
});
```

Result shape:

```js
{
  valid: true,
  contextReport: {},
  context: {},
  metadata: {},
  snapshot: {},
  diagnostics: [],
  eligible: [],
  rejected: [],
  totalWeight: 0,
  counts: {
    eligible: 0,
    rejected: 0,
    diagnostics: 0
  }
}
```

Live-message helpers:

```js
const recent = api.cards.diagnostics.listMessages({ limit: 50 });
const resolved = await api.cards.diagnostics.resolveMessageInput(message);
const diagnostic = api.cards.diagnose(resolved.input);
```

Resolver diagnostics are separate from the immutable adapter report so API consumers can decide how to combine or present them.


## Phase-1 visibility

The toolbar displays `Context Foundation · <module version>`. In German this appears as `Kontext-Fundament · <Modulversion>`. Together with Foundry's module list, this makes a development build distinguishable from the preceding `0.9.4-dev` build.

A `hostileThreatCount` of `null` with `threatEvaluation: "not-evaluated"` is expected in Phase 1. The workbench exposes that absence explicitly instead of presenting a guessed enemy count.
