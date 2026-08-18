import style from "./Voiceheader.module.css";
import useStore from "@/chat-api/store/useStore";
import { cn, conditionalClass } from "@/common/classNames";
import Button from "@/components/ui/Button";
import {
  createEffect,
  createSignal,
  For,
  on,
  Show
} from "solid-js";
import { ScreenShareModal } from "../ScreenShareModal";
import { WebcamModal } from "../WebcamModal";
import { VoiceAudioSettingsModal } from "@/components/settings/VoiceAudioSettingsModal";
import { useCustomPortal } from "@/components/ui/custom-portal/CustomPortal";
import { useWindowProperties } from "@/common/useWindowProperties";
import Icon from "@/components/ui/icon/Icon";
import Avatar from "@/components/ui/Avatar";
import { CustomLink } from "@/components/ui/CustomLink";
import MemberContextMenu from "@/components/member-context-menu/MemberContextMenu";
import RouterEndpoints from "@/common/RouterEndpoints";
import { useParams } from "solid-navigator";
import { VoiceUser } from "@/chat-api/store/useVoiceUsers";
import { t } from "@nerimity/i18lite";
import { useDrawer } from "@/components/ui/drawer/Drawer";
import { showLiveChat, setShowLiveChat, toggleLiveChat } from "./liveLayout";

const [showParticipants, setShowParticipants] = createSignal(true);
type VoiceViewMode = "gallery" | "focus";
const [viewMode, setViewMode] = createSignal<VoiceViewMode>("focus");

export function VoiceHeader(props: { channelId?: string }) {
  let headerRef: HTMLDivElement | undefined;
  const { voiceUsers } = useStore();

  const [selectedUserId, setSelectedUserId] = createSignal<null | string>(null);

  const channelId = () =>
    props.channelId || voiceUsers.currentUser()?.channelId;

  const channelVoiceUsers = () => {
    const id = channelId();
    if (!id) return [];
    return voiceUsers.getVoiceUsersByChannelId(id);
  };
  const videoStreamingUsers = () =>
    channelVoiceUsers().filter((v) => voiceUsers.videoEnabled(v.userId));

  createEffect(
    on(videoStreamingUsers, (now, prev) => {
      if (!now?.length && !channelVoiceUsers().length) setSelectedUserId(null);
      if (!prev?.length && now.length) {
        setSelectedUserId(now[0]!.userId);
      }
      if (
        selectedUserId() &&
        channelVoiceUsers().every((user) => user.userId !== selectedUserId())
      ) {
        setSelectedUserId(now[0]?.userId ?? channelVoiceUsers()[0]?.userId ?? null);
      }
    })
  );

  const selectedVoiceUser = () => {
    if (!selectedUserId()) return channelVoiceUsers()[0];
    return (
      channelVoiceUsers().find((v) => v.userId === selectedUserId()) ||
      channelVoiceUsers()[0]
    );
  };

  const isSomeoneVideoStreaming = () =>
    channelVoiceUsers().find((v) => voiceUsers.videoEnabled(v.userId));

  createEffect(() => {
    const el = headerRef;
    if (!el) return;
    if (isSomeoneVideoStreaming()) {
      el.style.setProperty("height", "calc(100dvh - 80px)", "important");
      el.style.setProperty("min-height", "420px", "important");
      el.style.setProperty("max-height", "none", "important");
      el.style.resize = "none";
    } else {
      el.style.removeProperty("height");
      el.style.removeProperty("min-height");
      el.style.removeProperty("max-height");
      el.style.resize = "";
    }
  });

  createEffect(
    on(
      () => !!isSomeoneVideoStreaming(),
      (streaming, wasStreaming) => {
        if (streaming && !wasStreaming) setShowLiveChat(false);
        else if (!streaming && wasStreaming) setShowLiveChat(true);
      }
    )
  );

  const gridColumns = () => {
    const count = channelVoiceUsers().length;
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    return 4;
  };

  const onTileClick = (userId: string) => {
    setSelectedUserId(userId);
    if (viewMode() === "gallery" && voiceUsers.videoEnabled(userId)) {
      setViewMode("focus");
    }
  };

  return (
    <Show when={channelVoiceUsers().length && isSomeoneVideoStreaming()}>
      <div
        ref={headerRef}
        class={cn(
          "voice-stage",
          style.headerVoiceParticipants,
          conditionalClass(isSomeoneVideoStreaming(), style.videoStream),
          conditionalClass(
            isSomeoneVideoStreaming() && viewMode() === "gallery",
            style.galleryView
          ),
          conditionalClass(
            isSomeoneVideoStreaming() && viewMode() === "focus",
            style.stageView
          ),
          conditionalClass(!showParticipants(), style.miniView)
        )}
      >
        <Show when={showParticipants()}>
          <div class={style.top}>
            <Show when={!isSomeoneVideoStreaming()}>
              <VoiceParticipants
                onClick={onTileClick}
                selectedUserId={selectedUserId()}
                channelId={channelId()!}
              />
            </Show>
            <Show when={isSomeoneVideoStreaming() && viewMode() === "gallery"}>
              <div
                class={style.videoGrid}
                style={{
                  "grid-template-columns": `repeat(${gridColumns()}, minmax(0, 1fr))`
                }}
              >
                <For each={channelVoiceUsers()}>
                  {(voiceUser) => (
                    <VoiceTile
                      voiceUser={voiceUser!}
                      selected={voiceUser.userId === selectedUserId()}
                      onClick={() => onTileClick(voiceUser.userId)}
                    />
                  )}
                </For>
              </div>
            </Show>
            <Show when={isSomeoneVideoStreaming() && viewMode() === "focus"}>
              <div class={style.stageLayout}>
                <Show when={selectedVoiceUser()}>
                  <div class={style.stageMain}>
                    <VoiceTile
                      voiceUser={selectedVoiceUser()!}
                      selected
                      large
                    />
                  </div>
                </Show>
                <div class={style.filmstrip}>
                  <For each={channelVoiceUsers()}>
                    {(voiceUser) => (
                      <VoiceTile
                        voiceUser={voiceUser!}
                        selected={voiceUser.userId === selectedUserId()}
                        filmstrip
                        onClick={() => onTileClick(voiceUser.userId)}
                      />
                    )}
                  </For>
                </div>
              </div>
            </Show>
          </div>
        </Show>
        <VoiceActions
          channelId={channelId()!}
          showViewToggle={!!isSomeoneVideoStreaming()}
        />
      </div>
    </Show>
  );
}

