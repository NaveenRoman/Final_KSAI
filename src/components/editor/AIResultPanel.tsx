"use client";

import {
    Sparkles,
    Copy,
    RotateCcw,
    Download,
    CheckCircle2,
    Mic,
    VolumeX,
    Check,
    Play,
    ArrowLeft,
    ArrowRight,
    Edit3,
    AlertCircle,
    CheckCircle,
    Clock,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useTabs } from "./tabs/TabContext";
import { useEditorTheme } from "./EditorTheme";
import { useAIResult } from "./AIResultContext";
import { useLanguage } from "./languages/LanguageContext";
import { useEditor } from "./EditorContext";

import {
    fetchDictatorPlan,
    type DictatorStep,
} from "./dictator/DictatorPlanner";
import {
    generateTeachingUnits,
    convertStepsToTeachingUnits,
    type DictatorTeachingUnit,
} from "./dictator/DictatorTokenizer";
import {
    validateStudentCode,
    validateCompleteProgram,
    createDictatorMessage,
    createInitialDictatorMessage,
    type DictatorMessage,
} from "./dictator/DictatorEngine";
import { cleanTextForSpeech } from "./voice/VoiceDictatorEngine";

export default function AIResultPanel() {
    const { darkMode } = useEditorTheme();
    const { language } = useLanguage();
    const { editor } = useEditor();

    const {
        result,
        loading,
        mode,

        // General setters
        setResult,
        setLoading,
        setMode,

        // Dictator state
        dictatorActive,
        dictatorLanguage,
        dictatorProject,
        dictatorStep,
        dictatorTotalSteps,
        dictatorPlan,
        dictatorRequirements,
        dictatorCompleted,
        dictatorFeedback,

        // Progressive word-by-word state
        dictatorUnits,
        dictatorCurrentUnit,
        dictatorValidationStatus,
        dictatorTypedToken,
        dictatorExpectedToken,
        dictatorErrorExplanation,
        currentDictatorMessage,

        // Dictator setters
        setDictatorActive,
        setDictatorLanguage,
        setDictatorProject,
        setDictatorStep,
        setDictatorTotalSteps,
        setDictatorPlan,
        setDictatorRequirements,
        setDictatorCompleted,
        setDictatorFeedback,
        setDictatorUnits,
        setDictatorCurrentUnit,
        setDictatorValidationStatus,
        setDictatorTypedToken,
        setDictatorExpectedToken,
        setDictatorErrorExplanation,
        setCurrentDictatorMessage,
        incrementSessionId,
        resetDictatorSession,
    } = useAIResult();

    const [speaking, setSpeaking] = useState(false);
    const [copied, setCopied] = useState(false);

    const { activeTab, updateTabContent, tabs, openTab, setActiveTab } = useTabs();

    const [dictatorInput, setDictatorInput] = useState("");
    const [dictatorLevel, setDictatorLevel] = useState("beginner");
    const [dictatorCategory, setDictatorCategory] = useState<"beginner" | "intermediate" | "advanced">("beginner");
    const [dictatorPracticeLevel, setDictatorPracticeLevel] = useState<"1" | "2" | "3">("1");

    // =========================
    // Auto Code State
    // =========================
    const [autoCodeInput, setAutoCodeInput] = useState("");
    const [autoCodeGenerating, setAutoCodeGenerating] = useState(false);
    const [autoCodeResult, setAutoCodeResult] = useState<{
        code: string;
        explanation: string;
        project: string;
        language: string;
        level: string;
    } | null>(null);

    // =========================================================
    // LANGUAGE SWITCH HANDLING DURING DICTATOR
    // =========================================================
    const prevLangIdRef = useRef(language.id);
    useEffect(() => {
        if (prevLangIdRef.current && prevLangIdRef.current !== language.id) {
            // Safely reset active Dictator session & cancel speech
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
            }
            resetDictatorSession();
            setDictatorInput("");
            setResult(`You switched to ${language.name}. What program would you like to build?`);
        }
        prevLangIdRef.current = language.id;
    }, [language.id, language.name, resetDictatorSession, setResult]);

    /*
     * Speak AI explanation
     */
    function speakResult() {
        const textToSpeak = result || dictatorFeedback;
        if (!textToSpeak) return;
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const cleaned = cleanTextForSpeech(textToSpeak);
        const speech = new SpeechSynthesisUtterance(cleaned);
        speech.rate = 0.95;
        speech.pitch = 1;
        speech.volume = 1;

        speech.onstart = () => setSpeaking(true);
        speech.onend = () => setSpeaking(false);
        speech.onerror = () => setSpeaking(false);
        window.speechSynthesis.speak(speech);
    }

    /*
     * Stop speech
     */
    function stopSpeaking() {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }
        setSpeaking(false);
    }

    /*
     * Copy AI result
     */
    async function copyResult() {
        const textToCopy = result || activeTab?.content || "";
        if (!textToCopy) return;
        if (typeof navigator !== "undefined" && navigator.clipboard) {
            await navigator.clipboard.writeText(textToCopy);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }

    /*
     * Download AI result
     */
    function downloadResult() {
        const textToSave = result || activeTab?.content || "";
        if (!textToSave || typeof document === "undefined" || typeof window === "undefined") return;
        const blob = new Blob([textToSave], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `CodeXAI-${language.name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /*
     * Regenerate
     */
    function regenerate() {
        if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("codexai-regenerate"));
        }
    }

    async function startDictator() {
        const project = dictatorInput.trim();
        if (!project) {
            setResult(`Please enter what ${language.name} program you want to build.`);
            return;
        }
        await startDictatorSession(
            project,
            `${dictatorCategory}_l${dictatorPracticeLevel}`,
            dictatorCategory,
            dictatorPracticeLevel
        );
    }

    const [dictatorAttempts, setDictatorAttempts] = useState<Record<string, number>>({});

    async function startDictatorSession(
        project: string,
        levelOverride?: string,
        categoryOverride?: "beginner" | "intermediate" | "advanced",
        practiceLevelOverride?: "1" | "2" | "3"
    ) {
        if (!project || !project.trim()) return;

        const currentLang = language?.id || activeTab?.language || "python";
        const cat = categoryOverride || dictatorCategory;
        const pLevel = practiceLevelOverride || dictatorPracticeLevel;
        const targetLevel = levelOverride || `${cat}_l${pLevel}`;
        
        // Track repetition / iteration attempts
        const attemptKey = `${currentLang}_${project.toLowerCase().trim()}_${cat}_${pLevel}`;
        const currentAttempt = (dictatorAttempts[attemptKey] || 0) + 1;
        setDictatorAttempts((prev) => ({ ...prev, [attemptKey]: currentAttempt }));

        setLoading(true);
        setResult("");

        // Cancel previous speech immediately
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
        }

        // Generate brand new unique session ID
        const currentSession = incrementSessionId();

        // 1. Synchronize active tab with selected language
        let targetTabId = activeTab?.id;
        const matchesCurrentLang =
            activeTab &&
            (activeTab.language === currentLang ||
                (language.extension && activeTab.name.endsWith(language.extension)));

        if (!matchesCurrentLang) {
            const existingLangTab = tabs.find(
                (t) =>
                    t.language === currentLang ||
                    (language.extension && t.name.endsWith(language.extension))
            );
            if (existingLangTab) {
                setActiveTab(existingLangTab.id);
                targetTabId = existingLangTab.id;
            } else {
                const defaultName = language.defaultFile || `main${language.extension || ".py"}`;
                const newId = `file-${currentLang}-${Date.now()}`;
                openTab({
                    id: newId,
                    name: defaultName,
                    path: defaultName,
                    language: currentLang,
                    content: "",
                    isDirty: false,
                    isPinned: false,
                });
                targetTabId = newId;
            }
        }

        try {
            // Fetch plan (from AI or verified local synthesizer) with full active file & multi-file context
            const planRes = await fetchDictatorPlan(
                project,
                currentLang,
                targetLevel,
                String(currentSession),
                activeTab?.name || language.defaultFile,
                activeTab?.path || language.defaultFile,
                activeTab?.content || "",
                tabs.map((t) => ({ name: t.name, path: t.path, language: t.language })),
                cat,
                pLevel,
                currentAttempt
            );
            let units: DictatorTeachingUnit[] = [];

            if (planRes && planRes.steps && planRes.steps.length > 0) {
                units = convertStepsToTeachingUnits(planRes.steps, targetLevel, currentLang);
                setDictatorPlan(planRes.steps);
                setDictatorRequirements(planRes.requirements || []);
            } else {
                units = generateTeachingUnits(project, currentLang, targetLevel);
            }

            if (!units || units.length === 0) {
                setMode("dictator");
                setDictatorActive(false);
                setResult(`What program would you like to build in ${language.name}?`);
                return;
            }

            // Handle multi-file projects if returned
            if (planRes && Array.isArray(planRes.files) && planRes.files.length > 0) {
                const primaryFileName = planRes.primaryFile || (planRes.files[0] ? planRes.files[0].name : "");
                for (const f of planRes.files) {
                    if (f.name && f.content !== undefined) {
                        const existingAuxTab = tabs.find((t) => t.name === f.name);
                        if (existingAuxTab) {
                            if (f.name !== primaryFileName) {
                                updateTabContent(existingAuxTab.id, f.content);
                            }
                        } else if (f.name !== primaryFileName) {
                            openTab({
                                id: `file-${currentLang}-${f.name.replace(/[^a-zA-Z0-9_-]/g, "_")}-${Date.now()}`,
                                name: f.name,
                                path: f.path || f.name,
                                language: f.language || currentLang,
                                content: f.content,
                                isDirty: false,
                                isPinned: false,
                            });
                        }
                    }
                }
            }

            const initialMsg = createInitialDictatorMessage(units[0], 0, units.length);

            setDictatorUnits(units);
            setDictatorCurrentUnit(0);
            setDictatorProject(project);
            setDictatorLanguage(currentLang);
            setDictatorStep(1);
            setDictatorTotalSteps(units.length);
            setDictatorActive(true);
            setDictatorCompleted(false);
            setDictatorValidationStatus("typing");
            setDictatorExpectedToken(units[0].expectedToken);
            setDictatorTypedToken("");
            setDictatorErrorExplanation("");
            setDictatorFeedback(initialMsg.explanation);
            setCurrentDictatorMessage(initialMsg);
            setMode("dictator");

            // Reset tab content for new program
            if (targetTabId) {
                updateTabContent(targetTabId, "");
            } else if (activeTab) {
                updateTabContent(activeTab.id, "");
            }

            // Speak first step
            if (typeof window !== "undefined" && "speechSynthesis" in window && initialMsg.speechText) {
                const cleaned = cleanTextForSpeech(initialMsg.speechText);
                const speech = new SpeechSynthesisUtterance(cleaned);
                speech.rate = 0.95;
                speech.pitch = 1;
                speech.volume = 1;
                window.speechSynthesis.speak(speech);
            }
        } catch (err: any) {
            console.error("Dictator startup error:", err);
            setResult(err.message || "Failed to start Dictator session.");
        } finally {
            setLoading(false);
        }
    }

    const currentUnit: DictatorTeachingUnit | undefined =
        dictatorUnits && dictatorUnits.length > 0
            ? dictatorUnits[Math.min(dictatorCurrentUnit, dictatorUnits.length - 1)]
            : undefined;

    /*
     * =========================================================
     * INSERT STEP CODE (INSERTS ONLY THE CURRENT TEACHING UNIT)
     * =========================================================
     */
    function applyStepCode() {
        if (!activeTab || !currentUnit) return;

        // Insert only the accumulated code up to current unit
        const targetCode = currentUnit.fullAccumulatedCode;
        updateTabContent(activeTab.id, targetCode);

        // Advance to next unit
        const nextIdx = dictatorCurrentUnit + 1;
        if (nextIdx >= dictatorUnits.length) {
            setDictatorCompleted(true);
            setDictatorValidationStatus("completed");
            const completeMsg = createDictatorMessage({
                instruction: "The program is completed. Now run the code.",
                explanation: `Excellent! All ${dictatorUnits.length} units for ${dictatorProject} in ${language.name} are finished and verified.\n\nThe program is completed. Now run the code.`,
                expectedToken: "",
                progress: `🎉 Program Complete!`,
                stepNumber: dictatorUnits.length,
                totalSteps: dictatorUnits.length,
                isComplete: true,
                speechText: "Excellent! The complete program has been written and checked. The program is completed. Now run the code.",
            });
            setDictatorFeedback(completeMsg.explanation);
            setCurrentDictatorMessage(completeMsg);
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const cleaned = cleanTextForSpeech(completeMsg.speechText);
                const speech = new SpeechSynthesisUtterance(cleaned);
                speech.rate = 0.95;
                window.speechSynthesis.speak(speech);
            }
        } else {
            const nextUnit = dictatorUnits[nextIdx];
            const advanceMsg = createDictatorMessage({
                instruction: `Next: ${nextUnit.title}.\n\n${nextUnit.instruction}`,
                explanation: `Good. Step ${dictatorCurrentUnit + 1} complete.\n\nNow let's move to Step ${nextIdx + 1}: ${nextUnit.title}.\n\n${nextUnit.explanation || nextUnit.instruction}`,
                expectedToken: nextUnit.expectedToken,
                hint: nextUnit.hint,
                progress: `✓ Step ${dictatorCurrentUnit + 1} complete`,
                stepNumber: nextIdx + 1,
                totalSteps: dictatorUnits.length,
                isComplete: false,
                speechText: `Good! Now let's move to ${nextUnit.title}.`,
            });
            setDictatorCurrentUnit(nextIdx);
            setDictatorStep(nextIdx + 1);
            setDictatorExpectedToken(nextUnit.expectedToken);
            setDictatorValidationStatus("correct");
            setDictatorFeedback(advanceMsg.explanation);
            setCurrentDictatorMessage(advanceMsg);
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const cleaned = cleanTextForSpeech(advanceMsg.speechText);
                const speech = new SpeechSynthesisUtterance(cleaned);
                speech.rate = 0.95;
                window.speechSynthesis.speak(speech);
            }
        }
    }

    function nextDictatorStep() {
        if (!dictatorUnits || dictatorUnits.length === 0) return;
        const currentCode = activeTab?.content || "";
        const currentLang = activeTab?.language || language?.id || "java";

        const validation = validateStudentCode(
            currentCode,
            dictatorUnits,
            dictatorCurrentUnit,
            currentLang,
            dictatorProject
        );

        if (!validation.correct && validation.status === "error") {
            setDictatorValidationStatus("error");
            setDictatorErrorExplanation(validation.message);
            setDictatorFeedback(validation.message);
            if (validation.dictatorMessage) {
                setCurrentDictatorMessage(validation.dictatorMessage);
            }
            return;
        }

        if (dictatorCurrentUnit < dictatorUnits.length - 1) {
            const nextIdx = dictatorCurrentUnit + 1;
            const nextUnit = dictatorUnits[nextIdx];
            const advanceMsg = createDictatorMessage({
                instruction: `👉 Step ${nextIdx + 1}: ${nextUnit.title}\n\n${nextUnit.instruction}`,
                explanation: `Good! Let's continue to Step ${nextIdx + 1}: ${nextUnit.title}.\n\n${nextUnit.explanation || nextUnit.instruction}`,
                expectedToken: nextUnit.expectedToken,
                hint: nextUnit.hint,
                progress: `Step ${nextIdx + 1} of ${dictatorUnits.length}`,
                stepNumber: nextIdx + 1,
                totalSteps: dictatorUnits.length,
                isComplete: false,
                speechText: `Good! Let's move to Step ${nextIdx + 1}: ${nextUnit.title}.`,
            });
            setDictatorCurrentUnit(nextIdx);
            setDictatorStep(nextIdx + 1);
            setDictatorExpectedToken(nextUnit.expectedToken);
            setDictatorValidationStatus("typing");
            setDictatorFeedback(advanceMsg.explanation);
            setCurrentDictatorMessage(advanceMsg);
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const cleaned = cleanTextForSpeech(advanceMsg.speechText);
                const speech = new SpeechSynthesisUtterance(cleaned);
                speech.rate = 0.95;
                window.speechSynthesis.speak(speech);
            }
        } else if (dictatorCurrentUnit === dictatorUnits.length - 1) {
            const finalValidation = validateCompleteProgram(currentCode, dictatorUnits, currentLang, dictatorProject);
            if (finalValidation.valid) {
                const completeMsg = finalValidation.dictatorMessage || createDictatorMessage({
                    instruction: "The program is completed. Now run the code.",
                    explanation: "Excellent! The complete program has been written and checked.\n\nThe program is completed. Now run the code.",
                    expectedToken: "",
                    progress: "🎉 Program Complete!",
                    stepNumber: dictatorUnits.length,
                    totalSteps: dictatorUnits.length,
                    isComplete: true,
                    speechText: "Excellent! The complete program has been written and checked. The program is completed. Now run the code.",
                });
                setDictatorCompleted(true);
                setDictatorValidationStatus("completed");
                setDictatorFeedback(completeMsg.explanation);
                setCurrentDictatorMessage(completeMsg);
                if (typeof window !== "undefined" && "speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                    const cleaned = cleanTextForSpeech(completeMsg.speechText);
                    const speech = new SpeechSynthesisUtterance(cleaned);
                    speech.rate = 0.95;
                    window.speechSynthesis.speak(speech);
                }
            } else {
                setDictatorValidationStatus("error");
                setDictatorErrorExplanation(finalValidation.message);
                setDictatorFeedback(finalValidation.message);
                if (finalValidation.dictatorMessage) {
                    setCurrentDictatorMessage(finalValidation.dictatorMessage);
                }
            }
        }
    }

    function prevDictatorStep() {
        if (dictatorCurrentUnit > 0) {
            const prevIdx = dictatorCurrentUnit - 1;
            const prevUnit = dictatorUnits[prevIdx];
            const prevMsg = createDictatorMessage({
                instruction: `👉 Step ${prevIdx + 1}: ${prevUnit.title}\n\n${prevUnit.instruction}`,
                explanation: `Returning to Step ${prevIdx + 1}: ${prevUnit.title}.\n\n${prevUnit.explanation || prevUnit.instruction}`,
                expectedToken: prevUnit.expectedToken,
                hint: prevUnit.hint,
                progress: `Step ${prevIdx + 1} of ${dictatorUnits.length}`,
                stepNumber: prevIdx + 1,
                totalSteps: dictatorUnits.length,
                isComplete: false,
                speechText: `Returning to Step ${prevIdx + 1}: ${prevUnit.title}.`,
            });
            setDictatorCurrentUnit(prevIdx);
            setDictatorStep(prevIdx + 1);
            setDictatorCompleted(false);
            setDictatorExpectedToken(prevUnit.expectedToken);
            setDictatorValidationStatus("typing");
            setDictatorFeedback(prevMsg.explanation);
            setCurrentDictatorMessage(prevMsg);
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
                window.speechSynthesis.cancel();
                const cleaned = cleanTextForSpeech(prevMsg.speechText);
                const speech = new SpeechSynthesisUtterance(cleaned);
                speech.rate = 0.95;
                window.speechSynthesis.speak(speech);
            }
        }
    }

    function resetDictator() {
        resetDictatorSession();
        setDictatorInput("");
    }

    const [insertedStatus, setInsertedStatus] = useState<"idle" | "inserted" | "replaced">("idle");

    function applyCodeToEditor(codeToApply: string, createNewTab: boolean = false) {
        if (!codeToApply) return;

        const currentLang = language?.id || activeTab?.language || "java";
        const langExt =
            currentLang === "python" ? ".py" :
            currentLang === "cpp" ? ".cpp" :
            currentLang === "c" ? ".c" :
            currentLang === "javascript" ? ".js" :
            currentLang === "typescript" ? ".ts" : ".java";

        const defaultFileName =
            currentLang === "python" ? "main.py" :
            currentLang === "cpp" ? "main.cpp" :
            currentLang === "c" ? "main.c" :
            currentLang === "javascript" ? "main.js" :
            currentLang === "typescript" ? "main.ts" : "Main.java";

        if (createNewTab) {
            const newId = `file-${currentLang}-${Date.now()}`;
            openTab({
                id: newId,
                name: defaultFileName,
                path: defaultFileName,
                language: currentLang,
                content: codeToApply,
                isDirty: false,
                isPinned: false,
            });
            setActiveTab(newId);
            if (editor) {
                editor.setValue(codeToApply);
            }
            setInsertedStatus("inserted");
            setTimeout(() => setInsertedStatus("idle"), 3500);
            return;
        }

        // Check if active tab matches language
        const matchesCurrentLang =
            activeTab &&
            (activeTab.language === currentLang ||
                activeTab.name.endsWith(langExt));

        if (matchesCurrentLang && activeTab) {
            if (editor) {
                editor.setValue(codeToApply);
            }
            updateTabContent(activeTab.id, codeToApply);
            setInsertedStatus("replaced");
            setTimeout(() => setInsertedStatus("idle"), 3500);
        } else {
            // Find an existing tab for this language or open new
            const existingTab = tabs.find(
                (t) => t.language === currentLang || t.name.endsWith(langExt)
            );
            if (existingTab) {
                setActiveTab(existingTab.id);
                updateTabContent(existingTab.id, codeToApply);
                if (editor) {
                    editor.setValue(codeToApply);
                }
            } else {
                const newId = `file-${currentLang}-${Date.now()}`;
                openTab({
                    id: newId,
                    name: defaultFileName,
                    path: defaultFileName,
                    language: currentLang,
                    content: codeToApply,
                    isDirty: false,
                    isPinned: false,
                });
                setActiveTab(newId);
                if (editor) {
                    editor.setValue(codeToApply);
                }
            }
            setInsertedStatus("inserted");
            setTimeout(() => setInsertedStatus("idle"), 3500);
        }
    }

    /*
     * Auto Code Generator
     */
    async function generateAutoCode() {
        const project = autoCodeInput.trim();
        if (!project) {
            setResult("Please enter what you want to build.");
            return;
        }

        const currentLanguage = activeTab?.language || language?.id || "java";

        setAutoCodeGenerating(true);
        setMode("autocode");
        setAutoCodeResult(null);

        try {
            let generatedCode = "";
            let explanation = "";

            try {
                const response = await fetch("/api/ai/autocode/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        language: currentLanguage,
                        project,
                        level: dictatorLevel,
                        learningLevel: dictatorLevel,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();

                    // 1. Direct code property
                    if (data?.data?.code && typeof data.data.code === "string") {
                        generatedCode = data.data.code;
                        explanation = data.data.explanation || "";
                    } else {
                        // 2. Structured response field
                        const aiResponse = data?.data?.response ?? data?.response ?? data?.data ?? null;

                        if (aiResponse) {
                            if (typeof aiResponse === "object" && aiResponse.code) {
                                generatedCode = String(aiResponse.code);
                                explanation = String(aiResponse.explanation || "");
                            } else if (typeof aiResponse === "string") {
                                let cleaned = aiResponse.trim();
                                if (cleaned.startsWith("```")) {
                                    cleaned = cleaned
                                        .replace(/^```(?:json)?\s*/i, "")
                                        .replace(/\s*```$/, "")
                                        .trim();
                                }

                                try {
                                    const parsed = JSON.parse(cleaned);
                                    if (parsed && typeof parsed === "object" && parsed.code) {
                                        generatedCode = String(parsed.code);
                                        explanation = String(parsed.explanation || "");
                                    } else {
                                        generatedCode = cleaned;
                                        explanation = `Complete ${project} program generated for ${language.name}.`;
                                    }
                                } catch {
                                    generatedCode = cleaned;
                                    explanation = `Complete ${project} program generated for ${language.name}.`;
                                }
                            }
                        }
                    }
                }
            } catch (fetchErr) {
                console.warn("API autocode request failed, falling back to universal engine:", fetchErr);
            }

            // Fallback to universal curriculum synthesizer if API response was incomplete
            if (!generatedCode) {
                const units = generateTeachingUnits(project, currentLanguage, dictatorLevel);
                if (units && units.length > 0) {
                    generatedCode = units[units.length - 1].fullAccumulatedCode;
                    explanation =
                        `### 📖 ${project} (${language.name} — ${dictatorLevel.toUpperCase()})\n\n` +
                        `Complete working implementation of **${project}** tailored for **${dictatorLevel}** level.\n\n` +
                        `**Overview:**\n` +
                        units.map((u, idx) => `• Step ${idx + 1}: ${u.title} — ${u.explanation || u.instruction}`).join("\n");
                }
            }

            if (!generatedCode) {
                throw new Error("Generated code was empty.");
            }

            const resultObj = {
                code: generatedCode,
                explanation: explanation || `Generated complete ${project} program in ${language.name}.`,
                project,
                language: language.name,
                level: dictatorLevel,
            };

            setAutoCodeResult(resultObj);
            setResult(resultObj.explanation);

            // If editor is empty or default starter code, auto-insert safely
            const currentEditorText = (editor ? editor.getValue() : activeTab?.content) || "";
            const isEditorEmpty = !currentEditorText.trim() || currentEditorText.trim() === (language?.starterCode || "").trim();

            if (isEditorEmpty) {
                applyCodeToEditor(generatedCode, false);
            }
        } catch (error) {
            console.error("Auto Code error:", error);
            setResult("⚠️ CodeXAI could not generate the code. Please try again.");
        } finally {
            setAutoCodeGenerating(false);
        }
    }

    const totalUnitsCount = dictatorUnits?.length || dictatorTotalSteps || 1;
    const currentUnitDisplayIndex = dictatorCurrentUnit + 1;
    const progressPercent = Math.min(
        (currentUnitDisplayIndex / totalUnitsCount) * 100,
        100
    );

    return (
        <div
            className={`
                h-full
                flex-1
                min-h-0
                overflow-hidden
                flex
                flex-col
                transition-all
                duration-300
                ${
                    darkMode
                        ? "bg-[#0E1117]"
                        : "bg-white"
                }
            `}
        >
            {/* Header */}
            <div
                className={`
                    flex
                    items-center
                    justify-between
                    px-4
                    h-10
                    border-b
                    text-xs
                    select-none
                    ${
                        darkMode
                            ? "border-white/10 text-slate-400"
                            : "border-gray-200 text-gray-500"
                    }
                `}
            >
                {/* Left Title */}
                <div className="flex items-center gap-2 font-medium">
                    <Sparkles size={14} className="text-cyan-500" />
                    <span>
                        {mode === "dictator"
                            ? `CodeXAI Dictator (${language.name})`
                            : mode === "autocode"
                            ? "CodeXAI Auto Code"
                            : mode === "guide"
                            ? "Codenthra AI Guide"
                            : mode === "error"
                            ? "CodeXAI Error Fix"
                            : "CodeXAI Explanation"}
                    </span>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1">
                    {speaking ? (
                        <button
                            type="button"
                            onClick={stopSpeaking}
                            title="Stop Speaking"
                            className="p-1 rounded-md text-red-400 hover:bg-white/10 transition"
                        >
                            <VolumeX size={14} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={speakResult}
                            title="Listen to Explanation"
                            className="p-1 rounded-md hover:bg-white/10 transition"
                        >
                            <Mic size={14} />
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={copyResult}
                        title="Copy Result"
                        className="p-1 rounded-md hover:bg-white/10 transition"
                    >
                        {copied ? (
                            <Check size={14} className="text-emerald-400" />
                        ) : (
                            <Copy size={14} />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={downloadResult}
                        title="Download Result"
                        className="p-1 rounded-md hover:bg-white/10 transition"
                    >
                        <Download size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={regenerate}
                        title="Regenerate"
                        className="p-1 rounded-md hover:bg-white/10 transition"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 text-xs font-mono">
                <div className="max-w-4xl mx-auto space-y-4">
                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-12 gap-3 text-slate-400">
                            <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            <span>
                                {mode === "dictator"
                                    ? `Creating progressive ${language.name} teaching plan...`
                                    : "CodeXAI is thinking..."}
                            </span>
                        </div>
                    )}

                    {/* Result Content (for Explain/Guide/Error) */}
                    {!loading && result && mode !== "dictator" && mode !== "autocode" && (
                        <div
                            className={`p-4 rounded-xl border text-sm leading-relaxed whitespace-pre-wrap ${
                                darkMode
                                    ? "bg-[#181B23] border-white/10 text-slate-200"
                                    : "bg-gray-50 border-gray-200 text-gray-800"
                            }`}
                        >
                            {result}
                        </div>
                    )}

                    {!loading && !result && mode !== "dictator" && mode !== "autocode" && (
                        <div
                            className={`p-8 text-center rounded-2xl border ${
                                darkMode
                                    ? "bg-[#181B23]/40 border-white/5 text-slate-400"
                                    : "bg-slate-50 border-slate-200 text-slate-500"
                            }`}
                        >
                            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-violet-500/20 to-purple-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                                <Sparkles size={22} />
                            </div>
                            <h4 className={`font-semibold text-sm mb-1 ${darkMode ? "text-slate-200" : "text-slate-800"}`}>
                                Code Explanation Ready
                            </h4>
                            <p className="text-xs opacity-75 max-w-xs mx-auto">
                                Click <strong>Explain</strong> in the bottom dock or select code to generate a complete step-by-step breakdown.
                            </p>
                        </div>
                    )}

                    {/* =========================================================
                        AUTO CODE VIEW
                    ========================================================== */}
                    {!loading && mode === "autocode" && (
                        <div
                            className={`rounded-2xl border p-6 ${
                                darkMode
                                    ? "bg-[#181B23] border-white/10"
                                    : "bg-gray-50 border-gray-300"
                            }`}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <h3
                                        className={`font-semibold ${
                                            darkMode ? "text-white" : "text-gray-900"
                                        }`}
                                    >
                                        CodeXAI Auto Code
                                    </h3>
                                    <p
                                        className={`text-xs ${
                                            darkMode ? "text-slate-400" : "text-gray-500"
                                        }`}
                                    >
                                        Generate complete, verified code in{" "}
                                        <span className="font-semibold text-blue-400">
                                            {language.name}
                                        </span>
                                        .
                                    </p>
                                </div>
                            </div>

                            {/* Program Input */}
                            <label
                                className={`block text-sm font-medium mb-2 ${
                                    darkMode ? "text-slate-300" : "text-gray-700"
                                }`}
                            >
                                What program do you want to build in {language.name}?
                            </label>
                            <input
                                value={autoCodeInput}
                                onChange={(e) => setAutoCodeInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !autoCodeGenerating) generateAutoCode();
                                }}
                                placeholder={
                                    language.name === "Python"
                                        ? "Example: Student marks program or Calculator"
                                        : language.name === "C++"
                                        ? "Example: Bank management system or Binary search"
                                        : language.name === "C"
                                        ? "Example: Linked list program or Calculator"
                                        : "Example: ATM program or Student management system"
                                }
                                className={`w-full rounded-xl px-4 py-3 outline-none border mb-5 ${
                                    darkMode
                                        ? "bg-[#11131B] border-white/10 text-white placeholder:text-slate-500"
                                        : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                                }`}
                            />

                            {/* Target Language / File */}
                            <label
                                className={`block text-sm font-medium mb-2 ${
                                    darkMode ? "text-slate-300" : "text-gray-700"
                                }`}
                            >
                                Target Language & File
                            </label>
                            <div
                                className={`rounded-xl px-4 py-3 border text-sm mb-5 ${
                                    darkMode
                                        ? "bg-[#11131B] border-white/10 text-slate-300"
                                        : "bg-white border-gray-300 text-gray-700"
                                }`}
                            >
                                <span className="text-blue-400 font-semibold">{language.name}</span>
                                {activeTab?.name ? ` — ${activeTab.name}` : ""}
                            </div>

                            {/* Learning Level Selector */}
                            <label
                                className={`block text-sm font-medium mb-2 ${
                                    darkMode ? "text-slate-300" : "text-gray-700"
                                }`}
                            >
                                Learning Level
                            </label>
                            <select
                                value={dictatorLevel}
                                onChange={(e) => setDictatorLevel(e.target.value)}
                                className={`w-full rounded-xl px-4 py-3 outline-none border mb-6 ${
                                    darkMode
                                        ? "bg-[#11131B] border-white/10 text-white"
                                        : "bg-white border-gray-300 text-gray-900"
                                }`}
                            >
                                <option value="beginner">Beginner (Simple & Direct)</option>
                                <option value="intermediate">Intermediate (Modular & Functions)</option>
                                <option value="advanced">Advanced (OOP & Robust Architecture)</option>
                            </select>

                            {/* Generate Button */}
                            <button
                                type="button"
                                onClick={generateAutoCode}
                                disabled={autoCodeGenerating}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition text-white font-semibold shadow-md flex items-center justify-center gap-2 mb-6 disabled:opacity-50"
                            >
                                {autoCodeGenerating ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Generating {language.name} Program...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={16} />
                                        <span>⚡ Generate {language.name} Program</span>
                                    </>
                                )}
                            </button>

                            {/* Generated Code Display */}
                            {autoCodeResult && (
                                <div className="space-y-4 pt-2 border-t border-white/10">
                                    {/* Explanation Card */}
                                    {autoCodeResult.explanation && (
                                        <div
                                            className={`p-4 rounded-xl border text-xs leading-relaxed whitespace-pre-wrap ${
                                                darkMode
                                                    ? "bg-[#11131B] border-white/10 text-slate-300"
                                                    : "bg-white border-gray-200 text-gray-700"
                                            }`}
                                        >
                                            <p className="font-semibold text-xs text-blue-400 mb-1.5">
                                                📖 Program Overview
                                            </p>
                                            {autoCodeResult.explanation}
                                        </div>
                                    )}

                                    {/* Generated Code Box */}
                                    <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0D1117]">
                                        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-white/5 text-xs text-slate-400 font-mono">
                                            <span>
                                                {autoCodeResult.project} ({language.name} - {autoCodeResult.level})
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (autoCodeResult?.code) {
                                                            applyCodeToEditor(autoCodeResult.code, false);
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                                                    title={activeTab?.content?.trim() ? `Replace contents of ${activeTab.name}` : "Insert code into editor"}
                                                >
                                                    <Edit3 size={12} />
                                                    <span>
                                                        {insertedStatus === "replaced"
                                                            ? "Replaced!"
                                                            : insertedStatus === "inserted"
                                                            ? "Inserted!"
                                                            : activeTab?.content?.trim()
                                                            ? `Replace in ${activeTab.name}`
                                                            : "Insert Code"}
                                                    </span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (autoCodeResult?.code) {
                                                            applyCodeToEditor(autoCodeResult.code, true);
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1 transition"
                                                    title="Open code in a new file tab without touching active file"
                                                >
                                                    <span>+ New Tab</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        if (navigator.clipboard && autoCodeResult.code) {
                                                            await navigator.clipboard.writeText(autoCodeResult.code);
                                                            setCopied(true);
                                                            setTimeout(() => setCopied(false), 2000);
                                                        }
                                                    }}
                                                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs flex items-center gap-1 transition"
                                                >
                                                    {copied ? (
                                                        <Check size={12} className="text-emerald-400" />
                                                    ) : (
                                                        <Copy size={12} />
                                                    )}
                                                    <span>{copied ? "Copied" : "Copy"}</span>
                                                </button>
                                            </div>
                                        </div>
                                        <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre leading-relaxed max-h-96">
                                            {autoCodeResult.code}
                                        </pre>
                                    </div>

                                    {/* Hint to Run Code */}
                                    <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                                        <CheckCircle size={14} />{" "}
                                        {insertedStatus === "replaced"
                                            ? `Code placed in ${activeTab?.name || "editor"}. Click Run in the bottom dock to execute!`
                                            : insertedStatus === "inserted"
                                            ? "Code placed in editor! Click Run in the bottom dock to execute."
                                            : "Code generated. Click 'Replace' or '+ New Tab' to apply to editor, then click Run."}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* =========================================================
                        DICTATOR SETUP VIEW (BEFORE STARTING)
                    ========================================================== */}
                    {!loading && mode === "dictator" && !dictatorActive && (
                        <div
                            className={`rounded-2xl border p-6 ${
                                darkMode
                                    ? "bg-[#181B23] border-white/10"
                                    : "bg-gray-50 border-gray-300"
                            }`}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center text-white">
                                    <Mic size={20} />
                                </div>
                                <div>
                                    <h3
                                        className={`font-semibold ${
                                            darkMode ? "text-white" : "text-gray-900"
                                        }`}
                                    >
                                        Codenthra AI Dictator
                                    </h3>
                                    <p
                                        className={`text-xs ${
                                            darkMode ? "text-slate-400" : "text-gray-500"
                                        }`}
                                    >
                                        You are currently using{" "}
                                        <span className="font-semibold text-purple-400">
                                            {language.name}
                                        </span>
                                        . What program would you like to build?
                                    </p>
                                </div>
                            </div>

                            {/* Program Input */}
                            <label
                                className={`block text-sm font-medium mb-2 ${
                                    darkMode ? "text-slate-300" : "text-gray-700"
                                }`}
                            >
                                What program do you want to build in {language.name}?
                            </label>
                            <input
                                value={dictatorInput}
                                onChange={(e) => setDictatorInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") startDictator();
                                }}
                                placeholder={
                                    language.name === "Python"
                                        ? "Example: Python Calculator or List Processing"
                                        : language.name === "C++"
                                        ? "Example: Array program to find largest number"
                                        : language.name === "C"
                                        ? "Example: Array traversal and sum program"
                                        : "Example: Student Marksheet or Array Program"
                                }
                                className={`w-full rounded-xl px-4 py-3 outline-none border mb-5 ${
                                    darkMode
                                        ? "bg-[#11131B] border-white/10 text-white placeholder:text-slate-500"
                                        : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400"
                                }`}
                            />

                            {/* Current File */}
                            <label
                                className={`block text-sm font-medium mb-2 ${
                                    darkMode ? "text-slate-300" : "text-gray-700"
                                }`}
                            >
                                Active Target File
                            </label>
                            <div
                                className={`rounded-xl px-4 py-3 border text-sm font-mono font-semibold mb-5 ${
                                    darkMode
                                        ? "bg-[#11131B] border-white/10 text-cyan-400"
                                        : "bg-white border-gray-300 text-blue-600"
                                }`}
                            >
                                {activeTab?.name || language.defaultFile || "main.py"}
                            </div>

                            {/* Student Category */}
                            <label
                                 className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                                     darkMode ? "text-slate-400" : "text-gray-600"
                                 }`}
                            >
                                Student Category
                            </label>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {(["beginner", "intermediate", "advanced"] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => {
                                            setDictatorCategory(cat);
                                            setDictatorLevel(`${cat}_l${dictatorPracticeLevel}`);
                                            if (dictatorActive && dictatorProject) {
                                                startDictatorSession(dictatorProject, `${cat}_l${dictatorPracticeLevel}`, cat, dictatorPracticeLevel);
                                            }
                                        }}
                                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition border ${
                                            dictatorCategory === cat
                                                ? "bg-purple-600 border-purple-500 text-white shadow-sm"
                                                : darkMode
                                                ? "bg-[#11131B] border-white/10 text-slate-400 hover:text-white"
                                                : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>

                            {/* Practice Level (1, 2, 3) */}
                            <label
                                 className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${
                                     darkMode ? "text-slate-400" : "text-gray-600"
                                 }`}
                            >
                                Practice Level
                            </label>
                            <div className="grid grid-cols-3 gap-2 mb-6">
                                {[
                                    { id: "1", label: "Level 1", desc: "Foundations" },
                                    { id: "2", label: "Level 2", desc: "Logic Shift" },
                                    { id: "3", label: "Level 3", desc: "Challenge" },
                                ].map((lvl) => (
                                    <button
                                        key={lvl.id}
                                        type="button"
                                        onClick={() => {
                                            const pId = lvl.id as "1" | "2" | "3";
                                            setDictatorPracticeLevel(pId);
                                            setDictatorLevel(`${dictatorCategory}_l${pId}`);
                                            if (dictatorActive && dictatorProject) {
                                                startDictatorSession(dictatorProject, `${dictatorCategory}_l${pId}`, dictatorCategory, pId);
                                            }
                                        }}
                                        className={`py-2 px-2 rounded-xl text-center transition border ${
                                            dictatorPracticeLevel === lvl.id
                                                ? "bg-pink-600 border-pink-500 text-white shadow-sm"
                                                : darkMode
                                                ? "bg-[#11131B] border-white/10 text-slate-400 hover:text-white"
                                                : "bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200"
                                        }`}
                                    >
                                        <div className="text-xs font-bold">{lvl.label}</div>
                                        <div className="text-[10px] opacity-80">{lvl.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Start Button */}
                            <button
                                type="button"
                                onClick={startDictator}
                                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 transition text-white font-semibold shadow-md"
                            >
                                🎙 Start {language.name} Dictator
                            </button>
                        </div>
                    )}

                    {/* =========================================================
                        ACTIVE PROGRESSIVE DICTATOR SESSION
                    ========================================================== */}
                    {!loading && mode === "dictator" && dictatorActive && (
                        <div
                            className={`rounded-2xl border p-6 ${
                                darkMode
                                    ? "bg-[#181B23] border-white/10"
                                    : "bg-gray-50 border-gray-300"
                            }`}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center text-white">
                                        <Mic size={20} />
                                    </div>
                                    <div>
                                        <h3
                                            className={`font-semibold ${
                                                darkMode ? "text-white" : "text-gray-900"
                                            }`}
                                        >
                                            Codenthra AI Dictator
                                        </h3>
                                        <p
                                            className={`text-xs ${
                                                darkMode ? "text-slate-400" : "text-gray-500"
                                            }`}
                                        >
                                            <span className="text-purple-400 font-bold">
                                                [{language.name}]
                                            </span>{" "}
                                            {dictatorProject}{" "}
                                            <span className="ml-2 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 uppercase border border-purple-500/30">
                                                {dictatorCategory}
                                            </span>
                                            <span className="ml-1 px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                                Level {dictatorPracticeLevel}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={resetDictator}
                                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-semibold transition"
                                >
                                    End Session
                                </button>
                            </div>

                            {/* Active Session Tier Switcher Bar */}
                            <div className={`flex flex-wrap items-center justify-between gap-2 p-2 mb-5 rounded-xl border ${
                                darkMode ? "bg-[#11131B] border-white/10" : "bg-white border-gray-200"
                            }`}>
                                <div className="flex items-center gap-1">
                                    {(["beginner", "intermediate", "advanced"] as const).map((cat) => (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                setDictatorCategory(cat);
                                                setDictatorLevel(`${cat}_l${dictatorPracticeLevel}`);
                                                startDictatorSession(dictatorProject, `${cat}_l${dictatorPracticeLevel}`, cat, dictatorPracticeLevel);
                                            }}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition ${
                                                dictatorCategory === cat
                                                    ? "bg-purple-600 text-white shadow-sm"
                                                    : darkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center gap-1">
                                    {(["1", "2", "3"] as const).map((lvl) => (
                                        <button
                                            key={lvl}
                                            type="button"
                                            onClick={() => {
                                                setDictatorPracticeLevel(lvl);
                                                setDictatorLevel(`${dictatorCategory}_l${lvl}`);
                                                startDictatorSession(dictatorProject, `${dictatorCategory}_l${lvl}`, dictatorCategory, lvl);
                                            }}
                                            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                                                dictatorPracticeLevel === lvl
                                                    ? "bg-pink-600 text-white shadow-sm"
                                                    : darkMode ? "text-slate-400 hover:text-white" : "text-gray-600 hover:text-gray-900"
                                            }`}
                                        >
                                            Level {lvl}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Progress Bar & Unit Counter */}
                            <div className="mb-5">
                                <div className="flex items-center justify-between mb-2">
                                    <span
                                        className={`text-sm font-medium ${
                                            darkMode ? "text-slate-300" : "text-gray-700"
                                        }`}
                                    >
                                        Teaching Unit {currentUnitDisplayIndex} of {totalUnitsCount}
                                    </span>
                                    <span
                                        className={`text-xs font-semibold ${
                                            dictatorCompleted
                                                ? "text-emerald-400"
                                                : dictatorValidationStatus === "error"
                                                ? "text-red-400"
                                                : "text-purple-400"
                                        }`}
                                    >
                                        {dictatorCompleted
                                            ? "🎉 Program Complete"
                                            : dictatorValidationStatus === "error"
                                            ? "❌ Typo Detected"
                                            : currentDictatorMessage?.progress || "Word-by-Word Guided"}
                                    </span>
                                </div>

                                <div
                                    className={`h-2 rounded-full overflow-hidden ${
                                        darkMode ? "bg-white/10" : "bg-gray-200"
                                    }`}
                                >
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* WHAT TO TYPE CURRENTLY CARD */}
                            <div
                                className={`rounded-xl border p-5 mb-5 ${
                                    darkMode
                                        ? "bg-[#11131B] border-purple-500/30 shadow-lg shadow-purple-500/5"
                                        : "bg-purple-50 border-purple-200 shadow-sm"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">✍️</span>
                                        <span
                                            className={`font-semibold text-sm ${
                                                darkMode ? "text-white" : "text-gray-900"
                                            }`}
                                        >
                                            {currentUnit?.title || `Step ${currentUnitDisplayIndex}`}
                                        </span>
                                    </div>
                                    <span className="text-xs px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-semibold border border-purple-500/30">
                                        Unit {currentUnitDisplayIndex}
                                    </span>
                                </div>

                                <p
                                    className={`text-sm leading-relaxed mb-4 whitespace-pre-wrap ${
                                        darkMode ? "text-slate-300" : "text-gray-700"
                                    }`}
                                >
                                    {currentDictatorMessage?.instruction ||
                                        currentUnit?.instruction ||
                                        "Type the code into the editor as instructed."}
                                </p>

                                {/* Expected Token Box */}
                                <div
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                                        darkMode
                                            ? "bg-[#0D1117] border-white/10"
                                            : "bg-white border-gray-300"
                                    }`}
                                >
                                    <span className="text-xs text-slate-400 font-sans">
                                        Expected Token:
                                    </span>
                                    <code className="text-sm font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
                                        {currentDictatorMessage?.expectedToken || currentUnit?.expectedToken || "..."}
                                    </code>
                                </div>
                            </div>

                            {/* REAL-TIME VALIDATION STATUS / MISTAKE ALERT */}
                            {(dictatorValidationStatus === "error" || currentDictatorMessage?.error) && (
                                <div className="rounded-xl border p-5 mb-5 bg-red-500/10 border-red-500/30 text-red-300">
                                    <div className="flex items-start gap-3">
                                        <AlertCircle size={20} className="text-red-400 mt-0.5 flex-shrink-0" />
                                        <div className="space-y-2">
                                            <p className="font-bold text-sm text-red-200">
                                                ❌ Mistake Detected
                                            </p>
                                            <p className="text-xs text-red-300 whitespace-pre-wrap leading-relaxed">
                                                {currentDictatorMessage?.error ||
                                                    dictatorFeedback ||
                                                    dictatorErrorExplanation}
                                            </p>
                                            <p className="text-xs text-amber-300 font-semibold">
                                                Please correct your code in the editor to proceed to the next unit.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {dictatorValidationStatus === "correct" && !currentDictatorMessage?.error && (
                                <div className="rounded-xl border p-4 mb-5 bg-emerald-500/10 border-emerald-500/30 text-emerald-300 flex items-center gap-3">
                                    <CheckCircle size={18} className="text-emerald-400 flex-shrink-0" />
                                    <p className="text-xs font-semibold">
                                        ✅ Validated! Ready for the next unit.
                                    </p>
                                </div>
                            )}

                            {/* Concept & Explanation Card */}
                            {(currentDictatorMessage?.explanation || currentUnit?.explanation) && (
                                <div
                                    className={`rounded-xl border p-4 mb-4 ${
                                        darkMode
                                            ? "bg-[#11131B] border-white/10"
                                            : "bg-white border-gray-200"
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-base">🧠</span>
                                        <div className="min-w-0">
                                            <p
                                                className={`text-xs font-semibold mb-1 ${
                                                    darkMode ? "text-slate-300" : "text-gray-800"
                                                }`}
                                            >
                                                Concept & Explanation
                                            </p>
                                            <p
                                                className={`text-xs leading-relaxed whitespace-pre-wrap ${
                                                    darkMode ? "text-slate-400" : "text-gray-600"
                                                }`}
                                            >
                                                {currentDictatorMessage?.explanation || currentUnit?.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Why is this needed */}
                            {currentUnit?.why && (
                                <div
                                    className={`rounded-xl border p-4 mb-5 ${
                                        darkMode
                                            ? "bg-emerald-500/5 border-emerald-500/20"
                                            : "bg-emerald-50 border-emerald-200"
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <span className="text-base">💡</span>
                                        <div className="min-w-0">
                                            <p
                                                className={`text-xs font-semibold mb-1 ${
                                                    darkMode
                                                        ? "text-emerald-300"
                                                        : "text-emerald-700"
                                                }`}
                                            >
                                                Why is this needed?
                                            </p>
                                            <p
                                                className={`text-xs leading-relaxed ${
                                                    darkMode
                                                        ? "text-slate-400"
                                                        : "text-gray-600"
                                                }`}
                                            >
                                                {currentUnit.why}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Hint Card */}
                            {(currentDictatorMessage?.hint || currentUnit?.hint) && (
                                <div
                                    className={`rounded-xl border p-3.5 mb-5 ${
                                        darkMode
                                            ? "bg-purple-500/10 border-purple-500/20"
                                            : "bg-purple-50 border-purple-200"
                                    }`}
                                >
                                    <p
                                        className={`text-xs ${
                                            darkMode ? "text-purple-300" : "text-purple-700"
                                        }`}
                                    >
                                        <strong>💡 Hint:</strong> {currentDictatorMessage?.hint || currentUnit?.hint}
                                    </p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                                <button
                                    type="button"
                                    onClick={applyStepCode}
                                    className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all duration-200"
                                >
                                    <Edit3 size={15} />
                                    <span>Insert Step Code</span>
                                </button>

                                {dictatorCurrentUnit > 0 && (
                                    <button
                                        type="button"
                                        onClick={prevDictatorStep}
                                        className={`flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                                            darkMode
                                                ? "bg-[#11131B] border-white/10 hover:bg-white/10 text-white"
                                                : "bg-white border-gray-300 hover:bg-gray-100 text-gray-800"
                                        }`}
                                    >
                                        <ArrowLeft size={14} />
                                        <span>Prev</span>
                                    </button>
                                )}

                                {dictatorCurrentUnit < totalUnitsCount - 1 ? (
                                    <button
                                        type="button"
                                        onClick={nextDictatorStep}
                                        className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 text-white text-xs font-semibold shadow-md transition-all"
                                    >
                                        <span>Next</span>
                                        <ArrowRight size={14} />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={resetDictator}
                                        className="flex items-center justify-center gap-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-all"
                                    >
                                        <CheckCircle2 size={14} />
                                        <span>Program Finished</span>
                                    </button>
                                )}
                            </div>

                            {/* COMPLETE PROGRAM REVIEW CARD */}
                            {dictatorCompleted && (
                                <div className="p-5 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-3">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 size={20} className="text-emerald-400" />
                                        <p className="font-bold text-sm text-emerald-300">
                                            🎉 Excellent Work! Program Complete!
                                        </p>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        You have successfully written and verified all teaching units for the{" "}
                                        <strong>{dictatorProject}</strong> program in{" "}
                                        <strong>{language.name}</strong>.
                                    </p>
                                    <div
                                        className={`p-3 rounded-lg border text-slate-300 space-y-1.5 ${
                                            darkMode
                                                ? "bg-[#0D1117] border-white/10"
                                                : "bg-white border-gray-200 text-gray-700"
                                        }`}
                                    >
                                        <p className="font-semibold text-xs text-white">
                                            Summary of Learned Concepts:
                                        </p>
                                        {dictatorRequirements && dictatorRequirements.length > 0 ? (
                                            dictatorRequirements.map((req, rIdx) => (
                                                <p key={rIdx}>• {req}</p>
                                            ))
                                        ) : (
                                            <>
                                                <p>• Program structure and entry points in {language.name}</p>
                                                <p>• Data definitions, arrays, and variable declarations</p>
                                                <p>• Computational algorithm and data manipulation</p>
                                                <p>• Standard console output formatting</p>
                                            </>
                                        )}
                                    </div>
                                    <p className="text-emerald-300 font-semibold">
                                        Click <strong>Run</strong> in the bottom dock to execute and test your program!
                                    </p>
                                </div>
                            )}

                            {/* Status Footer */}
                            <div
                                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                                    darkMode ? "bg-white/5" : "bg-gray-100"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`text-xs ${
                                            dictatorCompleted
                                                ? "text-emerald-400"
                                                : dictatorValidationStatus === "error"
                                                ? "text-red-400"
                                                : "text-cyan-400"
                                        }`}
                                    >
                                        ●
                                    </span>
                                    <p
                                        className={`text-xs ${
                                            darkMode ? "text-slate-300" : "text-gray-600"
                                        }`}
                                    >
                                        {dictatorCompleted
                                            ? "Program complete. Ready to run."
                                            : dictatorValidationStatus === "error"
                                            ? "Fix typo in editor to continue."
                                            : "Type the expected token in editor or click 'Insert Step Code'."}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={resetDictator}
                                    className="text-xs text-slate-400 hover:text-white underline ml-2"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Empty State for other modes */}
                    {!loading &&
                        !result &&
                        mode !== "dictator" &&
                        mode !== "autocode" && (
                            <div
                                className={`rounded-2xl border p-8 text-center ${
                                    darkMode
                                        ? "bg-[#181B23] border-white/10"
                                        : "bg-gray-50 border-gray-300"
                                }`}
                            >
                                <Sparkles
                                    size={28}
                                    className="mx-auto mb-3 text-cyan-500"
                                />
                                <p
                                    className={
                                        darkMode ? "text-slate-400" : "text-gray-500"
                                    }
                                >
                                    {mode === "guide" ? (
                                        <>
                                            Click{" "}
                                            <span className="font-semibold">
                                                AI Guide
                                            </span>{" "}
                                            to get step-by-step debugging guidance for your code.
                                        </>
                                    ) : mode === "error" ? (
                                        <>CodeXAI will explain your current coding errors here.</>
                                    ) : (
                                        <>
                                            Click{" "}
                                            <span className="font-semibold">Explain</span>{" "}
                                            to let CodeXAI analyze your code.
                                        </>
                                    )}
                                </p>
                            </div>
                        )}
                </div>
            </div>
        </div>
    );
}