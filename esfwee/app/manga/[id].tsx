import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router, Stack, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { useTheme } from "@/context/theme-context";
import { useAuth } from "@/context/auth-context";
import { useEsfweeUrl } from "@/context/esfwee";
import { useLazyQuery } from "@apollo/client/react";
import { GET_MANGA_DETAILS, GET_MEDIA_LIST } from "@/lib/anilist-queries";
import { Ionicons } from "@expo/vector-icons";
import { MediaType } from "@/__generated__/graphql";
import { fetchUserData } from "@/lib/anilist";
import { MangaApiClient } from "@/lib/esfwee-api";

export default function MangaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, styles: themeStyles } = useTheme();
  const { anilistToken } = useAuth();
  const { url: esfweeUrl } = useEsfweeUrl();
  const [userProgress, setUserProgress] = useState<number>(0);
  const [totalChapters, setTotalChapters] = useState<number | null>(null);
  const [localChapters, setLocalChapters] = useState<number>(0);
  const [userId, setUserId] = useState<number | null>(null);

  const [
    getMangaDetails,
    { data: mangaData, loading: mangaLoading, error: mangaError },
  ] = useLazyQuery(GET_MANGA_DETAILS);

  const [getUserList, { data: userListData }] = useLazyQuery(GET_MEDIA_LIST);

  useEffect(() => {
    const loadUserData = async () => {
      if (!anilistToken) return;
      const { data } = await fetchUserData(anilistToken);
      if (data?.Viewer?.id) {
        setUserId(data.Viewer.id);
      }
    };
    loadUserData();
  }, [anilistToken]);

  useEffect(() => {
    if (id) {
      getMangaDetails({ variables: { id: parseInt(id) } });
    }
  }, [id]);

  useEffect(() => {
    if (userId && id) {
      getUserList({ variables: { userId, type: MediaType.Manga } });
    }
  }, [userId, id]);

  useEffect(() => {
    if (userListData?.MediaListCollection?.lists) {
      const allEntries = userListData.MediaListCollection.lists.flatMap(
        (list: any) => list.entries || [],
      );
      const entry = allEntries.find((e: any) => e.mediaId === parseInt(id!));
      if (entry) {
        setUserProgress(entry.progress || 0);
      }
    }
  }, [userListData, id]);

  useEffect(() => {
    if (mangaData?.Media?.chapters) {
      setTotalChapters(mangaData.Media.chapters);
    }
  }, [mangaData]);

  const loadLocalChapters = useCallback(async () => {
    if (!esfweeUrl || !id) return;
    try {
      const client = new MangaApiClient(esfweeUrl);
      const chapters = await client.listChapters(parseInt(id));
      setLocalChapters(chapters.length);
    } catch (error) {
      setLocalChapters(0);
    }
  }, [esfweeUrl, id]);

  useFocusEffect(
    useCallback(() => {
      loadLocalChapters();
    }, [loadLocalChapters])
  );

  const manga = mangaData?.Media;
  const title =
    manga?.title?.english ||
    manga?.title?.romaji ||
    manga?.title?.native ||
    "Unknown";

  const handleRead = () => {
    if (localChapters > 0) {
      router.push(`/manga/${id}/chapters?progress=${userProgress}`);
    }
  };

  const handleDownload = () => {
    router.push(`/manga/${id}/download`);
  };

  if (mangaLoading) {
    return (
      <>
        <Stack.Screen options={{ title: "Loading..." }} />
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

  if (mangaError || !manga) {
    return (
      <>
        <Stack.Screen options={{ title: "Error" }} />
        <View
          style={[
            themeStyles.container,
            themeStyles.center,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[themeStyles.body, { color: colors.error }]}>
            Failed to load manga details
          </Text>
          <TouchableOpacity
            style={[
              themeStyles.button,
              { backgroundColor: colors.primary, marginTop: 16 },
            ]}
            onPress={() => router.back()}
          >
            <Text style={[themeStyles.body, { color: colors.buttonText }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: title }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={styles.coverContainer}>
          {manga.coverImage?.large && (
            <Image
              source={{ uri: manga.coverImage.large }}
              style={styles.coverImage}
              contentFit="cover"
            />
          )}
        </View>

        <View style={[themeStyles.container]}>
          <Text style={[themeStyles.title, { color: colors.text }]}>
            {title}
          </Text>

          <View style={[themeStyles.row, { marginTop: 8, marginBottom: 16 }]}>
            {manga.averageScore && (
              <View style={[themeStyles.row, { marginRight: 16 }]}>
                <Ionicons name="star" size={16} color={colors.accent} />
                <Text
                  style={[
                    themeStyles.body,
                    { color: colors.text, marginLeft: 4 },
                  ]}
                >
                  {manga.averageScore / 10}
                </Text>
              </View>
            )}
            {manga.format && (
              <Text
                style={[themeStyles.caption, { color: colors.textSecondary }]}
              >
                {manga.format}
              </Text>
            )}
            {manga.status && (
              <Text
                style={[
                  themeStyles.caption,
                  { color: colors.textSecondary, marginLeft: 8 },
                ]}
              >
                • {manga.status}
              </Text>
            )}
          </View>

          <View
            style={[
              themeStyles.card,
              { backgroundColor: colors.surface, marginBottom: 16 },
            ]}
          >
            <View style={themeStyles.spaceBetween}>
              <Text style={[themeStyles.body, { color: colors.textSecondary }]}>
                Your Progress
              </Text>
              <Text
                style={[
                  themeStyles.body,
                  { color: colors.text, fontWeight: "600" },
                ]}
              >
                {userProgress} / {totalChapters || "?"} chapters
              </Text>
            </View>
            <View style={[themeStyles.spaceBetween, { marginTop: 8 }]}>
              <Text style={[themeStyles.body, { color: colors.textSecondary }]}>
                Downloaded
              </Text>
              <Text
                style={[
                  themeStyles.body,
                  { color: colors.text, fontWeight: "600" },
                ]}
              >
                {localChapters} / {totalChapters || "?"} chapters
              </Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                themeStyles.button,
                styles.primaryButton,
                {
                  backgroundColor:
                    localChapters > 0 ? colors.primary : colors.borderLight,
                },
              ]}
              onPress={handleRead}
              disabled={localChapters === 0}
            >
              <Ionicons
                name="book-outline"
                size={20}
                color={localChapters > 0 ? colors.buttonText : colors.textMuted}
              />
              <Text
                style={[
                  themeStyles.body,
                  {
                    color:
                      localChapters > 0 ? colors.buttonText : colors.textMuted,
                    marginLeft: 8,
                    fontWeight: "600",
                  },
                ]}
              >
                {localChapters === 0
                  ? "No Chapters Downloaded"
                  : userProgress > 0
                    ? "Continue Reading"
                    : "Start Reading"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                themeStyles.button,
                styles.secondaryButton,
                { borderColor: colors.border },
              ]}
              onPress={handleDownload}
            >
              <Ionicons
                name="download-outline"
                size={20}
                color={colors.primary}
              />
              <Text
                style={[
                  themeStyles.body,
                  { color: colors.primary, marginLeft: 8 },
                ]}
              >
                Download
              </Text>
            </TouchableOpacity>
          </View>

          {manga.description && (
            <View style={{ marginTop: 16 }}>
              <Text
                style={[
                  themeStyles.heading,
                  { color: colors.text, marginBottom: 8 },
                ]}
              >
                Description
              </Text>
              <Text
                style={[
                  themeStyles.body,
                  { color: colors.textSecondary, lineHeight: 22 },
                ]}
              >
                {manga.description.replace(/<[^>]*>/g, "")}
              </Text>
            </View>
          )}

          {manga.chapters && (
            <View
              style={[
                themeStyles.card,
                { backgroundColor: colors.surface, marginTop: 16 },
              ]}
            >
              <View style={themeStyles.spaceBetween}>
                <Text
                  style={[themeStyles.body, { color: colors.textSecondary }]}
                >
                  Total Chapters
                </Text>
                <Text
                  style={[
                    themeStyles.body,
                    { color: colors.text, fontWeight: "600" },
                  ]}
                >
                  {manga.chapters}
                </Text>
              </View>
              {manga.volumes && (
                <View style={[themeStyles.spaceBetween, { marginTop: 8 }]}>
                  <Text
                    style={[themeStyles.body, { color: colors.textSecondary }]}
                  >
                    Volumes
                  </Text>
                  <Text
                    style={[
                      themeStyles.body,
                      { color: colors.text, fontWeight: "600" },
                    ]}
                  >
                    {manga.volumes}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  coverContainer: {
    width: "100%",
    height: 400,
    backgroundColor: "#000",
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  buttonContainer: {
    flexDirection: "column",
    gap: 12,
  },
  primaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
});
