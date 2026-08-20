import { createSignal } from "solid-js";

const [showLiveChat, setShowLiveChat] = createSignal(true);

export { showLiveChat, setShowLiveChat };

export function toggleLiveChat() {
  setShowLiveChat(!showLiveChat());
}
