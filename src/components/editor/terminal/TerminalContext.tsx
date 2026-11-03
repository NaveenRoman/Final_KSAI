"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  ReactNode,
} from "react";

import { TerminalTab } from "./TerminalTypes";

interface TerminalContextType {
  tabs: TerminalTab[];
  activeTab: string;
  activePanel: "terminal" | "output" | "problems";
  clearSignal: number;

  output: string;
  setOutput: (text: string) => void;
  clearOutput: () => void;

  problemsText: string;
  setProblemsText: (text: string) => void;
  clearProblemsText: () => void;

  appendOutput: (text: string) => void;

  showTerminal: boolean;
  setShowTerminal: (value: boolean) => void;

  setActivePanel: (value: "terminal" | "output" | "problems") => void;

  clearTerminal: () => void;
  createTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;

  // Interactive Execution Support
  isRunning: boolean;
  activeSessionId: string | null;
  sendInput: (input: string) => Promise<boolean>;
  stopExecution: () => void;
  startExecution: (params: {
    code: string;
    language: string;
    fileName?: string;
    onValidationError?: (err: { message: string; diagnostics?: any[] }) => void;
  }) => Promise<void>;
}

const TerminalContext = createContext<TerminalContextType | undefined>(undefined);

export function TerminalProvider({ children }: { children: ReactNode }) {
  const [showTerminal, setShowTerminal] = useState(true);

  const [tabs, setTabs] = useState<TerminalTab[]>([
    {
      id: crypto.randomUUID(),
      name: "Terminal 1",
    },
  ]);

  const [activeTab, setActiveTab] = useState(tabs[0]?.id || "");
  const [activePanel, setActivePanel] = useState<"terminal" | "output" | "problems">("terminal");

  const [clearSignal, setClearSignal] = useState(0);
  const [output, setOutput] = useState("");
  const [problemsText, setProblemsText] = useState("");

  const [isRunning, setIsRunning] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const activeSessionIdRef = useRef<string | null>(null);

  const clearTerminal = () => {
    setClearSignal((prev) => prev + 1);
  };

  const clearOutput = () => {
    setOutput("");
  };

  const clearProblemsText = () => {
    setProblemsText("");
  };

  const appendOutput = (text: string) => {
    setOutput((prev) => prev + text);
  };

  const createTab = () => {
    const newTab = {
      id: crypto.randomUUID(),
      name: `Terminal ${tabs.length + 1}`,
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTab(newTab.id);
  };

  const closeTab = (id: string) => {
    const remaining = tabs.filter((tab) => tab.id !== id);
    setTabs(remaining);
    if (remaining.length > 0) {
      setActiveTab(remaining[0].id);
    } else {
      setShowTerminal(false);
    }
  };

  const stopExecution = () => {
    const currentId = activeSessionIdRef.current;
    if (currentId) {
      fetch("/api/run/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentId }),
      }).catch(() => {});
    }
    setIsRunning(false);
    setActiveSessionId(null);
    activeSessionIdRef.current = null;
  };

  const sendInput = async (input: string): Promise<boolean> => {
    const currentId = activeSessionIdRef.current;
    if (!currentId) return false;

    // Echo input locally into terminal output stream
    setOutput((prev) => prev + input + "\n");

    try {
      const res = await fetch("/api/run/input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: currentId, input: input + "\n" }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const startExecution = async ({
    code,
    language,
    fileName = "",
    onValidationError,
  }: {
    code: string;
    language: string;
    fileName?: string;
    onValidationError?: (err: { message: string; diagnostics?: any[] }) => void;
  }) => {
    if (isRunning) {
      stopExecution();
    }

    setIsRunning(true);
    setActivePanel("output");
    setShowTerminal(true);
    setOutput(
`========================================
KnowledgeStream AI Execution
========================================

`
    );

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, fileName }),
      });

      const data = await response.json().catch(() => ({}));
      setIsRunning(false);

      if (!response.ok) {
        if (data.diagnostics || data.output) {
          if (onValidationError) {
            onValidationError({
              message: data.output || "Execution Error",
              diagnostics: data.diagnostics,
            });
          } else {
            setProblemsText(data.output || "Execution Error");
            setActivePanel("problems");
          }
          return;
        }

        setOutput((prev) =>
          prev +
          `\nExecution Error: ${data.message || data.output || "Failed to execute code."}\n` +
          `\n========================================\n`
        );
        return;
      }

      const outText = data.output || (data.success ? "Program finished successfully with no console output." : "Execution failed.");
      const duration = data.executionTime ?? 0;
      const codeVal = data.exitCode ?? (data.success ? 0 : 1);

      setOutput((prev) => {
        let finalMsg = prev + outText;
        if (!finalMsg.endsWith("\n")) {
          finalMsg += "\n\n";
        } else {
          finalMsg += "\n";
        }
        finalMsg += `Execution Time : ${duration} ms\n`;
        finalMsg += `Exit Code      : ${codeVal}\n\n`;
        finalMsg += `========================================`;
        return finalMsg;
      });
    } catch (err: any) {
      setIsRunning(false);
      setOutput((prev) =>
        prev +
        `\nExecution Error: ${err.message || "Failed to communicate with execution service."}\n` +
        `\n========================================\n`
      );
    }
  };

  return (
    <TerminalContext.Provider
      value={{
        tabs,
        activeTab,
        createTab,
        closeTab,
        setActiveTab,
        activePanel,
        setActivePanel,
        clearSignal,
        clearTerminal,
        output,
        setOutput,
        clearOutput,
        problemsText,
        setProblemsText,
        clearProblemsText,
        appendOutput,
        showTerminal,
        setShowTerminal,
        isRunning,
        activeSessionId,
        sendInput,
        stopExecution,
        startExecution,
      }}
    >
      {children}
    </TerminalContext.Provider>
  );
}

export function useTerminal() {
  const context = useContext(TerminalContext);
  if (!context) {
    throw new Error("TerminalProvider missing.");
  }
  return context;
}