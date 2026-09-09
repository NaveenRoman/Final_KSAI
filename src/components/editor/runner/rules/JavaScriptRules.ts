import type { LanguageRuleSet, InScopeSymbols } from "./types";

export const JAVASCRIPT_RESERVED_KEYWORDS = new Set([
    "async", "await", "break", "case", "catch", "class", "const", "continue",
    "debugger", "default", "delete", "do", "else", "export", "extends", "finally",
    "for", "function", "if", "import", "in", "instanceof", "let", "new", "return",
    "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while",
    "with", "yield", "true", "false", "null", "undefined"
]);

export const JAVASCRIPT_STANDARD_TYPES = new Set([
    "Object", "Function", "Boolean", "Symbol", "Number", "BigInt", "Math",
    "Date", "String", "RegExp", "Array", "Int8Array", "Uint8Array", "Uint8ClampedArray",
    "Int16Array", "Uint16Array", "Int32Array", "Uint32Array", "Float32Array",
    "Float64Array", "BigInt64Array", "BigUint64Array", "Map", "Set", "WeakMap",
    "WeakSet", "ArrayBuffer", "SharedArrayBuffer", "DataView", "Promise", "JSON",
    "Error", "EvalError", "RangeError", "ReferenceError", "SyntaxError", "TypeError",
    "URIError"
]);

export const JAVASCRIPT_BUILTIN_FUNCTIONS = new Set([
    "eval", "isFinite", "isNaN", "parseFloat", "parseInt", "decodeURI",
    "decodeURIComponent", "encodeURI", "encodeURIComponent", "escape", "unescape",
    "console", "setTimeout", "setInterval", "clearTimeout", "clearInterval"
]);

export const JAVASCRIPT_STANDARD_LIBRARY_SYMBOLS = new Set([
    "log", "error", "warn", "info", "debug", "table", "time", "timeEnd",
    "push", "pop", "shift", "unshift", "slice", "splice", "concat", "join",
    "indexOf", "lastIndexOf", "forEach", "map", "filter", "reduce", "reduceRight",
    "every", "some", "find", "findIndex", "includes", "flat", "flatMap", "sort",
    "reverse", "fill", "keys", "values", "entries", "toString", "valueOf"
]);

export const JavaScriptRules: LanguageRuleSet = {
    name: "javascript",
    displayName: "JavaScript",
    defaultFileName: "main.js",
    validExtensions: [".js", ".jsx", ".mjs", ".cjs"],
    reservedKeywords: JAVASCRIPT_RESERVED_KEYWORDS,
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

            const classMatch = line.match(/\bclass\s+([A-Za-z0-9_$]+)/);
            if (classMatch) types.add(classMatch[1]);

            const varMatch = line.match(/\b(?:const|let|var)\s+([A-Za-z0-9_$]+)/);
            if (varMatch) variables.add(varMatch[1]);
        }

        return { variables, types, functions };
    },
};
