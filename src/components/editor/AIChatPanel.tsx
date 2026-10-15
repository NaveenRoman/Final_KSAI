"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  User,
  Send,
  Paperclip,
  Sparkles,
  Loader2,
  Trash2,
  Mic,
  MicOff,
} from "lucide-react";

import { useEditorTheme } from "./EditorTheme";
import { useTabs } from "./tabs/TabContext";
import { useLanguage } from "./languages/LanguageContext";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type SpeechRecognitionType = any;

export default function AIChatPanel() {
  const { darkMode } = useEditorTheme();
  const { activeTab } = useTabs();
  const { language } = useLanguage();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const [isListening, setIsListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  function clearChat() {
  if (loading) return;

  setMessages([]);
}

function toggleVoiceInput() {
  if (loading) return;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "🎤 Voice input is not supported in this browser. Please use Google Chrome or Microsoft Edge.",
      },
    ]);

    return;
  }

  // Stop listening
  if (isListening) {
    recognitionRef.current?.stop();
    setIsListening(false);
    return;
  }

  const recognition = new SpeechRecognition();

  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    setIsListening(true);
  };

  recognition.onresult = (event: any) => {
    let transcript = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {
      transcript +=
        event.results[i][0].transcript;
    }

    setMessage(transcript);
  };

  recognition.onerror = (event: any) => {
    console.error(
      "Speech recognition error:",
      event.error
    );

    setIsListening(false);
  };

  recognition.onend = () => {
    setIsListening(false);
  };

  recognitionRef.current = recognition;

  recognition.start();
}

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  messagesEndRef.current?.scrollIntoView({
    behavior: "smooth",
  });
}, [messages, loading]);

