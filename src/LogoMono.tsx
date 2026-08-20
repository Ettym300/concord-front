import { appLogoMarkUrl } from "@/common/worldEvents";

export const LogoMono = () => {
  return (
    <img
      src={appLogoMarkUrl()}
      alt="Concord"
      draggable={false}
      style={{
        width: "100%",
        height: "100%",
        "object-fit": "cover",
        display: "block"
      }}
    />
  );
};
