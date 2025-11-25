import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/context/theme-context";

interface MangaCardProps {
  id: number;
  title: string;
  coverUri?: string | null;
  chapters?: number | null;
  onPress: () => void;
}

export function MangaCard({
  id,
  title,
  coverUri,
  chapters,
  onPress,
}: MangaCardProps) {
  const { colors, styles: themeStyles } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.mangaCard, { backgroundColor: colors.surface }]}
      onPress={onPress}
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
        {chapters && (
          <Text style={[themeStyles.caption, { color: colors.textSecondary }]}>
            {chapters} chapters
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
