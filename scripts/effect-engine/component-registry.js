import { MODULE_ID } from "../constants.js";

export class ComponentRegistry {
  #handlers = new Map();

  register(handler, { replace = false } = {}) {
    if (!handler || typeof handler.type !== "string" || !handler.type.trim()) {
      throw new TypeError("A component handler requires a non-empty type.");
    }

    if (this.#handlers.has(handler.type) && !replace) {
      const message = game.i18n.format(
        "PF2E_CRITICAL_FORGE.Errors.DuplicateComponent",
        { type: handler.type }
      );
      throw new Error(message);
    }

    for (const method of ["validate", "compile", "describe"]) {
      if (typeof handler[method] !== "function") {
        throw new TypeError(`Component handler "${handler.type}" requires ${method}().`);
      }
    }

    this.#handlers.set(handler.type, Object.freeze({ ...handler }));
    return handler.type;
  }

  unregister(type) {
    return this.#handlers.delete(type);
  }

  get(type) {
    return this.#handlers.get(type) ?? null;
  }

  has(type) {
    return this.#handlers.has(type);
  }

  list() {
    return [...this.#handlers.keys()].sort();
  }
}

export const componentRegistry = new ComponentRegistry();
