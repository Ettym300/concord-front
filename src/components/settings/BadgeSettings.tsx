import { createEffect, createSignal, For, onMount } from "solid-js";
import { styled } from "solid-styled-components";

import useStore from "@/chat-api/store/useStore";

import Breadcrumb, { BreadcrumbItem } from "../ui/Breadcrumb";
import { t } from "@nerimity/i18lite";

import {
  hasBit,
  isPaidUserBadge,
  USER_BADGES_VALUES
} from "@/chat-api/Bitwise";

import SettingsBlock, {
  SettingsGroup
} from "../ui/settings-block/SettingsBlock";
import Avatar from "../ui/Avatar";
import { RawInventoryItem } from "@/chat-api/RawData";
import { fetchInventory, toggleBadge } from "@/chat-api/services/UserService";
import { formatters } from "@/common/date";
import Checkbox from "../ui/Checkbox";
import { toast } from "../ui/custom-portal/CustomPortal";

const Container = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px;
  flex-shrink: 0;
`;

export default function BadgeSettings() {
  const { header } = useStore();

  createEffect(() => {
    header.updateHeader({
      title: t("settings.drawer.title") + " - " + t("settings.drawer.badges"),
      iconName: "settings"
    });
  });

  return (
    <Container>
      <Breadcrumb>
        <BreadcrumbItem href="/app" icon="home" title={t("dashboard.title")} />
        <BreadcrumbItem title={t("settings.drawer.badges")} />
      </Breadcrumb>

      <OwnedBadges />
    </Container>
  );
}

const OwnedBadges = () => {
  const store = useStore();
  const [inventory, setInventory] = createSignal<RawInventoryItem[]>([]);

  const user = () => store.account.user();

  onMount(() => {
    fetchInventory().then(setInventory);
  });

  const ownedBadges = () => {
    return inventory()
      .filter((item) => item.itemType === "badge")
      .map((item) => {
        const badge = USER_BADGES_VALUES.find(
          (entry) => entry.bit === parseInt(item.itemId)
        );
        if (!badge || isPaidUserBadge(badge)) return null;
        return {
          ...badge,
          acquiredAt: item.acquiredAt,
          enabled: hasBit(user()?.badges || 0, badge.bit)
        };
      })
      .filter((item) => item !== null);
  };

  const handleBadgeToggle = (badge: { bit: number; removable?: boolean }) => {
    if (badge.removable === false) {
      return toast(
        t("settings.badges.unremovableError.title"),
        t("settings.badges.unremovableError.body"),
        "error"
      );
    }
    toggleBadge(badge.bit).then((result) => {
      store.account.setUser({ badges: result.badges });
    });
  };

  return (
    <SettingsGroup>
      <SettingsBlock
        label={t("settings.badges.inventory.ownedBadges", {
          count: ownedBadges().length
        })}
        icon="badge"
      />

      <For each={ownedBadges()}>
        {(item) => (
          <SettingsBlock
            onClick={() => handleBadgeToggle(item)}
            label={item!.name?.()!}
            description={
              item!.acquiredAt
                ? t("settings.badges.inventory.acquireDate", {
                    date: formatters().datetime.mediumDate.format(
                      item!.acquiredAt
                    )
                  })
                : undefined
            }
            icon={<Avatar user={{ ...user()!, badges: item!.bit }} size={40} />}
          >
            <Checkbox
              style={{ "pointer-events": "none" }}
              checked={item!.enabled}
              disabled={!item!.removable}
            />
          </SettingsBlock>
        )}
      </For>
    </SettingsGroup>
  );
};