function VoiceTile(props: {
  voiceUser: VoiceUser;
  selected?: boolean;
  large?: boolean;
  filmstrip?: boolean;
  onClick?: () => void;
  onDblClick?: () => void;
}) {
  const { voiceUsers, account } = useStore();
  const stream = () => voiceUsers.videoEnabled(props.voiceUser.userId);
  const isSelf = () => props.voiceUser.userId === account.user()?.id;
  const user = () => props.voiceUser.user();
  const talking = () => props.voiceUser.voiceActivity;
  const isMuted = () => !voiceUsers.micEnabled(props.voiceUser.userId);
  const connected = () => props.voiceUser.connectionStatus === "CONNECTED";

  return (
    <div
      class={cn(
        style.voiceTile,
        conditionalClass(!!stream(), style.hasVideo),
        conditionalClass(props.selected, style.selected),
        conditionalClass(talking(), style.talking),
        conditionalClass(props.large, style.large),
        conditionalClass(props.filmstrip, style.filmstripTile),
        !connected() && !isSelf() ? style.disconnected : null
      )}
      onClick={props.onClick}
      onDblClick={props.onDblClick}
    >
      <Show
        when={stream()}
        fallback={
          <div class={style.tileAvatar}>
            <Show when={user()}>
              <Avatar
                user={user()!}
                size={props.filmstrip ? 40 : props.large ? 96 : 72}
                voiceIndicator
                animate={talking()}
              />
            </Show>
          </div>
        }
      >
        <VideoStream
          mediaStream={stream()!}
          mute={isSelf()}
          username={user()?.username}
          compact
        />
      </Show>
      <Show when={!stream()}>
        <div class={style.tileName}>
          <Show when={isMuted()}>
            <Icon name="mic_off" size={14} color="white" />
          </Show>
          {user()?.username}
        </div>
      </Show>
    </div>
  );
}

