import { MODULE_ID, SETTINGS } from "../../constants.js";
import {
  criticalCardRegistry,
  criticalPackRegistry,
  registerCriticalPack,
  unregisterCriticalPack
} from "../critical-forge.js";
import { normalizePackDefinition } from "../schema/card-normalizer.js";
import { validatePackDefinition } from "../schema/card-validator.js";
import { deepClone } from "../utils.js";
import { ensurePackCardOwnership, isEditorManagedPack } from "./card-editor-model.js";

const STORAGE_VERSION = 1;
const registeredManagedPackIds = new Set();

export async function initializeCustomCardPacks() {
  const stored = listStoredCustomPacks();
  try {
    synchronizeManagedRegistries(stored);
  } catch (error) {
    console.error(`${MODULE_ID} | Could not initialize custom Critical Forge packs`, error);
  }
  return stored;
}

export function listStoredCustomPacks() {
  const value = game.settings?.get?.(MODULE_ID, SETTINGS.CRITICAL_CUSTOM_CARD_PACKS) ?? {};
  const packs = Array.isArray(value?.packs) ? value.packs : [];
  const normalized = [];
  for (const raw of packs) {
    try {
      const pack = normalizeManagedPack(raw);
      normalized.push(pack);
    } catch (error) {
      console.warn(`${MODULE_ID} | Ignoring invalid stored Critical Forge pack`, raw?.id, error);
    }
  }
  return normalized;
}

export async function saveCustomCardPack(rawPack, { previousId = null } = {}) {
  if (!game.user?.isGM) throw new Error("Only a GM can save Critical Forge card packs.");
  const pack = normalizeManagedPack(rawPack);
  assertNoProtectedCollision(pack.id, previousId);
  assertNoCardCollisions(pack, previousId);

  const previousPacks = listStoredCustomPacks();
  const packs = previousPacks
    .filter((entry) => entry.id !== previousId && entry.id !== pack.id);
  packs.push(pack);
  packs.sort((left, right) => left.id.localeCompare(right.id));

  await commitManagedPacks(packs, previousPacks);
  const registered = criticalPackRegistry.get(pack.id);
  if (!registered) throw new Error(`Critical card pack was not registered after saving: ${pack.id}`);
  return registered;
}

export async function deleteCustomCardPack(packId) {
  if (!game.user?.isGM) throw new Error("Only a GM can delete Critical Forge card packs.");
  const previousPacks = listStoredCustomPacks();
  const packs = previousPacks.filter((entry) => entry.id !== String(packId));
  await commitManagedPacks(packs, previousPacks);
  return true;
}

export function hydrateRegisteredPack(packId) {
  const metadata = criticalPackRegistry.get(packId);
  if (!metadata) return null;
  return {
    ...deepClone(metadata),
    cards: criticalCardRegistry.list({ packId, enabledPacksOnly: false }).map((card) => deepClone(card))
  };
}

export function listHydratedRegisteredPacks() {
  return criticalPackRegistry.list({ enabledOnly: false })
    .map((pack) => hydrateRegisteredPack(pack.id))
    .filter(Boolean);
}

export function isCustomCardPack(packOrId) {
  const pack = typeof packOrId === "string"
    ? hydrateRegisteredPack(packOrId) ?? listStoredCustomPacks().find((entry) => entry.id === packOrId)
    : packOrId;
  return isEditorManagedPack(pack);
}

function normalizeManagedPack(rawPack) {
  const owned = ensurePackCardOwnership({
    ...deepClone(rawPack),
    sourceModule: rawPack?.sourceModule || `${MODULE_ID}:world`,
    metadata: {
      ...(rawPack?.metadata ?? {}),
      managedBy: MODULE_ID,
      editorVersion: 1
    }
  });
  const pack = normalizePackDefinition(owned);
  const validation = validatePackDefinition(pack);
  if (!validation.valid) {
    const error = new Error(`Critical card pack is invalid: ${pack.id || "unknown"}`);
    error.validation = validation;
    throw error;
  }
  return pack;
}

function assertNoProtectedCollision(id, previousId) {
  const existing = hydrateRegisteredPack(id);
  if (!existing) return;
  if (id === previousId && isEditorManagedPack(existing)) return;
  if (isEditorManagedPack(existing)) {
    throw new Error(`The card pack id is already used by another editable pack: ${id}`);
  }
  throw new Error(`The card pack id is already owned by a protected pack: ${id}`);
}

function assertNoCardCollisions(pack, previousId) {
  for (const card of pack.cards ?? []) {
    const existing = criticalCardRegistry.get(card.id);
    if (!existing) continue;
    if (existing.packId === previousId || existing.packId === pack.id) continue;
    throw new Error(`The card id is already used by another pack: ${card.id}`);
  }
}

async function commitManagedPacks(packs, previousPacks) {
  synchronizeManagedRegistries(packs);
  try {
    await persist(packs);
  } catch (error) {
    try {
      synchronizeManagedRegistries(previousPacks);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "Could not persist Critical Forge card packs and could not restore the previous live registry state."
      );
    }
    throw error;
  }
}

async function persist(packs) {
  await game.settings.set(MODULE_ID, SETTINGS.CRITICAL_CUSTOM_CARD_PACKS, {
    storageVersion: STORAGE_VERSION,
    packs: packs.map((pack) => deepClone(pack))
  });
}

function synchronizeManagedRegistries(packs) {
  const previousPacks = [...registeredManagedPackIds]
    .map((id) => hydrateRegisteredPack(id))
    .filter(Boolean);
  const previousIds = new Set(registeredManagedPackIds);
  assertManagedPackSetCanRegister(packs, previousIds);

  for (const id of previousIds) unregisterCriticalPack(id);
  registeredManagedPackIds.clear();

  const registeredNextIds = [];
  try {
    for (const pack of packs) {
      registerCriticalPack(pack);
      registeredManagedPackIds.add(pack.id);
      registeredNextIds.push(pack.id);
    }
  } catch (error) {
    for (const id of registeredNextIds) unregisterCriticalPack(id);
    registeredManagedPackIds.clear();

    try {
      for (const previousPack of previousPacks) {
        registerCriticalPack(previousPack);
        registeredManagedPackIds.add(previousPack.id);
      }
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "Could not synchronize Critical Forge card packs and could not restore the previous live registry state."
      );
    }
    throw error;
  }

  return packs.map((pack) => criticalPackRegistry.get(pack.id)).filter(Boolean);
}

function assertManagedPackSetCanRegister(packs, previousManagedIds) {
  const packIds = new Set();
  const cardIds = new Set();

  for (const pack of packs) {
    if (packIds.has(pack.id)) throw new Error(`Duplicate editable card pack id: ${pack.id}`);
    packIds.add(pack.id);

    const existingPack = criticalPackRegistry.get(pack.id);
    if (existingPack && !previousManagedIds.has(pack.id)) {
      throw new Error(`The card pack id is already owned by a protected pack: ${pack.id}`);
    }

    for (const card of pack.cards ?? []) {
      if (cardIds.has(card.id)) throw new Error(`Duplicate editable card id: ${card.id}`);
      cardIds.add(card.id);

      const existingCard = criticalCardRegistry.get(card.id);
      if (existingCard && !previousManagedIds.has(existingCard.packId)) {
        throw new Error(`The card id is already used by a protected pack: ${card.id}`);
      }
    }
  }
}
