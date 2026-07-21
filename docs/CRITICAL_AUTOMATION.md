# Critical Roll Automation

Version `0.9.4-dev.2` extends the connection between the PF2e Context Adapter, trigger policy, profile weighting, card selector, and chat-card publisher for supported PF2e critical rolls.

## Supported roll families

- weapon and unarmed attack critical successes and failures;
- spell-attack critical successes and failures;
- saving-throw critical successes and failures.

Each category has its own behavior (`disabled`, `prompt`, or `automatic`) and trigger scope (`all` or `natural`). Critically successful saving throws default to disabled; the other new categories default to prompt.

## Hook boundary

Critical Forge listens to Foundry's `createChatMessage` document hook only while the **Enable Critical Forge** world setting is active. Every connected client receives document hooks, so only the primary active GM processes a new roll message. This avoids duplicate prompts and duplicate cards in worlds with multiple connected GMs.

Critical Forge ignores:

- its own result-card ChatMessages;
- messages already carrying an automation audit flag;
- ordinary successes and failures;
- disabled or non-matching trigger policies;
- skill checks, damage rolls, and unsupported roll families.

## Live flow

```text
New PF2e ChatMessage
        ↓
Primary-GM ownership check
        ↓
PF2e source / item / target resolution
        ↓
PF2e Context Adapter
        ↓
Supported-roll-family guard
        ↓
Critical Trigger Policy
        ├─ disabled / mismatch → audit and stop
        ├─ prompt → GM confirmation dialog
        └─ automatic → continue
        ↓
Snapshot condition evaluation
        ↓
Profile-weighted card selection
        ↓
Critical result ChatMessage
        ↓
Manual Apply / Draw again controls
```

Effects are never applied automatically. Automatic mode only draws and publishes the card. The GM-only **Apply effect** control remains the final mechanical gate.

## Natural trigger semantics

Natural scope requires both the natural die and the final PF2e result:

- natural 20 plus final critical success for hit and save-success categories;
- natural 1 plus final critical failure for fumble and save-failure categories.

A natural 20/1 that produces only an ordinary success or failure does not trigger a card.

## Source and target resolution

For attack and spell-attack messages, the attack origin is the source and the attacked creature is the target. For saving throws, the rolling creature is the source and the originating Actor/effect is the target when PF2e records it. Missing references do not invent a target; the resulting card can remain narrative or report that a mechanical target is unavailable. The same immutable snapshot is passed to card conditions and stored with the published preview.

## Recent-card history

Automatic draws read a hidden world history bounded by the visible **Recent-card history size** setting. The selector first excludes those recent cards. If that removes every eligible candidate, it retries with the full eligible set rather than failing the critical result.

Redrawing an existing result card continues to use the history and runtime snapshot stored on that card.

## Source-message audit flag

After evaluating a supported critical message, Critical Forge may store:

```js
flags["pf2e-critical-forge"].criticalRollAutomation = {
  version: 1,
  status: "published", // ignored | dismissed | no-card | published
  reason: "automatic",
  category: "savingThrowCriticalFailure",
  cardId: "core.save-failure.full-impact",
  previewMessageUuid: "ChatMessage...",
  processedAt: "...",
  processedBy: "..."
};
```

The flag prevents duplicate processing and provides an audit trail without changing the PF2e roll itself.

## Public API

```js
const cards = game.modules.get("pf2e-critical-forge")?.api.cards;

await cards.automation.processMessage(message);
cards.automation.inspectMessage(message);
cards.automation.isAttackReport(report, input);
cards.automation.isSavingThrowReport(report, input);
cards.automation.isSupportedReport(report, input);
```

The processing method accepts injectable collaborators for deterministic tests and advanced module integrations.
