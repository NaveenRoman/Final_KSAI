import type { LanguageRuleSet } from "./types";
import { JavaRules, levenshteinDistance } from "./JavaRules";
import { PythonRules } from "./PythonRules";
import { CRules } from "./CRules";
import { CppRules } from "./CppRules";
import { JavaScriptRules } from "./JavaScriptRules";
import { TypeScriptRules } from "./TypeScriptRules";

export * from "./types";
export { JavaRules, PythonRules, CRules, CppRules, JavaScriptRules, TypeScriptRules, levenshteinDistance };

export function normalizeLanguage(lang: string): "java" | "python" | "c" | "cpp" | "javascript" | "typescript" {
    const norm = (lang || "").toLowerCase().trim();
    if (norm === "c++" || norm === "cpp") return "cpp";
    if (norm === "c") return "c";
    if (norm === "py" || norm === "python") return "python";
    if (norm === "js" || norm === "javascript") return "javascript";
    if (norm === "ts" || norm === "typescript") return "typescript";
    if (norm === "java") return "java";
    return "python";
}

export function getLanguageDisplayName(lang: string): string {
    const norm = normalizeLanguage(lang);
    if (norm === "cpp") return "C++";
    if (norm === "c") return "C";
    if (norm === "python") return "Python";
    if (norm === "javascript") return "JavaScript";
    if (norm === "typescript") return "TypeScript";
    return "Java";
}

export function getLanguageRules(lang: string): LanguageRuleSet {
    const norm = normalizeLanguage(lang);
    switch (norm) {
        case "python":
            return PythonRules;
        case "c":
            return CRules;
        case "cpp":
            return CppRules;
        case "javascript":
            return JavaScriptRules;
        case "typescript":
            return TypeScriptRules;
        case "java":
        default:
            return JavaRules;
    }
}