function VideoStream(props: {
  mediaStream: MediaStream;
  mute?: boolean;
  username?: string;
  compact?: boolean;
}) {
  let videoEl: HTMLVideoElement | undefined;

  const [muted, setMuted] = createSignal(false);
  const [playbackReady, setPlaybackReady] = createSignal(false);

  const shouldMute = () => props.mute || muted() || !playbackReady();

  const startPlayback = (el: HTMLVideoElement) => {
    el.muted = true;
    el.playsInline = true;
    void el
      .play()
      .then(() => setPlaybackReady(true))
      .catch(() => {
        const unlock = () => {
          void el.play().then(() => setPlaybackReady(true));
          document.removeEventListener("pointerdown", unlock);
        };
        document.addEventListener("pointerdown", unlock, { once: true });
      });
  };

  const attachStream = (el?: HTMLVideoElement) => {
    if (!el) return;
    videoEl = el;
    el.srcObject = props.mediaStream;
    startPlayback(el);
  };

  createEffect(() => {
    const stream = props.mediaStream;
    const el = videoEl;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      setPlaybackReady(false);
      startPlayback(el);
    }
    el.muted = shouldMute();
  });

  return (
    <div
      class={cn(
        style.videoContainer,
        conditionalClass(props.compact, style.compact)
      )}
    >
      <video
        ref={attachStream}
        autoplay
        playsinline
        muted={shouldMute()}
      />
      <Show when={props.username}>
        <div class={style.videoName}>{props.username}</div>
      </Show>
      <div class={style.videoOverlay}>
        <Show when={!props.mute}>
          <div class={style.volumeSlider}>
            <Button
              iconName={muted() ? "volume_off" : "volume_up"}
              iconSize={18}
              padding={6}
              color={muted() ? "var(--alert-color)" : "var(--primary-color)"}
              margin={0}
              onClick={(event) => {
                event.stopPropagation();
                setMuted(!muted());
              }}
            />
            <input
              type="range"
              min={0}
              value={muted() ? 0 : videoEl!.volume}
              max={1}
              step={0.01}
              onClick={(event) => event.stopPropagation()}
              onInput={(e) => {
                videoEl!.volume = parseFloat(e.target.value);
                setMuted(false);
              }}
            />
          </div>
        </Show>
        <Button
          iconName="fullscreen"
          iconSize={18}
          title={t("mainPaneHeader.voice.fullscreen")}
          padding={6}
          margin={0}
          onClick={(event) => {
            event.stopPropagation();
            videoEl?.requestFullscreen({ navigationUI: "hide" });
          }}
        />
      </div>
    </div>
  );
}

function VoiceParticipants(props: {
  channelId: string;
  selectedUserId?: string | null;
  size?: "small";
  onClick: (userId: string) => void;
}) {
  const { voiceUsers } = useStore();

  const channelVoiceUsers = () =>
    voiceUsers.getVoiceUsersByChannelId(props.channelId!);

  return (
    <div class={style.voiceParticipants}>
      <For each={channelVoiceUsers()}>
        {(voiceUser) => (
          <VoiceParticipantItem
            onClick={() => props.onClick(voiceUser.userId)}
            selected={voiceUser.userId === props.selectedUserId}
            voiceUser={voiceUser!}
            size={props.size}
          />
        )}
      </For>
    </div>
  );
}

