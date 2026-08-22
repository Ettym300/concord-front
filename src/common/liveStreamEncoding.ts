import {
  getStorageBoolean,
  getStorageObject,
  StorageKeys
} from "@/common/localStorage";
import { log } from "@/common/logger";

export const HEAVY_GAME_MAX_BITRATE_KBPS = 2000;
export const HEAVY_GAME_MAX_FRAMERATE = 30;

export function isHeavyGameModeEnabled() {
  return getStorageBoolean(StorageKeys.voiceLiveHeavyGameMode, false);
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

export function getEffectiveLiveFramerate() {
  return isHeavyGameModeEnabled() ? HEAVY_GAME_MAX_FRAMERATE : undefined;
}

export function prepareOutgoingVideoTrack(track?: MediaStreamTrack | null) {
  if (!track || track.kind !== "video") return;
  if (isHeavyGameModeEnabled()) {
    track.contentHint = "motion";
  }
}

/**
 * H264 first: it is the only codec with widespread hardware encoder support
 * (NVENC/AMF/QuickSync), which runs on dedicated silicon instead of competing
 * with the game for shader cores or CPU threads. VP8/VP9 fall back to libvpx
 * software encoding, which is what makes heavy games stutter.
 */
const VIDEO_CODEC_PRIORITY = ["video/h264", "video/vp8", "video/vp9", "video/av1"];

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

/**
 * Must run before the peer creates its offer/answer. setCodecPreferences only
 * affects the next negotiation, so calling it on an established connection is
 * a no-op.
 */
export function applyHardwarePreferredVideoEncoding(pc?: RTCPeerConnection) {
  if (!pc || !isHeavyGameModeEnabled()) return;
  const codecs = sortedVideoCodecs();
  if (!codecs.length) return;

  for (const transceiver of pc.getTransceivers()) {
    const isVideo =
      transceiver.sender.track?.kind === "video" ||
      transceiver.receiver.track?.kind === "video";
    if (!isVideo) continue;
    try {
      transceiver.setCodecPreferences(codecs);
    } catch (err) {
      log("RTC", "Heavy game codec preference failed", err);
    }
  }
}
