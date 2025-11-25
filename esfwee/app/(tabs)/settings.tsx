import React from "react";

import {
  TextInput,
  Pressable,
  ScrollView,
  Text,
  View,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "@/context/theme-context";
import { useAuth } from "@/context/auth-context";
import { useEsfweeUrl } from "@/context/esfwee";

export default function SettingsScreen() {
  const { url, setUrl } = useEsfweeUrl();

  const { colors, styles } = useTheme();
  const { logout } = useAuth();
  const [text, onChangeText] = React.useState(url || undefined);

  const onPressEsfwee = async () => {
    console.log(text);
    if (text) {
      await setUrl(text);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={[
          styles.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        <Text style={[styles.heading, { color: colors.text }]}>
          Anilist Settings
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.error }]}
          onPress={logout}
        >
          <Text
            style={[
              styles.body,
              { color: colors.buttonText, fontWeight: "600" },
            ]}
          >
            Logout of anilist
          </Text>
        </TouchableOpacity>
        <View style={styles.buttonContainer}>
          <Text style={[styles.heading, { color: colors.text }]}>
            Esfwee Settings
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Update Esfwee URL
          </Text>
          <TextInput
            style={[
              styles.input,
              { borderColor: colors.border, color: colors.text },
            ]}
            onChangeText={onChangeText}
            value={text}
            placeholder="Enter esfwee server URL"
            placeholderTextColor={colors.textMuted}
          />
          <Pressable
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.primary },
              pressed && styles.buttonPressed,
            ]}
            onPress={onPressEsfwee}
          >
            <Text style={[styles.body, { color: colors.buttonText }]}>
              Save
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}
