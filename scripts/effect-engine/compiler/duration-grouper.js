import {
  durationKey,
  normalizeDuration
} from "../builder/duration-builder.js";

function clone(value) {
  return foundry.utils.deepClone(value);
}

export function resolveComponentDuration(component, globalDuration) {
  const hasOverride = Object.hasOwn(component ?? {}, "duration") && component.duration != null;
  return {
    duration: clone(normalizeDuration(hasOverride ? component.duration : globalDuration)),
    source: hasOverride ? "component" : "global"
  };
}

export function groupCompiledComponents(components, globalDuration) {
  const groupsByKey = new Map();
  const globalKey = durationKey(globalDuration);

  for (const component of components) {
    const key = durationKey(component.duration);
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        key,
        duration: clone(component.duration),
        components: [],
        componentIndexes: [],
        usesGlobalDuration: key === globalKey
      };
      groupsByKey.set(key, group);
    }
    group.components.push(component);
    group.componentIndexes.push(component.componentIndex);
    if (component.durationSource === "global") group.usesGlobalDuration = true;
  }

  const groups = [...groupsByKey.values()];
  groups.sort((left, right) => {
    if (left.usesGlobalDuration !== right.usesGlobalDuration) {
      return left.usesGlobalDuration ? -1 : 1;
    }
    return Math.min(...left.componentIndexes) - Math.min(...right.componentIndexes);
  });

  return groups.map((group, index) => Object.freeze({
    ...group,
    index,
    components: Object.freeze([...group.components]),
    componentIndexes: Object.freeze([...group.componentIndexes])
  }));
}
