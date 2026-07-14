# Validation Engine

The Validation Engine analyzes Effect Definitions independently from compilation and never mutates the supplied definition.

```js
const report = api.effects.analyze(definition, { target });
```

## Report shape

```js
{
  valid: true,
  issues: [
    {
      severity: "info",
      code: "STACKING_FRIGHTENED_CIRCUMSTANCE",
      messageKey: "Validation.Rules.FrightenedCircumstance",
      message: null,
      data: {
        frightenedValue: 2,
        modifierValue: -1
      },
      componentIndex: 1
    }
  ],
  errors: [],
  warnings: [],
  hints: [],
  information: []
}
```

`valid` is false only when at least one `error` exists. Warnings and informational entries do not block compilation.

## Severity meanings

| Severity | Meaning |
|---|---|
| `error` | The definition cannot be compiled safely. |
| `warning` | The definition can compile, but behavior may be ineffective or surprising. |
| `hint` | Optional improvement advice. |
| `info` | Neutral diagnostic information. |

Use the stable `code` for automation:

```js
const report = api.effects.analyze(definition);

if (report.issues.some((issue) => issue.code === "STACKING_FRIGHTENED_STATUS")) {
  // Offer a circumstance penalty instead.
}
```

Do not parse localized messages.

## Validation phases

1. **Schema validation**
2. **Component validation**
3. **PF2e rule interaction validation**
4. **Optional target compatibility validation**

When schema or component validation produces an error, later rule and compatibility phases are skipped. This prevents misleading secondary diagnostics from malformed data.

## Current issue codes

### Schema and component codes

| Code | Severity | Meaning |
|---|---|---|
| `SCHEMA_DEFINITION_OBJECT` | error | Root value is not an object. |
| `SCHEMA_VERSION_UNSUPPORTED` | error | Schema version does not match the engine. |
| `SCHEMA_NAME_REQUIRED` | error | Effect name is empty. |
| `SCHEMA_DURATION_OBJECT` | error | Duration is not an object. |
| `SCHEMA_DURATION_UNIT` | error | Duration unit is unsupported. |
| `SCHEMA_DURATION_VALUE` | error | Finite duration value is invalid. |
| `SCHEMA_COMPONENTS_REQUIRED` | error | No components are present. |
| `SCHEMA_COMPONENT_OBJECT` | error | Component entry is not an object. |
| `SCHEMA_COMPONENT_UNKNOWN` | error | No handler is registered for the component type. |
| `COMPONENT_INVALID` | error | A component handler rejected its data. |
| `COMPONENT_WARNING` | warning | A component handler reported a non-blocking issue. |
| `PERSISTENT_DAMAGE_FORMULA_MISSING` | error | Persistent damage has no formula. |
| `PERSISTENT_DAMAGE_TYPE_INVALID` | error | Damage type is absent from the central catalog. |
| `PERSISTENT_DAMAGE_DC_INVALID` | error | Recovery DC is present but not a positive integer. |
| `RESISTANCE_TYPE_INVALID` | error | Resistance type is absent from the resistance-type catalog. |
| `RESISTANCE_VALUE_INVALID` | error | Resistance value is not a positive integer. |
| `WEAKNESS_TYPE_INVALID` | error | Weakness type is absent from the weakness-type catalog. |
| `WEAKNESS_VALUE_INVALID` | error | Weakness value is not a positive integer. |
| `IMMUNITY_TYPE_INVALID` | error | Immunity type is absent from the immunity-type catalog. |
| `FAST_HEALING_VALUE_INVALID` | error | Fast-healing value is not a positive integer. |
| `MOVEMENT_TYPE_INVALID` | error | Movement type is absent from the movement-type catalog. |
| `MOVEMENT_VALUE_INVALID` | error | Movement value is zero or not an integer. |
| `MOVEMENT_MODIFIER_TYPE_INVALID` | error | Movement modifier type is unsupported. |
| `MOVEMENT_VALUE_UNUSUAL_INCREMENT` | warning | Movement value does not use a 5-foot increment. |
| `BASE_SPEED_TYPE_INVALID` | error | The movement mode cannot be granted by `BaseSpeed`. |
| `BASE_SPEED_VALUE_INVALID` | error | Base Speed is not a positive integer. |
| `BASE_SPEED_VALUE_UNUSUAL_INCREMENT` | warning | Base Speed does not use a 5-foot increment. |

