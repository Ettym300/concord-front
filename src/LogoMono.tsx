import { appLogoUrl } from "@/common/worldEvents";

export const LogoMono = () => {
  return (
    <img
      src={appLogoUrl()}
      alt="Concord"
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        "object-fit": "contain",
        display: "block"
      }}
    />
  );
};
