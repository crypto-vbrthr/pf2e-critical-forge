import { MODULE_ID } from "../../constants.js";
import { CARD_ID_PATTERN } from "../constants.js";
import {
  criticalCardRegistry,
  criticalPackRegistry,
  registerCriticalPack,
  unregisterCriticalPack
} from "../critical-forge.js";
import { normalizePackDefinition } from "../schema/card-normalizer.js";
import { validatePackDefinition } from "../schema/card-validator.js";
import { deepClone, deepFreeze, normalizeString } from "../utils.js";

export const CRITICAL_FORGE_PACKS_CHANGED_HOOK = "pf2eCriticalForgePacksChanged";

export function createExtensionPackApi(sourceModule) {
  const owner = normalizeSourceModule(sourceModule);

  return Object.freeze({
    sourceModule: owner,
    registerPack: (pack, options = {}) => registerExtensionPack(owner, pack, options),
    registerPacks: (packs, options = {}) => registerExtensionPacks(owner, packs, options),
    unregisterPack: (packId) => unregisterExtensionPack(owner, packId),
    unregisterAll: () => unregisterExtensionPacks(owner),
    getPack: (packId) => getOwnedPack(owner, packId),
    listPacks: () => listExtensionPacks(owner)
  });
}

export function registerExtensionPack(sourceModule, rawPack, options = {}) {
  return registerExtensionPacks(sourceModule, [rawPack], options)[0] ?? null;
}

export function registerExtensionPacks(sourceModule, rawPacks, { replace = false } = {}) {
  const owner = normalizeSourceModule(sourceModule);
  if (!Array.isArray(rawPacks)) throw new TypeError("Extension card packs must be an array.");
  if (rawPacks.length === 0) return Object.freeze([]);

  const packs = rawPacks.map((pack) => prepareExtensionPack(owner, pack));
  assertBatchIsInternallyUnique(packs);

  const targetIds = new Set(packs.map((pack) => pack.id));
  const snapshots = [];
  const replacedPackIds = [];

  for (const pack of packs) {
    const existing = criticalPackRegistry.get(pack.id);
    if (!existing) continue;
    assertOwnedBy(existing, owner, pack.id);
    if (!replace) throw extensionError("EXTENSION_PACK_CONFLICT", `Critical card pack already registered: ${pack.id}`);
    snapshots.push(hydratePack(pack.id));
    replacedPackIds.push(pack.id);
  }

  assertNoForeignCardCollisions(packs, targetIds, owner, replace);

  for (const snapshot of snapshots) unregisterCriticalPack(snapshot.id);

  const registeredIds = [];
  try {
    for (const pack of packs) {
      registerCriticalPack(pack);
      registeredIds.push(pack.id);
    }
  } catch (error) {
    for (const id of registeredIds) unregisterCriticalPack(id);
    try {
      for (const snapshot of snapshots) registerCriticalPack(snapshot);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "Could not register extension card packs and could not restore the previous registry state."
      );
    }
    throw error;
  }

  const registered = packs.map((pack) => hydratePack(pack.id));
  emitPacksChanged({
    action: replacedPackIds.length > 0 ? "register-or-replace" : "register",
    sourceModule: owner,
    packIds: registered.map((pack) => pack.id),
    replacedPackIds
  });
  return deepFreeze(registered);
}

export function unregisterExtensionPack(sourceModule, packId) {
  const owner = normalizeSourceModule(sourceModule);
  const id = normalizePackId(packId);
  const existing = criticalPackRegistry.get(id);
  if (!existing) return Object.freeze({ removed: false, cardsRemoved: 0, packId: id });
  assertOwnedBy(existing, owner, id);

  const result = unregisterCriticalPack(id);
  emitPacksChanged({ action: "unregister", sourceModule: owner, packIds: [id] });
  return Object.freeze({ ...result, packId: id });
}

export function unregisterExtensionPacks(sourceModule) {
  const owner = normalizeSourceModule(sourceModule);
  const ids = listExtensionPacks(owner).map((pack) => pack.id);
  let cardsRemoved = 0;
  for (const id of ids) cardsRemoved += unregisterCriticalPack(id).cardsRemoved;

  if (ids.length > 0) {
    emitPacksChanged({ action: "unregister-all", sourceModule: owner, packIds: ids });
  }
  return Object.freeze({ packsRemoved: ids.length, cardsRemoved, packIds: Object.freeze(ids) });
}

