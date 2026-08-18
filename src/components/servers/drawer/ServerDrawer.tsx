import {
  Show,
  For,
  Switch,
  Match,
  createSignal,
  createMemo
} from "solid-js";
import style from "./style.module.scss";
import ServerDrawerHeader from "./header/ServerDrawerHeader";
import {
  CategoryControllerProvider,
  ServerDrawerControllerProvider,
  useCategoryController,
  useServerDrawerController
} from "./ServerDrawerController";
import { Skeleton } from "@/components/ui/skeleton/Skeleton";
import useStore from "@/chat-api/store/useStore";
import { ChannelType, ServerNotificationPingMode } from "@/chat-api/RawData";
import { Channel } from "@/chat-api/store/useChannels";
import { cn } from "@/common/classNames";
import { Tooltip } from "@/components/ui/Tooltip";
import Button from "@/components/ui/Button";
import Icon from "@/components/ui/icon/Icon";
import { ChannelIcon } from "@/components/ChannelIcon";
import { t } from "@nerimity/i18lite";
import { messagesPreloader } from "@/common/createPreloader";
import RouterEndpoints from "@/common/RouterEndpoints";
import { Item } from "@/components/ui/Item";
import { emitDrawerGoToMain } from "@/common/GlobalEvents";
import { styled } from "solid-styled-components";
import { FlexColumn } from "@/components/ui/Flexbox";
import Avatar from "@/components/ui/Avatar";
import InVoiceActions from "@/components/InVoiceActions";
import { useWindowProperties } from "@/common/useWindowProperties";
import { useMatch, useParams } from "solid-navigator";
import ContextMenuServerChannel from "../context-menu/ContextMenuServerChannel";

const ServerDrawer = () => {
  return (
    <ServerDrawerControllerProvider>
      <ServerDrawerContent />
    </ServerDrawerControllerProvider>
  );
};

const ServerDrawerContent = () => {
  const params = useParams<{ serverId: string }>();
  const store = useStore();
  const { isMobileWidth } = useWindowProperties();
  const controller = useServerDrawerController();

  const server = () => store.servers.get(params.serverId);
  return (
    <>
      <Show when={controller?.contextMenuDetails()}>
        <ContextMenuServerChannel
          {...controller?.contextMenuDetails()}
          onClose={() => controller?.setContextMenuDetails(undefined)}
        />
      </Show>
      <ServerDrawerHeader />
      <div class={style.serverDrawer}>
        <div class={style.serverDrawerInner}>
          <Show when={server()?.joinedThisSession}>
            <JoinedThisSessionNotificationNotice />
          </Show>
          <MembersItem />
          <Show when={server()?._count?.welcomeQuestions}>
            <CustomizeItem />
          </Show>
          <ChannelList />
          <InVoiceActions
            style={
              isMobileWidth()
                ? { bottom: "calc(var(--bottom-pane-gap) + 6px)" }
                : {}
            }
          />
        </div>
      </div>
    </>
  );
};

const CustomizeItem = () => {
  const params = useParams<{ serverId: string }>();
  const match = useMatch(() =>
    RouterEndpoints.SERVER_MESSAGES(params.serverId!, "welcome")
  );
  return (
    <div class={style.welcomeItemContainer}>
      <Item.Root
        href={RouterEndpoints.SERVER_MESSAGES(params.serverId!, "welcome")}
        onClick={() => emitDrawerGoToMain()}
        selected={!!match()}
      >
        <Item.Icon>tune</Item.Icon>
        <Item.Label>{t("channelDrawer.customize.title")}</Item.Label>
      </Item.Root>
    </div>
  );
};
const MembersItem = () => {
  const params = useParams<{ serverId: string }>();
  const match = useMatch(() =>
    RouterEndpoints.SERVER_MESSAGES(params.serverId!, "members")
  );
  return (
    <div class={style.membersItemContainer}>
      <Item.Root
        href={RouterEndpoints.SERVER_MESSAGES(params.serverId!, "members")}
        onClick={() => emitDrawerGoToMain()}
        selected={!!match()}
      >
        <Item.Icon>group</Item.Icon>
        <Item.Label>{t("informationDrawer.members")}</Item.Label>
      </Item.Root>
    </div>
  );
};

