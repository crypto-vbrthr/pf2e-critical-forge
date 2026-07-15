import { deepFreeze } from "../utils.js";

export class PackRegistry {
  #packs = new Map();

  register(pack, { replace = false } = {}) {
    if (this.#packs.has(pack.id) && !replace) {
      throw new Error(`Critical card pack already registered: ${pack.id}`);
    }
    const { cards: _cards, ...metadata } = pack;
    const stored = deepFreeze(metadata);
    this.#packs.set(pack.id, stored);
    return stored;
  }

  unregister(id) {
    return this.#packs.delete(String(id));
  }

  get(id) {
    return this.#packs.get(String(id)) ?? null;
  }

  has(id) {
    return this.#packs.has(String(id));
  }

  list({ enabledOnly = false } = {}) {
    return [...this.#packs.values()]
      .filter((pack) => !enabledOnly || pack.enabled)
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  }

  clear() {
    this.#packs.clear();
  }
}