export function listExtensionPacks(sourceModule) {
  const owner = normalizeSourceModule(sourceModule);
  return deepFreeze(
    criticalPackRegistry
      .list({ enabledOnly: false })
      .filter((pack) => pack.sourceModule === owner)
      .map((pack) => hydratePack(pack.id))
  );
}

function getOwnedPack(owner, packId) {
  const id = normalizePackId(packId);
  const pack = criticalPackRegistry.get(id);
  if (!pack || pack.sourceModule !== owner) return null;
  return deepFreeze(hydratePack(id));
}

function prepareExtensionPack(owner, rawPack) {
  if (!rawPack || typeof rawPack !== "object" || Array.isArray(rawPack)) {
    throw new TypeError("Extension card pack must be an object.");
  }

  const pack = normalizePackDefinition({
    ...deepClone(rawPack),
    sourceModule: owner,
    metadata: {
      ...(rawPack.metadata ?? {}),
      extension: true,
      extensionModule: owner,
      managedBy: owner
    }
  });
  const validation = validatePackDefinition(pack);
  if (!validation.valid) {
    const error = extensionError("EXTENSION_PACK_INVALID", `Extension card pack is invalid: ${pack.id || "unknown"}`);
    error.validation = validation;
    throw error;
  }
  return pack;
}

function assertBatchIsInternallyUnique(packs) {
  const packIds = new Set();
  const cardIds = new Set();

  for (const pack of packs) {
    if (packIds.has(pack.id)) throw extensionError("EXTENSION_PACK_DUPLICATE", `Duplicate extension card pack id: ${pack.id}`);
    packIds.add(pack.id);

    for (const card of pack.cards) {
      if (cardIds.has(card.id)) throw extensionError("EXTENSION_CARD_DUPLICATE", `Duplicate extension card id: ${card.id}`);
      cardIds.add(card.id);
    }
  }
}

function assertNoForeignCardCollisions(packs, targetIds, owner, replace) {
  for (const pack of packs) {
    for (const card of pack.cards) {
      const existingCard = criticalCardRegistry.get(card.id);
      if (!existingCard) continue;

      const existingPack = criticalPackRegistry.get(existingCard.packId);
      const replaceable = replace
        && targetIds.has(existingCard.packId)
        && existingPack?.sourceModule === owner;
      if (!replaceable) {
        throw extensionError("EXTENSION_CARD_CONFLICT", `Critical card already registered: ${card.id}`);
      }
    }
  }
}

function assertOwnedBy(pack, owner, packId) {
  if (pack.sourceModule !== owner) {
    throw extensionError(
      "EXTENSION_PACK_OWNERSHIP",
      `Critical card pack ${packId} is owned by ${pack.sourceModule || "an unknown source"}, not ${owner}.`
    );
  }
}

function hydratePack(packId) {
  const metadata = criticalPackRegistry.get(packId);
  if (!metadata) return null;
  return {
    ...deepClone(metadata),
    cards: criticalCardRegistry
      .list({ packId, enabledPacksOnly: false })
      .map((card) => deepClone(card))
  };
}

export function normalizeSourceModule(value) {
  const owner = normalizeString(value);
  if (!owner || !CARD_ID_PATTERN.test(owner)) {
    throw new TypeError(`Invalid extension module id: ${value ?? ""}`);
  }
  if (owner === MODULE_ID) {
    throw new Error(`The module id ${MODULE_ID} is reserved for the Critical Forge core.`);
  }
  return owner;
}

function normalizePackId(value) {
  const id = normalizeString(value);
  if (!id || !CARD_ID_PATTERN.test(id)) throw new TypeError(`Invalid critical card pack id: ${value ?? ""}`);
  return id;
}

function emitPacksChanged(data) {
  const payload = deepFreeze({
    action: data.action,
    sourceModule: data.sourceModule,
    packIds: [...(data.packIds ?? [])],
    replacedPackIds: [...(data.replacedPackIds ?? [])]
  });
  globalThis.Hooks?.callAll?.(CRITICAL_FORGE_PACKS_CHANGED_HOOK, payload);
}

function extensionError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
