import { MODULE_ID } from "../constants.js";
import { CORE_CRITICAL_CARD_PACK } from "./core/core-pack.js";
import { CardRegistry } from "./registry/card-registry.js";
import { PackRegistry } from "./registry/pack-registry.js";
import { CardSelector } from "./selection/card-selector.js";
import { normalizeCardDefinition, normalizePackDefinition } from "./schema/card-normalizer.js";
import { validateCardDefinition, validatePackDefinition } from "./schema/card-validator.js";
import { criticalContextProviderRegistry } from "./context/context-provider-registry.js";
import { createPf2eContextProvider } from "./adapters/pf2e/pf2e-context-provider.js";

export const criticalPackRegistry = new PackRegistry();
export const criticalCardRegistry = new CardRegistry({ packRegistry: criticalPackRegistry });
export const criticalCardSelector = new CardSelector({ cardRegistry: criticalCardRegistry });

let initialized = false;

export function initializeCriticalForge() {
  if (initialized) return;
  registerCriticalPack(CORE_CRITICAL_CARD_PACK);
  if (!criticalContextProviderRegistry.get("pf2e", "core-pf2e")) {
    criticalContextProviderRegistry.register(createPf2eContextProvider());
  }
  initialized = true;
  console.info(`${MODULE_ID} | Critical Forge architecture initialized`, {
    packs: criticalPackRegistry.list().length,
    cards: criticalCardRegistry.list().length,
    contextProviders: criticalContextProviderRegistry.list().length
  });
}

export function registerCriticalPack(rawPack, { replace = false } = {}) {
  const pack = normalizePackDefinition(rawPack);
  const validation = validatePackDefinition(pack);
  if (!validation.valid) throw createValidationError("Critical card pack is invalid.", validation);

  const previousPack = criticalPackRegistry.get(pack.id);
  const previousCards = previousPack
    ? criticalCardRegistry.list({ packId: pack.id, enabledPacksOnly: false })
    : [];
  if (previousPack && !replace) throw new Error(`Critical card pack already registered: ${pack.id}`);

  if (previousPack) {
    criticalCardRegistry.unregisterPack(pack.id);
    criticalPackRegistry.unregister(pack.id);
  }

  try {
    criticalPackRegistry.register(pack);
    for (const card of pack.cards) criticalCardRegistry.register(card);
    return criticalPackRegistry.get(pack.id);
  } catch (error) {
    criticalCardRegistry.unregisterPack(pack.id);
    criticalPackRegistry.unregister(pack.id);
    if (previousPack) {
      criticalPackRegistry.register(previousPack);
      for (const card of previousCards) criticalCardRegistry.register(card);
    }
    throw error;
  }
}

export function unregisterCriticalPack(packId) {
  const count = criticalCardRegistry.unregisterPack(packId);
  const removed = criticalPackRegistry.unregister(packId);
  return Object.freeze({ removed, cardsRemoved: count });
}

export function registerCriticalCard(rawCard, options = {}) {
  const card = normalizeCardDefinition(rawCard);
  const validation = validateCardDefinition(card);
  if (!validation.valid) throw createValidationError("Critical card is invalid.", validation);
  return criticalCardRegistry.register(card, options);
}

function createValidationError(message, validation) {
  const error = new Error(message);
  error.validation = validation;
  return error;
}
