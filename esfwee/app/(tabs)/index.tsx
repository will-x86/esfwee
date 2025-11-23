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
import { fetchUserData, AniListUser } from "@/lib/anilist";
import { router } from "expo-router";

export default function HomeScreen() {
  const { anilistToken, logout, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AniListUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading) {
      if (!anilistToken) {
        router.replace("/login");
      } else {
        loadUserData();
      }
    }
  }, [authLoading, anilistToken]);

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
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#02A9FF" />
        <Text style={styles.loadingText}>Loading your AniList data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.button} onPress={loadUserData}>
          <Text style={styles.buttonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <View style={styles.container}>
        <Text style={styles.title}>Welcome to esfwee idk!</Text>

        {user && (
          <View style={styles.userCard}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userId}>ID: {user.id}</Text>

            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {user.statistics.manga.count}
                </Text>
                <Text style={styles.statLabel}>Manga in List</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {user.statistics.manga.chaptersRead}
                </Text>
                <Text style={styles.statLabel}>Chapters Read</Text>
              </View>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#000",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  errorText: {
    color: "red",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  userCard: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
  },
  userName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#02A9FF",
    marginBottom: 8,
  },
  userId: {
    fontSize: 14,
    color: "#666",
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 32,
    marginTop: 16,
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  button: {
    backgroundColor: "#02A9FF",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
