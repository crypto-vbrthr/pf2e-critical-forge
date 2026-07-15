# Critical Card Preview

Version `0.5.5-dev` adds the first visible Critical Forge result card. The feature is deliberately manual and preview-only.

## Workflow

1. Open **Critical Forge Diagnostics**.
2. Analyze a suitable PF2e attack-roll ChatMessage.
3. Review the eligible candidates and their filter matches.
4. Press **Preview in chat** on one eligible card.
5. Critical Forge publishes a localized result card to chat.

No weighted random choice occurs in this workflow. The GM chooses the exact candidate that is previewed.

## Chat-card contents

The preview card contains:

- localized category, title, and narrative description;
- localized effect name when the card has a mechanical consequence;
- effect target (`source` or `target`), including the resolved Actor name when available;
- global Effect Definition duration;
- localized summaries of every current built-in Effect component;
- a visible notice that no effect was applied;
- the source ChatMessage label when available.

The preview card contains no buttons and performs no Actor or Item operation.

## Stored flags

The ChatMessage stores structured data for later milestones:

```js
flags["pf2e-critical-forge"].criticalCardPreview = {
  previewVersion: 1,
  cardId: "core.slashing.deep-cut",
  packId: "core",
  category: "criticalHit",
  sourceMessageUuid: "ChatMessage...",
  context: {},
  metadata: {},
  effect: {
    target: "target",
    definition: EffectDefinition
  }
};
```

These flags do not imply that the effect was accepted or applied. A future confirmation workflow can read the exact immutable Effect Definition without reconstructing it from rendered HTML.

## Public API

Prepare presentation data without creating a ChatMessage:

```js
const preview = api.cards.preparePreview("core.slashing.deep-cut", {
  context,
  metadata,
  sourceMessage
});
```

Publish the preview:

```js
const result = await api.cards.publishPreview("core.slashing.deep-cut", {
  context,
  metadata,
  sourceMessage
});

console.log(result.preview);
console.log(result.message);
```

Summarize an arbitrary Effect Definition for another UI:

```js
const summary = api.cards.summarizeEffect(definition);
```

## Safety boundary

The preview milestone does not:

- register attack-roll hooks;
- choose a card automatically;
- add an apply button to chat;
- create or embed an Effect Item;
- alter Actors, Tokens, or the source ChatMessage.
