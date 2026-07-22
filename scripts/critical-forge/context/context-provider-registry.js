const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]*$/;

export class ContextProviderRegistry {
  #providers = new Map();

  register(rawProvider, { replace = false } = {}) {
    const provider = normalizeProvider(rawProvider);
    const key = providerKey(provider.system, provider.id);
    const existing = this.#providers.get(key);
    if (existing && !replace) {
      throw registryError("CONTEXT_PROVIDER_CONFLICT", `Critical context provider already registered: ${provider.system}/${provider.id}`);
    }
    if (existing?.protected && replace) {
      throw registryError("CONTEXT_PROVIDER_PROTECTED", `Protected Critical context provider cannot be replaced: ${provider.system}/${provider.id}`);
    }
    if (existing && provider.sourceModule && existing.sourceModule !== provider.sourceModule) {
      throw registryError(
        "CONTEXT_PROVIDER_OWNERSHIP",
        `Critical context provider ${provider.system}/${provider.id} is owned by ${existing.sourceModule}, not ${provider.sourceModule}.`
      );
    }
    this.#providers.set(key, provider);
    return provider;
  }

  unregister(system, providerId, { sourceModule = null } = {}) {
    const key = providerKey(system, providerId);
    const existing = this.#providers.get(key);
    if (!existing) return false;
    if (existing.protected) return false;
    const owner = String(sourceModule ?? "").trim();
    if (owner && existing.sourceModule !== owner) {
      throw registryError(
        "CONTEXT_PROVIDER_OWNERSHIP",
        `Critical context provider ${existing.system}/${existing.id} is owned by ${existing.sourceModule}, not ${owner}.`
      );
    }
    return this.#providers.delete(key);
  }

  get(system, providerId = null) {
    const normalizedSystem = normalizeIdentifier(system);
    if (providerId) return this.#providers.get(providerKey(normalizedSystem, providerId)) ?? null;
    return this.list({ system: normalizedSystem })[0] ?? null;
  }

  list({ system = null, sourceModule = null } = {}) {
    const normalizedSystem = system == null ? null : normalizeIdentifier(system);
    const owner = String(sourceModule ?? "").trim();
    return [...this.#providers.values()]
      .filter((provider) => !normalizedSystem || provider.system === normalizedSystem)
      .filter((provider) => !owner || provider.sourceModule === owner)
      .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  }

  clear() {
    this.#providers.clear();
  }
}

export const criticalContextProviderRegistry = new ContextProviderRegistry();

function normalizeProvider(provider) {
  if (!provider || typeof provider !== "object" || Array.isArray(provider)) {
    throw new TypeError("A Critical Forge context provider must be an object.");
  }
  const id = normalizeIdentifier(provider.id);
  const system = normalizeIdentifier(provider.system);
  if (!PROVIDER_ID_PATTERN.test(id)) throw new TypeError(`Invalid Critical Forge context provider id: ${provider.id}`);
  if (!PROVIDER_ID_PATTERN.test(system)) throw new TypeError(`Invalid Critical Forge context system id: ${provider.system}`);
  if (typeof provider.createContext !== "function") {
    throw new TypeError(`Critical context provider ${system}/${id} requires createContext(input, options).`);
  }
  const priority = Number(provider.priority ?? 0);
  if (!Number.isFinite(priority)) throw new TypeError("Critical context provider priority must be finite.");

  return Object.freeze({
    id,
    system,
    version: String(provider.version ?? "1").trim() || "1",
    priority,
    sourceModule: String(provider.sourceModule ?? "").trim() || null,
    protected: Boolean(provider.protected),
    createContext: provider.createContext
  });
}

function providerKey(system, providerId) {
  return `${normalizeIdentifier(system)}/${normalizeIdentifier(providerId)}`;
}

function normalizeIdentifier(value) {
  return String(value ?? "").trim().toLowerCase();
}

function registryError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
