import { useState, useEffect } from "react";
import { ActivityIndicator, ScrollView, View, Text } from "react-native";
import { useAuth } from "@/context/auth-context";
import { useEsfweeUrl } from "@/context/esfwee";
import { fetchUserData, AniListUser } from "@/lib/anilist";
import { router } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { useLazyQuery } from "@apollo/client/react";
import {
  GET_MEDIA_LIST,
  GET_POPULAR_MANGA,
  GET_RECOMMENDATIONS,
} from "@/lib/anilist-queries";
import { SearchBar } from "@/components/SearchBar";
import { MangaSection } from "@/components/MangaSection";
import { MediaType } from "@/__generated__/graphql";

export default function HomeScreen() {
  const { anilistToken, isLoading: authLoading } = useAuth();
  const { isLoading, url } = useEsfweeUrl();
  const { colors, styles: themeStyles } = useTheme();
  const [user, setUser] = useState<AniListUser | null>(null);

  const [getMediaList, { data: mediaListData, loading: mediaListLoading }] =
    useLazyQuery(GET_MEDIA_LIST);
  const [getPopularManga, { data: popularData, loading: popularLoading }] =
    useLazyQuery(GET_POPULAR_MANGA);
  const [
    getRecommendations,
    { data: recommendationsData, loading: recommendationsLoading },
  ] = useLazyQuery(GET_RECOMMENDATIONS);

  useEffect(() => {
    if (authLoading || isLoading) return;

    if (!anilistToken || !url) {
      router.replace("/login");
    } else {
      loadData();
    }
  }, [authLoading, anilistToken, isLoading, url]);

  const loadData = async () => {
    if (!anilistToken) return;

    const { data, error } = await fetchUserData(anilistToken);

    if (data) {
      setUser(data.Viewer);
      getMediaList({
        variables: { userId: data.Viewer.id, type: MediaType.Manga },
      });
      getPopularManga({ variables: { page: 1, perPage: 20 } });
      getRecommendations({ variables: { page: 1, perPage: 20 } });
    }
  };

  const handleSearch = (query: string) => {
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleMangaPress = (id: number) => {
    router.push(`/manga/${id}`);
  };

  const continueReading =
    mediaListData?.MediaListCollection?.lists
      ?.flatMap((list: any) => list.entries || [])
      .filter((entry: any) => entry.status === "CURRENT" && entry.progress > 0)
      .map((entry: any) => ({ ...entry.media, progress: entry.progress })) ||
    [];

  const planToRead =
    mediaListData?.MediaListCollection?.lists
      ?.flatMap((list: any) => list.entries || [])
      .filter((entry: any) => entry.status === "PLANNING")
      .map((entry: any) => entry.media) || [];

  const recommended = ((recommendationsData as any)?.Page?.media || []).filter(
    (m: any): m is NonNullable<typeof m> => m != null,
  );

  const popular = (popularData?.Page?.media || []).filter(
    (m: any): m is NonNullable<typeof m> => m != null,
  );

  if (authLoading || isLoading || !user) {
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
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[themeStyles.container]}>
        <Text
          style={[themeStyles.title, { color: colors.text, marginBottom: 16 }]}
        >
          Welcome back, {user.name}
        </Text>

        <SearchBar onSearch={handleSearch} />

        <MangaSection
          title="Continue Reading"
          data={continueReading}
          loading={mediaListLoading}
          onMangaPress={handleMangaPress}
          emptyMessage="No manga in progress"
        />

        <MangaSection
          title="Plan to Read"
          data={planToRead}
          loading={mediaListLoading}
          onMangaPress={handleMangaPress}
          emptyMessage="No manga planned"
        />

        <MangaSection
          title="Trending Now"
          data={recommended}
          loading={recommendationsLoading}
          onMangaPress={handleMangaPress}
          emptyMessage="No trending manga found"
        />

        <MangaSection
          title="Popular Now"
          data={popular}
          loading={popularLoading}
          onMangaPress={handleMangaPress}
          emptyMessage="No popular manga found"
        />
      </View>
    </ScrollView>
  );
}
