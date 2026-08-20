import style from "./Voiceheader.module.css";
import useStore from "@/chat-api/store/useStore";
import { cn, conditionalClass } from "@/common/classNames";
import Button from "@/components/ui/Button";
import {
  createEffect,
  createSignal,
  For,
  on,
  onCleanup,
  onMount,
  Show
} from "solid-js";
import { ScreenShareModal } from "../ScreenShareModal";
import { WebcamModal } from "../WebcamModal";
import { LiveStreamModal } from "../LiveStreamModal";
import { VoiceAudioSettingsModal } from "@/components/settings/VoiceAudioSettingsModal";
import { useCustomPortal } from "@/components/ui/custom-portal/CustomPortal";
import { useWindowProperties } from "@/common/useWindowProperties";
import Icon from "@/components/ui/icon/Icon";
import Avatar from "@/components/ui/Avatar";
import { CustomLink } from "@/components/ui/CustomLink";
import MemberContextMenu from "@/components/member-context-menu/MemberContextMenu";
import RouterEndpoints from "@/common/RouterEndpoints";
import { useMatch, useNavigate, useParams } from "solid-navigator";
import { VoiceUser, cachedVolumes, setCachedVolumes } from "@/chat-api/store/useVoiceUsers";
import { t } from "@nerimity/i18lite";

const [showParticipants, setShowParticipants] = createSignal(true);
type VoiceViewMode = "gallery" | "focus";
const [viewMode, setViewMode] = createSignal<VoiceViewMode>("gallery");
const [floatingViewMode, setFloatingViewMode] =
  createSignal<VoiceViewMode>("gallery");
const [floatPos, setFloatPos] = createSignal<{
  left: number;
  top: number;
} | null>(null);

