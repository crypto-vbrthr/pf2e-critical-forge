# Critical Card Chat Workflow

Version `0.5.6-dev` turns the manual Critical Forge preview into a controlled result-card workflow. Cards are still chosen explicitly from diagnostics; no roll hook or automatic selection is active.

## Visibility setting

The world setting **Critical Forge card visibility** supports:

- `blind`: GM-blind, the default;
- `gm`: visible to Gamemasters;
- `public`: visible to everyone;
- `self`: visible only to the publishing user.

Critical Forge applies the selected mode through Foundry's `ChatMessage.applyMode()` before creating the message.

## Manual application

Cards with a mechanical consequence contain an **Apply effect** control. Application is deliberately GM-only. Before applying, Critical Forge:

1. reloads the structured data stored in ChatMessage flags;
2. rejects cards that were already applied or are currently being processed;
3. resolves the recorded source or target Token/Actor again;
4. reruns the Effect Engine's target-aware validation;
5. embeds the compiled PF2e Effect Item on the Actor;
6. stores an audit record and updates the chat-card status.

If the target no longer exists or validation returns an error, the Actor is not changed.

## Stored flags

```js
flags["pf2e-critical-forge"].criticalCardPreview = {
  previewVersion: 2,
  cardId: "core.slashing.deep-cut",
  packId: "core",
  category: "criticalHit",
  sourceMessageUuid: "ChatMessage...",
  visibilityMode: "blind",
  context: {},
  metadata: {},
  effect: {
    target: "target",
    definition: EffectDefinition
  },
  application: {
    status: "pending",
    appliedAt: null,
    appliedBy: null,
    targetActorUuid: null,
    targetActorName: null,
    createdEffectIds: []
  }
};
```

After success, `status` is `applied` and the audit fields are populated.

## Public API

```js
await api.cards.publishPreview(cardId, {
  context,
  metadata,
  sourceMessage,
  visibilityMode: "blind"
});

const inspection = await api.cards.inspectPreviewApplication(message);
const result = await api.cards.applyPreviewEffect(message);
```

`api.cards.visibilityModes` exposes the stable mode constants and `normalizeVisibilityMode()` provides safe fallback to `blind`.

## Safety boundary

This milestone still does not register attack-roll hooks or choose cards automatically. Every card publication and every effect application requires an explicit GM action.
