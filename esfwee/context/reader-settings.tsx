import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";

export type ReadingDirection = "ltr" | "rtl" | "vertical";
export type ScaleType = "fit-width" | "fit-height";

type ReaderSettingsContextType = {
  direction: ReadingDirection;
  setDirection: (dir: ReadingDirection) => void;
  doublePage: boolean;
  setDoublePage: (enabled: boolean) => void;
};

const ReaderSettingsContext = createContext<ReaderSettingsContextType>({
  direction: "rtl",
  setDirection: () => {},
  doublePage: false,
  setDoublePage: () => {},
});

export const ReaderSettingsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [direction, setDirectionState] = useState<ReadingDirection>("rtl");
  const [doublePage, setDoublePageState] = useState(false);

  useEffect(() => {
    const load = async () => {
      const dir = await SecureStore.getItemAsync("reader_direction");
      const dp = await SecureStore.getItemAsync("reader_double_page");
      if (dir) setDirectionState(dir as ReadingDirection);
      if (dp) setDoublePageState(dp === "true");
    };
    load();
  }, []);

  const setDirection = async (val: ReadingDirection) => {
    setDirectionState(val);
    await SecureStore.setItemAsync("reader_direction", val);
  };

  const setDoublePage = async (val: boolean) => {
    setDoublePageState(val);
    await SecureStore.setItemAsync("reader_double_page", String(val));
  };

  return (
    <ReaderSettingsContext.Provider
      value={{ direction, setDirection, doublePage, setDoublePage }}
    >
      {children}
    </ReaderSettingsContext.Provider>
  );
};

export const useReaderSettings = () => useContext(ReaderSettingsContext);
