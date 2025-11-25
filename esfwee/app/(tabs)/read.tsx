import { useEsfweeUrl } from "@/context/esfwee";
import { useTheme } from "@/context/theme-context";
import { Manga, MangaApiClient, Chapter } from "@/lib/esfwee-api";
import { useEffect, useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { GET_MANGA_DETAILS } from "@/lib/anilist-queries";
import {
  Alert,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { MangaCard } from "@/components/MangaCard";
import Feather from "@expo/vector-icons/Feather";

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
  const [currentPage, setCurrentPage] = useState(1);
  const [covers, setCovers] = useState<Record<number, string>>({});

  const [getMangaDetails] = useLazyQuery(GET_MANGA_DETAILS);

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
          const { data } = await getMangaDetails({ variables: { id: m.anilist_id } });
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
    setCurrentPage(1);
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

  const handleNextPage = () => {
    if (selectedChapter && currentPage < selectedChapter.page_count) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const renderMangaList = () => (
    <View style={themeStyles.container}>
      <Text style={[themeStyles.title, { color: colors.text }]}>
        Read Manga
      </Text>
      {loadingLocal ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : localManga.length === 0 ? (
        <Text style={[themeStyles.body, { color: colors.textSecondary }]}>
          No manga available. Upload some chapters first!
        </Text>
      ) : (
        <FlatList
          data={localManga}
          renderItem={({ item }) => (
            <MangaCard
              id={item.anilist_id}
              title={item.title}
              coverUri={covers[item.anilist_id]}
              onPress={() => handleSelectManga(item)}
            />
          )}
          keyExtractor={(item) => item.anilist_id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalList}
        />
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
                    style={[themeStyles.caption, { color: colors.textSecondary }]}
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
              <Feather name="chevron-right" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id.toString()}
        />
      )}
    </View>
  );

  const renderReader = () => {
    if (!selectedChapter || !esfweeUrl) return null;
    const client = new MangaApiClient(esfweeUrl);
    const pageUrl = client.getPageUrl(selectedChapter.id, currentPage);

    return (
      <View style={[styles.readerContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.readerHeader, { backgroundColor: colors.surface }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[themeStyles.body, { color: colors.text, flex: 1 }]}>
            Chapter {selectedChapter.chapter_number} - Page {currentPage}/
            {selectedChapter.page_count}
          </Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.pageContainer}
          maximumZoomScale={3}
          minimumZoomScale={1}
        >
          <Image
            source={{ uri: pageUrl }}
            style={styles.pageImage}
            contentFit="contain"
          />
        </ScrollView>
        <View style={[styles.readerControls, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            onPress={handlePrevPage}
            disabled={currentPage === 1}
            style={[
              styles.controlButton,
              currentPage === 1 && styles.controlButtonDisabled,
            ]}
          >
            <Feather
              name="chevron-left"
              size={32}
              color={currentPage === 1 ? colors.textMuted : colors.text}
            />
          </TouchableOpacity>
          <Text style={[themeStyles.body, { color: colors.text }]}>
            {currentPage} / {selectedChapter.page_count}
          </Text>
          <TouchableOpacity
            onPress={handleNextPage}
            disabled={currentPage === selectedChapter.page_count}
            style={[
              styles.controlButton,
              currentPage === selectedChapter.page_count &&
                styles.controlButtonDisabled,
            ]}
          >
            <Feather
              name="chevron-right"
              size={32}
              color={
                currentPage === selectedChapter.page_count
                  ? colors.textMuted
                  : colors.text
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (viewMode === "reader") {
    return renderReader();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {viewMode === "manga" && renderMangaList()}
      {viewMode === "chapters" && renderChapterList()}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalList: {
    flexGrow: 0,
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
  readerContainer: {
    flex: 1,
  },
  readerHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 12,
  },
  pageContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pageImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height - 120,
  },
  readerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  controlButton: {
    padding: 8,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
});
