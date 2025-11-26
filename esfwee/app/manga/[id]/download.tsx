import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { useEsfweeUrl } from "@/context/esfwee";
import { useLazyQuery } from "@apollo/client/react";
import { GET_MANGA_DETAILS } from "@/lib/anilist-queries";
import { Ionicons } from "@expo/vector-icons";

type MangaPillResult = {
  title: string;
  url: string;
  thumbnail: string | null;
};

type MangaPillChapter = {
  chapter: string;
  url: string;
};

type DownloadStep =
  | "search"
  | "select_manga"
  | "select_chapters"
  | "downloading";

export default function DownloadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, styles: themeStyles } = useTheme();
  const { url: esfweeUrl } = useEsfweeUrl();

  const [step, setStep] = useState<DownloadStep>("search");
  const [mangaTitle, setMangaTitle] = useState("");
  const [searchResults, setSearchResults] = useState<MangaPillResult[]>([]);
  const [selectedManga, setSelectedManga] = useState<MangaPillResult | null>(
    null,
  );
  const [chapters, setChapters] = useState<MangaPillChapter[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({
    current: 0,
    total: 0,
  });

  const [getMangaDetails, { data: mangaData }] =
    useLazyQuery(GET_MANGA_DETAILS);

  useEffect(() => {
    if (id) {
      getMangaDetails({ variables: { id: parseInt(id) } });
    }
  }, [id]);

  useEffect(() => {
    if (mangaData?.Media) {
      const title =
        mangaData.Media.title?.english ||
        mangaData.Media.title?.romaji ||
        mangaData.Media.title?.native ||
        "";
      setMangaTitle(title);
      if (title) {
        searchMangaPill(title);
      }
    }
  }, [mangaData]);

  const searchMangaPill = async (query: string) => {
    if (!esfweeUrl) return;
    setLoading(true);
    try {
      const response = await fetch(
        `${esfweeUrl}/pirate/search?query=${encodeURIComponent(query)}`,
      );
      const results = await response.json();
      setSearchResults(results);
      setStep("select_manga");
    } catch (error) {
      console.error("Search failed:", error);
      Alert.alert("Error", "Failed to search MangaPill");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectManga = async (manga: MangaPillResult) => {
    if (!esfweeUrl) return;
    setSelectedManga(manga);
    setLoading(true);
    try {
      const response = await fetch(
        `${esfweeUrl}/pirate/chapters?manga_url=${encodeURIComponent(manga.url)}`,
      );
      const chapterList = await response.json();
      setChapters(chapterList);
      setStep("select_chapters");
    } catch (error) {
      console.error("Failed to fetch chapters:", error);
      Alert.alert("Error", "Failed to load chapters");
    } finally {
      setLoading(false);
    }
  };

  const toggleChapter = (chapterUrl: string) => {
    const newSelected = new Set(selectedChapters);
    if (newSelected.has(chapterUrl)) {
      newSelected.delete(chapterUrl);
    } else {
      newSelected.add(chapterUrl);
    }
    setSelectedChapters(newSelected);
  };

  const selectAll = () => {
    setSelectedChapters(new Set(chapters.map((c) => c.url)));
  };

  const deselectAll = () => {
    setSelectedChapters(new Set());
  };

  const downloadChapters = async () => {
    if (!esfweeUrl || selectedChapters.size === 0) return;

    setStep("downloading");
    setDownloadProgress({ current: 0, total: selectedChapters.size });

    let downloaded = 0;
    for (const chapterUrl of Array.from(selectedChapters)) {
      const chapter = chapters.find((c) => c.url === chapterUrl);
      if (!chapter) continue;

      const chapterNumber = parseFloat(
        chapter.chapter.match(/[\d.]+/)?.[0] || "0",
      );

      try {
        const response = await fetch(`${esfweeUrl}/pirate/download`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            anilist_id: parseInt(id!),
            chapter_url: chapterUrl,
            chapter_number: chapterNumber,
            chapter_title: chapter.chapter,
          }),
        });

        const result = await response.json();
        if (result.success) {
          downloaded++;
        }
      } catch (error) {
        console.error(`Failed to download chapter ${chapter.chapter}:`, error);
      }

      setDownloadProgress({
        current: downloaded,
        total: selectedChapters.size,
      });
    }

    Alert.alert(
      "Download Complete",
      `Successfully downloaded ${downloaded} out of ${selectedChapters.size} chapters`,
      [{ text: "OK", onPress: () => router.back() }],
    );
  };

  const renderSearchResults = () => (
    <View style={{ flex: 1 }}>
      {loading ? (
        <View style={[themeStyles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              themeStyles.body,
              { color: colors.textSecondary, marginTop: 16 },
            ]}
          >
            Searching MangaPill...
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchResults}
          contentContainerStyle={styles.list}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={
            <View style={{ marginBottom: 16 }}>
              <Text style={[themeStyles.body, { color: colors.textSecondary }]}>
                Select the correct manga from MangaPill:
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.resultCard, { backgroundColor: colors.surface }]}
              onPress={() => handleSelectManga(item)}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    themeStyles.body,
                    { color: colors.text, fontWeight: "600" },
                  ]}
                >
                  {item.title}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.iconSecondary}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );

  const renderChapterSelection = () => (
    <View style={{ flex: 1 }}>
      <View
        style={[styles.selectionHeader, { backgroundColor: colors.surface }]}
      >
        <Text
          style={[themeStyles.body, { color: colors.text, fontWeight: "600" }]}
        >
          {selectedChapters.size} chapters selected
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={selectAll} style={styles.headerButton}>
            <Text style={[themeStyles.caption, { color: colors.primary }]}>
              Select All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deselectAll} style={styles.headerButton}>
            <Text style={[themeStyles.caption, { color: colors.primary }]}>
              Deselect All
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={chapters}
        contentContainerStyle={styles.list}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => {
          const isSelected = selectedChapters.has(item.url);
          return (
            <TouchableOpacity
              style={[
                styles.chapterCard,
                { backgroundColor: colors.surface },
                isSelected && { borderColor: colors.primary, borderWidth: 2 },
              ]}
              onPress={() => toggleChapter(item.url)}
            >
              <View style={styles.checkbox}>
                <Ionicons
                  name={isSelected ? "checkbox" : "square-outline"}
                  size={24}
                  color={isSelected ? colors.primary : colors.iconSecondary}
                />
              </View>
              <Text style={[themeStyles.body, { color: colors.text, flex: 1 }]}>
                {item.chapter}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      <View
        style={[styles.downloadButton, { backgroundColor: colors.surface }]}
      >
        <TouchableOpacity
          style={[
            themeStyles.button,
            {
              backgroundColor:
                selectedChapters.size > 0 ? colors.primary : colors.borderLight,
              width: "100%",
            },
          ]}
          onPress={downloadChapters}
          disabled={selectedChapters.size === 0}
        >
          <Text
            style={[
              themeStyles.body,
              {
                color:
                  selectedChapters.size > 0
                    ? colors.buttonText
                    : colors.textMuted,
                fontWeight: "600",
              },
            ]}
          >
            Download {selectedChapters.size} Chapter
            {selectedChapters.size !== 1 ? "s" : ""}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDownloading = () => (
    <View style={[themeStyles.center, { flex: 1 }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[themeStyles.body, { color: colors.text, marginTop: 16 }]}>
        Downloading chapters...
      </Text>
      <Text
        style={[
          themeStyles.caption,
          { color: colors.textSecondary, marginTop: 8 },
        ]}
      >
        {downloadProgress.current} / {downloadProgress.total}
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `Download: ${mangaTitle}` }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {step === "search" && loading && (
          <View style={[themeStyles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[
                themeStyles.body,
                { color: colors.textSecondary, marginTop: 16 },
              ]}
            >
              Loading...
            </Text>
          </View>
        )}
        {step === "select_manga" && renderSearchResults()}
        {step === "select_chapters" && renderChapterSelection()}
        {step === "downloading" && renderDownloading()}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  selectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    padding: 8,
  },
  chapterCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  checkbox: {
    marginRight: 12,
  },
  downloadButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#333",
  },
});
