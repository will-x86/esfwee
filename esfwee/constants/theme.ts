import { Platform, TextStyle, ViewStyle } from "react-native";

const purple = {
  50: "#faf5ff",
  100: "#f3e8ff",
  200: "#e9d5ff",
  300: "#d8b4fe",
  400: "#c084fc",
  500: "#a855f7",
  600: "#9333ea",
  700: "#7e22ce",
  800: "#6b21a8",
  900: "#581c87",
  950: "#3b0764",
};

export const Colors = {
  light: {
    text: "#1a1a1a",
    textSecondary: "#666666",
    textMuted: "#999999",
    background: "#faf5ff",
    backgroundSecondary: "#f3e8ff",
    surface: "#ffffff",
    primary: purple[600],
    primaryLight: purple[400],
    primaryDark: purple[700],
    tint: purple[600],
    accent: purple[500],
    border: purple[200],
    borderLight: "#e5e5e5",
    divider: purple[100],
    icon: purple[600],
    iconSecondary: "#666666",
    tabIconDefault: "#999999",
    tabIconSelected: purple[600],
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    info: "#3b82f6",
    buttonText: "#ffffff",
    link: purple[700],
    shadow: "rgba(107, 33, 168, 0.1)",
  },
  dark: {
    text: "#e5e5e5",
    textSecondary: "#a3a3a3",
    textMuted: "#737373",
    background: "#0f0a1a",
    backgroundSecondary: "#1a0f2e",
    surface: "#251a3d",
    primary: purple[500],
    primaryLight: purple[400],
    primaryDark: purple[600],
    tint: purple[400],
    accent: purple[400],
    border: purple[800],
    borderLight: "#2a2a2a",
    divider: purple[900],
    icon: purple[400],
    iconSecondary: "#a3a3a3",
    tabIconDefault: "#737373",
    tabIconSelected: purple[400],
    success: "#34d399",
    error: "#f87171",
    warning: "#fbbf24",
    info: "#60a5fa",
    buttonText: "#ffffff",
    link: purple[300],
    shadow: "rgba(0, 0, 0, 0.3)",
  },
};
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const commonStyles = {
  container: {
    flex: 1,
    padding: 16,
  } as ViewStyle,

  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,

  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },

  spaceBetween: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },

  center: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },

  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  buttonLarge: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },

  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  } as TextStyle & ViewStyle,

  shadow: Platform.select({
    ios: {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }) as ViewStyle,

  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    marginBottom: 8,
  } as TextStyle,

  heading: {
    fontSize: 20,
    fontWeight: "600" as const,
    marginBottom: 8,
  } as TextStyle,

  body: {
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  caption: {
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  small: {
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,
};
