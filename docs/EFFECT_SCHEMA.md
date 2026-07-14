# Effect Definition Schema

Current schema version: `1`.

```js
{
  schemaVersion: 1,
  id: "example.shaken-nerves",
  name: "Erschütterte Nerven",
  description: "<p>Das Ziel ist erschüttert und mental verwundbar.</p>",
  img: "icons/svg/terror.svg",

  duration: {
    value: 2,
    unit: "rounds",
    expiry: "turn-end"
  },

  components: [
    {
      type: "condition",
      slug: "frightened",
      value: 2
    },
    {
      type: "modifier",
      selector: "will",
      value: -1,
      modifierType: "circumstance",
      predicate: []
    }
  ],

  application: {
    targetType: "actor",
    stacking: "replace",
    incompatibilityMode: "warn"
  },

  metadata: {
    originModule: "example-module",
    originFeature: "critical-hit",
    tags: ["mental", "critical"]
  }
}
```

## Required fields

- `schemaVersion`: must equal the API's `schemaVersion`.
- `name`: non-empty string.
- `components`: non-empty array containing registered component types.

`id`, `description`, `img`, `duration`, `application`, and `metadata` are optional at the raw schema level, although the Builder supplies normalized defaults.

## Identity

`id` should be stable when effects need to be updated, replaced, or removed later.

Recommended form:

```text
module-id.feature.effect-name
```

Example:

```text
weather-forge.extreme-heat.exhaustion
```

## Duration

The global duration is inherited by all components.

Supported units:

- `rounds`
- `minutes`
- `hours`
- `days`
- `unlimited`

Finite duration:

```js
{
  value: 2,
  unit: "rounds",
  expiry: "turn-end"
}
```

Unlimited duration:

```js
{
  value: -1,
  unit: "unlimited",
  expiry: null
}
```

Component-specific duration overrides are reserved for a later schema revision and must not be assumed by integrations yet.

## Condition component

```js
{
  type: "condition",
  slug: "frightened",
  value: 2
}
```

`slug` is required.

`value` is optional because PF2e distinguishes:

- **valued conditions**, such as `frightened`;
- **non-valued conditions**, such as `prone`.

For non-valued conditions, omit `value`:

```js
{
  type: "condition",
  slug: "prone"
}
```

Legacy definitions containing a value on a non-valued condition remain valid, but validation emits `CONDITION_VALUE_IGNORED` and the compiler omits the `badge-value` alteration.

## Modifier component

```js
{
  type: "modifier",
  selector: "will",
  value: -1,
  modifierType: "circumstance",
  predicate: []
}
```

Fields:

- `selector`: one selector string or an array of selector strings;
- `value`: finite number;
- `modifierType`: `status`, `circumstance`, `item`, or `untyped`;
- `predicate`: optional PF2e predicate array;
- `label`: optional custom Rule Element label.

Multiple selectors:

```js
{
  type: "modifier",
  selector: ["will", "perception"],
  value: 1,
  modifierType: "status"
}
```

Unknown but syntactically valid selectors are allowed and reported as custom selectors. See [`SELECTORS.md`](SELECTORS.md).

## Persistent damage component

```js
{
  type: "persistentDamage",
  formula: "1d6",
  damageType: "bleed",
  dc: 17
}
```

Fields:

- `formula`: required non-empty PF2e damage formula string;
- `damageType`: required value registered in the damage-type catalog;
- `dc`: optional positive integer overriding the normal persistent-damage recovery DC.

Omit `dc` to retain PF2e's regular recovery DC:

```js
{
  type: "persistentDamage",
  formula: "2d4",
  damageType: "acid"
}
```

The compiler grants PF2e's `persistent-damage` condition and applies the `persistent-damage` Item Alteration. When `dc` is supplied, it additionally applies `pd-recovery-dc`.

Persistent damage can be removed by PF2e's normal recovery process without deleting the parent Effect Item. Removing or expiring the parent effect still removes granted persistent damage. The global duration therefore acts as the maximum lifetime of the component, not as a prohibition on early recovery.

Multiple persistent-damage components may coexist when their damage types differ. Repeated components of the same damage type produce `PERSISTENT_DAMAGE_DUPLICATE_TYPE`, because equal damage types normally do not stack. See [`DAMAGE_TYPES.md`](DAMAGE_TYPES.md).


## Resistance component

```js
{
  type: "resistance",
  resistanceType: "fire",
  value: 5
}
```

Fields:

- `resistanceType`: required resistance type registered in the resistance-type catalog;
- `value`: required positive integer.

The compiler creates the native PF2e rule element:

```js
{
  key: "Resistance",
  type: "fire",
  value: 5
}
```

The catalog includes ordinary damage types and broader PF2e resistance categories such as `physical`, `energy`, and `all-damage`. Repeated components with the same `resistanceType` are valid but produce a stacking warning because same-type resistances normally do not add together.

## Application data

`application` is reserved for policies such as target type, replacement, stacking, and incompatibility behavior. The current compiler preserves the object but does not enforce every proposed policy yet.

## Metadata

`metadata` is preserved through compilation and copied into module flags. Useful keys include:

```js
{
  originModule: "example-module",
  originFeature: "critical-hit",
  tags: ["mental"]
}
```

Unknown metadata keys are permitted so integrations can attach their own non-mechanical context.

## Weakness component

```js
{
  type: "weakness",
  weaknessType: "fire",
  value: 5
}
```

`weaknessType` must be a value from the weakness-type catalog. `value` must be a positive integer. The compiler emits a native PF2e `Weakness` Rule Element.


## Immunity component

```js
{
  type: "immunity",
  immunityType: "fire"
}
```

`immunityType` must be a value from the immunity-type catalog. Immunity intentionally has no numeric value. The compiler emits a native PF2e `Immunity` Rule Element:

```js
{
  key: "Immunity",
  type: "fire"
}
```

The same component supports condition immunities, such as `frightened`, when the type is present in `CONFIG.PF2E.immunityTypes`.


## Fast-healing component

```js
{
  type: "fastHealing",
  value: 4
}
```

`value` is the number of Hit Points regained at the beginning of the target's turn and must be a positive integer. The compiler emits the native PF2e Rule Element:

```js
{
  key: "FastHealing",
  value: 4
}
```

The component inherits the Effect Definition's global duration. Multiple fast-healing components remain valid but produce `FAST_HEALING_MULTIPLE_SOURCES` so the author can verify the intended interaction.


## Regeneration component

```js
{
  type: "regeneration",
  value: 5,
  deactivatedBy: ["acid", "fire"]
}
```

`value` must be a positive integer. `deactivatedBy` must be a non-empty array of known PF2e damage-type slugs. The compiler emits:

```js
{
  key: "FastHealing",
  value: 5,
  type: "regeneration",
  deactivatedBy: ["acid", "fire"]
}
```


## Temporary Hit Points component

```js
{
  type: "temporaryHitPoints",
  value: 5
}
```

The value must be a positive integer. The compiler emits:

```js
{
  key: "TempHP",
  value: 5
}
```


## Movement component

```js
{
  type: "movement",
  movementType: "land",
  value: 10,
  modifierType: "status"
}
```

`movementType` is one of `all`, `land`, `burrow`, `climb`, `fly`, or `swim`. `value` must be a non-zero integer and is measured in feet. `modifierType` is `status`, `circumstance`, `item`, or `untyped`. The component modifies an existing Speed and does not grant a missing movement mode.