export function VoiceHeader(props: { channelId?: string; floating?: boolean }) {
  let headerRef: HTMLDivElement | undefined;
  createEffect(() => {
    if (!showParticipants() && headerRef) {
      headerRef.style.height = "";
      headerRef.style.minHeight = "";
    }
  });
  const { voiceUsers, account } = useStore();

  const [selectedUserId, setSelectedUserId] = createSignal<null | string>(null);

  const channelVoiceUsers = () =>
    voiceUsers.getVoiceUsersByChannelId(props.channelId!);
  const videoStreamingUsers = () =>
    channelVoiceUsers().filter((v) => voiceUsers.videoEnabled(v.userId));
  const isHiddenLive = (user: VoiceUser) => {
    if (user.userId === account.user()?.id) return false;
    if (!voiceUsers.videoEnabled(user.userId)) return false;
    return !voiceUsers.isLiveWatched(user.userId);
  };
  const visibleStageUsers = () =>
    videoStreamingUsers().filter((user) => !isHiddenLive(user));
  const hiddenLiveUsers = () =>
    videoStreamingUsers().filter((user) => isHiddenLive(user));

  createEffect(
    on(videoStreamingUsers, (now, prev) => {
      if (!now?.length && !channelVoiceUsers().length) setSelectedUserId(null);
      if (!prev?.length && now.length) {
        setSelectedUserId(now[0]!.userId);
      }
      if (
        selectedUserId() &&
        videoStreamingUsers().every((user) => user.userId !== selectedUserId())
      ) {
        setSelectedUserId(now[0]?.userId ?? null);
      }
    })
  );

  const selectedVoiceUser = () => {
    const visible = visibleStageUsers();
    if (!selectedUserId()) return visible[0];
    return (
      visible.find((v) => v.userId === selectedUserId()) || visible[0]
    );
  };

  const isSomeoneVideoStreaming = () =>
    channelVoiceUsers().find((v) => voiceUsers.videoEnabled(v.userId));

  const displayMode = () =>
    props.floating ? floatingViewMode() : viewMode();
  const setDisplayMode = (mode: VoiceViewMode) =>
    props.floating ? setFloatingViewMode(mode) : setViewMode(mode);

  createEffect(() => {
    const selected = selectedUserId();
    const visible = visibleStageUsers();
    if (selected && visible.every((user) => user.userId !== selected)) {
      setSelectedUserId(visible[0]?.userId ?? null);
      if (displayMode() === "focus") setDisplayMode("gallery");
    }
  });

  const gridColumns = () => {
    const count = visibleStageUsers().length;
    if (count <= 1) return 1;
    if (count <= 4) return 2;
    if (count <= 9) return 3;
    return 4;
  };

  const onTileClick = (userId: string) => {
    const isSelf = userId === account.user()?.id;
    if (
      voiceUsers.videoEnabled(userId) &&
      !isSelf &&
      !voiceUsers.isLiveWatched(userId)
    ) {
      voiceUsers.setLiveWatched(userId, true);
      setSelectedUserId(userId);
      return;
    }
    if (
      displayMode() === "gallery" &&
      voiceUsers.videoEnabled(userId) &&
      voiceUsers.isLiveWatched(userId)
    ) {
      setSelectedUserId(userId);
      setDisplayMode("focus");
      return;
    }
    if (displayMode() === "focus" && userId === selectedUserId()) {
      setDisplayMode("gallery");
      return;
    }
    setSelectedUserId(userId);
  };

  return (
    <Show when={channelVoiceUsers().length}>
      <div
        ref={headerRef}
        class={cn(
          "voice-stage",
          style.headerVoiceParticipants,
          conditionalClass(isSomeoneVideoStreaming(), style.videoStream),
          conditionalClass(
            isSomeoneVideoStreaming() && displayMode() === "gallery",
            style.galleryView
          ),
          conditionalClass(
            isSomeoneVideoStreaming() && displayMode() === "focus",
            style.stageView
          ),
          conditionalClass(!showParticipants(), style.miniView),
          conditionalClass(props.floating, style.floating)
        )}
      >
        <Show when={showParticipants() || props.floating}>
          <div class={style.top}>
            <Show when={!isSomeoneVideoStreaming()}>
              <VoiceParticipants
                onClick={onTileClick}
                selectedUserId={selectedUserId()}
                channelId={props.channelId!}
              />
            </Show>
            <Show when={isSomeoneVideoStreaming() && displayMode() === "gallery"}>
              <div class={style.galleryLayout}>
                <div
                  class={style.videoGrid}
                  style={{
                    "grid-template-columns": `repeat(${gridColumns()}, minmax(0, 1fr))`
                  }}
                >
                  <For each={visibleStageUsers()}>
                    {(voiceUser) => (
                      <VoiceTile
                        voiceUser={voiceUser!}
                        selected={voiceUser.userId === selectedUserId()}
                        onClick={() => onTileClick(voiceUser.userId)}
                      />
                    )}
                  </For>
                </div>
                <HiddenLivesBar
                  users={hiddenLiveUsers()}
                  onWatch={onTileClick}
                />
              </div>
            </Show>
            <Show when={isSomeoneVideoStreaming() && displayMode() === "focus"}>
              <div class={style.stageLayout}>
                <Show when={selectedVoiceUser()}>
                  <div class={style.stageMain}>
                    <VoiceTile
                      voiceUser={selectedVoiceUser()!}
                      selected
                      large
                      onClick={() => onTileClick(selectedVoiceUser()!.userId)}
                    />
                  </div>
                </Show>
                <div class={style.filmstrip}>
                  <For each={visibleStageUsers()}>
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
                <HiddenLivesBar
                  users={hiddenLiveUsers()}
                  onWatch={onTileClick}
                />
              </div>
            </Show>
          </div>
        </Show>
        <Show when={!props.floating}>
          <VoiceActions
            channelId={props.channelId!}
            showViewToggle={!!isSomeoneVideoStreaming()}
          />
        </Show>
      </div>
    </Show>
  );
}

