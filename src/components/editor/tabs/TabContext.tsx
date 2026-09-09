"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";

import { EditorTab, TabContextType } from "./TabTypes";
import type { CompilerError } from "../monaco/ErrorParser";
import { useLanguage } from "../languages/LanguageContext";

const TabContext = createContext<TabContextType | null>(null);

export function TabProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();

  // Create initial tab based on the selected language
  const [tabs, setTabs] = useState<EditorTab[]>(() => [
    {
      id: `file-${language.id}-main`,
      name: language.defaultFile || "main.py",
      path: language.defaultFile || "main.py",
      language: language.id || "python",
      content: language.starterCode || "",
      isDirty: false,
      isPinned: false,
    },
  ]);

  const [activeTabId, setActiveTabId] = useState<string | null>(
    () => `file-${language.id}-main`
  );

  const [diagnosticsByTab, setDiagnosticsByTab] = useState<
    Record<string, CompilerError[]>
  >({});

  // Synchronize active tab when language changes
  const prevLangIdRef = useRef(language.id);
  useEffect(() => {
    if (prevLangIdRef.current !== language.id) {
      prevLangIdRef.current = language.id;

      setTabs((prevTabs) => {
        // Check if there is already an open tab for this language
        const existingLangTab = prevTabs.find(
          (t) =>
            t.language === language.id ||
            t.name.endsWith(language.extension) ||
            t.path.endsWith(language.extension)
        );

        if (existingLangTab) {
          setActiveTabId(existingLangTab.id);
          return prevTabs;
        }

        // Create new default tab for the newly selected language
        const newTabId = `file-${language.id}-${Date.now()}`;
        const newTab: EditorTab = {
          id: newTabId,
          name: language.defaultFile,
          path: language.defaultFile,
          language: language.id,
          content: language.starterCode,
          isDirty: false,
          isPinned: false,
        };

        setActiveTabId(newTabId);
        return [...prevTabs, newTab];
      });
    }
  }, [language.id, language.defaultFile, language.extension, language.starterCode]);

  const activeTab = tabs.find((tab) => tab.id === activeTabId) || (tabs.length > 0 ? tabs[0] : null);

  function openTab(tab: EditorTab) {
    setTabs((prev) => {
      const existing = prev.find((t) => t.id === tab.id || t.path === tab.path || t.name === tab.name);

      if (existing) {
        setActiveTabId(existing.id);
        return prev;
      }

      setActiveTabId(tab.id);
      setDiagnosticsByTab((diagnostics) => ({
        ...diagnostics,
        [tab.id]: [],
      }));

      return [...prev, tab];
    });
  }

  function closeTab(tabId: string) {
    setTabs((prev) => {
      const updated = prev.filter((tab) => tab.id !== tabId);

      if (activeTabId === tabId) {
        setActiveTabId(updated.length ? updated[updated.length - 1].id : null);
      }

      return updated;
    });

    setDiagnosticsByTab((prev) => {
      const updated = { ...prev };
      delete updated[tabId];
      return updated;
    });
  }

  function setActiveTab(tabId: string) {
    setActiveTabId(tabId);
  }

  function updateTabContent(tabId: string, content: string) {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              content,
              isDirty: true,
            }
          : tab
      )
    );
  }

  function markSaved(tabId: string) {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              isDirty: false,
            }
          : tab
      )
    );
  }

  function pinTab(tabId: string) {
    setTabs((prev) =>
      prev.map((tab) =>
        tab.id === tabId
          ? {
              ...tab,
              isPinned: !tab.isPinned,
            }
          : tab
      )
    );
  }

  function saveActiveTab() {
    if (!activeTabId) return;
    markSaved(activeTabId);
  }

  function setTabDiagnostics(tabId: string, errors: CompilerError[]) {
    setDiagnosticsByTab((prev) => ({
      ...prev,
      [tabId]: errors,
    }));
  }

  function clearTabDiagnostics(tabId: string) {
    setDiagnosticsByTab((prev) => ({
      ...prev,
      [tabId]: [],
    }));
  }

  return (
    <TabContext.Provider
      value={{
        tabs,
        activeTab,
        activeTabId,
        saveActiveTab,
        openTab,
        closeTab,
        setActiveTab,
        updateTabContent,
        markSaved,
        pinTab,
        diagnosticsByTab,
        setTabDiagnostics,
        clearTabDiagnostics,
      }}
    >
      {children}
    </TabContext.Provider>
  );
}

export function useTabs() {
  const context = useContext(TabContext);

  if (!context) {
    throw new Error("useTabs must be used inside TabProvider.");
  }

  return context;
}