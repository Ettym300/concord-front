type RuntimeEnv = Partial<Record<string, string>>;

declare global {
  interface Window {
    __CONCORD_ENV__?: RuntimeEnv;
  }
}

const runtime = (): RuntimeEnv =>
  typeof window !== "undefined" ? window.__CONCORD_ENV__ || {} : {};

const str = (key: string, fallback = "") => {
  const fromRuntime = runtime()[key];
  if (fromRuntime) return fromRuntime;
  const fromVite = import.meta.env[key];
  if (typeof fromVite === "string" && fromVite) return fromVite;
  return fallback;
};

export default {
  SERVER_URL: str("VITE_SERVER_URL"),
  WS_URL: str("VITE_WS_URL"),
  APP_URL: str("VITE_APP_URL"),
  MOBILE_WIDTH: parseInt(str("VITE_MOBILE_WIDTH", "850")),
  APP_VERSION: str("VITE_APP_VERSION") || undefined,
  DEV_MODE: str("VITE_DEV_MODE") === "true",
  MESSAGE_LIMIT: parseInt(str("VITE_MESSAGE_LIMIT", "50")),
  TURNSTILE_SITEKEY: str("VITE_TURNSTILE_SITEKEY"),
  EMOJI_URL: str("VITE_EMOJI_URL"),
  NERIMITY_CDN: str("VITE_NERIMITY_CDN"),
  OFFICIAL_SERVER: str("VITE_OFFICIAL_SERVER", "concord"),
  GOOGLE_CLIENT_ID: str("VITE_GOOGLE_CLIENT_ID") || undefined,
  GOOGLE_API_KEY: str("VITE_GOOGLE_API_KEY") || undefined,
  RELEASE_TIMESTAMP: parseInt(str("VITE_RELEASE_TIMESTAMP", "0")),
  // Set VITE_EMAIL_CONFIRMATION_ENABLED=true when SMTP is ready.
  EMAIL_CONFIRMATION_ENABLED:
    str("VITE_EMAIL_CONFIRMATION_ENABLED") === "true"
};
