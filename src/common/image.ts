import env from "./env";

export const generateUrl = (
  item: undefined | { avatar?: string; banner?: string },
  type: "avatar" | "banner"
): string | null => {
  const path = item?.[type];
  if (!path) return null;
  const base = env.NERIMITY_CDN.endsWith("/")
    ? env.NERIMITY_CDN
    : `${env.NERIMITY_CDN}/`;
  return `${base}${path.replace(/^\//, "")}`;
};
