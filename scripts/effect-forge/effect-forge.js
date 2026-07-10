import { MODULE_ID } from "../constants.js";
import { EffectForgeApp } from "./effect-forge-app.js";

let app = null;

export function openEffectForge() {
  if (!game.user?.isGM) {
    ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.Notifications.GmOnly"));
    return;
  }

  app ??= new EffectForgeApp();
  app.render({ force: true });
}

export function initializeEffectForgeUi() {
  Hooks.on("renderItemDirectory", (_app, html) => {
    if (!game.user?.isGM) return;

    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root || root.querySelector(`[data-${MODULE_ID}-button]`)) return;

    const header = root.querySelector(".directory-header .header-actions")
      ?? root.querySelector(".directory-header");

    if (!header) return;

    const button = document.createElement("button");
    button.type = "button";
    button.dataset[`${MODULE_ID.replaceAll("-", "")}Button`] = "";
    button.setAttribute(`data-${MODULE_ID}-button`, "");
    button.className = "pf2e-critical-forge-open";
    button.innerHTML = `<i class="fa-solid fa-hammer"></i> ${game.i18n.localize(
      "PF2E_CRITICAL_FORGE.EffectForge.Open"
    )}`;
    button.addEventListener("click", openEffectForge);
    header.append(button);
  });

  const api = game.modules.get(MODULE_ID)?.api;
  if (api) {
    Object.defineProperty(api, "openEffectForge", {
      value: openEffectForge,
      enumerable: true
    });
  }
}
