import type { LanguageRuleSet, InScopeSymbols, CodeDiagnostic } from "./types";
import { levenshteinDistance } from "./JavaRules";
import { maskCStyleCode } from "../lexing/CodeLexer";

export const C_RESERVED_KEYWORDS = new Set([
    "auto", "break", "case", "char", "const", "continue", "default", "do", "double", "else",
    "enum", "extern", "float", "for", "goto", "if", "inline", "int", "long", "register",
    "restrict", "return", "short", "signed", "sizeof", "static", "struct", "switch", "typedef",
    "union", "unsigned", "void", "volatile", "while", "_Alignas", "_Alignof", "_Atomic",
    "_Bool", "_Complex", "_Generic", "_Imaginary", "_Noreturn", "_Static_assert", "_Thread_local",
    "NULL", "true", "false", "bool", "size_t", "int8_t", "int16_t", "int32_t", "int64_t",
    "uint8_t", "uint16_t", "uint32_t", "uint64_t", "FILE", "stdin", "stdout", "stderr"
]);

export const C_STANDARD_TYPES = new Set([
    "int", "char", "float", "double", "void", "short", "long", "signed", "unsigned",
    "size_t", "ssize_t", "int8_t", "int16_t", "int32_t", "int64_t", "uint8_t", "uint16_t", "uint32_t", "uint64_t",
    "bool", "FILE", "time_t", "clock_t", "uintptr_t", "intptr_t", "ptrdiff_t", "va_list",
    "Node", "ListNode", "TreeNode", "Stack", "Queue", "Vector", "Array", "List", "Record", "StringBuffer"
]);

export const C_BUILTIN_FUNCTIONS = new Set([
    "printf", "scanf", "snprintf", "sprintf", "vsnprintf", "vsprintf",
    "puts", "gets", "getchar", "putchar", "fgetc", "fputc", "getc", "putc", "ungetc",
    "malloc", "calloc", "realloc", "free", "main", "sizeof",
    "strlen", "strcpy", "strncpy", "strcat", "strncat", "strcmp", "strncmp",
    "strchr", "strrchr", "strstr", "strtok", "strdup", "strspn", "strcspn", "strpbrk", "strerror",
    "memcpy", "memset", "memmove", "memcmp", "memchr",
    "atoi", "atof", "atol", "atoll", "abs", "labs", "llabs", "rand", "srand", "exit", "abort", "system", "getenv",
    "fopen", "fclose", "fread", "fwrite", "fprintf", "fscanf", "fgets", "fputs",
    "feof", "ferror", "fflush", "fseek", "ftell", "rewind", "remove", "rename", "perror", "clearerr",
    "sqrt", "pow", "sin", "cos", "tan", "asin", "acos", "atan", "atan2", "sinh", "cosh", "tanh",
    "log", "log10", "exp", "ceil", "floor", "fabs", "fmod", "round",
    "isalnum", "isalpha", "isdigit", "islower", "isupper", "isspace", "isprint", "ispunct", "tolower", "toupper",
    "time", "clock", "difftime", "mktime", "strftime",
    "qsort", "bsearch",
    "va_start", "va_arg", "va_end", "va_copy"
]);

export const C_STANDARD_LIBRARY_SYMBOLS = new Set([
    "include", "define", "ifdef", "ifndef", "endif", "pragma", "undef", "NULL", "EXIT_SUCCESS", "EXIT_FAILURE",
    "SEEK_SET", "SEEK_CUR", "SEEK_END", "EOF", "CLOCKS_PER_SEC", "RAND_MAX", "INT_MAX", "INT_MIN",
    "UINT_MAX", "LONG_MAX", "LONG_MIN", "ULONG_MAX", "CHAR_BIT",
    "stdio", "stdlib", "string", "math", "time", "stdbool", "stdint", "stddef", "stdarg", "ctype", "limits", "h"
]);

