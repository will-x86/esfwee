import React, { useEffect } from "react";
import {
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  TextInput,
  View,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { useEsfweeUrl } from "@/context/esfwee";
import { useAuth } from "@/context/auth-context";
import { useTheme } from "@/context/theme-context";

export default function LoginScreen() {
  const router = useRouter();
  const { url, setUrl, isLoading: urlLoading } = useEsfweeUrl();
  const { anilistToken, isLoading: authLoading } = useAuth();
  const { colors, styles: themeStyles } = useTheme();

  const [text, onChangeText] = React.useState(url || undefined);

  useEffect(() => {
    if (!authLoading && !urlLoading && anilistToken && url) {
      router.replace("/");
    }
  }, [authLoading, urlLoading, anilistToken, url]);

  const onPressEsfwee = async () => {
    console.log(text);
    if (text) {
      await setUrl(text);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[themeStyles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={[themeStyles.title, { color: colors.text }]}>
            AniList Reader
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Connect your AniList account to start
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              themeStyles.button,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/anilist-auth")}
          >
            <Text style={[themeStyles.body, { color: colors.buttonText }]}>
              Connect to AniList
            </Text>
          </Pressable>
        </View>
        <View style={styles.buttonContainer}>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Connect your esfwee server to start
          </Text>
          <TextInput
            style={[
              themeStyles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            onChangeText={onChangeText}
            value={text}
            placeholder="Enter your esfwee url"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={({ pressed }) => [
              themeStyles.button,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={onPressEsfwee}
          >
            <Text style={[themeStyles.body, { color: colors.buttonText }]}>
              Connect to esfwee
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    opacity: 0.8,
    fontSize: 16,
  },
  buttonContainer: {
    width: "100%",
    gap: 16,
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
