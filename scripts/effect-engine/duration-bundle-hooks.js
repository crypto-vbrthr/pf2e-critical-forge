import { MODULE_ID } from "../constants.js";
import { applyEffectToTargets } from "./effect-application.js";

let initialized = false;
const expansionLocks = new Set();

export function initializeDurationBundleHooks() {
  if (initialized || !globalThis.Hooks?.on) return;
  initialized = true;
  Hooks.on("createItem", expandDroppedDurationBundle);
}

async function expandDroppedDurationBundle(item, options = {}, userId = null) {
  if (options?.[MODULE_ID]?.durationBundleComplete) return;
  if (userId && globalThis.game?.user?.id && userId !== game.user.id) return;
  if (item?.parent?.documentName !== "Actor") return;

  const flags = item.flags?.[MODULE_ID];
  const segment = flags?.durationSegment;
  const definition = flags?.definition;
  if (!definition || !segment || Number(segment.segmentCount ?? 1) <= 1) return;

  const lockKey = item.uuid ?? item.id;
  if (!lockKey || expansionLocks.has(lockKey)) return;
  expansionLocks.add(lockKey);

  try {
    const siblings = item.parent.items?.filter?.((candidate) =>
      candidate.flags?.[MODULE_ID]?.durationSegment?.bundleId === segment.bundleId
    ) ?? [];
    if (siblings.length >= segment.segmentCount) return;

    const unmanagedRules = flags.unmanagedRules ?? [];
    await item.delete({ render: false });
    await applyEffectToTargets(definition, item.parent, {
      unmanagedRules,
      context: { target: item.parent },
      creationOptions: { [MODULE_ID]: { durationBundleComplete: true } }
    });
  } catch (error) {
    console.error(`${MODULE_ID} | Could not expand a dropped multi-duration effect bundle.`, error);
  } finally {
    expansionLocks.delete(lockKey);
  }
}
