import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { useTheme } from "@/context/theme-context";
import { useLazyQuery } from "@apollo/client/react";
import { SEARCH_MANGA } from "@/lib/anilist-queries";
import { SearchBar } from "@/components/SearchBar";
import { MangaCard } from "@/components/MangaCard";

export default function SearchScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const { colors, styles: themeStyles } = useTheme();
  const [query, setQuery] = useState(q || "");

  const [searchManga, { data, loading, error }] = useLazyQuery(SEARCH_MANGA);

  useEffect(() => {
    if (q) {
      searchManga({ variables: { search: q, page: 1, perPage: 20 } });
    }
  }, [q]);

  const handleSearch = (newQuery: string) => {
    setQuery(newQuery);
    searchManga({ variables: { search: newQuery, page: 1, perPage: 20 } });
  };

  const handleMangaPress = (id: number) => {
    router.push(`/manga/${id}`);
  };

  const results = data?.Page?.media?.filter((item) => item != null) || [];

  return (
    <>
      <Stack.Screen options={{ title: "Search" }} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[themeStyles.container]}>
          <SearchBar onSearch={handleSearch} placeholder="Search AniList..." />
        </View>

        {loading && (
          <View style={[themeStyles.center, { flex: 1 }]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {error && (
          <View style={[themeStyles.center, { flex: 1 }]}>
            <Text style={[themeStyles.body, { color: colors.error }]}>Failed to search</Text>
          </View>
        )}

        {!loading && !error && results.length === 0 && query && (
          <View style={[themeStyles.center, { flex: 1 }]}>
            <Text style={[themeStyles.body, { color: colors.textSecondary }]}>No results found</Text>
          </View>
        )}

        {!loading && !error && results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            numColumns={2}
            contentContainerStyle={styles.listContainer}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <View style={styles.cardWrapper}>
                <MangaCard
                  id={item.id}
                  title={item.title?.english || item.title?.romaji || item.title?.native || "Unknown"}
                  coverUri={item.coverImage?.large || item.coverImage?.medium}
                  chapters={item.chapters}
                  onPress={() => handleMangaPress(item.id)}
                />
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardWrapper: {
    flex: 1,
    maxWidth: "48%",
  },
});
