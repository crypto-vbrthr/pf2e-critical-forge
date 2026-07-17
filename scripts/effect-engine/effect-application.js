import { compileEffectDefinition } from "./compiler/effect-compiler.js";
import { buildPf2eEffectSources } from "./compiler/pf2e-item-builder.js";
import { MODULE_ID } from "../constants.js";

function resolveActor(target) {
  if (!target) return null;
  if (target.documentName === "Actor") return target;
  if (target.actor?.documentName === "Actor") return target.actor;
  if (target.document?.actor?.documentName === "Actor") return target.document.actor;
  return null;
}

function randomBundleId(definitionId = "effect") {
  const suffix = globalThis.foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2);
  return `${definitionId || "effect"}.${suffix}`;
}

function appendUnmanagedRules(sources, unmanagedRules = []) {
  const preserved = Array.isArray(unmanagedRules)
    ? foundry.utils.deepClone(unmanagedRules)
    : [];
  const list = Array.isArray(sources) ? sources : [sources];
  const primary = list[0];
  if (!primary) return list;

  if (preserved.length > 0) {
    primary.system.rules.push(...preserved);
    primary.flags[MODULE_ID].unmanagedRules = foundry.utils.deepClone(preserved);
  } else {
    delete primary.flags[MODULE_ID].unmanagedRules;
  }

  return list;
}

function itemChanges(source) {
  return {
    name: source.name,
    img: source.img,
    system: {
      description: foundry.utils.deepClone(source.system.description),
      rules: foundry.utils.deepClone(source.system.rules),
      duration: foundry.utils.deepClone(source.system.duration)
    },
    flags: {
      [MODULE_ID]: foundry.utils.deepClone(source.flags[MODULE_ID])
    }
  };
}

function collectionItems(item) {
  const parentItems = item?.parent?.items;
  if (parentItems) {
    if (typeof parentItems.filter === "function") return [...parentItems.filter(() => true)];
    return [...parentItems];
  }

  const worldItems = globalThis.game?.items;
  if (!worldItems) return [];
  if (typeof worldItems.filter === "function") return [...worldItems.filter(() => true)];
  return [...worldItems];
}

function durationSiblings(item, bundleId) {
  if (!bundleId) return [];
  return collectionItems(item).filter((candidate) =>
    candidate?.id !== item?.id
    && candidate?.flags?.[MODULE_ID]?.durationSegment?.bundleId === bundleId
  );
}

async function deleteDocuments(documents) {
  for (const document of documents) {
    if (typeof document?.delete === "function") {
      await document.delete({ render: false });
    }
  }
}

async function createAdditionalDocuments(item, sources) {
  if (sources.length === 0) return [];
  const parent = item?.parent;
  if (parent?.documentName === "Actor" && typeof parent.createEmbeddedDocuments === "function") {
    return parent.createEmbeddedDocuments("Item", foundry.utils.deepClone(sources), {
      renderSheet: false,
      [MODULE_ID]: { durationBundleComplete: true }
    });
  }

  const created = [];
  for (const source of sources) {
    created.push(await Item.create(foundry.utils.deepClone(source), {
      renderSheet: false,
      parent: null,
      [MODULE_ID]: { durationBundleComplete: true }
    }));
  }
  return created;
}

export async function updateEffectItem(item, definition, options = {}) {
  if (!item || item.type !== "effect" || typeof item.update !== "function") {
    throw new TypeError("A writable PF2e effect Item is required.");
  }

  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const previousBundleId = item.flags?.[MODULE_ID]?.durationSegment?.bundleId ?? null;
  const bundleId = previousBundleId ?? options.bundleId ?? randomBundleId(compiled.id);
  const sources = appendUnmanagedRules(
    buildPf2eEffectSources(compiled, { bundleId }),
    options.unmanagedRules
  );

  const siblings = durationSiblings(item, previousBundleId);
  const updated = await item.update(itemChanges(sources[0]), { render: options.render ?? true });
  await deleteDocuments(siblings);
  await createAdditionalDocuments(updated ?? item, sources.slice(1));
  return updated ?? item;
}

export async function createWorldEffectItems(definition, options = {}) {
  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const bundleId = options.bundleId ?? randomBundleId(compiled.id);
  const sources = appendUnmanagedRules(
    buildPf2eEffectSources(compiled, { bundleId }),
    options.unmanagedRules
  );

  const created = [];
  for (const [index, source] of sources.entries()) {
    created.push(await Item.create(foundry.utils.deepClone(source), {
      renderSheet: index === 0 ? (options.renderSheet ?? true) : false,
      parent: null,
      [MODULE_ID]: { durationBundleComplete: true }
    }));
  }
  return created;
}

export async function createWorldEffectItem(definition, options = {}) {
  const created = await createWorldEffectItems(definition, options);
  return created[0] ?? null;
}

export async function applyEffectToTargets(definition, targets, options = {}) {
  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const list = Array.isArray(targets) ? targets : [targets];
  const actors = [...new Set(list.map(resolveActor).filter(Boolean))];

  if (actors.length === 0) throw new Error("No valid Actor targets were supplied.");

  const results = [];
  for (const actor of actors) {
    const bundleId = options.bundleIdFactory?.(actor, compiled)
      ?? randomBundleId(compiled.id);
    const sources = appendUnmanagedRules(
      buildPf2eEffectSources(compiled, { bundleId }),
      options.unmanagedRules
    );
    const created = await actor.createEmbeddedDocuments(
      "Item",
      foundry.utils.deepClone(sources),
      {
        renderSheet: false,
        ...(options.creationOptions ?? {}),
        [MODULE_ID]: { durationBundleComplete: true }
      }
    );
    results.push(...created);
  }

  return results;
}

export async function removeEffectsByDefinitionId(definitionId, targets) {
  const list = Array.isArray(targets) ? targets : [targets];
  const actors = [...new Set(list.map(resolveActor).filter(Boolean))];
  const removed = [];

  for (const actor of actors) {
    const ids = actor.items
      .filter((item) => item.flags?.[MODULE_ID]?.definitionId === definitionId)
      .map((item) => item.id);

    if (ids.length > 0) {
      removed.push(...await actor.deleteEmbeddedDocuments("Item", ids));
    }
  }

  return removed;
}
