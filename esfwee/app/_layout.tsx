import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { AuthProvider } from "@/context/auth-context";
import { EsfweeUrlProvider } from "@/context/esfwee";
import { ThemeProvider, useTheme } from "@/context/theme-context";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <EsfweeUrlProvider>
          <HomeLayout />
        </EsfweeUrlProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function HomeLayout() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
          }}
        />
      </SafeAreaView>
    </View>
  );
}
