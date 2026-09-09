import type { LanguageRuleSet, InScopeSymbols, CodeDiagnostic } from "./types";
import { maskCStyleCode } from "../lexing/CodeLexer";

export function levenshteinDistance(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

export const JAVA_RESERVED_KEYWORDS = new Set([
    "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char", "class", "const",
    "continue", "default", "do", "double", "else", "enum", "extends", "final", "finally", "float",
    "for", "goto", "if", "implements", "import", "instanceof", "int", "interface", "long", "native",
    "new", "package", "private", "protected", "public", "return", "short", "static", "strictfp",
    "super", "switch", "synchronized", "this", "throw", "throws", "transient", "try", "void",
    "volatile", "while", "true", "false", "null", "var", "yield", "record", "sealed", "permits",
    "non-sealed", "Override", "Deprecated", "SuppressWarnings", "FunctionalInterface", "SafeVarargs"
]);

export const JAVA_STANDARD_TYPES = new Set([
    "String", "int", "double", "float", "boolean", "char", "long", "short", "byte", "void",
    "Math", "System", "Integer", "Double", "Float", "Boolean", "Character", "Byte", "Short", "Long",
    "Object", "Class", "Thread", "Runnable", "Exception", "RuntimeException", "Throwable", "Error",
    "Override", "Deprecated", "SuppressWarnings", "FunctionalInterface",
    "Scanner", "Arrays", "Collections", "List", "ArrayList", "Map", "HashMap", "Set", "HashSet",
    "Queue", "LinkedList", "Stack", "Vector", "Iterator", "StringBuilder", "StringBuffer",
    "Deque", "ArrayDeque", "PriorityQueue", "TreeSet", "TreeMap", "LinkedHashMap", "LinkedHashSet",
    "File", "FileReader", "FileWriter", "BufferedReader", "BufferedWriter", "InputStreamReader",
    "FileInputStream", "FileOutputStream", "BufferedInputStream", "BufferedOutputStream",
    "DataInputStream", "DataOutputStream", "InputStream", "OutputStream", "Reader", "Writer",
    "PrintStream", "PrintWriter", "Pattern", "Matcher", "Date", "Calendar", "Random",
    "BigDecimal", "BigInteger", "Optional", "Stream", "Collectors", "Objects", "Comparable", "Comparator",
    "Callable", "Future", "Executor", "ExecutorService", "Executors", "Lock", "ReentrantLock",
    "Condition", "CountDownLatch", "Semaphore", "AtomicInteger", "AtomicBoolean", "AtomicLong",
    "BlockingQueue", "ArrayBlockingQueue", "LinkedBlockingQueue", "ConcurrentHashMap",
    "IOException", "FileNotFoundException", "EOFException", "NullPointerException",
    "IllegalArgumentException", "IllegalStateException", "IndexOutOfBoundsException",
    "NoSuchElementException", "UnsupportedOperationException", "ArithmeticException", "InterruptedException",
    "Main", "Number", "CharSequence", "Iterable", "AutoCloseable", "Closeable",
    "T", "E", "K", "V", "N", "R", "U", "S"
]);

export const JAVA_BUILTIN_FUNCTIONS = new Set([
    "println", "print", "printf", "format", "flush", "equals", "toString", "hashCode",
    "length", "charAt", "substring", "indexOf", "contains", "replace", "toLowerCase", "toUpperCase",
    "trim", "split", "valueOf", "parseInt", "parseDouble", "max", "min", "sqrt", "pow", "abs",
    "floor", "ceil", "round", "random", "sin", "cos", "tan", "add", "get", "set", "remove",
    "size", "clear", "isEmpty", "containsKey", "containsValue", "keySet", "values", "entrySet",
    "main", "clone", "compareTo", "append", "insert", "delete", "push", "pop", "peek", "offer", "poll"
]);

export const JAVA_STANDARD_LIBRARY_SYMBOLS = new Set([
    "out", "in", "err", "PI", "E", "MAX_VALUE", "MIN_VALUE", "POSITIVE_INFINITY", "NEGATIVE_INFINITY"
]);

export const JavaRules: LanguageRuleSet = {
    name: "java",
    displayName: "Java",
    defaultFileName: "Main.java",
    validExtensions: [".java"],
    reservedKeywords: JAVA_RESERVED_KEYWORDS,
    standardTypes: JAVA_STANDARD_TYPES,
    builtInFunctions: JAVA_BUILTIN_FUNCTIONS,
    standardLibrarySymbols: JAVA_STANDARD_LIBRARY_SYMBOLS,

    extractDeclarations(lines: string[]): InScopeSymbols {
        const variables = new Set<string>();
        const types = new Set<string>(JAVA_STANDARD_TYPES);
        const functions = new Set<string>(JAVA_BUILTIN_FUNCTIONS);

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
            if (!line) continue;

            // Match import declarations: import java.io.FileWriter; or import java.io.*;
            const importMatch = line.match(/^import\s+(?:static\s+)?([A-Za-z0-9_.*]+);/);
            if (importMatch) {
                const imp = importMatch[1];
                if (!imp.endsWith(".*")) {
                    const lastDot = imp.lastIndexOf(".");
                    if (lastDot !== -1) {
                        types.add(imp.slice(lastDot + 1));
                    }
                }
            }

            // Match class declarations: [abstract] class Circle extends Shape
            const classMatch = line.match(/\bclass\s+([A-Za-z0-9_]+)(?:\s+extends\s+([A-Za-z0-9_]+))?(?:\s+implements\s+([A-Za-z0-9_,\s]+))?/);
            if (classMatch) {
                if (classMatch[1]) types.add(classMatch[1]);
                if (classMatch[2]) types.add(classMatch[2]);
            }

            // Match interface declarations: interface Drawable
            const interfaceMatch = line.match(/\binterface\s+([A-Za-z0-9_]+)/);
            if (interfaceMatch) {
                if (interfaceMatch[1]) types.add(interfaceMatch[1]);
            }

            // Match method / constructor declarations: Circle(double r) or double getArea() or abstract double getArea();
            const methodMatch = line.match(/(?:public|private|protected|static|final|abstract|synchronized|volatile|native|strictfp|\s)*\s*(?:[A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
            if (methodMatch) {
                if (!JAVA_RESERVED_KEYWORDS.has(methodMatch[1])) {
                    variables.add(methodMatch[1]);
                    functions.add(methodMatch[1]);
                }
                const params = methodMatch[2];
                if (params) {
                    const paramParts = params.split(",");
                    for (const p of paramParts) {
                        const pMatch = p.trim().match(/(?:[A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)/);
                        if (pMatch && !types.has(pMatch[1]) && !JAVA_RESERVED_KEYWORDS.has(pMatch[1])) {
                            variables.add(pMatch[1]);
                        }
                    }
                }
            }

            // Match constructor: Circle(double r)
            const ctorMatch = line.match(/^([A-Za-z0-9_]+)\s*\(([^)]*)\)/);
            if (ctorMatch) {
                const params = ctorMatch[2];
                if (params) {
                    const paramParts = params.split(",");
                    for (const p of paramParts) {
                        const pMatch = p.trim().match(/(?:[A-Za-z0-9_<>[\]]+)\s+([A-Za-z0-9_]+)/);
                        if (pMatch && !types.has(pMatch[1]) && !JAVA_RESERVED_KEYWORDS.has(pMatch[1])) {
                            variables.add(pMatch[1]);
                        }
                    }
                }
            }

            // Match field & variable declarations including multi-variable: double a = 10, b = 5; or int x = 1, y = 2;
            const declMatch = line.match(/(?:(?:public|private|protected|static|final|abstract|synchronized|volatile|transient|native|strictfp|const|auto)\s+)*(?:(?:[A-Za-z0-9_]+)(?:\[\]|<[^>]+>)?)\s+([^;\{]+);?/);
            if (declMatch) {
                const declBody = declMatch[1];
                const declParts = declBody.split(",");
                for (const part of declParts) {
                    const idMatch = part.trim().match(/^([a-zA-Z_]\w*)/);
                    if (idMatch && !types.has(idMatch[1]) && !JAVA_RESERVED_KEYWORDS.has(idMatch[1])) {
                        variables.add(idMatch[1]);
                    }
                }
            }

            const typeHeaderMatches = Array.from(line.matchAll(/(?:^|[\s;\{\(]+)(?:(?:public|private|protected|static|final|abstract|synchronized|volatile|transient|native|strictfp|const|auto)\s+)*(?:(?:[A-Z][a-zA-Z0-9_]*|[a-z]+)(?:\[\]|<[^>]+>)?)\s+([^;\{=]+)(?:=|[;\{])/g));
            for (const thm of typeHeaderMatches) {
                const declBody = thm[1];
                const varNames = Array.from(declBody.matchAll(/(?:^|,)\s*([a-zA-Z_]\w*)(?:\[[^\]]*\])?/g));
                for (const vn of varNames) {
                    if (vn[1] && !types.has(vn[1]) && !JAVA_RESERVED_KEYWORDS.has(vn[1])) {
                        variables.add(vn[1]);
                    }
                }
            }
        }

        return { variables, types, functions };
    },

    checkStatementTermination(
        line: string,
        allLines: string[],
        lineIndex: number,
        defaultFile: string
    ): CodeDiagnostic | null {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("@") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
            return null;
        }

        if (
            trimmed.endsWith("{") ||
            trimmed.endsWith("}") ||
            trimmed.endsWith(";") ||
            trimmed.endsWith(",") ||
            trimmed.endsWith(":") ||
            trimmed.endsWith("\\")
        ) {
            return null;
        }

        if (trimmed.endsWith(")")) {
            if (trimmed.includes("System.out.") || trimmed.includes("printn") || trimmed.includes("printl") || trimmed.includes("=")) {
                if (!/^(if|for|while|switch|catch)\b/.test(trimmed)) {
                    return {
                        file: defaultFile,
                        line: lineIndex + 1,
                        column: line.length + 1,
                        severity: "error",
                        type: "Missing Semicolon",
                        message: `Missing semicolon ';' at the end of statement`,
                        explanation: `In Java, executable statements must end with a semicolon ';'.`,
                        correction: trimmed + ";",
                        code: trimmed,
                    };
                }
            }
        }

        if (
            /(\b(System\.out\.\w+|return|break|continue)\b|=[^=]|^\s*[a-zA-Z_]\w*\s*[\+\-\*\/]?=)/.test(trimmed) &&
            !/^(if|for|while|switch|else|try|catch|class|interface|public|private|protected)\b/.test(trimmed)
        ) {
            return {
                file: defaultFile,
                line: lineIndex + 1,
                column: line.length + 1,
                severity: "error",
                type: "Missing Semicolon",
                message: `Missing semicolon ';' at the end of statement`,
                explanation: `In Java, executable statements must end with a semicolon ';'.`,
                correction: trimmed + ";",
                code: trimmed,
            };
        }

        return null;
    },

    checkLanguageSpecificDiagnostics(
        lines: string[],
        symbols: InScopeSymbols,
        defaultFile: string
    ): CodeDiagnostic[] {
        const diagnostics: CodeDiagnostic[] = [];
        const masked = maskCStyleCode(lines.join("\n"), "java");

        // 1. Type Typos (e.g. Strng -> String) on masked lines
        for (let i = 0; i < masked.maskedLines.length; i++) {
            const line = masked.maskedLines[i].trim();
            if (!line || line.startsWith("@")) continue;

            const typeMatches = Array.from(line.matchAll(/\b([A-Z][a-zA-Z0-9_]*)(?:\[\])?\s+[a-zA-Z_]\w*/g));
            for (const tm of typeMatches) {
                const typeName = tm[1];
                if (!symbols.types.has(typeName)) {
                    let closestType = "";
                    let minDistance = 3;
                    for (const kt of Array.from(symbols.types)) {
                        const dist = levenshteinDistance(typeName.toLowerCase(), kt.toLowerCase());
                        if (dist <= 2 && dist < minDistance) {
                            minDistance = dist;
                            closestType = kt;
                        }
                    }
                    if (closestType) {
                        diagnostics.push({
                            file: defaultFile,
                            line: i + 1,
                            column: lines[i].indexOf(typeName) + 1,
                            severity: "error",
                            type: "Unknown Type",
                            message: `Unknown type '${typeName}'`,
                            explanation: `Java uses the type '${closestType}', not '${typeName}'.`,
                            correction: lines[i].replace(new RegExp(`\\b${typeName}\\b`), closestType),
                            code: lines[i],
                        });
                    }
                }
            }
        }

        // 2. Method Typos (e.g. System.out.printn -> System.out.println) on masked lines
        for (let i = 0; i < masked.maskedLines.length; i++) {
            const line = masked.maskedLines[i].trim();
            if (!line) continue;

            const sysOutMatch = line.match(/System\.out\.([a-zA-Z_]\w*)\s*\(/);
            if (sysOutMatch) {
                const method = sysOutMatch[1];
                const validMethods = ["println", "print", "printf", "format", "flush"];
                if (!validMethods.includes(method)) {
                    let closest = "println";
                    for (const vm of validMethods) {
                        if (levenshteinDistance(method, vm) <= 2) {
                            closest = vm;
                            break;
                        }
                    }
                    diagnostics.push({
                        file: defaultFile,
                        line: i + 1,
                        column: lines[i].indexOf(method) + 1,
                        severity: "error",
                        type: "Unknown Method",
                        message: `Unknown method 'System.out.${method}'`,
                        explanation: `Java provides '${closest}()', not '${method}()'.`,
                        correction: line.replace(`System.out.${method}`, `System.out.${closest}`) + (line.endsWith(";") ? "" : ";"),
                        code: line,
                    });
                }
            }
        }

        return diagnostics;
    },

    checkLanguageMismatch(
        line: string,
        lineIndex: number,
        defaultFile: string
    ): CodeDiagnostic | null {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
            return null;
        }

        // Top-level python statement in Java
        if (
            trimmed.startsWith("def ") ||
            trimmed.startsWith("def main():") ||
            (trimmed.startsWith("print(") && !trimmed.startsWith("System.out.print")) ||
            trimmed.startsWith("import numpy") ||
            trimmed.startsWith("from ")
        ) {
            return {
                file: defaultFile,
                line: lineIndex + 1,
                column: 1,
                severity: "error",
                type: "Language Mismatch",
                message: `Invalid Java syntax: Found Python statement in Java source`,
                explanation: `Java requires statements to be enclosed within a class and method (e.g. 'public class Main { public static void main(String[] args) { ... } }').`,
                correction: `public class Main {\n    public static void main(String[] args) {\n        // Java code here\n    }\n}`,
                code: trimmed,
            };
        }

        return null;
    }
};
