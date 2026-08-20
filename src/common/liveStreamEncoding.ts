import { getStorageObject, StorageKeys } from "@/common/localStorage";
import { log } from "@/common/logger";

export const HEAVY_GAME_MAX_BITRATE_KBPS = 2000;

export function isHeavyGameModeEnabled() {
  return getStorageObject(StorageKeys.voiceLiveHeavyGameMode, false) === true;
}

export function getEffectiveLiveBitrateKbps() {
  const stored = getStorageObject(StorageKeys.voiceLiveBitrate, 2500);
  const value = typeof stored === "number" ? stored : 2500;
  const clamped = Math.max(250, Math.min(8000, value));
  if (isHeavyGameModeEnabled()) {
    return Math.min(clamped, HEAVY_GAME_MAX_BITRATE_KBPS);
  }
  return clamped;
}

export function prepareOutgoingVideoTrack(track?: MediaStreamTrack | null) {
  if (!track || track.kind !== "video") return;
  if (isHeavyGameModeEnabled()) {
    track.contentHint = "motion";
  }
}

const VIDEO_CODEC_PRIORITY = ["video/vp8", "video/vp9", "video/av1", "video/h264"];

function sortedVideoCodecs() {
  if (typeof RTCRtpSender.getCapabilities !== "function") return [];
  const caps = RTCRtpSender.getCapabilities("video");
  if (!caps?.codecs?.length) return [];
  return [...caps.codecs].sort((a, b) => {
    const ai = VIDEO_CODEC_PRIORITY.indexOf(a.mimeType.toLowerCase());
    const bi = VIDEO_CODEC_PRIORITY.indexOf(b.mimeType.toLowerCase());
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
}

/** Prefer software-friendly codecs (VP8 first) to reduce GPU encoder load. */
export function applyCpuPreferredVideoEncoding(pc?: RTCPeerConnection) {
  if (!pc || !isHeavyGameModeEnabled()) return;
  const codecs = sortedVideoCodecs();
  if (!codecs.length) return;

  for (const transceiver of pc.getTransceivers()) {
    if (transceiver.sender.track?.kind !== "video") continue;
    try {
      transceiver.setCodecPreferences(codecs);
    } catch (err) {
      log("RTC", "Heavy game codec preference failed", err);
    }
  }
}

export function applyCpuPreferredVideoEncodingToPeer(
  peer?: { _pc?: RTCPeerConnection }
) {
  applyCpuPreferredVideoEncoding(peer?._pc);
}
