export function collectRuleElements(compiledComponents) {
  if (!Array.isArray(compiledComponents)) return [];
  return compiledComponents.flatMap((component) => {
    if (!component || !Array.isArray(component.rules)) return [];
    return foundry.utils.deepClone(component.rules);
  });
}
