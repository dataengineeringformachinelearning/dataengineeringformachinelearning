import { registerVikingButton } from "./elements/button/viking-button";
import { registerVikingCard } from "./elements/card/viking-card";
import { registerVikingModal } from "./elements/modal/viking-modal";

export {
  VikingButton,
  registerVikingButton,
} from "./elements/button/viking-button";
export { VikingCard, registerVikingCard } from "./elements/card/viking-card";
export {
  VikingModal,
  registerVikingModal,
} from "./elements/modal/viking-modal";

export const registerVikingElements = (): void => {
  registerVikingButton();
  registerVikingCard();
  registerVikingModal();
};

if (typeof globalThis !== "undefined" && typeof document !== "undefined") {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", registerVikingElements, {
      once: true,
    });
  } else {
    registerVikingElements();
  }
}
