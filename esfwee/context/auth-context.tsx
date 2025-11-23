import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";

type AuthContextType = {
  isLoading: boolean;
  isLoggedInAnilist: boolean;
  anilistToken: string | null;
  loginAnilist: (token: string) => Promise<boolean>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedInAnilist, setIsLoggedInAnilist] = useState(false);
  const [anilistToken, setAnilistToken] = useState<string | null>(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync("anilist_token");
      setIsLoggedInAnilist(!!token);
      setAnilistToken(token);
    } catch (error) {
      console.error("Failed to check login status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loginAnilist = async (token: string) => {
    try {
      await SecureStore.setItemAsync("anilist_token", token);
      setIsLoggedInAnilist(true);
      setAnilistToken(token);
      return true;
    } catch (error) {
      console.error("AniList login failed:", error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync("anilist_token");
      setIsLoggedInAnilist(false);
      setAnilistToken(null);
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isLoggedInAnilist,
        anilistToken,
        loginAnilist,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