useEffect(() => {
  return () => {
    recognitionRef.current?.stop();
  };
}, []);

  async function sendMessage() {
    const question = message.trim();

    if (!question || loading) return;

    if (!activeTab) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Please open a code file before starting a chat.",
        },
      ]);

      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: question,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          language:
            language?.name ||
            (activeTab.language === "cpp"
              ? "C++"
              : activeTab.language === "c"
              ? "C"
              : activeTab.language === "python"
              ? "Python"
              : "Java"),
          code: activeTab.content,

          history: messages,

          question,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Chat request failed: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("Codenthra AI Chat Response:", data);

      const aiResponse =
        data?.data?.response ??
        data?.response ??
        "";

      if (!aiResponse) {
        throw new Error("AI returned an empty response.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: aiResponse,
        },
      ]);

    } catch (error) {
      console.error("Codenthra AI Chat Error:", error);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "⚠️ Codenthra AI could not process your question. Please try again.",
        },
      ]);

    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  return (
    <div
      className={`flex flex-col h-full transition-all duration-300 ${
        darkMode
          ? "bg-[#11131B]"
          : "bg-white"
      }`}
    >

      {/* Header */}

      <div
        className={`h-12 flex items-center justify-between px-5 border-b ${
          darkMode
            ? "border-white/10"
            : "border-gray-300"
        }`}
      >
        <div className="flex items-center gap-2">

          <Sparkles
            size={18}
            className="text-cyan-500"
          />

          <span
            className={`font-semibold ${
              darkMode
                ? "text-white"
                : "text-gray-900"
            }`}
          >
            Codenthra AI Chat
          </span>

        </div>

        <div className="flex items-center gap-4">

  <div className="text-xs text-green-500">
    ● Online
  </div>

  <button
    type="button"
    onClick={clearChat}
    disabled={loading || messages.length === 0}
    title="Clear chat"
    className={`w-8 h-8 rounded-lg flex items-center justify-center transition
      ${
        darkMode
          ? "hover:bg-red-500/10 text-slate-400 hover:text-red-400"
          : "hover:bg-red-50 text-gray-500 hover:text-red-500"
      }
      disabled:opacity-30
      disabled:cursor-not-allowed
    `}
  >
    <Trash2 size={16} />
  </button>

</div>
      </div>

      {/* Messages */}

      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Welcome */}

        {messages.length === 0 && (
          <div className="flex gap-3">

            <div className="w-10 h-10 shrink-0 rounded-full bg-cyan-500 flex items-center justify-center text-white">
              <Bot size={18} />
            </div>

            <div
              className={`rounded-2xl px-4 py-3 max-w-[90%] ${
                darkMode
                  ? "bg-[#1A1D26]"
                  : "bg-gray-100"
              }`}
            >

              <p
                className={`text-sm leading-7 ${
                  darkMode
                    ? "text-slate-300"
                    : "text-gray-700"
                }`}
              >
                👋 Welcome to Codenthra AI.

                <br />
                <br />

                Ask me anything about your current code.

                <br />
                <br />

                I can help with:

                <br />

                • Code explanation

                <br />

                • Debugging

                <br />

                • Optimization

                <br />

                • Programming concepts

                <br />

                • Interview preparation
              </p>

            </div>

          </div>
        )}

        {/* Messages */}

        {messages.map((chat, index) => (

          <div
            key={index}
            className={`flex gap-3 ${
              chat.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >

            {chat.role === "assistant" && (
              <div className="w-10 h-10 shrink-0 rounded-full bg-cyan-500 flex items-center justify-center text-white">
                <Bot size={18} />
              </div>
            )}

            <div
              className={`rounded-2xl px-4 py-3 max-w-[80%] whitespace-pre-wrap text-sm leading-7 ${
                chat.role === "user"
                  ? "bg-cyan-600 text-white"
                  : darkMode
                    ? "bg-[#1A1D26] text-slate-300"
                    : "bg-gray-100 text-gray-700"
              }`}
            >
              {chat.content}
            </div>

            {chat.role === "user" && (
              <div className="w-10 h-10 shrink-0 rounded-full bg-blue-600 flex items-center justify-center text-white">
                <User size={18} />
              </div>
            )}

          </div>

        ))}

        {/* Loading */}

        {loading && (
          <div className="flex gap-3">

            <div className="w-10 h-10 shrink-0 rounded-full bg-cyan-500 flex items-center justify-center text-white">
              <Bot size={18} />
            </div>

            <div
              className={`rounded-2xl px-4 py-3 ${
                darkMode
                  ? "bg-[#1A1D26]"
                  : "bg-gray-100"
              }`}
            >
              <Loader2
                size={18}
                className="animate-spin text-cyan-500"
              />
            </div>

          </div>
        )}

        <div ref={messagesEndRef} />

      </div>

      {/* Input */}

      <div
        className={`border-t p-4 ${
          darkMode
            ? "border-white/10"
            : "border-gray-300"
        }`}
      >

        <div className="flex items-center gap-3">

          <button
            type="button"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              darkMode
                ? "bg-[#1A1D26] hover:bg-[#232734]"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <Paperclip size={18} />
          </button>

          <input
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Ask Codenthra AI..."
            className={`flex-1 rounded-xl px-4 py-3 outline-none border transition ${
              darkMode
                ? "bg-[#1A1D26] border-white/10 text-white placeholder:text-slate-400"
                : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
            }`}
          />

          <button
  type="button"
  onClick={toggleVoiceInput}
  disabled={loading}
  title={
    isListening
      ? "Stop listening"
      : "Voice input"
  }
  className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
    isListening
      ? "bg-red-500 text-white hover:bg-red-600"
      : darkMode
        ? "bg-[#1A1D26] text-slate-300 hover:bg-[#232734]"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
  } disabled:opacity-40 disabled:cursor-not-allowed`}
>
  {isListening ? (
    <MicOff size={18} />
  ) : (
    <Mic size={18} />
  )}
</button>

          <button
            type="button"
            onClick={sendMessage}
            disabled={
              loading ||
              !message.trim()
            }
            className="w-12 h-12 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition"
          >

            {loading ? (
              <Loader2
                size={18}
                className="animate-spin"
              />
            ) : (
              <Send size={18} />
            )}

          </button>

        </div>

      </div>

    </div>
  );
}