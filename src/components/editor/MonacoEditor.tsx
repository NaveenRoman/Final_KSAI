"use client";

import Editor from "@monaco-editor/react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { editor as MonacoEditor } from "monaco-editor";

import { useTabs } from "./tabs/TabContext";
import { useEditorTheme } from "./EditorTheme";
import { useEditorSettings } from "./EditorSettingsContext";
import type { CompilerError } from "./monaco/ErrorParser";
import { registerLanguages } from "./monaco/registerLanguages";
import { useEditor } from "./EditorContext";
import { showDiagnostics } from "./monaco/MonacoDiagnostics";
import { debounceCompile } from "./monaco/LiveDiagnostics";
import { compileCode } from "./monaco/LiveCompiler";
import { useAIResult } from "./AIResultContext";
import { validateStudentCode } from "./dictator/DictatorEngine";
import { useLanguage } from "./languages/LanguageContext";
import { cleanTextForSpeech } from "./voice/VoiceDictatorEngine";

export default function MonacoEditorPanel() {
  const { darkMode } = useEditorTheme();
  const { settings } = useEditorSettings();
  const { language } = useLanguage();

  const {
    activeTab,
    updateTabContent,
    diagnosticsByTab,
    setTabDiagnostics,
  } = useTabs();

  const {
    setEditor,
    setDiagnostics,
  } = useEditor();

  const {
    dictatorActive,
    dictatorProject,
    dictatorUnits,
    dictatorCurrentUnit,
    dictatorSessionId,
    setDictatorStep,
    setDictatorCompleted,
    setDictatorFeedback,
    setDictatorCurrentUnit,
    setDictatorValidationStatus,
    setDictatorTypedToken,
    setDictatorExpectedToken,
    setDictatorErrorExplanation,
    setCurrentDictatorMessage,
    setMode,
  } = useAIResult();

  const activeDiagnostics =
    activeTab
        ? diagnosticsByTab[activeTab.id] ?? []
        : [];

  const editorRef =
    useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestSessionIdRef = useRef(dictatorSessionId);
  const currentUnitRef = useRef(dictatorCurrentUnit);
  const unitsRef = useRef(dictatorUnits);
  const lastSpokenHashRef = useRef<string>("");

  useEffect(() => {
    latestSessionIdRef.current = dictatorSessionId;
    lastSpokenHashRef.current = "";
  }, [dictatorSessionId]);

  useEffect(() => {
    currentUnitRef.current = dictatorCurrentUnit;
  }, [dictatorCurrentUnit]);

  useEffect(() => {
    unitsRef.current = dictatorUnits;
  }, [dictatorUnits]);

  useEffect(() => {
    if (!editorRef.current) return;
    showDiagnostics(editorRef.current, activeDiagnostics);
  }, [activeDiagnostics]);

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const updateMobile = () => {
      setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    };
    updateMobile();
    window.addEventListener("resize", updateMobile);
    return () => window.removeEventListener("resize", updateMobile);
  }, []);

  const editorOptions = useMemo(() => ({
    fontSize: isMobile ? Math.max(12, settings.editor.fontSize - 1) : settings.editor.fontSize,
    tabSize: settings.editor.tabSize,
    minimap: { enabled: isMobile ? false : settings.editor.minimap },
    wordWrap: isMobile ? ("on" as const) : settings.editor.wordWrap ? ("on" as const) : ("off" as const),
    lineNumbers: settings.editor.lineNumbers ? ("on" as const) : ("off" as const),
    fontFamily: settings.editor.fontFamily,
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    cursorBlinking: "smooth" as const,
    cursorSmoothCaretAnimation: "on" as const,
    automaticLayout: true,
    padding: { top: isMobile ? 8 : 12, bottom: isMobile ? 8 : 12 },
    folding: !isMobile,
    glyphMargin: false,
    lineDecorationsWidth: isMobile ? 2 : 6,
    lineNumbersMinChars: isMobile ? 2 : 3,
    renderLineHighlight: "line" as const,
    bracketPairColorization: { enabled: true },
    guides: {
        bracketPairs: !isMobile,
        indentation: true,
    },
    suggest: {
        snippetsPreventQuickSuggestions: false,
    },
  }), [settings.editor, isMobile]);

  return (
    <div className="h-full w-full relative">
      <Editor
        onMount={(editor: any) => {
          editorRef.current = editor;
          registerLanguages();
          setEditor(editor);
        }}
        height="100%"
        language={language?.monacoLanguage || activeTab?.language || "java"}
        value={activeTab?.content ?? language?.starterCode ?? ""}
        theme={darkMode ? "vs-dark" : "vs"}
        options={editorOptions}
        onChange={(value) => {
          if (!activeTab) return;

          const code = value || "";

          updateTabContent(
            activeTab.id,
            code
          );

          // =========================================================
          // REAL-TIME TWO-LAYER PROGRESSIVE DICTATOR VALIDATION
          // =========================================================
          if (dictatorActive && unitsRef.current.length > 0) {
            setMode("dictator");

            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
            }

            debounceTimerRef.current = setTimeout(() => {
              const currentLang = activeTab?.language || language?.id || "java";
              const currentUnits = unitsRef.current;
              const activeUnitIdx = currentUnitRef.current;

              const res = validateStudentCode(
                code,
                currentUnits,
                activeUnitIdx,
                currentLang,
                dictatorProject
              );

              setDictatorValidationStatus(res.status);
              setDictatorExpectedToken(res.expectedToken);
              setDictatorTypedToken(res.typedToken || "");
              setDictatorFeedback(res.message);
              if (res.dictatorMessage) {
                setCurrentDictatorMessage(res.dictatorMessage);
              }

              if (res.status === "completed") {
                setDictatorCompleted(true);
                setDictatorStep(currentUnits.length);
                setDictatorCurrentUnit(currentUnits.length - 1);
              } else if (res.status === "correct" && res.nextUnitIndex !== undefined) {
                setDictatorCurrentUnit(res.nextUnitIndex);
                setDictatorStep(res.nextUnitIndex + 1);
                currentUnitRef.current = res.nextUnitIndex;
              } else if (res.status === "error") {
                setDictatorErrorExplanation(res.message);
                // Do NOT advance unit index on error
              }

              // Voice guidance with deduplication - speaking the SAME synchronized message
              const speechText = res.dictatorMessage?.speechText || res.speech;
              if (
                speechText &&
                speechText !== lastSpokenHashRef.current &&
                typeof window !== "undefined" &&
                "speechSynthesis" in window
              ) {
                lastSpokenHashRef.current = speechText;
                window.speechSynthesis.cancel();
                const cleaned = cleanTextForSpeech(speechText);
                const speech = new SpeechSynthesisUtterance(cleaned);
                speech.rate = 0.95;
                speech.pitch = 1;
                speech.volume = 1;
                window.speechSynthesis.speak(speech);
              }
            }, 120);
          }

          // =========================
          // LIVE COMPILER CHECK
          // =========================
          debounceCompile(() => {
            compileCode(
              code,
              (errors: CompilerError[]) => {
                setTabDiagnostics(
                  activeTab.id,
                  errors
                );
                setDiagnostics(errors);
              },
              activeTab.language || language?.id || "java",
              activeTab.name
            );
          });
        }}
      />
    </div>
  );
}
