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
  get SERVER_URL() {
    return str("VITE_SERVER_URL");
  },
  get WS_URL() {
    return str("VITE_WS_URL");
  },
  get APP_URL() {
    return str("VITE_APP_URL");
  },
  get MOBILE_WIDTH() {
    return parseInt(str("VITE_MOBILE_WIDTH", "850"));
  },
  get APP_VERSION() {
    return str("VITE_APP_VERSION") || undefined;
  },
  get DEV_MODE() {
    return str("VITE_DEV_MODE") === "true";
  },
  get MESSAGE_LIMIT() {
    return parseInt(str("VITE_MESSAGE_LIMIT", "50"));
  },
  get TURNSTILE_SITEKEY() {
    return str("VITE_TURNSTILE_SITEKEY");
  },
  get EMOJI_URL() {
    return str("VITE_EMOJI_URL");
  },
  get NERIMITY_CDN() {
    return str("VITE_NERIMITY_CDN");
  },
  get OFFICIAL_SERVER() {
    return str("VITE_OFFICIAL_SERVER", "concord");
  },
  get GOOGLE_CLIENT_ID() {
    return str("VITE_GOOGLE_CLIENT_ID") || undefined;
  },
  get GOOGLE_API_KEY() {
    return str("VITE_GOOGLE_API_KEY") || undefined;
  },
  get RELEASE_TIMESTAMP() {
    return parseInt(str("VITE_RELEASE_TIMESTAMP", "0"));
  },
  get EMAIL_CONFIRMATION_ENABLED() {
    return str("VITE_EMAIL_CONFIRMATION_ENABLED") === "true";
  }
};
