import { createSignal } from "solid-js";

const [showLiveChat, setShowLiveChat] = createSignal(false);

export { showLiveChat, setShowLiveChat };

export function toggleLiveChat() {
  setShowLiveChat(!showLiveChat());
}