export const CRules: LanguageRuleSet = {
    name: "c",
    displayName: "C",
    defaultFileName: "main.c",
    validExtensions: [".c", ".h"],
    reservedKeywords: C_RESERVED_KEYWORDS,
    standardTypes: C_STANDARD_TYPES,
    builtInFunctions: C_BUILTIN_FUNCTIONS,
    standardLibrarySymbols: C_STANDARD_LIBRARY_SYMBOLS,

    extractDeclarations(lines: string[]): InScopeSymbols {
        const variables = new Set<string>();
        const types = new Set<string>(C_STANDARD_TYPES);
        const functions = new Set<string>(C_BUILTIN_FUNCTIONS);

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
            if (!line) continue;

            // 1. Struct declarations: struct Node { int data; struct Node *next; };
            const structMatch = line.match(/\bstruct\s+([a-zA-Z_]\w*)/);
            if (structMatch) {
                types.add(structMatch[1]);
                types.add(`struct ${structMatch[1]}`);
            }

            // 2. Typedef declarations: typedef struct Node Node; or typedef int MyInt;
            const typedefMatch = line.match(/\btypedef\s+(?:struct\s+)?([a-zA-Z_]\w*)\s+([a-zA-Z_]\w*)\s*;/);
            if (typedefMatch) {
                types.add(typedefMatch[2]);
            }

            // 2b. Multi-line typedef struct closing: } Stack; or } Node, *NodePtr;
            if (line.startsWith("}")) {
                const closingTypedefMatch = line.match(/^\}\s*\*?\s*([a-zA-Z_]\w*)/);
                if (closingTypedefMatch && !C_RESERVED_KEYWORDS.has(closingTypedefMatch[1])) {
                    const parts = line.substring(1).replace(/;.*$/, "").split(",");
                    for (const p of parts) {
                        const clean = p.replace(/\*/g, "").trim();
                        if (clean && !C_RESERVED_KEYWORDS.has(clean)) {
                            types.add(clean);
                            variables.add(clean);
                        }
                    }
                }
            }

            // 2c. Macro / #define constants: #define MAX 100 or #define BUFFER_SIZE 256
            const defineMatch = rawLine.match(/^\s*#\s*define\s+([a-zA-Z_]\w*)/);
            if (defineMatch && defineMatch[1] && !C_RESERVED_KEYWORDS.has(defineMatch[1])) {
                variables.add(defineMatch[1]);
                types.add(defineMatch[1]);
            }

            // 3. Enum declarations and members: enum Color { RED, GREEN, BLUE };
            const enumMatch = line.match(/\benum\s+([a-zA-Z_]\w*)/);
            if (enumMatch) {
                types.add(enumMatch[1]);
            }
            const enumMembersMatch = line.match(/\benum\s*(?:[a-zA-Z_]\w*)?\s*\{([^}]+)\}/);
            if (enumMembersMatch) {
                const members = enumMembersMatch[1].split(",");
                for (const m of members) {
                    const id = m.split("=")[0].trim();
                    if (id && !C_RESERVED_KEYWORDS.has(id)) {
                        variables.add(id);
                    }
                }
            }

            // 4. Function declarations and definitions: int add(int a, int b) or void printList(struct Node* head)
            const fnMatch = line.match(/^(?:static\s+|inline\s+|const\s+)*(?:[a-zA-Z_]\w*(?:\s*\*+|\s+))\s*([a-zA-Z_]\w*)\s*\(([^)]*)\)/);
            if (fnMatch && !C_RESERVED_KEYWORDS.has(fnMatch[1])) {
                const fnName = fnMatch[1];
                functions.add(fnName);
                variables.add(fnName);

                const params = fnMatch[2];
                if (params && params.trim() !== "void") {
                    const paramList = params.split(",");
                    for (const p of paramList) {
                        const pMatch = p.trim().match(/(?:[a-zA-Z_]\w*(?:\s*\*+|\s+))\s*([a-zA-Z_]\w*)$/);
                        if (pMatch && !C_RESERVED_KEYWORDS.has(pMatch[1]) && !types.has(pMatch[1])) {
                            variables.add(pMatch[1]);
                        }
                    }
                }
            }

            // 5. Variable declarations: int a = 10, b = 20; const char *fname = "..."; unsigned char *bytes;
            const declMatch = line.match(/(?:(?:const|static|extern|volatile|register|unsigned|signed|short|long)\s+)*(?:struct\s+[a-zA-Z_]\w*|union\s+[a-zA-Z_]\w*|enum\s+[a-zA-Z_]\w*|[a-zA-Z_]\w*)(?:\s*\*+|\s+)([^;\{]+);?/);
            if (declMatch && !/^(if|for|while|switch|return)\b/.test(line)) {
                const declBody = declMatch[1];
                const declParts = declBody.split(",");
                for (const part of declParts) {
                    const cleanPart = part.trim().replace(/^[*&\s]+/, "");
                    const idMatch = cleanPart.match(/^([a-zA-Z_]\w*)/);
                    if (idMatch && !types.has(idMatch[1]) && !C_RESERVED_KEYWORDS.has(idMatch[1])) {
                        variables.add(idMatch[1]);
                    }
                }
            }

            const typeHeaderMatches = Array.from(line.matchAll(/(?:^|[\s;\{\(]+)(?:(?:const|static|extern|volatile|register|unsigned|signed|struct\s+[a-zA-Z_]\w*|[a-zA-Z_]\w*)\s*\*?\s+)([^;\{=]+)(?:=|[;\{])/g));
            for (const thm of typeHeaderMatches) {
                const declBody = thm[1];
                const varNames = Array.from(declBody.matchAll(/(?:^|,)\s*\*?\s*([a-zA-Z_]\w*)(?:\[[^\]]*\])?/g));
                for (const vn of varNames) {
                    if (vn[1] && !C_RESERVED_KEYWORDS.has(vn[1]) && !types.has(vn[1])) {
                        variables.add(vn[1]);
                    }
                }
            }

            // 6. For loop declarations: for (int i = 0; i < n; i++)
            const forLoopMatch = line.match(/\bfor\s*\(\s*(?:(?:const|unsigned|signed|int|size_t|long|short)\s*\*?\s+)+([a-zA-Z_]\w*)\s*=/);
            if (forLoopMatch && forLoopMatch[1]) {
                variables.add(forLoopMatch[1]);
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
        const stripped = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
        if (!stripped || stripped.startsWith("#") || stripped.startsWith("*")) {
            return null;
        }

        if (
            stripped.endsWith("{") ||
            stripped.endsWith("}") ||
            stripped.endsWith(";") ||
            stripped.endsWith(",") ||
            stripped.endsWith(":") ||
            stripped.endsWith("\\")
        ) {
            return null;
        }

        if (stripped.endsWith(")")) {
            if (stripped.includes("printf") || stripped.includes("scanf") || stripped.includes("puts") || stripped.includes("malloc") || stripped.includes("free") || stripped.includes("=")) {
                if (!/^(if|for|while|switch)\b/.test(stripped)) {
                    return {
                        file: defaultFile,
                        line: lineIndex + 1,
                        column: line.length + 1,
                        severity: "error",
                        type: "Missing Semicolon",
                        message: `Missing semicolon ';' at the end of statement`,
                        explanation: `In C, executable statements must end with a semicolon ';'.`,
                        correction: stripped + ";",
                        code: stripped,
                    };
                }
            }
        }

        if (
            /(\b(printf|scanf|puts|gets|return|break|continue|free|malloc)\b|=[^=]|^\s*[a-zA-Z_]\w*\s*[\+\-\*\/]?=)/.test(stripped) &&
            !/^(if|for|while|switch|else|struct|union|enum|typedef)\b/.test(stripped)
        ) {
            return {
                file: defaultFile,
                line: lineIndex + 1,
                column: line.length + 1,
                severity: "error",
                type: "Missing Semicolon",
                message: `Missing semicolon ';' at the end of statement`,
                explanation: `In C, executable statements must end with a semicolon ';'.`,
                correction: stripped + ";",
                code: stripped,
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
        const masked = maskCStyleCode(lines.join("\n"), "c");

        // Function call typos (e.g. printff -> printf, scannf -> scanf) on masked lines
        for (let i = 0; i < masked.maskedLines.length; i++) {
            const line = masked.maskedLines[i].trim();
            if (!line || line.startsWith("#")) continue;

            const callMatches = Array.from(line.matchAll(/\b([a-zA-Z_]\w*)\s*\(/g));
            for (const cm of callMatches) {
                const fnName = cm[1];
                if (
                    C_RESERVED_KEYWORDS.has(fnName) ||
                    C_STANDARD_TYPES.has(fnName) ||
                    C_BUILTIN_FUNCTIONS.has(fnName) ||
                    C_STANDARD_LIBRARY_SYMBOLS.has(fnName) ||
                    symbols.variables.has(fnName) ||
                    symbols.functions.has(fnName) ||
                    symbols.types.has(fnName)
                ) {
                    continue;
                }

                let closest = "";
                let minDistance = 3;
                for (const cFn of Array.from(C_BUILTIN_FUNCTIONS)) {
                    const dist = levenshteinDistance(fnName.toLowerCase(), cFn.toLowerCase());
                    if (dist > 0 && dist <= 2 && dist < minDistance) {
                        minDistance = dist;
                        closest = cFn;
                    }
                }

                if (closest) {
                    diagnostics.push({
                        file: defaultFile,
                        line: i + 1,
                        column: lines[i].indexOf(fnName) + 1,
                        severity: "error",
                        type: "Unknown Function",
                        message: `Unknown function '${fnName}'`,
                        explanation: `The function '${fnName}' is undeclared. Did you mean standard C function '${closest}'?`,
                        correction: lines[i].replace(new RegExp(`\\b${fnName}\\b`), closest),
                        code: lines[i],
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
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) return null;

        // Java or Python statements in C
        if (
            trimmed.startsWith("public class") ||
            trimmed.startsWith("public static void main") ||
            trimmed.startsWith("System.out.print") ||
            trimmed.startsWith("def main():")
        ) {
            return {
                file: defaultFile,
                line: lineIndex + 1,
                column: 1,
                severity: "error",
                type: "Language Mismatch",
                message: `Invalid C syntax: Found Java or Python syntax in C file`,
                explanation: `C programs require standard C structure with '#include <stdio.h>' and 'int main() { ... }'.`,
                correction: `#include <stdio.h>\n\nint main() {\n    printf("Hello World\\n");\n    return 0;\n}`,
                code: trimmed,
            };
        }

        return null;
    }
};
