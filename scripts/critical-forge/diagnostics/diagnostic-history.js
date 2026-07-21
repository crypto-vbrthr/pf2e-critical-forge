import { deepClone, deepFreeze } from "../utils.js";

export const CRITICAL_DIAGNOSTIC_HISTORY_LIMIT = 100;

export class CriticalDiagnosticHistory {
  #entries = [];
  #limit;

  constructor({ limit = CRITICAL_DIAGNOSTIC_HISTORY_LIMIT } = {}) {
    this.#limit = Math.max(1, Number(limit) || CRITICAL_DIAGNOSTIC_HISTORY_LIMIT);
  }

  record(report) {
    if (!report?.id) throw new TypeError("A diagnostic report with an id is required.");
    const copy = deepClone(report);
    const index = this.#entries.findIndex((entry) => entry.id === copy.id);
    if (index >= 0) this.#entries.splice(index, 1);
    this.#entries.unshift(copy);
    this.#entries.length = Math.min(this.#entries.length, this.#limit);
    return this.get(copy.id);
  }

  update(reportId, updater) {
    const index = this.#entries.findIndex((entry) => entry.id === reportId);
    if (index < 0) return null;
    const current = deepClone(this.#entries[index]);
    const next = typeof updater === "function" ? updater(current) : { ...current, ...deepClone(updater) };
    this.#entries[index] = deepClone(next);
    return this.get(reportId);
  }

  get(reportId) {
    const entry = this.#entries.find((candidate) => candidate.id === reportId);
    return entry ? deepFreeze(deepClone(entry)) : null;
  }

  findBySourceMessageUuid(uuid) {
    if (!uuid) return null;
    const entry = this.#entries.find((candidate) => candidate.source?.messageUuid === uuid);
    return entry ? deepFreeze(deepClone(entry)) : null;
  }

  findByPreviewMessageUuid(uuid) {
    if (!uuid) return null;
    const entry = this.#entries.find((candidate) => candidate.phases?.selection?.previewMessageUuid === uuid);
    return entry ? deepFreeze(deepClone(entry)) : null;
  }

  list({ limit = this.#limit } = {}) {
    return deepFreeze(this.#entries.slice(0, Math.max(0, Number(limit) || 0)).map((entry) => deepClone(entry)));
  }

  clear() {
    const count = this.#entries.length;
    this.#entries = [];
    return count;
  }

  get size() {
    return this.#entries.length;
  }
}

export const criticalDiagnosticHistory = new CriticalDiagnosticHistory();
