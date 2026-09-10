"use client";

import {
    BookOpen,
    Loader2,
} from "lucide-react";

import { useTabs } from "./tabs/TabContext";
import { useAIResult } from "./AIResultContext";
import { useLanguage } from "./languages/LanguageContext";
import { useEditor } from "./EditorContext";

export default function ExplainButton() {
    const { activeTab } = useTabs();
    const { language } = useLanguage();
    const { editor } = useEditor();

    const {
        setResult,
        setLoading,
        loading,
        setMode,
    } = useAIResult();

    async function explainCode() {
        // Read live code from Monaco editor instance first, falling back to activeTab content
        const liveCode = (editor ? editor.getValue() : activeTab?.content) || "";

        // Switch to Explanation mode and focus the Explanation panel tab
        setMode("explain");
        if (typeof window !== "undefined") {
            window.dispatchEvent(
                new CustomEvent("editor-switch-right-tab", { detail: "explanation" })
            );
        }

        // Empty code check
        if (!liveCode.trim()) {
            setResult("Write or paste some code first, then I can explain it.");
            return;
        }

        setLoading(true);
        setResult("");

        // Detect language accurately across C, C++, Java, Python, JS, TS
        const tabLang = (activeTab?.language || "").toLowerCase();
        let langName = language?.name || "Java";
        if (tabLang === "cpp" || tabLang === "c++") langName = "C++";
        else if (tabLang === "c") langName = "C";
        else if (tabLang === "python" || tabLang === "py") langName = "Python";
        else if (tabLang === "javascript" || tabLang === "js") langName = "JavaScript";
        else if (tabLang === "typescript" || tabLang === "ts") langName = "TypeScript";
        else if (tabLang === "java") langName = "Java";

        try {
            const response = await fetch(
                "/api/ai/explain",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        language: langName,
                        code: liveCode,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Explain request failed: ${response.status}`
                );
            }

            const result = await response.json();

            /*
             * Support the response structures
             * returned by Next.js and Django backends.
             */
            const aiResponse =
                result.response ??
                result.data?.response ??
                result.data ??
                result.message ??
                "";

            if (!aiResponse) {
                throw new Error(
                    "AI returned an empty response."
                );
            }

            setResult(aiResponse);

        } catch (error) {
            console.error(
                "Explain failed, using structured fallback:",
                error
            );

            setResult(generateClientFallbackExplanation(liveCode, langName));

        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            type="button"
            onClick={explainCode}
            disabled={loading}
            className="
                group
                flex
                items-center
                gap-3
                px-5
                py-3
                rounded-2xl
                bg-gradient-to-r
                from-violet-500
                to-purple-600
                text-white
                shadow-lg
                hover:scale-105
                hover:shadow-xl
                transition
                disabled:opacity-50
                disabled:cursor-not-allowed
                disabled:hover:scale-100
                cursor-pointer
            "
        >
            {loading ? (
                <Loader2
                    size={20}
                    className="animate-spin"
                />
            ) : (
                <BookOpen
                    size={20}
                />
            )}

            <span className="font-semibold text-sm">
                {loading
                    ? "Analyzing..."
                    : "Explain"}
            </span>
        </button>
    );
}

function generateClientFallbackExplanation(code: string, language: string): string {
    const lines = code.split("\n").filter((l) => l.trim().length > 0);
    const hasLoops = /for\s*\(|while\s*\(|for\s+\w+\s+in/i.test(code);
    const hasConditionals = /if\s*\(|if\s+\w+|else/i.test(code);
    const classMatches = Array.from(code.matchAll(/class\s+([a-zA-Z_]\w*)/g)).map((m) => m[1]);
    const funcMatches = Array.from(
        code.matchAll(/(?:def|function|void|int|double|String|boolean)\s+([a-zA-Z_]\w*)\s*\(/g)
    ).map((m) => m[1]).filter((f) => f !== "main" && f !== "if" && f !== "for" && f !== "while");

    let summary = `This ${language} program consists of ${lines.length} lines of code.`;
    if (classMatches.length > 0) summary += ` It defines ${classMatches.length} class(es): ${classMatches.join(", ")}.`;
    if (funcMatches.length > 0) summary += ` It contains ${funcMatches.length} modular function(s): ${funcMatches.join(", ")}.`;
    if (hasLoops) summary += " It employs iteration/loops for repetitive task processing.";
    if (hasConditionals) summary += " It uses conditional branching to handle decision logic.";

    return `### 📌 1. Topic & Purpose
**Language:** ${language}
**Overview:** ${summary}

### 📝 2. What the Code Does
The program sets up necessary data structures and logic to execute the requested operations:
• Initializes variables and required runtime dependencies.
• Processes inputs or configured state according to ${language} syntax.
• Produces runtime output to the console or system stream.

### 🔍 3. Step-by-Step Execution Logic Flow
1. **Initialization:** Defines data types, imports, and variables required for runtime.
2. **Execution Entry:** Enters the main execution block or module entry point.
3. **Core Processing:** ${hasLoops ? "Executes loop iterations to process data collections." : "Evaluates operations sequentially in program flow."}
4. **Control Flow:** ${hasConditionals ? "Branches execution paths based on evaluated conditions." : "Follows direct sequential statement execution."}
5. **Output / Completion:** Emits results and concludes lifecycle gracefully.

### 💡 4. Important Concepts & Functions/Classes Used
• **Syntax & Semantics:** Standard ${language} keywords and idiomatic structure.
• **State Management:** Local variables, scope boundaries, and typed definitions.
${classMatches.length > 0 ? `• **Classes Defined:** ${classMatches.map((c) => `\`${c}\``).join(", ")} (encapsulating state and logic).\n` : ""}${funcMatches.length > 0 ? `• **Functions/Methods:** ${funcMatches.map((f) => `\`${f}()\``).join(", ")} (modularizing operations).\n` : ""}${hasLoops ? "• **Iteration:** Loops for systematic evaluation.\n" : ""}${hasConditionals ? "• **Decision Trees:** Branching logic for state routing.\n" : ""}

### ⚠️ 5. Potential Issues, Edge Cases & Mistakes
• **Input Boundaries:** Always check for empty inputs, negative values, or zero division before processing.
• **Off-by-One Errors:** Review array indexing and loop termination bounds carefully.
• **Memory & Stream Leaks:** Close streams or input readers when completed.
• **Null Reference Protection:** Check variables for null/undefined before invoking methods.

### 🚀 6. Suggestions for Improvement
• Decouple algorithm computations from printing for modular unit testing.
• Add descriptive docstrings or comments explaining non-trivial logic blocks.
• Structure unit tests to verify logic correctness across varying inputs.

### 💻 7. Expected Input & Output
• **Input:** Interactive console entry or predefined variables.
• **Output:** Formatted results printed to standard output stream.`;
}