### Rule codes

| Code | Severity | Meaning |
|---|---|---|
| `CONDITION_VALUE_IGNORED` | warning | A non-valued condition contains a legacy value. |
| `MODIFIER_SELECTOR_FORMAT` | error | Selector is not lowercase kebab case. |
| `MODIFIER_SELECTOR_CUSTOM` | info | Selector is syntactically valid but absent from the catalog. |
| `STACKING_FRIGHTENED_STATUS` | warning | A status penalty overlaps with frightened's status penalty. |
| `STACKING_FRIGHTENED_CIRCUMSTANCE` | info | A circumstance penalty can stack with frightened. |
| `PERSISTENT_DAMAGE_DUPLICATE_TYPE` | warning | Multiple components use the same persistent-damage type. |
| `RESISTANCE_DUPLICATE_TYPE` | warning | Multiple components grant the same resistance type. |
| `WEAKNESS_DUPLICATE_TYPE` | warning | Multiple components grant the same weakness type. |
| `IMMUNITY_DUPLICATE_TYPE` | warning | Multiple components grant the same immunity type. |
| `FAST_HEALING_MULTIPLE_SOURCES` | warning | Multiple fast-healing components require an interaction check. |
| `MOVEMENT_MODIFIER_OVERLAP` | warning | Overlapping Speed modifiers use the same modifier type and may not stack. |
| `BASE_SPEED_DUPLICATE_TYPE` | warning | Multiple components grant the same movement mode. |

### Compatibility codes

| Code | Severity | Meaning |
|---|---|---|
| `COMPATIBILITY_TARGET_PRESENT` | info | A target was supplied to the compatibility phase. |

Target immunity, resistance, trait, and creature-state checks are planned extensions. Their codes will remain machine-readable and localized through the same report structure.

## Localized compatibility wrapper

`api.effects.validate(definition)` returns the same structured information plus localized string arrays:

```js
{
  valid: false,
  issues: [...],
  errors: ["Localized error"],
  warnings: ["Localized warning"],
  hints: [],
  information: []
}
```

Use `analyze()` for module logic and `validate()` when directly presenting text to a user.


### Regeneration

- `REGENERATION_VALUE_INVALID`
- `REGENERATION_DEACTIVATION_REQUIRED`
- `REGENERATION_DEACTIVATION_TYPE_INVALID`
- `REGENERATION_DEACTIVATION_DUPLICATE`
- `REGENERATION_MULTIPLE_SOURCES`


### Temporary Hit Points

| Code | Severity | Meaning |
|---|---|---|
| `TEMPORARY_HIT_POINTS_VALUE_INVALID` | error | The value is not a positive integer. |
| `TEMPORARY_HIT_POINTS_MULTIPLE_SOURCES` | warning | More than one component grants temporary Hit Points, which normally do not stack. |


### Movement

| Code | Severity | Meaning |
|---|---|---|
| `MOVEMENT_TYPE_INVALID` | error | The movement type is unknown. |
| `MOVEMENT_VALUE_INVALID` | error | The value is zero or not an integer. |
| `MOVEMENT_MODIFIER_TYPE_INVALID` | error | The modifier type is unsupported. |
| `MOVEMENT_VALUE_UNUSUAL_INCREMENT` | warning | The value is not divisible by 5. |
| `MOVEMENT_MODIFIER_OVERLAP` | warning | Two overlapping components use the same modifier type. |


### Base Speed

| Code | Severity | Meaning |
|---|---|---|
| `BASE_SPEED_TYPE_INVALID` | error | The selected movement mode is not grantable. |
| `BASE_SPEED_VALUE_INVALID` | error | The value is not a positive integer. |
| `BASE_SPEED_VALUE_UNUSUAL_INCREMENT` | warning | The value is not divisible by 5. |
| `BASE_SPEED_DUPLICATE_TYPE` | warning | More than one component grants the same movement mode. |
