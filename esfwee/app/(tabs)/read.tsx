import { useEsfweeUrl } from "@/context/esfwee";
import { useTheme } from "@/context/theme-context";
import { Manga, MangaApiClient, Chapter } from "@/lib/esfwee-api";
import { useEffect, useState, useRef } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { GET_MANGA_DETAILS } from "@/lib/anilist-queries";
import {
  Alert,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import Feather from "@expo/vector-icons/Feather";
import { Reader } from "@/components/Reader";

type ViewMode = "manga" | "chapters" | "reader";

export default function ReadScreen() {
  const { colors, styles: themeStyles } = useTheme();
  const { url: esfweeUrl } = useEsfweeUrl();
  const [localManga, setLocalManga] = useState<Manga[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("manga");
  const [selectedManga, setSelectedManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [covers, setCovers] = useState<Record<number, string>>({});
  const flatListRef = useRef<FlatList>(null);

  const [getMangaDetails] = useLazyQuery(GET_MANGA_DETAILS);

  const sortedManga = [...localManga].sort((a, b) =>
    a.title.localeCompare(b.title),
  );

  const alphabet = Array.from(
    new Set(sortedManga.map((m) => m.title[0].toUpperCase())),
  ).sort();

  useEffect(() => {
    const loadLocalManga = async () => {
      if (!esfweeUrl) return;
      setLoadingLocal(true);
      try {
        const client = new MangaApiClient(esfweeUrl);
        const manga = await client.listManga();
        setLocalManga(manga);

        const newCovers: Record<number, string> = {};
        for (const m of manga) {
          const { data } = await getMangaDetails({
            variables: { id: m.anilist_id },
          });
          if (data?.Media?.coverImage?.medium) {
            newCovers[m.anilist_id] = data.Media.coverImage.medium;
          }
        }
        setCovers(newCovers);
      } catch (error) {
        console.error("Failed to load local manga:", error);
        Alert.alert("Error", "Failed to load manga from server");
      } finally {
        setLoadingLocal(false);
      }
    };
    loadLocalManga();
  }, [esfweeUrl]);

  const handleSelectManga = async (manga: Manga) => {
    setSelectedManga(manga);
    setLoadingChapters(true);
    try {
      if (!esfweeUrl) return;
      const client = new MangaApiClient(esfweeUrl);
      const chapterList = await client.listChapters(manga.anilist_id);
      setChapters(chapterList);
      setViewMode("chapters");
    } catch (error) {
      console.error("Failed to load chapters:", error);
      Alert.alert("Error", "Failed to load chapters");
    } finally {
      setLoadingChapters(false);
    }
  };

  const handleSelectChapter = (chapter: Chapter) => {
    setSelectedChapter(chapter);
    setViewMode("reader");
  };

  const handleBack = () => {
    if (viewMode === "reader") {
      setViewMode("chapters");
      setSelectedChapter(null);
    } else if (viewMode === "chapters") {
      setViewMode("manga");
      setSelectedManga(null);
      setChapters([]);
    }
  };

  const scrollToLetter = (letter: string) => {
    const index = sortedManga.findIndex(
      (m) => m.title[0].toUpperCase() === letter,
    );
    if (index !== -1 && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index, animated: true });
    }
  };

  const renderMangaList = () => (
    <View style={{ flex: 1 }}>
      {loadingLocal ? (
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : localManga.length === 0 ? (
        <View style={[themeStyles.container, { flex: 1 }]}>
          <Text
            style={[
              themeStyles.title,
              { color: colors.text, marginBottom: 16 },
            ]}
          >
            Read Manga
          </Text>
          <Text style={[themeStyles.body, { color: colors.textSecondary }]}>
            No manga available. Upload some chapters first!
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1, position: "relative" }}>
          <FlatList
            ref={flatListRef}
            data={sortedManga}
            ListHeaderComponent={() => (
              <Text
                style={[
                  themeStyles.title,
                  { color: colors.text, marginBottom: 16 },
                ]}
              >
                Read Manga
              </Text>
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.mangaRow, { backgroundColor: colors.surface }]}
                onPress={() => handleSelectManga(item)}
              >
                {item.anilist_id && covers[item.anilist_id] ? (
                  <Image
                    source={{ uri: covers[item.anilist_id] }}
                    style={styles.mangaRowCover}
                    contentFit="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.mangaRowCover,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  />
                )}
                <View style={styles.mangaRowInfo}>
                  <Text
                    style={[
                      themeStyles.body,
                      { color: colors.text, fontWeight: "600", fontSize: 16 },
                    ]}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                </View>
                <Feather
                  name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.anilist_id.toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 20,
            }}
            onScrollToIndexFailed={() => {}}
          />
          {alphabet.length > 0 && (
            <View style={styles.alphabetScroller}>
              {alphabet.map((letter) => (
                <TouchableOpacity
                  key={letter}
                  onPress={() => scrollToLetter(letter)}
                  style={styles.letterButton}
                >
                  <Text
                    style={[
                      styles.letterText,
                      { color: colors.primary, fontWeight: "600" },
                    ]}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderChapterList = () => (
    <View style={themeStyles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[themeStyles.title, { color: colors.text, flex: 1 }]}>
          {selectedManga?.title}
        </Text>
      </View>
      {loadingChapters ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : chapters.length === 0 ? (
        <Text style={[themeStyles.body, { color: colors.textSecondary }]}>
          No chapters available
        </Text>
      ) : (
        <FlatList
          data={chapters}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chapterCard, { backgroundColor: colors.surface }]}
              onPress={() => handleSelectChapter(item)}
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
                  style={[themeStyles.caption, { color: colors.textSecondary }]}
                >
                  {item.page_count} pages
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
        />
      )}
    </View>
  );
  if (viewMode === "reader") {
    if (!selectedChapter || !esfweeUrl) return null;
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {viewMode === "manga" && renderMangaList()}
      {viewMode === "chapters" && renderChapterList()}
    </View>
  );
}

const styles = StyleSheet.create({
  mangaRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  mangaRowCover: {
    width: 60,
    height: 85,
    borderRadius: 8,
  },
  mangaRowInfo: {
    flex: 1,
  },
  alphabetScroller: {
    position: "absolute",
    right: 8,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingVertical: 8,
  },
  letterButton: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  letterText: {
    fontSize: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  chapterCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  chapterInfo: {
    flex: 1,
  },
});
