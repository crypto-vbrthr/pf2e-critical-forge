# Critical Roll Automation

Version `0.5.8-dev` connects the existing PF2e Context Adapter, trigger policy, profile weighting, card selector, and chat-card publisher to real PF2e attack rolls.

## Hook boundary

Critical Forge listens to Foundry's `createChatMessage` document hook only while the **Enable Critical Forge** world setting is active. Every connected client receives document hooks, so only the primary active GM processes a new roll message. This avoids duplicate prompts and duplicate cards in worlds with multiple connected GMs.

Critical Forge ignores:

- its own result-card ChatMessages;
- messages already carrying an automation audit flag;
- ordinary successes and failures;
- disabled or non-matching trigger policies;
- skill checks, saving throws, damage rolls, and other non-attack messages.

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
Attack-roll guard
        ↓
Critical Trigger Policy
        ├─ disabled / mismatch → audit and stop
        ├─ prompt → GM confirmation dialog
        └─ automatic → continue
        ↓
Profile-weighted card selection
        ↓
Critical result ChatMessage
        ↓
Manual Apply / Draw again controls
```

Effects are never applied automatically. Automatic mode only draws and publishes the card. The existing GM-only **Apply effect** control remains the final mechanical gate.

## Target resolution

The message resolver prefers actor and token references recorded by PF2e in `flags.pf2e.context.origin` and `flags.pf2e.context.target`. If no target is stored there, it can fall back to the rolling user's current target set. Manual diagnostics may still use an explicitly supplied or currently selected target.

## Recent-card history

Automatic draws read a hidden world history bounded by the visible **Recent-card history size** setting. The selector first excludes those recent cards. If that removes every eligible candidate, it retries with the full eligible set rather than failing the critical result.

Redrawing an existing result card continues to use the history stored on that card.

## Source-message audit flag

After evaluating a qualifying attack message, Critical Forge may store:

```js
flags["pf2e-critical-forge"].criticalRollAutomation = {
  version: 1,
  status: "published", // ignored | dismissed | no-card | published
  reason: "automatic",
  category: "criticalHit",
  cardId: "core.slashing.deep-cut",
  previewMessageUuid: "ChatMessage...",
  processedAt: "...",
  processedBy: "..."
};
```

The flag prevents duplicate processing and provides a small audit trail without changing the PF2e roll itself.

## Public API

```js
const cards = game.modules.get("pf2e-critical-forge")?.api.cards;

await cards.automation.processMessage(message);
cards.automation.inspectMessage(message);
cards.automation.isAttackReport(report, input);
```

The processing method accepts injectable collaborators for deterministic tests and advanced module integrations.
