import { MODULE_ID } from "../../constants.js";
import { CardPackEditorApp } from "./card-pack-editor-app.js";

let app = null;

export async function openCardPackEditor() {
  if (!game.user?.isGM) {
    ui.notifications.warn(game.i18n.localize("PF2E_CRITICAL_FORGE.Notifications.GmOnly"));
    return null;
  }
  app ??= new CardPackEditorApp();
  await app.render({ force: true });
  app.bringToFront?.();
  return app;
}

export function resetCardPackEditorSingleton() {
  app = null;
}

export function createCardEditorButton() {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "pf2e-critical-forge-card-editor-open";
  button.title = game.i18n.localize("PF2E_CRITICAL_FORGE.CardEditor.OpenHint");
  button.innerHTML = `<i class="fa-solid fa-layer-group"></i><span>${game.i18n.localize(
    "PF2E_CRITICAL_FORGE.CardEditor.Open"
  )}</span>`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    void openCardPackEditor();
  });
  return button;
}
