import React, { createContext, useContext, ReactNode } from "react";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Colors, commonStyles } from "@/constants/theme";

type ColorScheme = "light" | "dark";

type ThemeContextType = {
  colors: typeof Colors.light;
  colorScheme: ColorScheme;
  isDark: boolean;
  styles: typeof commonStyles;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = Colors[colorScheme];

  return (
    <ThemeContext.Provider
      value={{
        colors,
        colorScheme,
        isDark,
        styles: commonStyles,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
