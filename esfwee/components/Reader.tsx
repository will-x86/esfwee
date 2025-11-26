import { useTheme } from "@/context/theme-context";
import { MangaApiClient } from "@/lib/esfwee-api";
import { useReaderSettings } from "@/context/reader-settings";
import { ReaderSettings } from "@/components/ReaderSettings";
import Feather from "@expo/vector-icons/Feather";
import { Image } from "expo-image";
import { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  GestureResponderEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { useNavigation } from "@react-navigation/native";

type ReaderProps = {
  esfweeUrl: string;
  chapter: { id: number; number: string; pageCount: number };
  onBack: () => void;
};

const createSpreads = (pages: any[], double: boolean) => {
  if (!double) return pages.map((p) => [p]);

  const spreads = [];
  if (pages.length > 0) spreads.push([pages[0]]);

  for (let i = 1; i < pages.length; i += 2) {
    const spread = [pages[i]];
    if (i + 1 < pages.length) spread.push(pages[i + 1]);
    spreads.push(spread);
  }
  return spreads;
};

export const Reader = ({ esfweeUrl, chapter, onBack }: ReaderProps) => {
  const { colors } = useTheme();
  const { direction, doublePage } = useReaderSettings();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [showUI, setShowUI] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const [currPageNum, setCurrPageNum] = useState(1);
  const [currSpreadIndex, setCurrSpreadIndex] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const client = useMemo(() => new MangaApiClient(esfweeUrl), [esfweeUrl]);
  const dim = Dimensions.get("window");

  const rawPages = useMemo(
    () =>
      Array.from({ length: chapter.pageCount }, (_, i) => ({
        index: i + 1,
        url: client.getPageUrl(chapter.id, i + 1),
      })),
    [chapter, client],
  );

  const spreads = useMemo(
    () => createSpreads(rawPages, doublePage),
    [rawPages, doublePage],
  );

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: { display: "none" },
      headerShown: false,
    });

    return () => {
      navigation.setOptions({
        tabBarStyle: { backgroundColor: colors.surface },
        headerShown: false,
      });
    };
  }, [navigation, colors]);

  useEffect(() => {
    if (!showUI) NavigationBar.setVisibilityAsync("hidden");
    else NavigationBar.setVisibilityAsync("visible");
  }, [showUI]);

  const scrollToSpread = (index: number) => {
    if (index >= 0 && index < spreads.length) {
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }
  };

  const handleTap = (evt: GestureResponderEvent) => {
    const { pageX } = evt.nativeEvent;
    const width = dim.width;

    const isLeft = pageX < width * 0.3;
    const isRight = pageX > width * 0.7;

    if (isLeft) {
      if (direction === "rtl") scrollToSpread(currSpreadIndex + 1);
      else scrollToSpread(currSpreadIndex - 1);
    } else if (isRight) {
      if (direction === "rtl") scrollToSpread(currSpreadIndex - 1);
      else scrollToSpread(currSpreadIndex + 1);
    } else {
      setShowUI((p) => !p);
    }
  };

  const renderSpread = ({ item }: { item: typeof rawPages }) => {
    const isSpread = item.length > 1;

    return (
      <ScrollView
        minimumZoomScale={1}
        maximumZoomScale={3}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: dim.width,
          height: dim.height,
          flexDirection: direction === "rtl" ? "row-reverse" : "row",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={handleTap}
          style={{
            flex: 1,
            flexDirection: direction === "rtl" ? "row-reverse" : "row",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {item.map((page) => (
            <Image
              key={page.index}
              source={{ uri: page.url }}
              style={{
                width: isSpread ? dim.width / 2 : dim.width,
                height: dim.height,
              }}
              contentFit="contain"
              cachePolicy="memory-disk"
            />
          ))}
        </Pressable>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <RNStatusBar
        hidden={!showUI}
        barStyle="light-content"
        backgroundColor="black"
      />

      <FlatList
        ref={flatListRef}
        data={spreads}
        renderItem={renderSpread}
        keyExtractor={(item) => item[0].index.toString()}
        horizontal={direction !== "vertical"}
        pagingEnabled={direction !== "vertical"}
        inverted={direction === "rtl"}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        windowSize={3}
        onViewableItemsChanged={({ viewableItems }) => {
          if (viewableItems.length > 0 && viewableItems[0].index !== null) {
            setCurrSpreadIndex(viewableItems[0].index);
            setCurrPageNum(viewableItems[0].item[0].index);
          }
        }}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
      />

      {showUI && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "space-between",
            pointerEvents: "box-none",
          }}
        >
          <View
            style={{
              paddingTop: insets.top,
              paddingHorizontal: 12,
              paddingBottom: 8,
              backgroundColor: "rgba(0,0,0,0.7)",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <TouchableOpacity onPress={onBack} style={{ padding: 2 }}>
              <Feather name="arrow-left" size={20} color="white" />
            </TouchableOpacity>
            <Text
              style={{
                color: "white",
                marginLeft: 12,
                fontWeight: "600",
                fontSize: 14,
                flex: 1,
              }}
              numberOfLines={1}
            >
              Ch. {chapter.number}
            </Text>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={{ padding: 2 }}
            >
              <Feather name="settings" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View
            style={{
              paddingBottom: insets.bottom + 8,
              paddingTop: 8,
              backgroundColor: "rgba(0,0,0,0.7)",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "500", fontSize: 13 }}>
              Page {currPageNum} / {chapter.pageCount}
            </Text>
          </View>
        </View>
      )}

      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)" }}
          onPress={() => setShowSettings(false)}
        >
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <Pressable
              style={{
                backgroundColor: colors.surface,
                padding: 24,
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: insets.bottom + 20,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text
                style={{
                  color: colors.text,
                  fontSize: 18,
                  fontWeight: "bold",
                  marginBottom: 20,
                }}
              >
                Reader Settings
              </Text>
              <ReaderSettings />
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};
