import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  FlatList,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import * as DocumentPicker from "expo-document-picker";
import { useLazyQuery } from "@apollo/client/react";
import { useTheme } from "@/context/theme-context";
import { useEsfweeUrl } from "@/context/esfwee";
import { MangaApiClient, Manga } from "@/lib/esfwee-api";
import { SEARCH_MANGA, GET_MANGA_DETAILS } from "@/lib/anilist-queries";
import Feather from "@expo/vector-icons/Feather";

type UploadMode = "local" | "search";

interface AniListManga {
  id: number;
  title: {
    romaji: string | null;
    english: string | null;
    native: string | null;
  } | null;
  coverImage: {
    large: string | null;
    medium: string | null;
  } | null;
  chapters: number | null;
  volumes: number | null;
  format: string | null;
  status: string | null;
  averageScore: number | null;
}

export default function UploadScreen() {
  const { colors, styles: themeStyles } = useTheme();
  const { url: esfweeUrl } = useEsfweeUrl();

  const [mode, setMode] = useState<UploadMode>("local");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedManga, setSelectedManga] = useState<AniListManga | null>(null);
  const [chapterNumber, setChapterNumber] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploading, setUploading] = useState(false);
  const [localManga, setLocalManga] = useState<Manga[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);

  const [searchManga, { data: searchData, loading: searchingAnilist }] =
    useLazyQuery(SEARCH_MANGA);

  const [getMangaDetails, { data: mangaDetailsData, loading: loadingDetails }] =
    useLazyQuery(GET_MANGA_DETAILS);

  React.useEffect(() => {
    const loadLocalManga = async () => {
      if (!esfweeUrl) return;
      setLoadingLocal(true);
      try {
        const client = new MangaApiClient(esfweeUrl);
        const manga = await client.listManga();
        setLocalManga(manga);
      } catch (error) {
        console.error("Failed to load local manga:", error);
        Alert.alert("Error", "Failed to load manga from server");
      } finally {
        setLoadingLocal(false);
      }
    };
    if (mode === "local" && esfweeUrl) {
      loadLocalManga();
    }
  }, [mode, esfweeUrl]);

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchManga({ variables: { search: searchQuery, page: 1, perPage: 20 } });
  };

  const handleSelectManga = async (manga: AniListManga) => {
    setSelectedManga(manga);
    await getMangaDetails({ variables: { id: manga.id } });
  };

  const handlePickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedFile(result.assets[0]);
      }
    } catch (error) {
      console.error("Error picking file:", error);
      Alert.alert("Error", "Failed to pick file");
    }
  };

  const handleUpload = async () => {
    if (!selectedManga || !chapterNumber || !selectedFile || !esfweeUrl) {
      Alert.alert("Error", "Please select manga, chapter number, and file");
      return;
    }

    const mangaDetails = mangaDetailsData?.Media || selectedManga;
    const maxChapters = mangaDetails.chapters ?? 999;
    const chapterNum = parseInt(chapterNumber);

    if (isNaN(chapterNum) || chapterNum < 1) {
      Alert.alert("Error", "Invalid chapter number");
      return;
    }

    if (maxChapters !== null && chapterNum > maxChapters) {
      Alert.alert(
        "Warning",
        `Chapter ${chapterNum} exceeds known chapters (${maxChapters}). Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Upload Anyway", onPress: () => performUpload() },
        ],
      );
      return;
    }

    await performUpload();
  };

  const performUpload = async () => {
    if (!selectedManga || !chapterNumber || !selectedFile || !esfweeUrl) return;

    setUploading(true);
    try {
      const client = new MangaApiClient(esfweeUrl);
      await client.uploadManga({
        anilist_id: selectedManga.id,
        chapter_number: parseInt(chapterNumber),
        file: {
          uri: selectedFile.uri,
          name: selectedFile.name,
          type: selectedFile.mimeType || "application/zip",
        },
      });

      Alert.alert("Success", "Chapter uploaded successfully!");
      setSelectedManga(null);
      setChapterNumber("");
      setSelectedFile(null);
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Error", "Failed to upload chapter");
    } finally {
      setUploading(false);
    }
  };

  const renderMangaCard = ({ item }: { item: AniListManga }) => {
    const title = item.title?.english || item.title?.romaji || "Unknown Title";
    const coverUri = item.coverImage?.medium || item.coverImage?.large;

    return (
      <TouchableOpacity
        style={[styles.mangaCard, { backgroundColor: colors.surface }]}
        onPress={() => handleSelectManga(item)}
      >
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            style={styles.mangaCover}
            contentFit="cover"
          />
        ) : (
          <View
            style={[
              styles.mangaCover,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          />
        )}
        <View style={styles.mangaInfo}>
          <Text
            style={[
              themeStyles.body,
              { color: colors.text, fontWeight: "600" },
            ]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {item.chapters && (
            <Text
              style={[themeStyles.caption, { color: colors.textSecondary }]}
            >
              {item.chapters} chapters
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const mangaList: AniListManga[] =
    mode === "local"
      ? localManga.map((m: Manga) => ({
          id: m.anilist_id,
          title: { romaji: m.title, english: null, native: null },
          coverImage: { large: null, medium: null },
          chapters: null,
          volumes: null,
          format: null,
          status: null,
          averageScore: null,
        }))
      : (searchData?.Page?.media?.filter(
          (m: any): m is NonNullable<typeof m> => m !== null,
        ) as AniListManga[]) || [];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={themeStyles.container}>
        <Text style={[themeStyles.title, { color: colors.text }]}>
          Upload Chapter
        </Text>

        <View style={styles.modeSelector}>
          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "local" && { backgroundColor: colors.primary },
              mode !== "local" && { backgroundColor: colors.surface },
            ]}
            onPress={() => setMode("local")}
          >
            <Text
              style={[
                themeStyles.body,
                { color: mode === "local" ? colors.buttonText : colors.text },
              ]}
            >
              My Manga
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeButton,
              mode === "search" && { backgroundColor: colors.primary },
              mode !== "search" && { backgroundColor: colors.surface },
            ]}
            onPress={() => setMode("search")}
          >
            <Text
              style={[
                themeStyles.body,
                { color: mode === "search" ? colors.buttonText : colors.text },
              ]}
            >
              Search AniList
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "search" && (
          <View style={styles.searchContainer}>
            <TextInput
              style={[
                themeStyles.input,
                { borderColor: colors.border, color: colors.text },
              ]}
              placeholder="Search for manga..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
            />
            <TouchableOpacity
              style={[styles.searchButton, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
            >
              <Feather name="search" size={20} color={colors.buttonText} />
            </TouchableOpacity>
          </View>
        )}

        {(loadingLocal || searchingAnilist) && (
          <ActivityIndicator size="large" color={colors.primary} />
        )}

        {mangaList.length > 0 && (
          <FlatList
            data={mangaList}
            renderItem={renderMangaCard}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.mangaList}
          />
        )}

        {selectedManga && (
          <View style={[themeStyles.card, { backgroundColor: colors.surface }]}>
            <Text
              style={[
                themeStyles.heading,
                { color: colors.text, marginBottom: 16 },
              ]}
            >
              {selectedManga.title?.english ||
                selectedManga.title?.romaji ||
                "Unknown Title"}
            </Text>

            {loadingDetails && (
              <ActivityIndicator size="small" color={colors.primary} />
            )}

            {mangaDetailsData?.Media && (
              <Text
                style={[themeStyles.caption, { color: colors.textSecondary }]}
              >
                Total chapters: {mangaDetailsData.Media.chapters ?? "Unknown"}
              </Text>
            )}

            <TextInput
              style={[
                themeStyles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  marginTop: 12,
                },
              ]}
              placeholder="Chapter number"
              placeholderTextColor={colors.textMuted}
              value={chapterNumber}
              onChangeText={setChapterNumber}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={[
                themeStyles.button,
                {
                  backgroundColor: colors.surface,
                  marginTop: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                },
              ]}
              onPress={handlePickFile}
            >
              <Text style={[themeStyles.body, { color: colors.text }]}>
                {selectedFile ? selectedFile.name : "Pick CBZ File"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                themeStyles.button,
                { backgroundColor: colors.primary, marginTop: 12 },
              ]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={colors.buttonText} />
              ) : (
                <Text style={[themeStyles.body, { color: colors.buttonText }]}>
                  Upload
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  modeSelector: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  searchButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mangaList: {
    marginBottom: 16,
  },
  mangaCard: {
    width: 140,
    marginRight: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  mangaCover: {
    width: "100%",
    height: 200,
  },
  mangaInfo: {
    padding: 8,
  },
});