function VoiceParticipantItem(props: {
  voiceUser: VoiceUser;
  selected: boolean;
  size?: "small";
  onClick: () => void;
}) {
  const { createRegisteredPortal } = useCustomPortal();
  const { voiceUsers, account } = useStore();
  const params = useParams<{ serverId?: string; channelId?: string }>();
  const [contextPosition, setContextPosition] = createSignal<null | {
    x: number;
    y: number;
  }>(null);

  const showProfileFlyout = (event: MouseEvent) => {
    event.preventDefault();
    const el = event.target as HTMLElement;
    const rect = el?.getBoundingClientRect()!;
    const pos = {
      left: rect.left + 40,
      top: rect.top,
      anchor: "left"
    } as const;

    createRegisteredPortal(
      "ProfileFlyout",
      {
        triggerEl: el,
        position: pos,
        serverId: params.serverId,
        close: close,
        userId: props.voiceUser.userId
      },
      "profile-pane-flyout-" + props.voiceUser.userId,
      true
    );
  };

  const isMuted = () => {
    return !voiceUsers.micEnabled(props.voiceUser.userId);
  };

  const connected = () => props.voiceUser.connectionStatus === "CONNECTED";

  const isVideoStreaming = () =>
    voiceUsers.videoEnabled(props.voiceUser.userId);

  const isInCall = () =>
    voiceUsers.currentUser()?.channelId === props.voiceUser.channelId;
  const talking = () => props.voiceUser.voiceActivity;
  const user = () => props.voiceUser.user()!;

  const onClick = (event: MouseEvent) => {
    if (props.size !== "small") return showProfileFlyout(event);
    event.preventDefault();
    if (!props.selected) {
      props.onClick();
      return;
    }
    showProfileFlyout(event);
  };
  const onContextMenu = (event: MouseEvent) => {
    event.preventDefault();
    setContextPosition({ x: event.clientX, y: event.clientY });
  };

  const isSelf = () => user().id === account.user()?.id;

  return (
    <>
      <MemberContextMenu
        position={contextPosition()}
        serverId={params.serverId}
        userId={user().id}
        onClose={() => {
          setContextPosition(null);
        }}
      />
      <CustomLink
        onContextMenu={onContextMenu}
        onClick={onClick}
        href={RouterEndpoints.PROFILE(user().id)}
        class={cn(
          "trigger-profile-flyout",
          style.voiceParticipantItem,
          !connected() && !isSelf() && isInCall() ? style.disconnected : null,
          conditionalClass(props.selected, style.selected)
        )}
      >
        <Avatar
          user={user()}
          size={props.size === "small" ? 40 : 60}
          voiceIndicator
          animate={talking()}
        />
        <Show when={isMuted() && isInCall()}>
          <Icon class={style.muteIcon} name="mic_off" color="white" size={16} />
        </Show>
        <Show when={isVideoStreaming()}>
          <Icon
            class={style.videoStreamIcon}
            name="monitor"
            color="white"
            size={16}
          />
        </Show>
      </CustomLink>
    </>
  );
}

