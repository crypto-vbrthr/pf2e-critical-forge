function clone(value) {
  if (value === undefined) return undefined;
  if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value);
  return structuredClone(value);
}

let fallbackCounter = 0;

export function createComponentUiId() {
  if (globalThis.foundry?.utils?.randomID) return globalThis.foundry.utils.randomID();
  fallbackCounter += 1;
  return `component-${fallbackCounter}`;
}

export function attachComponentUiState(component, {
  uiId = null,
  collapsed = false
} = {}) {
  return {
    ...clone(component),
    _uiId: uiId ?? component?._uiId ?? createComponentUiId(),
    _collapsed: Boolean(component?._collapsed ?? collapsed)
  };
}

export function stripComponentUiState(component) {
  const result = clone(component);
  delete result._uiId;
  delete result._collapsed;
  return result;
}

export function duplicateComponent(components, index) {
  if (!Array.isArray(components) || !Number.isInteger(index) || index < 0 || index >= components.length) {
    return false;
  }
  const copy = attachComponentUiState(stripComponentUiState(components[index]), {
    collapsed: false
  });
  components.splice(index + 1, 0, copy);
  return true;
}

export function moveComponent(components, index, direction) {
  if (!Array.isArray(components) || !Number.isInteger(index)) return false;
  const offset = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  const target = index + offset;
  if (offset === 0 || index < 0 || index >= components.length || target < 0 || target >= components.length) {
    return false;
  }
  [components[index], components[target]] = [components[target], components[index]];
  return true;
}

export function toggleComponentCollapsed(components, index) {
  if (!Array.isArray(components) || !Number.isInteger(index) || index < 0 || index >= components.length) {
    return false;
  }
  components[index]._collapsed = !components[index]._collapsed;
  return true;
}

export function createEditorSnapshot({ state, unmanagedRules = [] } = {}) {
  const cleanState = clone(state ?? {});
  cleanState.components = Array.isArray(cleanState.components)
    ? cleanState.components.map(stripComponentUiState)
    : [];
  return JSON.stringify({ state: cleanState, unmanagedRules: clone(unmanagedRules) });
}

export function normalizeWindowState(value, {
  minWidth = 720,
  minHeight = 540
} = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const number = (candidate) => Number.isFinite(Number(candidate)) ? Number(candidate) : undefined;
  const width = number(source.width);
  const height = number(source.height);
  const left = number(source.left);
  const top = number(source.top);

  return {
    ...(width !== undefined ? { width: Math.max(minWidth, width) } : {}),
    ...(height !== undefined ? { height: Math.max(minHeight, height) } : {}),
    ...(left !== undefined ? { left } : {}),
    ...(top !== undefined ? { top } : {})
  };
}
