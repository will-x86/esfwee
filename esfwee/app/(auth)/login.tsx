import React from "react";
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

export default function LoginScreen() {
  const router = useRouter();
  const { url, setUrl } = useEsfweeUrl();
  const { anilistToken, isLoading: authLoading } = useAuth();

  const [text, onChangeText] = React.useState(url || undefined);

  const onPressEsfwee = async () => {
    console.log(text);
    await setUrl(text);
    if (anilistToken && url && !authLoading) {
      router.push("/");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>AniList Reader</Text>
          <Text style={styles.subtitle}>
            Connect your AniList account to start
          </Text>
        </View>
        <View style={styles.buttonContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/anilist-auth")}
          >
            <Text style={styles.buttonText}>Connect to AniList</Text>
          </Pressable>
        </View>
        <View style={styles.buttonContainer}>
          <Text style={styles.subtitle}>
            Connect your esfwee server to start
          </Text>
          <TextInput
            style={styles.input}
            onChangeText={onChangeText}
            value={text}
            placeholder="Enter esfwee server URL"
          />
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={onPressEsfwee}
          >
            <Text style={styles.buttonText}>Connect to esfwee</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
    borderRadius: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 8,
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
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: "#02A9FF",
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
});
