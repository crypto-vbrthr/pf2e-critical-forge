# Critical Diagnostics 2.0

Version `1.0.0-rc` keeps the diagnostic workbench as the central test cockpit, retains per-token PF2e battlefield threat evidence, and renders those entries with an explicit high-contrast Forge palette. It remains GM-only and never applies an effect without a separate explicit action.

## Evaluation pipeline

Every analysis produces one immutable evaluation report with three phases:

1. **Context resolution** records the PF2e adapter result, resolver diagnostics, provider, runtime snapshot, participants, health, conditions, combat references, and complete battlefield threat evidence.
2. **Card selection** records the requested deck, each pack's active deck, every card's assigned deck, trigger policy, profile, eligible and rejected cards, weights, matched filters, context-condition evidence, and any actual automated selection.
3. **Effect application** records an optional safe simulation and, when an automated preview is later applied, the successful application audit.

The report has its own `reportVersion`. It is independent of Critical Card, Card Pack, Effect Definition, and module versions.

## Battlefield threat evidence

When scene analysis is available, the runtime-context panel lists each candidate token separately. Every row records alliance, attack-capable/dead state, relative perception, occupied-space distance, selected ready melee Strike and reach, collision result, counted status, and localized rejection reasons. The same data is retained in snapshot replay and JSON export. A missing scene or source token remains visibly `not-evaluated` rather than appearing as zero threats.

The exact counting contract is documented in [`BATTLEFIELD_THREATS.md`](BATTLEFIELD_THREATS.md).

## Session history

The workbench stores the newest 100 reports in memory for the current browser session. History is not written to world settings and does not alter card packs or Actors. Each row shows:

- source-message label;
- analysis time;
- origin such as manual analysis, automation, snapshot replay, or current-state replay;
- validity and eligible-card count;
- selected card when automation actually selected one.

Closing or reloading the Foundry client clears the history. The **Clear history** action removes it immediately.

## Replay

### Repeat snapshot

Snapshot replay uses the original normalized selection context, metadata, and immutable runtime snapshot. It does not read current Actor HP, conditions, token positions, or combat state. This is the reproducibility check for the original decision.

### Re-evaluate current state

Current-state replay resolves the original ChatMessage again. It can therefore reflect changed HP, Actor data, targets, or future battlefield providers. The comparison lists changes to:

- validity;
- eligible-card IDs;
- rejected-card IDs;
- total selection weight.

## Application simulation

Every eligible card has **Simulate application** beside **Show card in chat**. Simulation:

- materializes the card's current Effect Definition;
- resolves the configured `source` or `target` role from the analyzed message;
- validates the definition against the resolved Actor;
- summarizes duration and components;
- reports unresolved targets and invalid effects;
- never creates, updates, or deletes Foundry documents.

Narrative-only cards are reported explicitly and remain valid simulations.

## Actual application audit

Automatic card processing records the selected card and preview-message UUID in the session report. A later successful GM-confirmed effect application updates the matching report with:

- applying user;
- application time;
- resolved Actor UUID and name;
- created effect document IDs.

This tracking is session-local and additive. Existing preview flags remain the persistent audit source on ChatMessages.

## Export

**Copy report** exports the complete JSON evaluation report, including:

- report, module, snapshot, and provider versions;
- source-message references;
- context, metadata, and snapshot;
- resolver and adapter diagnostics;
- eligible and rejected cards with requested, active, and assigned deck evidence, weights, and conditions;
- trigger and profile details;
- selected card and preview reference;
- simulation and actual-application results;
- replay comparison.

## Public API

```js
const diagnostics = game.modules.get("pf2e-critical-forge")?.api.cards.diagnostics;

const resolved = await diagnostics.resolveMessageInput(message);
const diagnostic = game.modules.get("pf2e-critical-forge")?.api.cards.diagnose(resolved.input);
const report = diagnostics.createReport(diagnostic, {
  sourceMessage: message,
  resolverDiagnostics: resolved.diagnostics
});

diagnostics.history.record(report);
console.log(diagnostics.serializeReport(report));
```

Additional functions:

```js
diagnostics.reportVersion;
diagnostics.history.list();
diagnostics.history.get(report.id);
diagnostics.history.clear();
diagnostics.replaySnapshot(report);
await diagnostics.simulateCard(cardId, { input: resolved.input });
```

All previous diagnostic APIs remain available.
