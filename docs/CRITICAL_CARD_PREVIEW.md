# Critical Card Chat Workflow

Version `0.5.8-dev` uses the same result-card system for both manual diagnostic previews and cards drawn by the automatic PF2e attack-roll hook. Publication may be manual, prompted, or automatic; effect application remains explicitly GM-controlled.

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
  previewVersion: 3,
  cardId: "core.slashing.deep-cut",
  packId: "core",
  category: "criticalHit",
  sourceMessageUuid: "ChatMessage...",
  visibilityMode: "blind",
  context: {},
  metadata: {},
  draw: {
    profileId: "balanced",
    history: ["core.slashing.deep-cut"]
  },
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
const redraw = await api.cards.redrawPreview(message);
```

`api.cards.visibilityModes` exposes the stable mode constants and `normalizeVisibilityMode()` provides safe fallback to `blind`.

## Safety boundary

Automatic mode may choose and publish a card after a qualifying attack roll. Prompt mode requires an explicit GM confirmation first. In every mode, applying the card's mechanical effect still requires the GM-only **Apply effect** action.


## Draw again

If the world setting permits redraws, an unapplied card shows a GM-only **Draw again** control. The existing ChatMessage is updated in place. Critical Forge preserves its context, target metadata, visibility, and source-message reference while replacing the card and resetting application state.

The `draw.history` array is bounded by the configured history size. The selector first excludes every recent card and, if that exhausts the eligible pool, falls back to excluding only the currently displayed card. Applied cards cannot be redrawn.

## Tone and impact

Cards display localized tone and impact badges. These values are descriptive and feed profile weighting; they do not change the stored Effect Definition.
