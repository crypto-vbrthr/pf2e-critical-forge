# Validation Engine

The Validation Engine analyzes Effect Definitions independently from compilation.

```js
const report = api.effects.analyze(definition, { target });
```

The report contains stable machine-readable codes:

```js
{
  valid: true,
  issues: [
    {
      severity: "info",
      code: "STACKING_FRIGHTENED_CIRCUMSTANCE",
      messageKey: "Validation.Rules.FrightenedCircumstance",
      data: { frightenedValue: 2, modifierValue: -1 },
      componentIndex: 1
    }
  ],
  errors: [],
  warnings: [],
  hints: [],
  information: []
}
```

## Validation phases

1. Schema and component validation
2. PF2e rule interaction validation
3. Optional target compatibility validation

Later phases are skipped when schema errors make the definition invalid.

## Initial rule codes

- `STACKING_FRIGHTENED_STATUS`
- `STACKING_FRIGHTENED_CIRCUMSTANCE`
- `COMPATIBILITY_TARGET_PRESENT`

The legacy `api.effects.validate()` method remains available and returns localized text arrays for compatibility.
