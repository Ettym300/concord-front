import { onCleanup, onMount, Show, createSignal } from "solid-js";
import env from "./env";
import { electronWindowAPI } from "./Electron";
import { log } from "./logger";
import useStore from "@/chat-api/store/useStore";

const BUILD_ID_URL = "/build-id.txt";

async function fetchRemoteBuildId() {
  const res = await fetch(`${BUILD_ID_URL}?t=${Date.now()}`, {
    cache: "no-store"
  });
  if (!res.ok) return null;
  const text = (await res.text()).trim();
  return text || null;
}

export function useFrontUpdate() {
  const { voiceUsers } = useStore();
  const [updateAvailable, setUpdateAvailable] = createSignal(false);

  const currentId = () => env.BUILD_ID;
  const inVoiceCall = () => !!voiceUsers.currentUser();

  const applyUpdate = () => {
    window.location.reload();
  };

  const check = async () => {
    if (env.DEV_MODE || !currentId()) return;
    try {
      const remote = await fetchRemoteBuildId();
      if (!remote || remote === currentId()) {
        setUpdateAvailable(false);
        return;
      }
      log("UPDATER", `Front update ${currentId()} → ${remote}`);
      setUpdateAvailable(true);
      const shouldAutoReload =
        !!electronWindowAPI()?.isElectron &&
        !inVoiceCall() &&
        document.visibilityState === "visible";
      if (shouldAutoReload) applyUpdate();
    } catch {
      // offline or nginx not serving the file yet
    }
  };

  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    void check();
  };

  onMount(() => {
    void check();
    const interval = window.setInterval(() => {
      void check();
    }, 30000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    onCleanup(() => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    });
  });

  return { updateAvailable, applyUpdate };
}
