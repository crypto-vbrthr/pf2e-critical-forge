# Damage Type Catalog

The central damage-type catalog is shared by Effect Forge, component validation, and the public API.

```js
api.damageTypes.list();
api.damageTypes.groups("bleed");
api.damageTypes.get("fire");
api.damageTypes.has("spirit");
```

## Sources

The catalog reads registered entries from:

```js
CONFIG.PF2E.damageTypes
```

This allows PF2e-compatible system additions and module-registered damage types to appear automatically. A fallback set keeps the standard Remaster damage types available during early initialization and in the Node test environment.

## GUI groups

```text
Physical
  bleed
  bludgeoning
  piercing
  slashing

Energy
  acid
  cold
  electricity
  fire
  force
  sonic
  vitality
  void

Other
  mental
  poison
  spirit

Additional System Damage Types
  dynamically registered values
```

Visible labels are localized independently from the stable stored values.

## Validation

A `persistentDamage` component must use a damage type known to this catalog. Unknown values produce `PERSISTENT_DAMAGE_TYPE_INVALID` and block compilation.

Unlike modifier selectors, arbitrary custom damage types are not accepted unless they are registered in `CONFIG.PF2E.damageTypes`. This prevents Effect Forge from compiling a persistent-damage condition that PF2e cannot resolve correctly.
