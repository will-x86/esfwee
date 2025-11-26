import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { View, StatusBar } from "react-native";
import { AuthProvider } from "@/context/auth-context";
import { EsfweeUrlProvider } from "@/context/esfwee";
import { ThemeProvider, useTheme } from "@/context/theme-context";
import { ApolloClientProvider } from "@/context/apollo-context";
import { ReaderSettingsProvider } from "@/context/reader-settings";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ApolloClientProvider>
          <EsfweeUrlProvider>
            <ReaderSettingsProvider>
              <HomeLayout />
            </ReaderSettingsProvider>
          </EsfweeUrlProvider>
        </ApolloClientProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function HomeLayout() {
  const { colors, isDark } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.surface}
      />
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
