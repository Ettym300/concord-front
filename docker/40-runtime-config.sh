#!/bin/sh
set -e

json_quote() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cat > /usr/share/nginx/html/runtime-config.js <<EOF
window.__CONCORD_ENV__ = {
  VITE_SERVER_URL: "$(json_quote "${VITE_SERVER_URL:-}")",
  VITE_WS_URL: "$(json_quote "${VITE_WS_URL:-}")",
  VITE_APP_URL: "$(json_quote "${VITE_APP_URL:-}")",
  VITE_NERIMITY_CDN: "$(json_quote "${VITE_NERIMITY_CDN:-}")",
  VITE_DEV_MODE: "$(json_quote "${VITE_DEV_MODE:-false}")",
  VITE_MOBILE_WIDTH: "$(json_quote "${VITE_MOBILE_WIDTH:-850}")",
  VITE_MESSAGE_LIMIT: "$(json_quote "${VITE_MESSAGE_LIMIT:-50}")",
  VITE_TURNSTILE_SITEKEY: "$(json_quote "${VITE_TURNSTILE_SITEKEY:-}")",
  VITE_EMOJI_URL: "$(json_quote "${VITE_EMOJI_URL:-}")",
  VITE_OFFICIAL_SERVER: "$(json_quote "${VITE_OFFICIAL_SERVER:-concord}")",
  VITE_EMAIL_CONFIRMATION_ENABLED: "$(json_quote "${VITE_EMAIL_CONFIRMATION_ENABLED:-false}")"
};
EOF
