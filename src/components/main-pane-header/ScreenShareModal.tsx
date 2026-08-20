import {
  For,
  Show,
  createEffect,
  createSignal,
  onCleanup,
  onMount
} from "solid-js";
import LegacyModal from "../ui/legacy-modal/LegacyModal";
import Button from "../ui/Button";
import { css, styled } from "solid-styled-components";
import { FlexRow } from "../ui/Flexbox";
import Text from "../ui/Text";
import useStore from "@/chat-api/store/useStore";
import { ElectronCaptureSource, electronWindowAPI } from "@/common/Electron";
import Checkbox from "../ui/Checkbox";
import { t } from "@nerimity/i18lite";
import { StorageKeys, useLocalStorage } from "@/common/localStorage";
import Input from "../ui/input/Input";
import {
  HEAVY_GAME_MAX_BITRATE_KBPS,
  isHeavyGameModeEnabled
} from "@/common/liveStreamEncoding";

const QualityOptions = ["480p", "720p", "1080p"] as const;
const FramerateOptions = ["1fps 💀", "10fps", "30fps", "60fps"] as const;
export const LIVE_BITRATE_OPTIONS = [1000, 2500, 4000, 8000] as const;

export function bitrateLabel(kbps: number) {
  return `${kbps / 1000} Mbps`;
}

