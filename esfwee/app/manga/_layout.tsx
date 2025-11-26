import { Stack } from "expo-router";
import { useTheme } from "@/context/theme-context";

export default function MangaLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "600",
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    />
  );
}
