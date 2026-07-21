# Critical Forge Multi-Deck Packs

Version `0.9.4-dev.5` adds optional per-pack card pools for attacks and the three PF2e saving throws while preserving the historical single-list pack format.

## Deck types

Critical Forge defines five stable deck types:

| Deck | Purpose |
|---|---|
| `default` | legacy and universal per-pack fallback |
| `attack` | weapon and spell attack critical hits/fumbles |
| `fortitude` | Fortitude critical successes/failures |
| `reflex` | Reflex critical successes/failures |
| `will` | Will critical successes/failures |

`default` is not a global emergency pool. It is resolved independently inside each pack.

## Requested deck

The neutral selection context determines the requested deck:

- `criticalHit`, `criticalFumble`, `spellCriticalHit`, and `spellCriticalFumble` request `attack`;
- saving-throw categories with exactly one recognized save type request `fortitude`, `reflex`, or `will`;
- an unknown, absent, or ambiguous save type requests `default`.

The public helper is:

```js
api.cards.decks.requested(context);
```

## Per-pack resolution

For every enabled pack:

1. Use the requested specialized deck when it contains cards.
2. Otherwise use that pack's populated `default` deck.
3. Otherwise let the pack contribute no cards.

Only cards in the active deck continue to category, filter, condition, exclusion, profile, and weight evaluation. This makes save decks mutually isolated while allowing a specialized expansion pack and an unrelated legacy pack to contribute together.

## Legacy format

This remains valid:

```js
{
  schemaVersion: 1,
  id: "legacy-pack",
  cards: [cardA, cardB]
}
```

Every card without `deckType` normalizes to `default`. No world setting, source JSON, or extension object is rewritten, and no migration runs.

## Specialized authoring format

A pack may use arrays or objects containing a `cards` array:

```js
{
  schemaVersion: 1,
  id: "heroic-expansion",
  decks: {
    attack: [attackHit, attackFumble],
    fortitude: { cards: [fortitudeSuccess, fortitudeFailure] },
    reflex: [reflexSuccess, reflexFailure],
    will: { cards: [willSuccess, willFailure] }
  }
}
```

A pack may also combine a root `cards` fallback with specialized `decks`.

Normalization produces:

```js
{
  cards: [/* flat immutable cards with deckType */],
  decks: {
    default: { type: "default", cardIds: [] },
    attack: { type: "attack", cardIds: [/* ids */] },
    fortitude: { type: "fortitude", cardIds: [/* ids */] },
    reflex: { type: "reflex", cardIds: [/* ids */] },
    will: { type: "will", cardIds: [/* ids */] }
  }
}
```

The normalized index is derived data. Pack authors should treat explicit card `deckType` values or the nested authoring input as the source of truth.

## Category compatibility

- `attack` accepts attack and spell-attack categories.
- `fortitude`, `reflex`, and `will` accept saving-throw critical success/failure categories.
- `default` accepts all six categories.

Invalid combinations fail pack/card validation. In the Card Pack Editor, moving a card between attack and save decks corrects an incompatible category to a valid default before saving.

## Card Pack Editor

The editor exposes five fixed tabs with independent card counts and filtered card lists. New cards are created in the active tab. Card duplication, pack duplication, persistence, import, export, and Effect Forge handoff preserve `deckType`.

Legacy packs open in `Standard` and can remain there indefinitely.

## Diagnostics

The selection phase records:

- `requestedDeckType` for the roll;
- `activeDeckType` for the card's pack;
- `deckType` assigned to each card.

Cards outside their pack's active deck are rejected with `deckType`, making fallback and isolation visible in Diagnostics 2.0 and exported reports.

## Public API

```js
api.cards.capabilities.multiDeckPacks; // true
api.cards.deckTypes;
api.cards.decks.types;
api.cards.decks.specializedTypes;
api.cards.decks.requested(context);
api.cards.decks.resolvePack(packOrId, "reflex");
api.cards.decks.listPackTypes(packOrId, { populatedOnly: true });
api.cards.decks.supportsCategory("savingThrowCriticalSuccess", "will");
```

The public API version remains `0.9.4` because these methods are additive.

## Compatibility contract

- Critical Card schema remains `1`.
- Critical Card Pack schema remains `1`.
- Effect Definition schema remains `2`.
- Existing registration methods and extension controllers are unchanged.
- Existing cards and packs require no migration.
- A runtime without the `multiDeckPacks` capability should not be given a specialized-deck-only expansion; extension modules should capability-check before registration.
