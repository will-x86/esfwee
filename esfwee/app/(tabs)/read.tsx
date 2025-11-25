import { useEsfweeUrl } from "@/context/esfwee";
import { useTheme } from "@/context/theme-context";
import { Manga, MangaApiClient } from "@/lib/esfwee-api";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export default function ReadScreen() {
  const { colors, styles: themeStyles } = useTheme();
  const { url: esfweeUrl } = useEsfweeUrl();
  const [localManga, setLocalManga] = useState<Manga[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  useEffect(() => {
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
  }, [esfweeUrl]);

  return <></>;
}
