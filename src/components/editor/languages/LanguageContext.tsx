"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  LANGUAGES,
  LanguageConfig,
  getLanguageConfig,
} from "./LanguageConfig";

interface LanguageContextType {
  language: LanguageConfig;
  setLanguage: (nameOrId: string) => void;
  languages: LanguageConfig[];
  accessibleLanguages: LanguageConfig[];
  loading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const urlLang =
    searchParams?.get("course") ||
    searchParams?.get("language") ||
    searchParams?.get("lang") ||
    "";

  const [accessibleList, setAccessibleList] = useState<LanguageConfig[]>(LANGUAGES);
  const [selectedLangId, setSelectedLangId] = useState<string>("java");
  const [loading, setLoading] = useState(true);

  // Fetch accessible languages from backend
  useEffect(() => {
    let isMounted = true;
    async function loadAccessible() {
      try {
        const res = await fetch("/api/editor/accessible-languages");
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.languages) && data.languages.length > 0) {
            if (isMounted) {
              setAccessibleList(data.languages);

              // Check if URL param matches an accessible language
              const targetLang = getLanguageConfig(urlLang);
              const isUrlLangAccessible = data.languages.some(
                (l: LanguageConfig) => l.id === targetLang.id
              );

              if (urlLang && isUrlLangAccessible) {
                setSelectedLangId(targetLang.id);
              } else {
                setSelectedLangId(data.languages[0].id);
              }
            }
          }
        }
      } catch (err) {
        console.error("Failed to load accessible languages:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAccessible();
    return () => {
      isMounted = false;
    };
  }, [urlLang]);

  const language = useMemo(() => {
    const found = accessibleList.find(
      (l) => l.id === selectedLangId || l.name.toLowerCase() === selectedLangId.toLowerCase()
    );
    return found || accessibleList[0] || LANGUAGES[0];
  }, [selectedLangId, accessibleList]);

  const handleSetLanguage = (nameOrId: string) => {
    const config = getLanguageConfig(nameOrId);
    // Ensure selected language is accessible
    const isAccessible = accessibleList.some((l) => l.id === config.id);
    if (isAccessible) {
      setSelectedLangId(config.id);
    } else {
      setSelectedLangId(config.id);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: handleSetLanguage,
        languages: LANGUAGES,
        accessibleLanguages: accessibleList,
        loading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}