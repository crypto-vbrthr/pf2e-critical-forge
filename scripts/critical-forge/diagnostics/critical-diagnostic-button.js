import { MODULE_ID } from "../../constants.js";

export const DIAGNOSTIC_BUTTON_ATTRIBUTE = `data-${MODULE_ID}-diagnostic-button`;
export const DIAGNOSTIC_TOOLBAR_ATTRIBUTE = `data-${MODULE_ID}-diagnostic-toolbar`;

export function isElementLike(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof HTMLElement !== "undefined" && value instanceof HTMLElement) return true;
  return value.nodeType === 1 && typeof value.querySelector === "function";
}

export function getRootElement(app, html = null) {
  const candidates = [
    html,
    html?.[0],
    html?.element,
    app?.element,
    app?.window?.content
  ];
  return candidates.find(isElementLike) ?? null;
}

export function isChatApplication(app, root = null) {
  const tabName = app?.tabName ?? app?.options?.tabName ?? app?.constructor?.tabName ?? "";
  const className = app?.constructor?.name ?? "";
  const id = app?.id ?? root?.id ?? "";

  if (String(tabName).toLowerCase() === "chat") return true;
  if (String(className).toLowerCase() === "chatlog") return true;
  if (String(id).toLowerCase() === "chat") return true;

  if (!isElementLike(root)) return false;
  return Boolean(root.matches?.('[data-tab="chat"], .sidebar-tab[data-tab="chat"], #chat, .chat-log'));
}

export function findDiagnosticButtonHost(root) {
  if (!isElementLike(root)) return null;

  const selectors = [
    '[data-application-part="input"]',
    '[data-part="input"]',
    '#chat-form',
    'form.chat-form',
    '.chat-form',
    '.chat-input'
  ];

  for (const selector of selectors) {
    const candidate = root.matches?.(selector) ? root : root.querySelector?.(selector);
    if (candidate) return candidate;
  }

  return null;
}
