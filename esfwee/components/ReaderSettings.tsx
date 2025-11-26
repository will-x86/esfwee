import { View, Text, TouchableOpacity, StyleSheet, Switch } from "react-native";
import { useTheme } from "@/context/theme-context";
import { useReaderSettings, ReadingDirection } from "@/context/reader-settings";

export const ReaderSettings = () => {
  const { colors, styles: themeStyles } = useTheme();
  const { direction, setDirection, doublePage, setDoublePage } =
    useReaderSettings();

  const dirOptions: { label: string; value: ReadingDirection }[] = [
    { label: "Left to Right", value: "ltr" },
    { label: "Right to Left", value: "rtl" },
    { label: "Vertical", value: "vertical" },
  ];

  return (
    <View style={{ width: "100%", gap: 20 }}>
      <View>
        <Text
          style={[themeStyles.heading, { color: colors.text, marginBottom: 8 }]}
        >
          Reading Direction
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {dirOptions.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setDirection(opt.value)}
              style={[
                styles.optionBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor:
                    direction === opt.value ? colors.primary : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  color:
                    direction === opt.value ? colors.buttonText : colors.text,
                  fontWeight: "600",
                  fontSize: 12,
                }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={[themeStyles.body, { color: colors.text }]}>
          Double Page (Landscape)
        </Text>
        <Switch
          value={doublePage}
          onValueChange={setDoublePage}
          trackColor={{ false: colors.border, true: colors.primary }}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  optionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    alignItems: "center",
  },
});
