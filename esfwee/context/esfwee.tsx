import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

type EsfweeUrlContextType = {
  url: string | null;
  setUrl: (url: string) => Promise<void>;
  isLoading: boolean;
};

const EsfweeUrlContext = createContext<EsfweeUrlContextType | undefined>(
  undefined,
);

export const EsfweeUrlProvider = ({ children }: { children: ReactNode }) => {
  const [url, setUrlState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUrl();
  }, []);

  const loadUrl = async () => {
    try {
      const storedUrl = await SecureStore.getItemAsync("esfwee_url");
      setUrlState(storedUrl);
    } catch (error) {
      console.error("Failed to load esfwee URL:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setUrl = async (newUrl: string) => {
    try {
      await SecureStore.setItemAsync("esfwee_url", newUrl);
      setUrlState(newUrl);
    } catch (error) {
      console.error("Failed to save esfwee URL:", error);
    }
  };

  return (
    <EsfweeUrlContext.Provider value={{ url, setUrl, isLoading }}>
      {children}
    </EsfweeUrlContext.Provider>
  );
};

export const useEsfweeUrl = () => {
  const context = useContext(EsfweeUrlContext);
  if (context === undefined) {
    throw new Error("useEsfweeUrl must be used within an EsfweeUrlProvider");
  }
  return context;
};