const ChannelList = () => {
  const store = useStore();
  const controller = useServerDrawerController();

  return (
    <div class={style.channelList}>
      <Show
        when={store.account.lastAuthenticatedAt()}
        fallback={<ChannelListSkeleton />}
      >
        <For each={controller?.sortedRootChannels()}>
          {(channel) => (
            <Switch
              fallback={
                <ChannelItem
                  expanded={true}
                  channel={channel!}
                  selected={controller?.params().channelId === channel!.id}
                />
              }
            >
              <Match when={channel!.type === ChannelType.CATEGORY}>
                <CategoryControllerProvider channel={channel}>
                  <CategoryItem
                    channel={channel!}
                    selected={controller?.params().channelId === channel!.id}
                  />
                </CategoryControllerProvider>
              </Match>
            </Switch>
          )}
        </For>
      </Show>
    </div>
  );
};

const ChannelListSkeleton = () => {
  return (
    <Skeleton.List>
      <Skeleton.Item height="34px" width="100%" />
    </Skeleton.List>
  );
};

function CategoryItem(props: { channel: Channel; selected: boolean }) {
  const controller = useServerDrawerController();
  const categoryController = useCategoryController();
  const [hovered, setHovered] = createSignal(false);

  const sortedServerChannels = () =>
    categoryController!.sortedCategoryChannels();

  const isPrivateCategory = () =>
    controller?.privateChannelIds().includes(props.channel.id);

  const expanded = createMemo(
    () => controller?.expanded(props.channel) ?? false
  );

  return (
    <Show when={!isPrivateCategory() || sortedServerChannels().length}>
      <div
        class={style.categoryContainer}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          class={style.categoryItemContainer}
          onClick={() => controller?.toggleExpanded(props.channel)}
          classList={{ [style.hide!]: !expanded() }}
        >
          <Icon
            size={14}
            name="keyboard_arrow_down"
            class={cn(expanded() && style.expanded, style.expandIcon)}
          />

          <ChannelIcon
            icon={props.channel.icon}
            type={props.channel.type}
            hovered={hovered()}
            class={style.categoryItemChannelIcon}
          />
          <Show when={isPrivateCategory()}>
            <Icon name="lock" size={14} style={{ opacity: 0.3 }} />
          </Show>
          <div class={style.label}>{props.channel.name}</div>

          <div class={style.categoryButtons}>
            <Show when={controller!.hasModeratorPermission()}>
              <Tooltip tooltip={t("channelDrawer.addChannel")}>
                <Button
                  class={style.addChannelButton}
                  padding={4}
                  margin={0}
                  iconName="add"
                  iconSize={16}
                  onClick={(e) =>
                    controller!.onAddChannelClick(e, props.channel.id)
                  }
                />
              </Tooltip>
            </Show>
          </div>
        </div>

        <Show when={sortedServerChannels().length}>
          <div class={style.categoryChannelList}>
            <For each={sortedServerChannels()}>
              {(channel) => (
                <ChannelItem
                  expanded={expanded()}
                  channel={channel!}
                  selected={controller?.params().channelId === channel!.id}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
    </Show>
  );
}

function ChannelItem(props: {
  channel: Channel;
  selected: boolean;
  expanded: boolean;
}) {
  const controller = useServerDrawerController();
  const { voiceUsers } = useStore();
  const [hovered, setHovered] = createSignal(false);

  const onMouseEnter = () => {
    setHovered(true);
    messagesPreloader.preload(props.channel.id);
  };

  const hasNotifications = () => props.channel.hasNotifications();

  const isPrivateChannel = () =>
    controller?.privateChannelIds().includes(props.channel.id);

  const onChannelDblClick = (event: MouseEvent) => {
    event.preventDefault();
    if (voiceUsers.currentUser()?.channelId === props.channel.id) return;
    props.channel.joinCall();
  };

  return (
    <Show when={props.expanded || props.selected || hasNotifications()}>
      <Item.Root
        onContextMenu={(e) =>
          controller?.onChannelContextMenu(e, props.channel)
        }
        href={RouterEndpoints.SERVER_MESSAGES(
          props.channel.serverId!,
          props.channel.id
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={() => setHovered(false)}
        selected={props.selected}
        alert={!!hasNotifications()}
        onClick={() => emitDrawerGoToMain()}
        onDblClick={onChannelDblClick}
        class={style.channelItem}
      >
        <ChannelIcon
          icon={props.channel.icon}
          type={props.channel.type}
          hovered={hovered()}
        />
        <Item.Label>{props.channel.name}</Item.Label>
        <Show when={isPrivateChannel()}>
          <Icon
            name="lock"
            size={14}
            style={{ opacity: 0.3, "margin-right": "5px" }}
          />
        </Show>
        <Show when={props.channel.mentionCount()}>
          <div class={style.mentionCount}>{props.channel.mentionCount()}</div>
        </Show>
      </Item.Root>
      <ChannelItemVoiceUsers channelId={props.channel.id} />
    </Show>
  );
}
const ChannelVoiceUsersContainer = styled(FlexColumn)`
  gap: 2px;
  padding: 2px 4px 4px 22px;
  margin-bottom: 4px;
`;

const VoiceUserRow = styled("div")`
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 4px 6px;
  overflow: visible;
  border-radius: 4px;
  gap: 8px;
  cursor: default;
  &:hover {
    background-color: rgba(255, 255, 255, 0.06);
  }
`;

const VoiceUserName = styled("span")`
  overflow: hidden;
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const LiveBadge = styled("span")`
  flex-shrink: 0;
  padding: 1px 5px;
  border-radius: 3px;
  background-color: #ed4245;
  color: white;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.4px;
`;

function ChannelItemVoiceUsers(props: { channelId: string }) {
  const { voiceUsers } = useStore();

  const channelVoiceUsers = () =>
    voiceUsers.getVoiceUsersByChannelId(props.channelId);

  return (
    <Show when={channelVoiceUsers().length}>
      <ChannelVoiceUsersContainer>
        <For each={channelVoiceUsers()}>
          {(voiceUser) => (
            <VoiceUserRow>
              <Avatar
                user={voiceUser!.user()}
                size={20}
                voiceIndicator
                animate={voiceUser!.voiceActivity}
              />
              <VoiceUserName>{voiceUser!.user()?.username}</VoiceUserName>
              <Show when={voiceUsers.videoEnabled(voiceUser!.userId)}>
                <LiveBadge>LIVE</LiveBadge>
              </Show>
              <Show when={!voiceUsers.micEnabled(voiceUser!.userId)}>
                <Icon name="mic_off" size={14} color="rgba(255,255,255,0.45)" />
              </Show>
            </VoiceUserRow>
          )}
        </For>
      </ChannelVoiceUsersContainer>
    </Show>
  );
}

function JoinedThisSessionNotificationNotice() {
  const params = useParams<{ serverId: string }>();
  const store = useStore();
  const server = () => store.servers.get(params.serverId);

  const dismiss = () => {
    server()?.update({ joinedThisSession: false });
  };

  const handleSetToMentionsOnly = () => {
    dismiss();
    store.account.updateUserNotificationSettings({
      notificationPingMode: ServerNotificationPingMode.MENTIONS_ONLY,
      serverId: params.serverId
    });
  };

  return (
    <div class={style.joinedThisSessionNotice}>
      <Button
        iconName="close"
        iconSize={14}
        class={style.closeIcon}
        onclick={dismiss}
      />
      <Icon name="notifications" size={30} />
      <div class={style.details}>
        <div class={style.text}>
          {t("serverDrawer.joinedThisSessionNotice")}
        </div>
        <Button
          label={t("serverDrawer.joinedThisSessionNoticeSetToMentionsOnly")}
          iconName="alternate_email"
          iconSize={16}
          onClick={handleSetToMentionsOnly}
        />
      </div>
    </div>
  );
}

export default ServerDrawer;
