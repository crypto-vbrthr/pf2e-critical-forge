const CONDITION_PACK = "pf2e.conditionitems";

/**
 * PF2e conditions whose badge represents a numeric condition value.
 *
 * The compendium metadata is the primary source of truth. This set keeps the
 * Builder and Validation APIs useful before Foundry has finished loading packs,
 * and provides a compatibility fallback for older PF2e versions whose index did
 * not expose system.value.isValued.
 */
const FALLBACK_VALUED_CONDITIONS = new Set([
  "clumsy",
  "cursebound",
  "doomed",
  "drained",
  "dying",
  "enfeebled",
  "frightened",
  "sickened",
  "slowed",
  "stunned",
  "stupefied",
  "wounded"
]);

const definitions = new Map();
let initialization = null;

function normalizeSlug(slug) {
  return String(slug ?? "").trim();
}

function fallbackDefinition(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;

  return Object.freeze({
    slug: normalized,
    uuid: null,
    isValued: FALLBACK_VALUED_CONDITIONS.has(normalized),
    source: "fallback"
  });
}

function readIndexedBoolean(entry, path) {
  const value = foundry.utils.getProperty(entry, path);
  return typeof value === "boolean" ? value : null;
}

/** Load PF2e condition metadata once the compendium collection is available. */
export async function initializeConditionCatalog({ force = false } = {}) {
  if (initialization && !force) return initialization;

  initialization = (async () => {
    if (force) definitions.clear();

    const pack = game.packs.get(CONDITION_PACK);
    if (!pack) {
      console.warn(
        `pf2e-critical-forge | PF2e condition compendium "${CONDITION_PACK}" is unavailable; using fallback metadata.`
      );
      return listConditionDefinitions();
    }

    const index = await pack.getIndex({
      fields: ["system.slug", "system.value.isValued"]
    });

    for (const entry of index) {
      const slug = normalizeSlug(entry.system?.slug);
      if (!slug) continue;

      let isValued = readIndexedBoolean(entry, "system.value.isValued");

      // Some older PF2e releases did not expose this nested field in the index.
      // Loading only the affected document keeps the catalog accurate without
      // eagerly hydrating the complete compendium on current releases.
      if (isValued === null) {
        try {
          const document = await pack.getDocument(entry._id);
          const documentValue = document?.system?.value?.isValued;
          isValued = typeof documentValue === "boolean"
            ? documentValue
            : FALLBACK_VALUED_CONDITIONS.has(slug);
        } catch (error) {
          console.warn(
            `pf2e-critical-forge | Could not inspect condition metadata for "${slug}".`,
            error
          );
          isValued = FALLBACK_VALUED_CONDITIONS.has(slug);
        }
      }

      const uuid = entry.uuid ?? pack.getUuid(entry._id);
      definitions.set(slug, Object.freeze({
        slug,
        uuid,
        isValued,
        source: "compendium"
      }));
    }

    return listConditionDefinitions();
  })();

  try {
    return await initialization;
  } catch (error) {
    initialization = null;
    throw error;
  }
}

export function getConditionDefinition(slug) {
  const normalized = normalizeSlug(slug);
  return definitions.get(normalized) ?? fallbackDefinition(normalized);
}

export function isValuedCondition(slug) {
  return getConditionDefinition(slug)?.isValued ?? false;
}

export function listConditionDefinitions() {
  const slugs = new Set([
    ...FALLBACK_VALUED_CONDITIONS,
    ...definitions.keys()
  ]);

  return [...slugs]
    .map((slug) => getConditionDefinition(slug))
    .filter(Boolean)
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Resolve a condition and guarantee that its UUID is available for compilation. */
export async function resolveConditionDefinition(slug) {
  const normalized = normalizeSlug(slug);
  if (!normalized) throw new Error("Condition slug must not be empty.");

  await initializeConditionCatalog();
  const known = definitions.get(normalized);
  if (known?.uuid) return known;

  const pack = game.packs.get(CONDITION_PACK);
  if (!pack) {
    throw new Error(`PF2e condition compendium "${CONDITION_PACK}" is unavailable.`);
  }

  const index = await pack.getIndex({
    fields: ["system.slug", "system.value.isValued"]
  });
  const entry = index.find((item) => item.system?.slug === normalized);
  if (!entry) throw new Error(`Unknown PF2e condition slug: ${normalized}`);

  const isValued = readIndexedBoolean(entry, "system.value.isValued")
    ?? FALLBACK_VALUED_CONDITIONS.has(normalized);
  const resolved = Object.freeze({
    slug: normalized,
    uuid: entry.uuid ?? pack.getUuid(entry._id),
    isValued,
    source: "compendium"
  });
  definitions.set(normalized, resolved);
  return resolved;
}