function HiddenLivesBar(props: {
  users: VoiceUser[];
  onWatch: (userId: string) => void;
}) {
  return (
    <Show when={props.users.length}>
      <div class={style.hiddenLives}>
        <div class={style.hiddenLivesLabel}>
          {t("mainPaneHeader.voice.hiddenLives")}
        </div>
        <div class={style.hiddenLivesList}>
          <For each={props.users}>
            {(voiceUser) => (
              <VoiceTile
                voiceUser={voiceUser!}
                filmstrip
                onClick={() => props.onWatch(voiceUser.userId)}
              />
            )}
          </For>
        </div>
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
  const params = useParams<{ serverId?: string }>();
  const [contextPosition, setContextPosition] = createSignal<{
    x: number;
    y: number;
  } | null>(null);
  const stream = () => voiceUsers.videoEnabled(props.voiceUser.userId);
  const watching = () => voiceUsers.isLiveWatched(props.voiceUser.userId);
  const showVideo = () => !!stream() && watching();
  const isSelf = () => props.voiceUser.userId === account.user()?.id;
  const user = () => props.voiceUser.user();
  const talking = () => props.voiceUser.voiceActivity;
  const isMuted = () => !voiceUsers.micEnabled(props.voiceUser.userId);
  const connected = () => props.voiceUser.connectionStatus === "CONNECTED";

  return (
    <>
      <MemberContextMenu
        position={contextPosition()}
        serverId={params.serverId}
        userId={props.voiceUser.userId}
        onClose={() => setContextPosition(null)}
      />
      <div
        class={cn(
          style.voiceTile,
          conditionalClass(showVideo(), style.hasVideo),
          conditionalClass(props.selected, style.selected),
          conditionalClass(talking(), style.talking),
          conditionalClass(props.large, style.large),
          conditionalClass(props.filmstrip, style.filmstripTile),
          !connected() && !isSelf() ? style.disconnected : null
        )}
        onClick={props.onClick}
        onDblClick={props.onDblClick}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setContextPosition({ x: event.clientX, y: event.clientY });
        }}
      >
      <Show
        when={showVideo()}
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
          userId={props.voiceUser.userId}
          compact
          filmstrip={props.filmstrip}
          large={props.large}
        />
      </Show>
      <Show when={!showVideo()}>
        <div class={style.tileName}>
          <Show when={isMuted()}>
            <Icon name="mic_off" size={14} color="white" />
          </Show>
          {user()?.username}
        </div>
      </Show>
      <Show when={!!stream() && !isSelf() && !watching()}>
        <div class={style.watchLiveOverlay}>
          <span class={style.livePausedBadge}>LIVE</span>
          <span class={style.watchLiveLabel}>
            {t("mainPaneHeader.voice.watchLive")}
          </span>
        </div>
      </Show>
      <Show when={!!stream() && !isSelf() && watching()}>
        <button
          type="button"
          class={style.unwatchLive}
          title={t("mainPaneHeader.voice.stopWatchingLive")}
          onClick={(event) => {
            event.stopPropagation();
            voiceUsers.setLiveWatched(props.voiceUser.userId, false);
          }}
        >
          <Icon name="visibility_off" size={16} />
        </button>
      </Show>
      </div>
    </>
  );
}

