import { reconcile } from "solid-js/store";
import { StorageKeys, useLocalStorage, setStorageString } from "./localStorage";

export const ThemeCategory = {
  Surface: "Surface",
  Overlays: "Overlays",
  Input: "Input",
  MarkupBar: "Markup Bar",
  Message: "Message",
  Accent: "Accent",
  Alert: "Alert",
  Warn: "Warn",
  Success: "Success",
  Status: "Status",
  Text: "Text",
  Markup: "Markup",
  Drawer: "Drawer"
} as const;

const ThemeTokensBase = [
  // Surface
  {
    key: "background-color",
    category: ThemeCategory.Surface,
    value: "#1e1f22",
    allowGradient: true
  },
  {
    key: "pane-color",
    category: ThemeCategory.Surface,
    value: "#313338",
    allowGradient: true
  },
  {
    key: "side-pane-color",
    category: ThemeCategory.Surface,
    value: "#2b2d31",
    allowGradient: true
  },

  // Overlays
  {
    key: "header-background-color",
    category: ThemeCategory.Overlays,
    value: "#313338"
  },
  {
    key: "header-background-color-blur-disabled",
    category: ThemeCategory.Overlays,
    value: "#313338"
  },
  {
    key: "tooltip-background-color",
    category: ThemeCategory.Overlays,
    value: "#111214"
  },

  // Input
  {
    key: "chat-input-background-color",
    category: ThemeCategory.Input,
    value: "#383a40"
  },
  {
    key: "chat-input-background-color-blur-disabled",
    category: ThemeCategory.Input,
    value: "#383a40"
  },

  // Markup bar
  {
    key: "chat-markup-bar-background-color",
    category: ThemeCategory.MarkupBar,
    value: "#2b2d31"
  },
  {
    key: "chat-markup-bar-background-color-blur-disabled",
    category: ThemeCategory.MarkupBar,
    value: "#2b2d31"
  },

  // Message
  {
    key: "message-hover-background-color",
    category: ThemeCategory.Message,
    value: "rgba(2, 2, 2, 0.12)"
  },
  {
    key: "message-floating-options-background-color",
    category: ThemeCategory.Message,
    value: "#111214"
  },

  // Accent (Primary)
  { key: "primary-color", category: ThemeCategory.Accent, value: "#5865f2" },
  {
    key: "primary-color-dark",
    category: ThemeCategory.Accent,
    value: "#3c45a5"
  },

  // Alert
  { key: "alert-color", category: ThemeCategory.Alert, value: "#ed4245" },
  { key: "alert-color-dark", category: ThemeCategory.Alert, value: "#4a1c1d" },

  // Warn
  { key: "warn-color", category: ThemeCategory.Warn, value: "#f0b232" },
  { key: "warn-color-dark", category: ThemeCategory.Warn, value: "#3d3218" },

  // Success
  { key: "success-color", category: ThemeCategory.Success, value: "#23a559" },
  {
    key: "success-color-dark",
    category: ThemeCategory.Success,
    value: "#1a3d28"
  },

  // Status
  { key: "status-offline", category: ThemeCategory.Status, value: "#80848e" },
  { key: "status-online", category: ThemeCategory.Status, value: "#23a559" },
  {
    key: "status-looking-to-play",
    category: ThemeCategory.Status,
    value: "#3ba55c"
  },
  {
    key: "status-away-from-keyboard",
    category: ThemeCategory.Status,
    value: "#f0b232"
  },
  {
    key: "status-do-not-disturb",
    category: ThemeCategory.Status,
    value: "#f23f43"
  },

  // Text
  { key: "text-color", category: ThemeCategory.Text, value: "#f2f3f5" },
  {
    key: "content-color",
    category: ThemeCategory.Text,
    value: "#dbdee1"
  },
  { key: "side-pane-text-color", category: ThemeCategory.Text, value: "#f2f3f5" },
  {
    key: "typing-indicator-color",
    category: ThemeCategory.Text,
    value: "#f2f3f5"
  },
  {
    key: "typing-indicator-secondary-color",
    category: ThemeCategory.Text,
    value: "#b5bac1"
  },

  // Markup
  {
    key: "markup-code-background-color",
    category: ThemeCategory.Markup,
    value: "rgba(255, 255, 255, 0.12)"
  },
  {
    key: "markup-mention-background-color",
    category: ThemeCategory.Markup,
    value: "rgba(255, 255, 255, 0.1)"
  },
  {
    key: "markup-mention-background-color-hover",
    category: ThemeCategory.Markup,
    value: "rgba(255, 255, 255, 0.12)"
  },
  {
    key: "markup-codeblock-background-color",
    category: ThemeCategory.Markup,
    value: "rgba(255, 255, 255, 0.1)"
  },
  {
    key: "markup-spoiler-background-color",
    category: ThemeCategory.Markup,
    value: "#1d1f20ff"
  },
  {
    key: "markup-spoiler-background-color-hover",
    category: ThemeCategory.Markup,
    value: "#2b2e30ff"
  },

  // Drawer
  {
    key: "drawer-item-background-color",
    category: ThemeCategory.Drawer,
    value: "#404249"
  },
  {
    key: "drawer-item-hover-background-color",
    category: ThemeCategory.Drawer,
    value: "#35373c"
  }
] as const;

// Get the order of categories as defined in ThemeCategory
const categoryOrder = Object.values(ThemeCategory);

