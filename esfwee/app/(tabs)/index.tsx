import { useState, useEffect } from "react";
import {
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  View,
  Text,
} from "react-native";
import { useAuth } from "@/context/auth-context";
import { useEsfweeUrl } from "@/context/esfwee";
import { fetchUserData, AniListUser } from "@/lib/anilist";
import { router } from "expo-router";
import { useTheme } from "@/context/theme-context";

export default function HomeScreen() {
  const { anilistToken, logout, isLoading: authLoading } = useAuth();
  const { isLoading, url } = useEsfweeUrl();
  const { colors, styles: themeStyles } = useTheme();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AniListUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || isLoading) return;

    if (!anilistToken || !url) {
      router.replace("/login");
    } else {
      loadUserData();
    }
  }, [authLoading, anilistToken, isLoading, url]);

  const loadUserData = async () => {
    if (!anilistToken) return;

    setLoading(true);
    setError("");

    const { data, error: err } = await fetchUserData(anilistToken);

    if (err) {
      setError(err);
    } else if (data) {
      setUser(data.Viewer);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <View
        style={[
          themeStyles.container,
          themeStyles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text
          style={[
            themeStyles.body,
            { marginTop: 16, color: colors.textSecondary },
          ]}
        >
          Loading your AniList data...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={[
          themeStyles.container,
          themeStyles.center,
          { backgroundColor: colors.background },
        ]}
      >
        <Text
          style={[
            themeStyles.body,
            { color: colors.error, marginBottom: 16, textAlign: "center" },
          ]}
        >
          Error: {error}
        </Text>
        <TouchableOpacity
          style={[themeStyles.button, { backgroundColor: colors.primary }]}
          onPress={loadUserData}
        >
          <Text style={[themeStyles.body, { color: colors.buttonText }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[themeStyles.container, { alignItems: "center" }]}>
        <Text style={[themeStyles.title, { color: colors.text }]}>
          Welcome to esfwee idk!
        </Text>

        {user && (
          <View
            style={[
              themeStyles.card,
              {
                backgroundColor: colors.surface,
                width: "100%",
                alignItems: "center",
              },
            ]}
          >
            <Text
              style={[
                styles.userName,
                { color: colors.primary, fontWeight: "bold" },
              ]}
            >
              {user.name}
            </Text>
            <Text
              style={[
                themeStyles.caption,
                { color: colors.textSecondary, marginBottom: 20 },
              ]}
            >
              ID: {user.id}
            </Text>

            <View style={styles.statsContainer}>
              <View style={themeStyles.center}>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.text, fontWeight: "bold" },
                  ]}
                >
                  {user.statistics.manga.count}
                </Text>
                <Text
                  style={[
                    themeStyles.caption,
                    { color: colors.textSecondary, marginTop: 4 },
                  ]}
                >
                  Manga in List
                </Text>
              </View>

              <View style={themeStyles.center}>
                <Text
                  style={[
                    styles.statValue,
                    { color: colors.text, fontWeight: "bold" },
                  ]}
                >
                  {user.statistics.manga.chaptersRead}
                </Text>
                <Text
                  style={[
                    themeStyles.caption,
                    { color: colors.textSecondary, marginTop: 4 },
                  ]}
                >
                  Chapters Read
                </Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[themeStyles.button, { backgroundColor: colors.error }]}
          onPress={logout}
        >
          <Text
            style={[
              themeStyles.body,
              { color: colors.buttonText, fontWeight: "600" },
            ]}
          >
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  userName: {
    fontSize: 24,
    marginBottom: 8,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 32,
    marginTop: 16,
  },
  statValue: {
    fontSize: 32,
  },
});
