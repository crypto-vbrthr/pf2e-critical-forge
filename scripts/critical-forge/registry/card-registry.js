export class CardRegistry {
  #cards = new Map();
  #packRegistry;

  constructor({ packRegistry }) {
    this.#packRegistry = packRegistry;
  }

  register(card, { replace = false } = {}) {
    if (!this.#packRegistry.has(card.packId)) {
      throw new Error(`Unknown critical card pack: ${card.packId}`);
    }
    if (this.#cards.has(card.id) && !replace) {
      throw new Error(`Critical card already registered: ${card.id}`);
    }
    this.#cards.set(card.id, card);
    return card;
  }

  unregister(id) {
    return this.#cards.delete(String(id));
  }

  unregisterPack(packId) {
    let count = 0;
    for (const [id, card] of this.#cards) {
      if (card.packId === packId) {
        this.#cards.delete(id);
        count += 1;
      }
    }
    return count;
  }

  get(id) {
    return this.#cards.get(String(id)) ?? null;
  }

  has(id) {
    return this.#cards.has(String(id));
  }

  list({ packId = null, category = null, deckType = null, tags = [], enabledPacksOnly = true } = {}) {
    const requiredTags = new Set(tags);
    return [...this.#cards.values()]
      .filter((card) => !packId || card.packId === packId)
      .filter((card) => !category || card.category === category)
      .filter((card) => !deckType || card.deckType === deckType)
      .filter((card) => [...requiredTags].every((tag) => card.tags.includes(tag)))
      .filter((card) => !enabledPacksOnly || this.#packRegistry.get(card.packId)?.enabled)
      .sort((left, right) => left.id.localeCompare(right.id));
  }

  clear() {
    this.#cards.clear();
  }
}
