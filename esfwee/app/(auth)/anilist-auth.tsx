import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  Linking,
  View,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { useAuth } from "@/context/auth-context";

WebBrowser.maybeCompleteAuthSession();

const ANILIST_CLIENT_ID = "27049";
const REDIRECT_URI = makeRedirectUri({
  scheme: "esfwee",
});

export default function AnilistAuthScreen() {
  const router = useRouter();
  const { loginAnilist, isLoggedInAnilist } = useAuth();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isLoggedInAnilist) {
      router.replace("/");
    }

    setupDeepLinking();

    return () => {
      Linking.removeAllListeners("url");
    };
  }, [isLoggedInAnilist, router]);

  const setupDeepLinking = () => {
    Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleRedirect(url);
    });
  };

  const handleDeepLink = (event: { url: string }) => {
    handleRedirect(event.url);
  };

  const handleRedirect = async (url: string) => {
    try {
      if (url.includes("#")) {
        const hashFragment = url.split("#")[1];
        const params = new URLSearchParams(hashFragment);
        const token = params.get("access_token");
        if (token) {
          await loginAnilist(token);
          router.replace("/");
        } else {
          setError("Failed to get authentication token from redirect URL.");
        }
      }
    } catch (e) {
      console.error("Redirect handling error:", e);
      setError("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      const authUrl = `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&response_type=token`;
      const red_uri = REDIRECT_URI;
      console.log(red_uri);
      const result = await WebBrowser.openAuthSessionAsync(authUrl, red_uri);

      if (result.type !== "success") {
        if (result.type === "cancel") {
          setError("Authentication cancelled by user.");
        } else if (result.type === "dismiss") {
          setError("Authentication dismissed.");
        } else {
          setError("Authentication failed with an unknown error type.");
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Anilist auth error:", error);
      setError("Authentication failed. Please try again.");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleLogin();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.subtitle}>Connecting to AniList...</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {isLoading && <ActivityIndicator size="large" color="#02A9FF" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 20,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    opacity: 0.8,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
});
