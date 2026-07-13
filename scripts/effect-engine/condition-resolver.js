const CONDITION_PACK = "pf2e.conditionitems";
const cache = new Map();

export async function resolveConditionUuid(slug) {
  if (cache.has(slug)) return cache.get(slug);

  const pack = game.packs.get(CONDITION_PACK);
  if (!pack) {
    throw new Error(`PF2e condition compendium "${CONDITION_PACK}" is unavailable.`);
  }

  const index = await pack.getIndex({ fields: ["system.slug"] });
  const entry = index.find((item) => item.system?.slug === slug);

  if (!entry) {
    throw new Error(`Unknown PF2e condition slug: ${slug}`);
  }

  const uuid = entry.uuid ?? pack.getUuid(entry._id);
  cache.set(slug, uuid);
  return uuid;
}
