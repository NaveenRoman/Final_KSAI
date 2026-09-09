import { synthesizeUniversalProgram, DictatorTeachingUnit } from "./DictatorTokenizer";

export interface DictatorStep {
    step: number;
    title: string;
    concept: string;
    instruction: string;
    explanation: string;
    why: string;
    example: string;
    code?: string;        // full accumulated program code up to this step
    stepCode?: string;    // specific snippet introduced in this step
    hint: string;
    speech: string;
    expected: string;
    type: "keyword" | "identifier" | "symbol" | "method" | "statement" | "structure";
}

export interface DictatorPlanResponse {
    success: boolean;
    language: string;
    project: string;
    requirements: string[];
    steps: DictatorStep[];
    totalSteps: number;
}

/**
 * Creates sequential pedagogical teaching steps directly from the validated program units.
 */
export function createDictatorPlan(
    project: string,
    language: string = "python",
    level: string = "beginner",
    studentCategory?: string,
    practiceLevel?: string | number
): DictatorStep[] {
    const units = synthesizeUniversalProgram(project, language, level, studentCategory, practiceLevel);
    return units.map((u, idx) => ({
        step: u.partOfStep || idx + 1,
        title: u.title || `Step ${idx + 1}`,
        concept: u.stepTitle || u.title || "Core Logic",
        instruction: u.instruction,
        explanation: u.explanation,
        why: u.why,
        example: u.insertSnippet,
        code: u.fullAccumulatedCode,
        stepCode: u.insertSnippet,
        hint: u.hint,
        speech: u.speech,
        expected: u.expectedToken,
        type: (u.category as any) || "statement",
    }));
}

/**
 * Remote fetch with automatic verification fallback and session tracking.
 */
export async function fetchDictatorPlan(
    project: string,
    language: string = "python",
    level: string = "beginner",
    sessionId?: string,
    activeFileName?: string,
    activeFilePath?: string,
    activeFileContent?: string,
    projectFiles?: Array<{ name: string; path: string; language?: string }>,
    studentCategory?: string,
    practiceLevel?: string | number,
    iteration?: number
): Promise<{
    steps: DictatorStep[];
    requirements: string[];
    primaryFile?: string;
    files?: Array<{ name: string; path?: string; content: string; language: string; isPrimary?: boolean }>;
}> {
    try {
        const payload = {
            project,
            topic: project,
            language,
            level,
            learningLevel: level,
            studentCategory: studentCategory || level,
            learningGroup: (studentCategory || level).toUpperCase(),
            practiceLevel: String(practiceLevel || "1"),
            iteration: iteration || 1,
            sessionId,
            activeFileName: activeFileName || (language.toLowerCase() === "java" ? "Main.java" : language.toLowerCase() === "c" ? "main.c" : (language.toLowerCase() === "cpp" || language.toLowerCase() === "c++") ? "main.cpp" : "main.py"),
            activeFilePath: activeFilePath || activeFileName || (language.toLowerCase() === "java" ? "Main.java" : language.toLowerCase() === "c" ? "main.c" : (language.toLowerCase() === "cpp" || language.toLowerCase() === "c++") ? "main.cpp" : "main.py"),
            activeFileContent: activeFileContent || "",
            projectFiles: projectFiles || [],
        };

        console.log("[DICTATOR FRONTEND] Sending API Request:", {
            Language: payload.language,
            Topic: payload.topic,
            LearningGroup: payload.learningGroup,
            PracticeLevel: payload.practiceLevel,
        });

        const res = await fetch("/api/ai/dictator", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (res.ok) {
            const data = await res.json();
            const rawSteps = data?.steps || data?.data?.steps || [];
            const reqs = data?.requirements || data?.data?.requirements || [];
            const primaryFile = data?.primaryFile || data?.data?.primaryFile;
            const files = data?.files || data?.data?.files || [];
            if (Array.isArray(rawSteps) && rawSteps.length >= 1) {
                const steps = rawSteps.map((s: any, idx: number) => ({
                    step: s.step || idx + 1,
                    title: s.title || `Step ${idx + 1}`,
                    concept: s.concept || "Programming Step",
                    instruction: s.instruction || "Follow the step instructions.",
                    explanation: s.explanation || "",
                    why: s.why || "",
                    example: s.example || "",
                    code: s.code || "",
                    stepCode: s.stepCode || s.code || "",
                    hint: s.hint || "",
                    speech: s.speech || s.instruction || "",
                    expected: s.expected || "",
                    type: s.type || "statement",
                }));
                return {
                    steps,
                    requirements: Array.isArray(reqs) && reqs.length > 0 ? reqs : [
                        "Program structure & headers",
                        "Data declarations",
                        "Core algorithm & logic",
                        "Output formatting"
                    ],
                    primaryFile,
                    files,
                };
            }
        }
    } catch (err) {
        console.warn("Could not fetch remote dictator plan, using verified local synthesizer:", err);
    }

    const fallbackSteps = createDictatorPlan(project, language, level, studentCategory, practiceLevel);
    return {
        steps: fallbackSteps,
        requirements: [
            "Program structure & headers",
            "Data declarations",
            "Core algorithm & logic",
            "Output formatting"
        ],
        primaryFile: activeFileName || (language.toLowerCase() === "java" ? "Main.java" : language.toLowerCase() === "c" ? "main.c" : (language.toLowerCase() === "cpp" || language.toLowerCase() === "c++") ? "main.cpp" : "main.py"),
        files: [],
    };
}
