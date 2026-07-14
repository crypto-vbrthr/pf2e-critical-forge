import { resolveConditionDefinition } from "./catalogs/condition-catalog.js";

export async function resolveConditionUuid(slug) {
  return (await resolveConditionDefinition(slug)).uuid;
}

export { resolveConditionDefinition };
