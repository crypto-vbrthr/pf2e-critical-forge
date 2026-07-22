# PF2e Battlefield Threat Evaluation

Version `0.9.4-dev.7` adds a headless PF2e scene evaluator for the runtime field `battlefield.hostileThreatCount`. The evaluator is part of the Forge infrastructure; it does not contain any Against All Odds cards or package-specific thresholds.

## Threat definition

A scene token counts as an immediate melee threat to the executing or saving Actor only when every requirement below is satisfied:

1. The executing Actor and candidate Actor form a strict `party` versus `opposition` alliance pair.
2. The candidate is not dead and its combatant is not marked defeated.
3. The candidate can currently attack.
4. The candidate exposes at least one ready PF2e melee Strike.
5. At least one of those Strikes reaches the executing Actor's occupied token space.
6. The executing Actor's location is known to that candidate.
7. The candidate has an unobstructed sight/attack path to the executing Actor.

All scene tokens are evaluated independently. Allies, neutral creatures, ranged-only creatures, dead or defeated creatures, creatures without a ready melee Strike, out-of-reach creatures, unaware creatures, and creatures separated by a blocking wall do not count.

## Reach and distance

Reach is resolved for each ready melee Strike through `actor.getReach({ action: "attack", weapon })` when available, with item/action and trait fallbacks for deterministic tests and external adapters.

Distance is measured between occupied grid spaces rather than token centers. This keeps adjacency stable for Tiny, Medium, Large, and larger tokens. Elevation and creature height are included as occupied vertical grid layers. On gridless scenes, token bounds are used as a fallback.

A ranged Strike never becomes a melee threat merely because the Actor has a generic base reach.

## Perception

The evaluator cares about whether the executing Actor's position is known to each candidate, not merely whether the Actor has an `invisible` status.

| Relative state | Counts |
| --- | --- |
| observed | yes |
| concealed | yes |
| hidden | yes |
| undetected | no |
| unnoticed | no |

Invisibility is relative in PF2e. If the core evaluator sees `invisible` without a more precise relative state, it conservatively treats the Actor as `undetected`. A caller or extension may provide an explicit per-observer state through `threatPerceptionStates`, `perceptionStates`, or a `perceptionResolver`. An explicit `hidden` or `observed` state therefore allows an invisible Actor to remain threatened by a creature that located it.

A GM-hidden source token is treated as unnoticed by the core fallback.

## Walls and line of sight

The default Foundry integration uses the candidate token's `checkCollision()` with `type: "sight"` and `mode: "any"`. A blocking result rejects the threat. If collision evaluation is unavailable, the path is recorded as not evaluated rather than guessed to be blocked.

Tests and extensions may supply a deterministic `lineOfSightTest` callback.

## Snapshot result

Successful scene analysis is stored as serializable evidence:

```js
battlefield: {
  hostileThreatCount: 2,
  threatEvaluation: "scene-analysis",
  hostileThreats: [
    {
      actorUuid: "Actor.goblin",
      name: "Goblin Warrior",
      sourceAlliance: "party",
      alliance: "opposition",
      perception: {
        state: "concealed",
        source: "actor-status",
        knownPosition: true
      },
      distance: {
        value: 5,
        horizontal: 5,
        vertical: 0,
        units: "ft",
        method: "occupied-grid-spaces"
      },
      selectedAttack: {
        name: "Dogslicer",
        reach: 5
      },
      lineOfSight: {
        clear: true,
        blocked: false,
        method: "token-sight-collision"
      },
      counted: true,
      rejectedBy: []
    }
  ],
  threatSummary: {
    candidateCount: 4,
    evaluatedCount: 4,
    countedCount: 2,
    rejectedCount: 2,
    reason: null
  }
}
```

If the Actor, its unique token, or the scene cannot be resolved, `hostileThreatCount` remains `null` and `threatEvaluation` remains `not-evaluated`. Unknown information is never converted to zero.

## Explicit compatibility override

Existing callers may continue to supply:

```js
createContext({ hostileThreatCount: 3 });
```

The explicit value remains authoritative and produces `threatEvaluation: "explicit"`. This preserves test workbenches and external providers that already calculate their own count.

## Diagnostics

Diagnostics 2.0 lists every evaluated token with:

- alliance pairing;
- dead and attack-capable state;
- relative perception state and source;
- occupied-space distance;
- selected melee Strike and reach;
- wall/collision result;
- counted or rejected status;
- localized rejection reasons.

The raw report and JSON export contain the same immutable evidence.

## Public API

```js
api.cards.capabilities.battlefieldThreatEvaluation; // true
api.cards.battlefield.threatEvaluatorVersion;       // "1.0.0"

api.cards.battlefield.evaluateThreats(options);
api.cards.battlefield.evaluateToken(candidateToken, sourceToken, options);
api.cards.battlefield.collectMeleeAttacks(actor);
api.cards.battlefield.measureDistance(sourceToken, targetToken, scene);
api.cards.battlefield.resolvePerception(sourceActor, sourceToken, observerActor, observerToken, input);
api.cards.battlefield.testLineOfSight(observerToken, sourceToken, options);
```

The PF2e Context Adapter version is `1.4.0`; the built-in snapshot provider version is `1.1.0`.

## Compatibility

No data migration runs. Critical Card schema remains `1`, Card Pack schema remains `1`, Effect Definition schema remains `2`, diagnostic report schema remains `1`, and public API version remains `0.9.4`. Existing packs without battlefield conditions behave exactly as before.
