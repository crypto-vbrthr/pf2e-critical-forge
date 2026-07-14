# Resistance Types

The resistance component uses a dedicated catalog because PF2e resistances can target more than ordinary damage types. In addition to `fire` or `slashing`, the system supports categories and sources such as `physical`, `all-damage`, `persistent-damage`, and `weapons`.

## Sources

The catalog reads runtime entries from:

```js
CONFIG.PF2E.resistanceTypes
```

It supplements incomplete configuration with:

- every entry from the damage-type catalog;
- broad damage categories;
- common damage-source categories.

This keeps tests and compatible PF2e releases functional while still allowing system and module additions to appear automatically.

## GUI groups

The Effect Forge presents resistance types in four groups:

1. **Damage Types**: fire, cold, bleed, slashing, spirit, and other registered damage types.
2. **Damage Categories**: all damage, physical, energy, precision, persistent damage, area damage, and critical hits.
3. **Damage Sources and Properties**: alchemical, magical, non-magical, weapons, unarmed attacks, and spell damage.
4. **Additional PF2e Resistance Types**: materials, traditions, homebrew entries, and other system-provided values.

## API

```js
const types = api.resistanceTypes;

types.list();
types.groups("fire");
types.get("physical");
types.has("all-damage");
```

## Component

```js
{
  type: "resistance",
  resistanceType: "fire",
  value: 5
}
```

`value` must be a positive integer. The compiler emits a native PF2e `Resistance` Rule Element.

## Validation

- `RESISTANCE_TYPE_INVALID` blocks unknown resistance types.
- `RESISTANCE_VALUE_INVALID` blocks zero, negative, fractional, or non-numeric values.
- `RESISTANCE_DUPLICATE_TYPE` warns when more than one component grants the same resistance type.
