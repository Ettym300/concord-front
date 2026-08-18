import {
  GtcrnWorkletNode,
  RnnoiseWorkletNode,
  loadGtcrn,
  loadRnnoise
} from "@sapphi-red/web-noise-suppressor";
import gtcrnWorkletPath from "@sapphi-red/web-noise-suppressor/gtcrnWorklet.js?url";
import gtcrnWasmPath from "@sapphi-red/web-noise-suppressor/gtcrn.wasm?url";
import rnnoiseWorkletPath from "@sapphi-red/web-noise-suppressor/rnnoiseWorklet.js?url";
import rnnoiseWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise.wasm?url";
import rnnoiseSimdWasmPath from "@sapphi-red/web-noise-suppressor/rnnoise_simd.wasm?url";
import { log } from "@/common/logger";

export type WrappedMic = {
  stream: MediaStream;
  originalStream: MediaStream;
  dispose: () => void;
};

let gtcrnWasm: ArrayBuffer | null = null;
let rnnoiseWasm: ArrayBuffer | null = null;
let preloadPromise: Promise<void> | null = null;

async function loadGtcrnWasm() {
  if (!gtcrnWasm) {
    gtcrnWasm = await loadGtcrn({ url: gtcrnWasmPath });
  }
  return gtcrnWasm;
}

async function loadRnnoiseWasm() {
  if (!rnnoiseWasm) {
    rnnoiseWasm = await loadRnnoise({
      url: rnnoiseWasmPath,
      simdUrl: rnnoiseSimdWasmPath
    });
  }
  return rnnoiseWasm;
}

export function preloadNoiseSuppressor() {
  if (!preloadPromise) {
    preloadPromise = Promise.all([loadGtcrnWasm(), loadRnnoiseWasm()])
      .then(() => undefined)
      .catch((err) => {
        preloadPromise = null;
        log("RTC", "Failed to preload noise suppressor", err);
      });
  }
  return preloadPromise;
}

function createAudioContext() {
  try {
    return new AudioContext({ sampleRate: 48000, latencyHint: "interactive" });
  } catch {
    return new AudioContext({ latencyHint: "interactive" });
  }
}

function passthrough(input: MediaStream): WrappedMic {
  return {
    stream: input,
    originalStream: input,
    dispose: () => {
      input.getTracks().forEach((track) => track.stop());
    }
  };
}

async function tryBrowserNoiseSuppression(input: MediaStream) {
  const track = input.getAudioTracks()[0];
  if (!track) return;
  try {
    await track.applyConstraints({ noiseSuppression: true });
  } catch {
    // browser may not allow toggling this constraint
  }
}

async function wrapWithNode(
  input: MediaStream,
  createNode: (
    ctx: AudioContext
  ) => Promise<{ node: AudioWorkletNode; destroy: () => void }>,
  allowedRates: number[] = [48000, 16000]
): Promise<WrappedMic> {
  const ctx = createAudioContext();
  try {
    if (!allowedRates.includes(ctx.sampleRate)) {
      throw new Error(`Unsupported sample rate: ${ctx.sampleRate}`);
    }
    await ctx.resume();
    const { node, destroy } = await createNode(ctx);
    const source = ctx.createMediaStreamSource(input);
    const dest = ctx.createMediaStreamDestination();
    dest.channelCount = 2;
    dest.channelCountMode = "explicit";
    dest.channelInterpretation = "speakers";
    const merger = ctx.createChannelMerger(2);
    source.connect(node);
    // Worklet output is mono; HTMLAudio/WebRTC otherwise plays it only on the left.
    node.connect(merger, 0, 0);
    node.connect(merger, 0, 1);
    merger.connect(dest);

    return {
      stream: dest.stream,
      originalStream: input,
      dispose: () => {
        dest.stream.getTracks().forEach((track) => track.stop());
        try {
          destroy();
        } catch {
          // already torn down
        }
        try {
          source.disconnect();
          node.disconnect();
          merger.disconnect();
        } catch {
          // already disconnected
        }
        void ctx.close();
        input.getTracks().forEach((track) => track.stop());
      }
    };
  } catch (err) {
    void ctx.close();
    throw err;
  }
}

async function wrapWithGtcrn(input: MediaStream) {
  const wasmBinary = await loadGtcrnWasm();
  return wrapWithNode(input, async (ctx) => {
    await ctx.audioWorklet.addModule(gtcrnWorkletPath);
    const node = new GtcrnWorkletNode(ctx, {
      wasmBinary,
      maxChannels: 1
    });
    return { node, destroy: () => node.destroy() };
  });
}

async function wrapWithRnnoise(input: MediaStream) {
  const wasmBinary = await loadRnnoiseWasm();
  return wrapWithNode(input, async (ctx) => {
    await ctx.audioWorklet.addModule(rnnoiseWorkletPath);
    const node = new RnnoiseWorkletNode(ctx, {
      wasmBinary,
      maxChannels: 1
    });
    return { node, destroy: () => node.destroy() };
  }, [48000]);
}

export async function wrapMicWithNoiseSuppression(
  input: MediaStream,
  enabled: boolean
): Promise<WrappedMic> {
  if (!enabled) return passthrough(input);

  try {
    const wrapped = await wrapWithGtcrn(input);
    log("RTC", "Using GTCRN noise suppression");
    return wrapped;
  } catch (gtcrnError) {
    log("RTC", "GTCRN failed, trying RNNoise", gtcrnError);
    try {
      const wrapped = await wrapWithRnnoise(input);
      log("RTC", "Using RNNoise noise suppression");
      return wrapped;
    } catch (rnnoiseError) {
      log(
        "RTC",
        "Neural noise suppression failed, using browser filter",
        rnnoiseError
      );
      await tryBrowserNoiseSuppression(input);
      return passthrough(input);
    }
  }
}