export const ThemeTokens = [...ThemeTokensBase].sort((a, b) => {
  const categoryIndexA = categoryOrder.indexOf(a.category);
  const categoryIndexB = categoryOrder.indexOf(b.category);
  return categoryIndexA - categoryIndexB;
});

type ThemeKey = (typeof ThemeTokensBase)[number]["key"];

export const DefaultTheme = ThemeTokens.reduce(
  (acc, token) => {
    acc[token.key] = token.value;
    return acc;
  },
  {} as Record<ThemeKey, string>
);

const [customColors, setCustomColors] = useLocalStorage<
  Partial<Record<ThemeKey, string>>
>(StorageKeys.CUSTOM_COLORS, {});

const currentTheme = () => ({ ...DefaultTheme, ...customColors() });

export const themeVars = (
  theme: Record<ThemeKey, string>
): Record<string, string> => {
  const vars: Record<string, string> = {};
  for (const key of Object.keys(theme)) {
    vars[`--${key}`] = theme[key as ThemeKey];
  }
  vars["--text-color-secondary"] ??= dimmedColor(theme["text-color"], 0.6);
  vars["--alert-color-faded"] ??= dimmedColor(theme["alert-color"], 0.6);
  vars["--content-color-dim60"] ??= dimmedColor(theme["content-color"], 0.6);
  vars["--content-color-dim80"] ??= dimmedColor(theme["content-color"], 0.8);
  return vars;
};

export const updateTheme = () => {
  const vars = themeVars(currentTheme());
  for (const key in vars) {
    document.documentElement.style.setProperty(key, vars[key] ?? null);
  }
};

export const setThemeColor = (key: ThemeKey, value?: string) => {
  if (value === undefined) {
    const temp = { ...customColors() };
    delete temp[key];
    setCustomColors(reconcile(temp));
  } else {
    setCustomColors({ ...customColors(), [key]: value });
  }
  updateTheme();
};

// Theme presets
export type ThemePreset = {
  colors: Partial<Record<ThemeKey, string>>;
  maintainers: string[];
};

export const themePresets: Record<string, ThemePreset> = {
  Default: {
    colors: DefaultTheme,
    maintainers: ["Superkitten", "Asraye"]
  },
  "Discord Root": {
    colors: {
      "background-color": "#1e1f22",
      "pane-color": "#313338",
      "side-pane-color": "#2b2d31",
      "header-background-color": "#313338",
      "header-background-color-blur-disabled": "#313338",
      "primary-color": "#5865f2",
      "success-color": "#23a559",
      "alert-color": "#ed4245"
    },
    maintainers: ["local"]
  },
  Classic: {
    colors: {
      "background-color": "hsl(216deg 9% 8%)",
      "pane-color": "hsl(216deg 8% 15%)",
      "side-pane-color": "hsl(216deg 7.82% 12.55%)",
      "header-background-color": "hsla(216deg 8% 15% / 80%)",
      "header-background-color-blur-disabled": "hsl(216deg 8% 15%)",
      "tooltip-background-color": "rgb(40, 40, 40)",
      "markup-code-background-color": "rgba(0, 0, 0, 0.6)",
      "markup-mention-background-color": "rgba(0, 0, 0, 0.2)",
      "markup-mention-background-color-hover": "rgba(0, 0, 0, 0.6)",
      "markup-codeblock-background-color": "rgba(0, 0, 0, 0.6)",
      "message-hover-background-color": "rgba(255, 255, 255, 0.03)",
      "message-floating-options-background-color": "rgb(40, 40, 40)",
      "markup-spoiler-background-color": "#0e0f10",
      "markup-spoiler-background-color-hover": "#1c1e20"
    },
    maintainers: ["Superkitten", "Asraye"]
  }
};

// Apply a preset
export const applyTheme = (name: string, themeObj?: ThemePreset) => {
  const preset = themeObj || themePresets[name];
  if (!preset || !preset.colors) return;

  // Clear previous
  Object.keys(customColors()).forEach((key) =>
    setThemeColor(key as ThemeKey, undefined)
  );

  // Apply
  Object.entries(preset.colors).forEach(([key, value]) =>
    setThemeColor(key as ThemeKey, value)
  );

  // Persist
  setStorageString(StorageKeys.CUSTOM_COLORS, JSON.stringify(preset.colors));
};

const placeholder = document.createElement("span");
placeholder.style.display = "none";
document.body.appendChild(placeholder);

const computedColor = (
  color: string
): [number, number, number, number] | null => {
  placeholder.style.color = "";
  placeholder.style.color = color;
  if (placeholder.style.color == "") return null;

  const computed = window.getComputedStyle(placeholder).color;
  const match = computed.match(/^rgba?\((.*)\)$/)?.[1];
  const colors = match?.split(",")?.map(Number);
  if (colors === undefined || colors.length < 3 || colors.length > 4)
    return null;
  colors[3] = colors[3] ?? 1.0;
  return colors as [number, number, number, number];
};

const supportsColorMix = CSS.supports(
  "color",
  "color-mix(in srgb, #FFF 50%, transparent)"
);

const dimmedColor = (color: string, opacity: number): string => {
  if (supportsColorMix)
    return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;

  const computed = computedColor(color);
  if (computed === null) return color;

  const [r, g, b, a] = computed;
  return `rgba(${r},${g},${b},${a * opacity})`;
};

updateTheme();

export const defaultThemeCSSVars = themeVars(DefaultTheme);

export { DefaultTheme as theme, currentTheme, customColors, setCustomColors };
