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

```js
Hooks.once("pf2eCriticalForgeReady", (forge) => {
  const extension = forge.cards.extensions.forModule("my-extension");
  extension.registerPacks([pack]);
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

Every card contains stable identity, localization, category, filters, optional conditions, optional effects, and an optional `deckType`. Omitted deck assignments normalize to `default`.

# Multi-Deck packs

Extensions may keep the historical `cards` array or provide specialized `decks` for `attack`, `fortitude`, `reflex`, and `will`. The runtime resolves a deck per pack and falls back to `default` only within that same pack. Extensions should capability-check before relying on specialized decks:

```js
if (!forge.cards.capabilities.multiDeckPacks) {
  console.warn("This expansion requires a newer Critical Forge version.");
  return;
}

console.log(forge.cards.deckTypes);
console.log(forge.cards.decks.resolvePack(pack, "reflex"));
```

A specialized deck must contain compatible categories. Attack decks use attack/spell-attack categories; save decks use saving-throw success/failure categories.

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