import { router, Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/auth-context";

export default function RootLayout() {
  return (
    <AuthProvider>
      <HomeLayout />
    </AuthProvider>
  );
}

function HomeLayout() {
  const { isLoading, isLoggedInAnilist } = useAuth();
  const colorScheme = useColorScheme();

  useEffect(() => {
    if (!isLoading && !isLoggedInAnilist) {
      router.replace("/login");
    }
  }, [isLoading, isLoggedInAnilist]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
      }}
    >
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
        }}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: {
              backgroundColor: colorScheme === "dark" ? "#000" : "#fff",
            },
          }}
        />
      </SafeAreaView>
    </View>
  );
}
