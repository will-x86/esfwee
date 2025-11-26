import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useTheme } from "@/context/theme-context";
import { MangaCard } from "./MangaCard";

interface MangaItem {
  id: number;
  title: {
    romaji?: string | null;
    english?: string | null;
    native?: string | null;
  };
  coverImage?: {
    large?: string | null;
    medium?: string | null;
  } | null;
  chapters?: number | null;
  progress?: number;
}

interface MangaSectionProps {
  title: string;
  data: MangaItem[];
  loading?: boolean;
  onMangaPress: (id: number) => void;
  emptyMessage?: string;
}

export function MangaSection({
  title,
  data,
  loading = false,
  onMangaPress,
  emptyMessage = "No manga found",
}: MangaSectionProps) {
  const { colors, styles: themeStyles } = useTheme();

  const getTitle = (manga: MangaItem) => {
    return manga.title.english || manga.title.romaji || manga.title.native || "Unknown";
  };

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={[themeStyles.heading, { color: colors.text }]}>{title}</Text>
        <View style={[styles.loadingContainer, themeStyles.center]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.section}>
        <Text style={[themeStyles.heading, { color: colors.text }]}>{title}</Text>
        <Text style={[themeStyles.caption, { color: colors.textSecondary, marginTop: 8 }]}>
          {emptyMessage}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={[themeStyles.heading, { color: colors.text, marginBottom: 12 }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {data.map((manga) => (
          <MangaCard
            key={manga.id}
            id={manga.id}
            title={getTitle(manga)}
            coverUri={manga.coverImage?.large || manga.coverImage?.medium}
            chapters={manga.chapters}
            onPress={() => onMangaPress(manga.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  loadingContainer: {
    height: 200,
  },
});