function VideoStream(props: {
  mediaStream: MediaStream;
  mute?: boolean;
  username?: string;
  userId?: string;
  compact?: boolean;
  filmstrip?: boolean;
  large?: boolean;
}) {
  let videoEl: HTMLVideoElement | undefined;
  const { voiceUsers } = useStore();

  const [playing, setPlaying] = createSignal(false);

  const voiceUser = () => {
    const channelId = voiceUsers.currentUser()?.channelId;
    if (!channelId || !props.userId) return undefined;
    return voiceUsers.getVoiceUser(channelId, props.userId);
  };

  const volume = () =>
    props.userId ? (cachedVolumes[props.userId] ?? 1) : 1;
  const isVolumeMuted = () => volume() === 0;
  const showVolumeControls = () => !props.mute && !!props.userId;
  const showFullscreen = () => !props.filmstrip;

  const applyVolume = (next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    if (!props.userId) return;
    setCachedVolumes(props.userId, clamped);
    const audio = voiceUser()?.audio;
    if (audio) audio.volume = clamped;
    if (videoEl) videoEl.volume = clamped;
  };

  const toggleVolumeMute = () => {
    applyVolume(isVolumeMuted() ? 1 : 0);
  };

  createEffect(() => {
    const userId = props.userId;
    if (!userId) return;
    const vol = cachedVolumes[userId] ?? 1;
    const audio = voiceUser()?.audio;
    if (audio && audio.volume !== vol) audio.volume = vol;
    if (videoEl && videoEl.volume !== vol) videoEl.volume = vol;
  });

  createEffect(
    on(
      () => voiceUser()?.audio,
      (audio) => {
        if (!audio || !props.userId) return;
        audio.volume = cachedVolumes[props.userId] ?? 1;
      }
    )
  );

  const tryPlay = () => {
    const el = videoEl;
    if (!el) return;
    el.playsInline = true;
    el.autoplay = true;
    if (!playing()) el.muted = true;
    void el
      .play()
      .then(() => {
        setPlaying(true);
        el.muted = props.mute || false;
        el.volume = volume();
      })
      .catch(() => {});
  };

  createEffect(() => {
    const el = videoEl;
    if (!el || !playing()) return;
    el.muted = !!props.mute;
  });

  const attachStream = (el?: HTMLVideoElement) => {
    if (!el) return;
    videoEl = el;
    el.srcObject = props.mediaStream;
    el.addEventListener("loadedmetadata", tryPlay);
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);
    tryPlay();
  };

  createEffect(() => {
    const stream = props.mediaStream;
    const el = videoEl;
    if (!el) return;
    if (el.srcObject !== stream) {
      setPlaying(false);
      el.srcObject = stream;
    }
    const onTrackUnmute = () => tryPlay();
    const tracks = stream.getVideoTracks();
    tracks.forEach((track) => {
      track.addEventListener("unmute", onTrackUnmute);
    });
    tryPlay();
    onCleanup(() => {
      tracks.forEach((track) => {
        track.removeEventListener("unmute", onTrackUnmute);
      });
    });
  });

  onMount(() => {
    const unlock = () => tryPlay();
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);

    const interval = window.setInterval(() => {
      const el = videoEl;
      if (!el) return;
      if (!el.paused && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        setPlaying(true);
        el.muted = !!props.mute;
        el.volume = volume();
        window.clearInterval(interval);
        return;
      }
      tryPlay();
    }, 200);

    onCleanup(() => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
      window.clearInterval(interval);
      videoEl?.removeEventListener("loadedmetadata", tryPlay);
      videoEl?.removeEventListener("loadeddata", tryPlay);
      videoEl?.removeEventListener("canplay", tryPlay);
    });
  });

  return (
    <div
      class={cn(
        style.videoContainer,
        conditionalClass(props.compact, style.compact),
        conditionalClass(props.filmstrip, style.compactFilmstrip)
      )}
    >
      <video
        ref={attachStream}
        autoplay
        playsinline
        muted
      />
      <Show when={props.username}>
        <div class={style.videoName}>{props.username}</div>
      </Show>
      <Show when={showVolumeControls() || showFullscreen()}>
        <div
          class={cn(
            style.videoControls,
            conditionalClass(props.filmstrip, style.videoControlsFilmstrip)
          )}
          onPointerDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
        >
          <Show when={showVolumeControls()}>
            <div class={style.volumeSlider}>
              <Button
                iconName={isVolumeMuted() ? "volume_off" : "volume_up"}
                iconSize={props.filmstrip ? 14 : 18}
                padding={props.filmstrip ? 4 : 6}
                color={
                  isVolumeMuted() ? "var(--alert-color)" : "var(--primary-color)"
                }
                margin={0}
                onClick={() => toggleVolumeMute()}
              />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume()}
                onInput={(event) => {
                  applyVolume(Number(event.currentTarget.value));
                }}
              />
            </div>
          </Show>
          <Show when={showFullscreen()}>
            <Button
              iconName="fullscreen"
              iconSize={props.filmstrip ? 14 : 18}
              title={t("mainPaneHeader.voice.fullscreen")}
              padding={props.filmstrip ? 4 : 6}
              margin={0}
              onClick={() => {
                videoEl?.requestFullscreen({ navigationUI: "hide" });
              }}
            />
          </Show>
        </div>
      </Show>
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
  const { isMobileAgent } = useWindowProperties();

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

  const onLiveControlsClick = () => {
    createPortal((close) => <LiveStreamModal close={close} />);
  };

  const onWebCamClick = () => {
    return createPortal((close) => <WebcamModal close={close} />);
  };

  const onAudioSettingsClick = () => {
    createPortal((close) => <VoiceAudioSettingsModal close={close} />);
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
            iconName="monitor"
            color="var(--success-color)"
            hoverText={t("mainPaneHeader.voice.liveControls.title")}
            onClick={onLiveControlsClick}
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

export function FloatingLivePreview() {
  const { voiceUsers, channels, servers } = useStore();
  const navigate = useNavigate();
  const { isMobileWidth } = useWindowProperties();
  const inboxMatch = useMatch(() => "/app/inbox/:id");
  const serverMatch = useMatch(() => "/app/servers/:serverId/:channelId");

  let liveRef: HTMLDivElement | undefined;
  let dragging = false;
  let didDrag = false;
  let startX = 0;
  let startY = 0;
  let origLeft = 0;
  let origTop = 0;
  const [grabbing, setGrabbing] = createSignal(false);
  const [hidden, setHidden] = createSignal(false);

  const callChannelId = () => voiceUsers.currentUser()?.channelId;
  const viewingChannelId = () =>
    serverMatch()?.params.channelId || inboxMatch()?.params.id;
  const isAwayFromCall = () =>
    !!callChannelId() && viewingChannelId() !== callChannelId();

  const channel = () => channels.get(callChannelId()!);
  const server = () => servers.get(channel()?.serverId!);

  const label = () => {
    const ch = channel();
    if (!ch) return "";
    if (server()) return `${server()!.name}#${ch.name}`;
    return ch.recipient()?.username || ch.name || "";
  };

  const goToCall = () => {
    const ch = channel();
    if (!ch) return;
    if (ch.serverId) {
      navigate(RouterEndpoints.SERVER_MESSAGES(ch.serverId, ch.id));
      return;
    }
    navigate(RouterEndpoints.INBOX_MESSAGES(ch.id));
  };

  const clampPos = (left: number, top: number) => {
    const w = liveRef?.offsetWidth ?? 380;
    const h = liveRef?.offsetHeight ?? 240;
    return {
      left: Math.max(8, Math.min(window.innerWidth - w - 8, left)),
      top: Math.max(8, Math.min(window.innerHeight - h - 8, top))
    };
  };

  const onBarPointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || !liveRef) return;
    const rect = liveRef.getBoundingClientRect();
    dragging = true;
    didDrag = false;
    startX = event.clientX;
    startY = event.clientY;
    origLeft = rect.left;
    origTop = rect.top;
    setGrabbing(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const onBarPointerMove = (event: PointerEvent) => {
    if (!dragging) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (!didDrag && dx * dx + dy * dy < 25) return;
    didDrag = true;
    setFloatPos(clampPos(origLeft + dx, origTop + dy));
  };

  const onBarPointerUp = () => {
    if (!dragging) return;
    dragging = false;
    setGrabbing(false);
    if (!didDrag) goToCall();
  };

  createEffect(() => {
    if (!isAwayFromCall()) setHidden(false);
  });

  const hidePreview = (event: Event) => {
    event.stopPropagation();
    event.preventDefault();
    dragging = false;
    setGrabbing(false);
    setHidden(true);
  };

  const floatStyle = () =>
    floatPos()
      ? {
          left: `${floatPos()!.left}px`,
          top: `${floatPos()!.top}px`,
          right: "auto",
          bottom: "auto"
        }
      : undefined;

  createEffect(() => {
    if (!isAwayFromCall()) return;
    const onResize = () => {
      const pos = floatPos();
      if (!pos) return;
      setFloatPos(clampPos(pos.left, pos.top));
    };
    window.addEventListener("resize", onResize);
    onCleanup(() => window.removeEventListener("resize", onResize));
  });

  return (
    <Show when={isAwayFromCall()}>
      <Show
        when={!hidden()}
        fallback={
          <button
            type="button"
            class={cn(
              style.floatingLiveChip,
              conditionalClass(
                isMobileWidth() && !floatPos(),
                style.floatingLiveMobile
              )
            )}
            style={floatStyle()}
            title={t("mainPaneHeader.voice.showPreview")}
            onClick={() => setHidden(false)}
          >
            <Icon name="videocam" size={16} />
            <span class={style.floatingLiveChipLabel}>{label()}</span>
            <span class={style.floatingLiveChipButton}>
              <Icon name="open_in_full" size={16} />
            </span>
          </button>
        }
      >
        <div
          ref={liveRef}
          class={cn(
            style.floatingLive,
            conditionalClass(
              isMobileWidth() && !floatPos(),
              style.floatingLiveMobile
            ),
            conditionalClass(grabbing(), style.floatingLiveGrabbing)
          )}
          style={floatStyle()}
        >
          <div
            class={style.floatingLiveBar}
            onPointerDown={onBarPointerDown}
            onPointerMove={onBarPointerMove}
            onPointerUp={onBarPointerUp}
            onPointerCancel={onBarPointerUp}
          >
            <Icon name="drag_indicator" size={16} />
            <Icon name="videocam" size={14} />
            <span class={style.floatingLiveBarLabel}>{label()}</span>
            <button
              type="button"
              class={style.floatingLiveHide}
              title={t("mainPaneHeader.voice.hidePreview")}
              onPointerDown={hidePreview}
              onPointerUp={(event) => event.stopPropagation()}
              onClick={hidePreview}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
          <VoiceHeader channelId={callChannelId()!} floating />
        </div>
      </Show>
    </Show>
  );
}
