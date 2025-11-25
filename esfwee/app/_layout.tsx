import { Stack } from "expo-router";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { View } from "react-native";
import { AuthProvider } from "@/context/auth-context";
import { EsfweeUrlProvider } from "@/context/esfwee";

export default function RootLayout() {
  return (
    <AuthProvider>
      <EsfweeUrlProvider>
        <HomeLayout />
      </EsfweeUrlProvider>
    </AuthProvider>
  );
}

function HomeLayout() {
  const colorScheme = useColorScheme();
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