function VoiceActions(props: {
  channelId: string;
  showViewToggle?: boolean;
}) {
  const { voiceUsers, channels } = useStore();
  const { createPortal } = useCustomPortal();
  const { isMobileAgent, isMobileWidth } = useWindowProperties();
  const drawer = useDrawer();

  const currentVoiceUser = () => voiceUsers.currentUser();

  const channel = () => channels.get(props.channelId);

  const onCallClick = async () => {
    channel()?.joinCall();
  };

  const onCallEndClick = async () => {
    channel()?.leaveCall();
  };

  const isInCall = () =>
    voiceUsers.currentUser()?.channelId === props.channelId;

  const onScreenShareClick = () => {
    createPortal((close) => <ScreenShareModal close={close} />);
  };

  const onWebCamClick = () => {
    return createPortal((close) => <WebcamModal close={close} />);
  };

  const onAudioSettingsClick = () => {
    createPortal((close) => <VoiceAudioSettingsModal close={close} />);
  };

  const onStopScreenShareClick = () => {
    voiceUsers.setVideoStream(null);
  };

  return (
    <div class={style.voiceActions}>
      <Show when={showParticipants()}>
        <Button
          iconName="keyboard_arrow_up"
          color="rgba(255,255,255,0.6)"
          onClick={() => setShowParticipants(false)}
        />
      </Show>
      <Show when={!showParticipants()}>
        <Button
          iconName="keyboard_arrow_down"
          color="rgba(255,255,255,0.6)"
          onClick={() => setShowParticipants(true)}
        />
      </Show>
      <Show when={props.showViewToggle && showParticipants()}>
        <Button
          iconName={viewMode() === "gallery" ? "crop_free" : "grid_view"}
          color="rgba(255,255,255,0.6)"
          title={viewMode() === "gallery" ? "Focus" : "Gallery"}
          onClick={() =>
            setViewMode(viewMode() === "gallery" ? "focus" : "gallery")
          }
        />
      </Show>
      <Show when={props.showViewToggle && !isMobileWidth()}>
        <Button
          iconName="forum"
          color={showLiveChat() ? "var(--primary-color)" : "rgba(255,255,255,0.6)"}
          hoverText={
            showLiveChat()
              ? t("mainPaneHeader.voice.hideChat")
              : t("mainPaneHeader.voice.showChat")
          }
          onClick={toggleLiveChat}
        />
        <Button
          iconName="menu"
          color={
            drawer.hideLeftDrawer()
              ? "rgba(255,255,255,0.6)"
              : "var(--primary-color)"
          }
          hoverText={
            drawer.hideLeftDrawer()
              ? t("mainPaneHeader.voice.showChannels")
              : t("mainPaneHeader.voice.hideChannels")
          }
          onClick={drawer.toggleHideLeftDrawer}
        />
        <Show when={drawer.hasRightDrawer()}>
          <Button
            iconName="group"
            color={
              drawer.hideRightDrawer()
                ? "rgba(255,255,255,0.6)"
                : "var(--primary-color)"
            }
            hoverText={
              drawer.hideRightDrawer()
                ? t("mainPaneHeader.voice.showMembers")
                : t("mainPaneHeader.voice.hideMembers")
            }
            onClick={drawer.toggleHideRightDrawer}
          />
        </Show>
      </Show>
      <Show when={!isInCall()}>
        <Button
          iconName="call"
          color="var(--success-color)"
          onClick={onCallClick}
          label={t("mainPaneHeader.voice.join")}
        />
      </Show>
      <Show when={isInCall()}>
        <Show when={!currentVoiceUser()?.videoStream && !isMobileAgent()}>
          <Button iconName="monitor" onClick={onScreenShareClick} />
        </Show>
        <Show when={!currentVoiceUser()?.videoStream}>
          <Button iconName="videocam" onClick={onWebCamClick} />
        </Show>
        <Show when={currentVoiceUser()?.videoStream}>
          <Button
            iconName="desktop_access_disabled"
            onClick={onStopScreenShareClick}
            color="var(--alert-color)"
          />
        </Show>
        <VoiceDeafenActions />
        <VoiceMicActions />
        <Button
          iconName="settings_voice"
          color="rgba(255,255,255,0.6)"
          hoverText={t("mainPaneHeader.voice.audioSettings")}
          onClick={onAudioSettingsClick}
        />
        <Button
          iconName="call_end"
          color="var(--alert-color)"
          onClick={onCallEndClick}
          label={t("mainPaneHeader.voice.leave")}
        />
      </Show>
    </div>
  );
}

function VoiceMicActions() {
  const {
    voiceUsers: { isLocalMicMuted, toggleMic, deafened }
  } = useStore();

  return (
    <Show when={!deafened.enabled}>
      <Show when={isLocalMicMuted()}>
        <Button
          iconName="mic_off"
          color="var(--alert-color)"
          label={t("mainPaneHeader.voice.muted")}
          onClick={toggleMic}
        />
      </Show>
      <Show when={!isLocalMicMuted()}>
        <Button
          iconName="mic"
          color="var(--success-color)"
          onClick={toggleMic}
        />
      </Show>
    </Show>
  );
}
function VoiceDeafenActions() {
  const { voiceUsers } = useStore();

  const isDeafened = () => voiceUsers.deafened.enabled;

  return (
    <>
      <Show when={isDeafened()}>
        <Button
          iconName="headset_off"
          color="var(--alert-color)"
          label={t("mainPaneHeader.voice.deafened")}
          onClick={voiceUsers.toggleDeafen}
        />
      </Show>
      <Show when={!isDeafened()}>
        <Button
          iconName="headset_mic"
          color="var(--primary-color)"
          onClick={voiceUsers.toggleDeafen}
        />
      </Show>
    </>
  );
}
