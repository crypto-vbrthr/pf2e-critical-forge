import { deepClone, deepFreeze, normalizeString } from "../utils.js";

export const CRITICAL_EXTENSION_DIAGNOSTIC_LIMIT = 200;

let sequence = 0;

export class ExtensionDiagnosticJournal {
  #entries = [];
  #limit;

  constructor({ limit = CRITICAL_EXTENSION_DIAGNOSTIC_LIMIT } = {}) {
    this.#limit = Math.max(1, Number(limit) || CRITICAL_EXTENSION_DIAGNOSTIC_LIMIT);
  }

  record(entry = {}) {
    sequence += 1;
    const normalized = deepFreeze({
      id: normalizeString(entry.id, `extension-diagnostic-${Date.now()}-${sequence}`),
      createdAt: Number(entry.createdAt ?? Date.now()),
      sourceModule: normalizeString(entry.sourceModule) || null,
      resourceType: normalizeString(entry.resourceType, "extension"),
      action: normalizeString(entry.action, "inspect"),
      status: normalizeStatus(entry.status),
      code: normalizeString(entry.code, "EXTENSION_OPERATION"),
      message: normalizeString(entry.message),
      resourceIds: Object.freeze([...(entry.resourceIds ?? [])].map(String)),
      data: deepClone(entry.data ?? {})
    });
    this.#entries.unshift(deepClone(normalized));
    this.#entries.length = Math.min(this.#entries.length, this.#limit);
    return normalized;
  }

  list({ sourceModule = null, status = null, limit = this.#limit } = {}) {
    const owner = normalizeString(sourceModule);
    const normalizedStatus = status == null ? null : normalizeStatus(status);
    const entries = this.#entries
      .filter((entry) => !owner || entry.sourceModule === owner)
      .filter((entry) => !normalizedStatus || entry.status === normalizedStatus)
      .slice(0, Math.max(0, Number(limit) || 0));
    return deepFreeze(entries.map((entry) => deepClone(entry)));
  }

  clear({ sourceModule = null } = {}) {
    const owner = normalizeString(sourceModule);
    if (!owner) {
      const count = this.#entries.length;
      this.#entries = [];
      return count;
    }
    const before = this.#entries.length;
    this.#entries = this.#entries.filter((entry) => entry.sourceModule !== owner);
    return before - this.#entries.length;
  }

  get size() {
    return this.#entries.length;
  }
}

export const criticalExtensionDiagnostics = new ExtensionDiagnosticJournal();

export function recordExtensionSuccess({ sourceModule, resourceType, action, code, message, resourceIds = [], data = {} }) {
  return criticalExtensionDiagnostics.record({
    sourceModule,
    resourceType,
    action,
    status: "success",
    code,
    message,
    resourceIds,
    data
  });
}

export function recordExtensionFailure(error, { sourceModule, resourceType, action, code = "EXTENSION_OPERATION_FAILED", resourceIds = [], data = {} }) {
  const diagnostic = criticalExtensionDiagnostics.record({
    sourceModule,
    resourceType,
    action,
    status: "error",
    code: error?.code ?? code,
    message: error?.message ?? String(error),
    resourceIds,
    data: {
      ...deepClone(data),
      name: error?.name ?? "Error",
      compatibility: deepClone(error?.compatibility ?? null),
      validation: deepClone(error?.validation ?? null)
    }
  });
  if (error && typeof error === "object") error.extensionDiagnostic = diagnostic;
  return diagnostic;
}

function normalizeStatus(value) {
  const normalized = normalizeString(value, "info").toLowerCase();
  return ["success", "warning", "error", "info"].includes(normalized) ? normalized : "info";
}
