import { compileEffectDefinition } from "./compiler/effect-compiler.js";
import { buildPf2eEffectSource } from "./compiler/pf2e-item-builder.js";

function resolveActor(target) {
  if (!target) return null;
  if (target.documentName === "Actor") return target;
  if (target.actor?.documentName === "Actor") return target.actor;
  if (target.document?.actor?.documentName === "Actor") return target.document.actor;
  return null;
}

export async function createWorldEffectItem(definition, options = {}) {
  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const source = buildPf2eEffectSource(compiled);
  return Item.create(source, { renderSheet: options.renderSheet ?? true, parent: null });
}

export async function applyEffectToTargets(definition, targets, options = {}) {
  const compiled = await compileEffectDefinition(definition, options.context ?? {});
  const source = buildPf2eEffectSource(compiled);
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
