import { t } from "@nerimity/i18lite";
import { Modal } from "../ui/modal";
import { InputDevices, OutputDevices } from "./CallSettings";
import { styled } from "solid-styled-components";

const Body = styled("div")`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 4px 12px;
`;

export function VoiceAudioSettingsModal(props: { close: () => void }) {
  return (
    <Modal.Root close={props.close} desktopMaxWidth={560} desktopMinWidth={460}>
      <Modal.Header
        title={t("settings.call.audioSettingsTitle")}
        icon="settings_voice"
      />
      <Modal.Body>
        <Body>
          <InputDevices />
          <OutputDevices />
        </Body>
      </Modal.Body>
    </Modal.Root>
  );
}
