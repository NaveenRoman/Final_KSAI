import type { LanguageRuleSet, InScopeSymbols } from "./types";
import { JAVASCRIPT_STANDARD_TYPES, JAVASCRIPT_BUILTIN_FUNCTIONS, JAVASCRIPT_STANDARD_LIBRARY_SYMBOLS } from "./JavaScriptRules";

export const TYPESCRIPT_RESERVED_KEYWORDS = new Set([
    "any", "as", "async", "await", "boolean", "break", "case", "catch", "class",
    "const", "constructor", "continue", "debugger", "declare", "default", "delete",
    "do", "else", "enum", "export", "extends", "false", "finally", "for", "from",
    "function", "get", "if", "implements", "import", "in", "infer", "instanceof",
    "interface", "is", "keyof", "let", "module", "namespace", "never", "new",
    "null", "number", "of", "package", "private", "protected", "public", "readonly",
    "return", "set", "static", "string", "super", "switch", "symbol", "this",
    "throw", "true", "try", "type", "typeof", "undefined", "unique", "unknown",
    "var", "void", "while", "with", "yield"
]);

export const TypeScriptRules: LanguageRuleSet = {
    name: "typescript",
    displayName: "TypeScript",
    defaultFileName: "main.ts",
    validExtensions: [".ts", ".tsx", ".mts", ".cts"],
    reservedKeywords: TYPESCRIPT_RESERVED_KEYWORDS,
    standardTypes: JAVASCRIPT_STANDARD_TYPES,
    builtInFunctions: JAVASCRIPT_BUILTIN_FUNCTIONS,
    standardLibrarySymbols: JAVASCRIPT_STANDARD_LIBRARY_SYMBOLS,

    extractDeclarations(lines: string[]): InScopeSymbols {
        const variables = new Set<string>(["console", "process", "window", "globalThis"]);
        const types = new Set<string>(JAVASCRIPT_STANDARD_TYPES);
        const functions = new Set<string>(JAVASCRIPT_BUILTIN_FUNCTIONS);

        for (const rawLine of lines) {
            const line = rawLine.replace(/\/\/.*$/, "").trim();
            if (!line) continue;

            const fnMatch = line.match(/\bfunction\s+([A-Za-z0-9_$]+)/);
            if (fnMatch) functions.add(fnMatch[1]);

            const classMatch = line.match(/\b(?:class|interface|type|enum)\s+([A-Za-z0-9_$]+)/);
            if (classMatch) types.add(classMatch[1]);

            const varMatch = line.match(/\b(?:const|let|var)\s+([A-Za-z0-9_$]+)/);
            if (varMatch) variables.add(varMatch[1]);
        }

        return { variables, types, functions };
    },
};
