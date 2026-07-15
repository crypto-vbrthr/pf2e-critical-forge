import { compileEffectDefinition } from "./compiler/effect-compiler.js";
import { buildPf2eEffectSource } from "./compiler/pf2e-item-builder.js";
import { MODULE_ID } from "../constants.js";

function resolveActor(target) {
  if (!target) return null;
  if (target.documentName === "Actor") return target;
  if (target.actor?.documentName === "Actor") return target.actor;
  if (target.document?.actor?.documentName === "Actor") return target.document.actor;
  return null;
}

function appendUnmanagedRules(source, unmanagedRules = []) {
  const preserved = Array.isArray(unmanagedRules)
    ? foundry.utils.deepClone(unmanagedRules)
    : [];

  if (preserved.length > 0) {
    source.system.rules.push(...preserved);
    source.flags[MODULE_ID].unmanagedRules = foundry.utils.deepClone(preserved);
  } else {
    delete source.flags[MODULE_ID].unmanagedRules;
  }

  return source;
}

export async function updateEffectItem(item, definition, options = {}) {
  if (!item || item.type !== "effect" || typeof item.update !== "function") {
    throw new TypeError("A writable PF2e effect Item is required.");
  }

  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const source = appendUnmanagedRules(
    buildPf2eEffectSource(compiled),
    options.unmanagedRules
  );

  const changes = {
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

  return item.update(changes, { render: options.render ?? true });
}

export async function createWorldEffectItem(definition, options = {}) {
  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const source = appendUnmanagedRules(
    buildPf2eEffectSource(compiled),
    options.unmanagedRules
  );
  return Item.create(source, { renderSheet: options.renderSheet ?? true, parent: null });
}

export async function applyEffectToTargets(definition, targets, options = {}) {
  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const source = appendUnmanagedRules(
    buildPf2eEffectSource(compiled),
    options.unmanagedRules
  );
  const list = Array.isArray(targets) ? targets : [targets];
  const actors = [...new Set(list.map(resolveActor).filter(Boolean))];

  if (actors.length === 0) throw new Error("No valid Actor targets were supplied.");

  const results = [];
  for (const actor of actors) {
    const created = await actor.createEmbeddedDocuments(
      "Item",
      [foundry.utils.deepClone(source)],
      { renderSheet: false }
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
      .filter((item) => item.flags?.["pf2e-critical-forge"]?.definitionId === definitionId)
      .map((item) => item.id);

    if (ids.length > 0) {
      removed.push(...await actor.deleteEmbeddedDocuments("Item", ids));
    }
  }

  return removed;
}