function formatMbps(kbps: number) {
  const mbps = kbps / 1000;
  return Number.isInteger(mbps)
    ? String(mbps)
    : mbps.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

export function LiveBitratePicker() {
  const { voiceUsers } = useStore();
  const [bitrate, setBitrate] = useLocalStorage(
    StorageKeys.voiceLiveBitrate,
    2500
  );
  const [draft, setDraft] = createSignal(formatMbps(bitrate()));
  const heavyGame = () => isHeavyGameModeEnabled();

  const applyKbps = (kbps: number) => {
    setBitrate(kbps);
    voiceUsers.setLiveBitrate(kbps);
    setDraft(formatMbps(voiceUsers.getLiveBitrateKbps()));
  };

  const applyDraft = () => {
    const parsed = Number(draft().replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setDraft(formatMbps(bitrate()));
      return;
    }
    applyKbps(Math.round(parsed * 1000));
  };

  return (
    <>
      <OptionTitle>
        {t("mainPaneHeader.voice.screenShareModal.bitrate")}
      </OptionTitle>
      <OptionContainer>
        <For each={LIVE_BITRATE_OPTIONS}>
          {(kbps) => (
            <Button
              onClick={() => applyKbps(kbps)}
              label={bitrateLabel(kbps)}
              primary={bitrate() === kbps}
            />
          )}
        </For>
      </OptionContainer>
      <BitrateInputRow>
        <Input
          type="number"
          value={draft()}
          placeholder="2.5"
          suffix="Mbps"
          margin={0}
          onText={setDraft}
          onBlur={applyDraft}
          onChange={() => applyDraft()}
        />
        <BitrateHint>
          {heavyGame()
            ? t("mainPaneHeader.voice.screenShareModal.bitrateHeavyGameHint", {
                max: HEAVY_GAME_MAX_BITRATE_KBPS / 1000
              })
            : t("mainPaneHeader.voice.screenShareModal.bitrateHint")}
        </BitrateHint>
      </BitrateInputRow>
    </>
  );
}

export function HeavyGameModePicker(props?: { onChange?: (enabled: boolean) => void }) {
  const { voiceUsers } = useStore();
  const [heavyGame, setHeavyGame] = useLocalStorage(
    StorageKeys.voiceLiveHeavyGameMode,
    false
  );

  const onToggle = (enabled: boolean) => {
    setHeavyGame(enabled);
    props?.onChange?.(enabled);
    if (voiceUsers.currentUser()?.videoStream) {
      void voiceUsers.applyOutgoingLiveEncoding();
    }
  };

  return (
    <HeavyGameBlock>
      <Checkbox
        label={t("mainPaneHeader.voice.screenShareModal.heavyGameMode")}
        checked={heavyGame()}
        onChange={onToggle}
      />
      <BitrateHint>
        {t("mainPaneHeader.voice.screenShareModal.heavyGameModeDescription")}
      </BitrateHint>
    </HeavyGameBlock>
  );
}

const HeavyGameBlock = styled("div")`
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  margin: 8px 0 12px;
  padding: 10px 12px;
  box-sizing: border-box;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  gap: 6px;
`;

const OptionContainer = styled(FlexRow)``;

const BitrateInputRow = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 180px;
  margin: 8px 0 4px 5px;
`;

const BitrateHint = styled(Text)`
  display: block;
  width: 100%;
  max-width: 100%;
  margin-left: 2px;
  opacity: 0.65;
  font-size: 11px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-word;
`;

const ActionButtonsContainer = styled(FlexRow)`
  justify-content: flex-end;
  width: 100%;
`;

const OptionTitle = styled(Text)`
  margin-left: 5px;
`;

let audioGenerator: any | null = null;
let writer: any | null = null;

const isWindows = navigator?.userAgentData?.platform === "Windows";

// reference: https://github.com/WerdoxDev/Huginn/blob/215c00f3a8c18b82c2cc95df8f695a077a998c73/packages/huginn-app/src/lib/voice/voice-bridge.ts#L236
if (electronWindowAPI()?.isElectron) {
  const { sampleRate, numChannels } = { sampleRate: 48000, numChannels: 2 };

  electronWindowAPI()?.appLoopbackData?.(async (d) => {
    const float32 = new Float32Array(d.length / 2);
    const view = new DataView(d.buffer);
    for (let i = 0; i < float32.length; i++) {
      float32[i] = view.getInt16(i * 2, true) / 32768;
    }

    const audioData = new AudioData({
      format: "f32",
      sampleRate,
      numberOfFrames: float32.length / numChannels,
      numberOfChannels: numChannels,
      timestamp: performance.now() * 1000, // In microseconds
      data: float32
    });

    try {
      await writer?.write(audioData);
    } catch {
      electronWindowAPI()?.appLoopbackReset?.();
    }
  });
}

export function ScreenShareModal(props: { close: () => void }) {
  const { voiceUsers } = useStore();
  const [selectedQuality, setSelectedQuality] =
    createSignal<(typeof QualityOptions)[number]>("480p");
  const [selectedFramerate, setFramerate] =
    createSignal<(typeof FramerateOptions)[number]>("30fps");

  const [shareSystemAudio, setShareSystemAudio] = createSignal(false);
  const [preventEcho, setPreventEcho] = createSignal(true);

  const [electronSourceId, setElectronSourceId] = createSignal<string>();

  onMount(() => {
    if (isHeavyGameModeEnabled()) {
      setSelectedQuality("720p");
      setFramerate("30fps");
    }
  });

  const onHeavyGameChange = (enabled: boolean) => {
    if (!enabled) return;
    setSelectedQuality("720p");
    setFramerate("30fps");
  };

  const chooseWindowClick = async () => {
    const constraints = await constructConstraints(
      selectedQuality(),
      selectedFramerate(),
      (electronWindowAPI()?.isElectron && isWindows) ? false :  shareSystemAudio()
    );

    let appTrack: MediaStreamTrack | undefined = undefined;
    if (electronWindowAPI()?.isElectron) {
      const sourceId = electronSourceId();
      if (!sourceId) return;
      await electronWindowAPI()?.setDesktopCaptureSourceId(sourceId);

      if (
        isWindows &&
        shareSystemAudio() 
      ) {

        if (sourceId.includes("window")) {
          electronWindowAPI()?.appLoopbackStartV2?.({type: "CaptureApp", chromeMediaSourceId: sourceId});
        } else {
          electronWindowAPI()?.appLoopbackStartV2?.({type: "CaptureSystem", excludeSelf: preventEcho()});
        }

        /* @ts-expect-error MediaStreamTrackGenerator is not available in standard TypeScript DOM lib */
        audioGenerator = new MediaStreamTrackGenerator({ kind: "audio" });

        writer = audioGenerator!.writable.getWriter();

        appTrack = new MediaStream([audioGenerator!]).getAudioTracks()[0];
      }
    }

    const stream = await navigator.mediaDevices
      .getDisplayMedia(constraints)
      .catch(() => {});
    if (!stream) return;

    if (appTrack) {
      const audioTrack = stream.getAudioTracks()[0]!;
      if (audioTrack) {
        stream.removeTrack(audioTrack);
      }
      if (appTrack) {
        stream.addTrack(appTrack);
      }
    }

    voiceUsers.setVideoStream(stream);
    props.close();
  };

  const ActionButtons = (
    <ActionButtonsContainer>
      <Button
        label={t("general.backButton")}
        color="var(--alert-color)"
        onClick={props.close}
      />
      <Button
        label={t("mainPaneHeader.voice.screenShareModal.chooseWindowButton")}
        onClick={chooseWindowClick}
      />
    </ActionButtonsContainer>
  );

  return (
    <LegacyModal
      title={
        voiceUsers.currentUser()?.videoStream
          ? t("mainPaneHeader.voice.screenShareModal.changeTitle")
          : t("mainPaneHeader.voice.screenShareModal.title")
      }
      close={props.close}
      actionButtons={ActionButtons}
    >
      <OptionTitle>
        {t("mainPaneHeader.voice.screenShareModal.quality")}
      </OptionTitle>
      <OptionContainer>
        <For each={QualityOptions}>
          {(quality) => (
            <Button
              onClick={() => setSelectedQuality(quality)}
              label={quality}
              primary={selectedQuality() === quality}
            />
          )}
        </For>
      </OptionContainer>

      <OptionTitle>
        {t("mainPaneHeader.voice.screenShareModal.framerate")}
      </OptionTitle>
      <OptionContainer>
        <For each={FramerateOptions}>
          {(framerate) => (
            <Button
              onClick={() => setFramerate(framerate)}
              label={framerate}
              primary={selectedFramerate() === framerate}
            />
          )}
        </For>
      </OptionContainer>
      <LiveBitratePicker />
      <HeavyGameModePicker onChange={onHeavyGameChange} />
      <Show when={electronWindowAPI()?.isElectron && electronSourceId()}>
        <Checkbox
          label={
            isWindows||
            electronSourceId()?.includes("screen")
              ? t("mainPaneHeader.voice.screenShareModal.shareSystemAudio")
              : t("mainPaneHeader.voice.screenShareModal.shareAppAudio")
          }
          checked={shareSystemAudio()}
          onChange={setShareSystemAudio}
          class={css`
            margin-left: 6px;
            margin-top: 10px;
            margin-bottom: 10px;
          `}
        />
      </Show>
      <Show when={shareSystemAudio() && electronSourceId() && electronWindowAPI()?.isElectron &&  electronSourceId()?.includes("screen") && isWindows}>
        <Checkbox
          label={
            "Prevent Application Echo"
          }
          checked={preventEcho()}
          onChange={setPreventEcho}
          class={css`
            margin-left: 6px;
            margin-top: 10px;
            margin-bottom: 10px;
          `}
        />
      </Show>
      <Show when={electronWindowAPI()?.isElectron}>
        <ElectronCaptureSourceList ref={setElectronSourceId} />
      </Show>
    </LegacyModal>
  );
}

const constructConstraints = async (
  quality: (typeof QualityOptions)[number],
  framerate: (typeof FramerateOptions)[number],
  audio?: boolean
) => {
  // const supportedConstraints = navigator.mediaDevices?.getSupportedConstraints();
  const constraints: MediaStreamConstraints & {
    video: MediaTrackConstraints & { resizeMode: string };
  } = {
    video: {
      height: 0,
      width: 0,
      frameRate: 0,
      resizeMode: "none"
    },
    audio:
      electronWindowAPI()?.isElectron && !audio
        ? false
        : {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
  };

  // if (supportedConstraints?.suppressLocalAudioPlayback) {
  //   (constraints.audio as any).suppressLocalAudioPlayback = true
  // }

  switch (quality) {
    case "480p":
      constraints.video.width = 848;
      constraints.video.height = 480;
      break;
    case "720p":
      constraints.video.width = 1280;
      constraints.video.height = 720;
      break;
    case "1080p":
      constraints.video.width = 1920;
      constraints.video.height = 1080;
      break;
    default:
      constraints.video.width = window.screen.width;
      constraints.video.height = window.screen.height;
      break;
  }
  switch (framerate) {
    case "1fps 💀":
      constraints.video.frameRate = 1;
      break;
    case "10fps":
      constraints.video.frameRate = 10;
      break;
    case "30fps":
      constraints.video.frameRate = 30;
      break;
    case "60fps":
      constraints.video.frameRate = 60;
      break;
    case "Source":
      constraints.video.frameRate = await getRoundedFps();
      break;
    default:
      break;
  }

  return constraints;
};

const getRoundedFps = async () => {
  return Math.round((await getFPS()) / 10) * 10;
};

const getFPS = () => {
  return new Promise<number>((resolve) => {
    let fps = 0;
    let count = 0;
    const samples = 20;
    const fpsArray = new Array(samples).fill(0);
    const sampleInterval = setInterval(() => {
      requestAnimationFrame((t1) => {
        requestAnimationFrame((t2) => {
          fpsArray[count % samples] = 1000 / (t2 - t1);
          count++;
          if (count >= samples) {
            clearInterval(sampleInterval);
            fps = fpsArray.reduce((a, b) => a + b) / samples;
            resolve(Math.round(fps));
          }
        });
      });
    }, 1000 / 60);
  });
};

const SourcesContainer = styled("div")`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  width: 100%;
  max-width: 100%;
  height: min(38vh, 360px);
  margin-top: 8px;
  padding: 4px 0 8px;
  overflow: auto;
  gap: 10px;
  box-sizing: border-box;
`;

function ElectronCaptureSourceList(props: { ref: any }) {
  const [sources, setSources] = createSignal<ElectronCaptureSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = createSignal<string | null>(
    null
  );

  createEffect(() => {
    props.ref(() => selectedSourceId());
  });

  const fetchSources = async () => {
    const sources = await electronWindowAPI()?.getDesktopCaptureSources()!;

    const selectedExists = sources.find(
      (source) => selectedSourceId() === source.id
    );
    if (!selectedExists) {
      setSelectedSourceId(null);
    }

    setSources(sources);
  };

  onMount(() => {
    fetchSources();
    const timeoutId = window.setInterval(fetchSources, 3000);

    onCleanup(() => clearInterval(timeoutId));
  });

  return (
    <SourcesContainer>
      <For each={sources()}>
        {(source) => (
          <SourceItem
            source={source}
            onClick={() => setSelectedSourceId(source.id)}
            selected={selectedSourceId() === source.id}
          />
        )}
      </For>
    </SourcesContainer>
  );
}

const SourceItemContainer = styled("button")<{ selected?: boolean }>`
  position: relative;
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 0;
  overflow: hidden;
  border: 2px solid
    ${(props) =>
      props.selected ? "var(--primary-color)" : "transparent"};
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.1);
  cursor: pointer;
  user-select: none;
`;
const SourceItemImage = styled("img")`
  display: block;
  width: 100%;
  height: 110px;
  background-color: black;
  object-fit: contain;
`;
const SourceText = styled("span")`
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 18px 8px 8px;
  overflow: hidden;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.88));
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.3;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

function SourceItem(props: {
  source: ElectronCaptureSource;
  onClick: () => void;
  selected?: boolean;
}) {
  const label = () =>
    props.source.name?.trim() ||
    (props.source.id.includes("screen") ? "Tela" : "Janela");

  return (
    <SourceItemContainer
      type="button"
      onClick={props.onClick}
      selected={props.selected}
      title={label()}
    >
      <SourceItemImage src={props.source.thumbnailUrl} alt="" />
      <SourceText>{label()}</SourceText>
    </SourceItemContainer>
  );
}
