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
  synchronizeManagedRegistries(stored);
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

  const packs = listStoredCustomPacks()
    .filter((entry) => entry.id !== previousId && entry.id !== pack.id);
  packs.push(pack);
  packs.sort((left, right) => left.id.localeCompare(right.id));

  await persist(packs);
  synchronizeManagedRegistries(packs);
  return criticalPackRegistry.get(pack.id);
}

export async function deleteCustomCardPack(packId) {
  if (!game.user?.isGM) throw new Error("Only a GM can delete Critical Forge card packs.");
  const packs = listStoredCustomPacks().filter((entry) => entry.id !== String(packId));
  await persist(packs);
  synchronizeManagedRegistries(packs);
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

async function persist(packs) {
  await game.settings.set(MODULE_ID, SETTINGS.CRITICAL_CUSTOM_CARD_PACKS, {
    storageVersion: STORAGE_VERSION,
    packs: packs.map((pack) => deepClone(pack))
  });
}

function synchronizeManagedRegistries(packs) {
  for (const id of [...registeredManagedPackIds]) {
    unregisterCriticalPack(id);
    registeredManagedPackIds.delete(id);
  }

  for (const pack of packs) {
    try {
      registerCriticalPack(pack, { replace: true });
      registeredManagedPackIds.add(pack.id);
    } catch (error) {
      console.error(`${MODULE_ID} | Could not register custom Critical Forge pack ${pack.id}`, error);
    }
  }
}
