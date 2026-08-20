import { Show } from "solid-js";
import { t } from "@nerimity/i18lite";
import { useFrontUpdate } from "@/common/useFrontUpdate";
import Button from "@/components/ui/Button";

export default function FrontUpdateBanner() {
  const { updateAvailable, applyUpdate } = useFrontUpdate();

  return (
    <Show when={updateAvailable()}>
      <div
        style={{
          display: "flex",
          "align-items": "center",
          "justify-content": "center",
          gap: "10px",
          padding: "8px 12px",
          "flex-shrink": "0",
          background: "var(--primary-color)",
          color: "#fff",
          "font-size": "13px",
          "z-index": "120001"
        }}
      >
        <span>{t("statusHeader.updateAvailable")}</span>
        <Button
          label={t("statusHeader.reloadNow")}
          onClick={applyUpdate}
          margin={0}
          padding={6}
        />
      </div>
    </Show>
  );
}
