import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { useEsfweeUrl } from "@/context/esfwee";
import { MangaApiClient, Chapter } from "@/lib/esfwee-api";
import { Ionicons } from "@expo/vector-icons";
import { Reader } from "@/components/Reader";

export default function ChaptersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, styles: themeStyles } = useTheme();
  const { url: esfweeUrl } = useEsfweeUrl();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [mangaTitle, setMangaTitle] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    const loadChapters = async () => {
      if (!esfweeUrl || !id) return;
      setLoading(true);
      try {
        const client = new MangaApiClient(esfweeUrl);
        const manga = await client.getManga(parseInt(id));
        setMangaTitle(manga.title);
        const chapterList = await client.listChapters(parseInt(id));
        setChapters(
          chapterList.sort((a, b) => a.chapter_number - b.chapter_number),
        );
      } catch (error) {
        console.error("Failed to load chapters:", error);
      } finally {
        setLoading(false);
      }
    };
    loadChapters();
  }, [esfweeUrl, id]);

  const handleChapterPress = (chapter: Chapter) => {
    setSelectedChapter(chapter);
  };

  const handleBack = () => {
    setSelectedChapter(null);
  };

  if (selectedChapter && esfweeUrl) {
    return (
      <Reader
        esfweeUrl={esfweeUrl}
        chapter={{
          id: selectedChapter.id,
          number: String(selectedChapter.chapter_number),
          pageCount: selectedChapter.page_count,
        }}
        onBack={handleBack}
      />
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: "Chapters" }} />
        <View
          style={[
            themeStyles.container,
            themeStyles.center,
            { backgroundColor: colors.background },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: mangaTitle || "Chapters" }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        {chapters.length === 0 ? (
          <View
            style={[themeStyles.container, themeStyles.center, { flex: 1 }]}
          >
            <Text style={[themeStyles.body, { color: colors.textSecondary }]}>
              No chapters available
            </Text>
          </View>
        ) : (
          <FlatList
            data={chapters}
            contentContainerStyle={styles.list}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.chapterCard,
                  { backgroundColor: colors.surface },
                ]}
                onPress={() => handleChapterPress(item)}
              >
                <View style={styles.chapterInfo}>
                  <Text
                    style={[
                      themeStyles.body,
                      { color: colors.text, fontWeight: "600" },
                    ]}
                  >
                    Chapter {item.chapter_number}
                  </Text>
                  {item.title && (
                    <Text
                      style={[
                        themeStyles.caption,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>
                  )}
                  <Text
                    style={[
                      themeStyles.caption,
                      { color: colors.textMuted, marginTop: 4 },
                    ]}
                  >
                    {item.page_count} pages
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
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  chapterCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  chapterInfo: {
    flex: 1,
  },
});
