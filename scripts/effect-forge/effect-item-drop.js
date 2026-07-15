/**
 * Extract Foundry document drag data from a DragEvent.
 *
 * Foundry V14 exposes TextEditor.getDragEventData as the canonical parser. A
 * small JSON fallback keeps the helper testable and tolerant of older clients.
 */
export function getEffectItemDragData(event, { textEditor = null } = {}) {
  const editor = textEditor
    ?? globalThis.foundry?.applications?.ux?.TextEditor?.implementation
    ?? globalThis.foundry?.applications?.ux?.TextEditor
    ?? globalThis.TextEditor;

  if (typeof editor?.getDragEventData === "function") {
    return editor.getDragEventData(event) ?? {};
  }

  const raw = event?.dataTransfer?.getData?.("text/plain") ?? "";
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/**
 * Whether a Foundry drag payload represents an Item document.
 */
export function isItemDragData(data) {
  return data?.type === "Item" || data?.documentName === "Item";
}

/**
 * Resolve a dragged Item document and ensure that it is a PF2e Effect Item.
 *
 * The result is intentionally structured instead of throwing for expected user
 * mistakes so the GUI can provide precise localized feedback.
 */
export async function resolveDroppedEffectItem(
  data,
  {
    fromUuidFn = globalThis.fromUuid,
    worldItems = globalThis.game?.items
  } = {}
) {
  if (!isItemDragData(data)) {
    return { status: "unsupported", item: null };
  }

  let item = null;
  let uuid = String(data.uuid ?? "").trim();

  if (!uuid && data.pack && data.id) {
    uuid = `Compendium.${data.pack}.Item.${data.id}`;
  }

  if (uuid && typeof fromUuidFn === "function") {
    item = await fromUuidFn(uuid);
  }

  const id = String(data.id ?? data.data?._id ?? "").trim();
  if (!item && id && typeof worldItems?.get === "function") {
    item = worldItems.get(id);
  }

  if (!item) {
    return { status: "not-found", item: null };
  }

  if (item.documentName && item.documentName !== "Item") {
    return { status: "unsupported", item: null };
  }

  if (item.type !== "effect") {
    return { status: "not-effect", item };
  }

  return { status: "ok", item };
}
