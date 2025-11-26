import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/context/theme-context";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search manga..." }: SearchBarProps) {
  const { colors, styles: themeStyles } = useTheme();
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery("");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Ionicons name="search" size={20} color={colors.iconSecondary} style={styles.icon} />
      <TextInput
        style={[themeStyles.body, { color: colors.text, flex: 1 }]}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={handleSearch}
        returnKeyType="search"
      />
      {query.length > 0 && (
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color={colors.iconSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  icon: {
    marginRight: 8,
  },
  clearButton: {
    marginLeft: 8,
  },
});
