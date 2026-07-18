# Critical Forge Extension API

## Introduction

Critical Forge supports external extensions that register additional card packs.

Extensions may provide:

- new card packs
- localized content
- new effects
- helper utilities

Extensions should not modify the internal behavior of Critical Forge.

---

# Registration

Extensions register card packs during module initialization.

Example:

```javascript
CriticalForge.api.registerCardPack({
    ...
});
```

---

# Card Pack

A card pack consists of:

- metadata
- localization
- cards

Each pack requires a unique id.

---

# Cards

Every card contains:

- id
- title
- description
- trigger
- filters
- effects

---

# Triggers

Supported trigger types include:

- attack
- spell attack
- saving throw

Additional trigger types may be added in future versions.

---

# Filters

Current filters include:

- attackTraits
- excludedAttackTraits
- damageTypes
- weaponGroups
- saveTypes
- spellTraits
- spellTraditions
- sourceTraits
- excludedSourceTraits
- targetTraits
- excludedTargetTraits

---

# Effects

Effects are built from reusable components.

Each component may define its own duration.

Components should remain independent whenever possible.

---

# Localization

All player-facing text should be localized.

Avoid hardcoded English strings.

---

# Validation

Critical Forge validates:

- pack structure
- card structure
- effect schema

Extensions should pass validation without warnings.

---

# Compatibility

Extensions should:

- declare their required Critical Forge version
- avoid using undocumented APIs
- remain forward compatible whenever possible

---

# Best Practices

- Keep packs focused.
- Avoid duplicate mechanics.
- Prefer reusable effect components.
- Write clear descriptions.
- Test every trigger.
- Validate every release.