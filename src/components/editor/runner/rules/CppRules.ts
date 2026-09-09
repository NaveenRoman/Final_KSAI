import type { LanguageRuleSet, InScopeSymbols, CodeDiagnostic } from "./types";
import { levenshteinDistance } from "./JavaRules";
import { maskCStyleCode } from "../lexing/CodeLexer";
import { C_RESERVED_KEYWORDS, C_STANDARD_TYPES, C_BUILTIN_FUNCTIONS } from "./CRules";

export const CPP_RESERVED_KEYWORDS = new Set([
    ...Array.from(C_RESERVED_KEYWORDS),
    "alignas", "alignof", "and", "and_eq", "asm", "atomic_cancel", "atomic_commit", "atomic_noexcept",
    "auto", "bitand", "bitor", "bool", "break", "case", "catch", "char", "char8_t", "char16_t",
    "char32_t", "class", "compl", "concept", "const", "consteval", "constexpr", "constinit",
    "const_cast", "continue", "co_await", "co_return", "co_yield", "decltype", "default", "delete",
    "do", "double", "dynamic_cast", "else", "enum", "explicit", "export", "extern", "false",
    "float", "for", "friend", "goto", "if", "inline", "int", "long", "mutable", "namespace",
    "new", "noexcept", "not", "not_eq", "nullptr", "operator", "or", "or_eq", "private",
    "protected", "public", "reflexpr", "register", "reinterpret_cast", "requires", "return",
    "short", "signed", "sizeof", "static", "static_assert", "static_cast", "struct", "switch",
    "synchronized", "template", "this", "thread_local", "throw", "true", "try", "typedef",
    "typeid", "typename", "union", "unsigned", "using", "virtual", "void", "volatile", "wchar_t",
    "while", "xor", "xor_eq", "override", "final"
]);

export const CPP_STANDARD_TYPES = new Set([
    ...Array.from(C_STANDARD_TYPES),
    "string", "vector", "map", "unordered_map", "set", "unordered_set", "list", "deque",
    "queue", "priority_queue", "stack", "pair", "tuple", "array", "unique_ptr", "shared_ptr",
    "weak_ptr", "stringstream", "ifstream", "ofstream", "fstream", "iostream", "istream",
    "ostream", "exception", "runtime_error", "invalid_argument", "out_of_range", "logic_error",
    "bad_alloc", "initializer_list", "function", "complex", "valarray", "bitset", "chrono",
    "BankAccount", "Student", "Book", "Shape", "Circle", "Rectangle", "Animal", "Dog",
    "Node", "ListNode", "TreeNode", "Tree", "Graph", "BST"
]);

export const CPP_BUILTIN_FUNCTIONS = new Set([
    ...Array.from(C_BUILTIN_FUNCTIONS),
    "cout", "cin", "cerr", "clog", "endl", "std", "make_unique", "make_shared", "make_pair", "make_tuple",
    "sort", "max", "min", "accumulate", "reverse", "find", "count", "swap", "fill", "copy",
    "transform", "binary_search", "lower_bound", "upper_bound", "min_element", "max_element",
    "getline", "to_string", "stoi", "stod", "stof", "stol", "stoll", "stoul", "stoull",
    "push_back", "pop_back", "emplace_back", "push", "pop", "top", "front", "back", "empty",
    "size", "clear", "begin", "end", "rbegin", "rend", "cbegin", "cend", "insert", "erase",
    "substr", "length", "c_str", "append", "compare", "find_first_of", "find_last_of"
]);

export const CPP_STANDARD_LIBRARY_SYMBOLS = new Set([
    "std", "cout", "cin", "endl", "cerr", "clog", "string", "vector", "map", "set", "list", "deque",
    "include", "define", "ifdef", "ifndef", "endif", "pragma", "nullptr", "NULL", "iostream", "algorithm",
    "utility", "memory", "cmath", "ctime", "chrono", "sstream", "fstream", "iomanip", "numeric"
]);

export const CppRules: LanguageRuleSet = {
    name: "cpp",
    displayName: "C++",
    defaultFileName: "main.cpp",
    validExtensions: [".cpp", ".cc", ".cxx", ".hpp", ".h"],
    reservedKeywords: CPP_RESERVED_KEYWORDS,
    standardTypes: CPP_STANDARD_TYPES,
    builtInFunctions: CPP_BUILTIN_FUNCTIONS,
    standardLibrarySymbols: CPP_STANDARD_LIBRARY_SYMBOLS,

    extractDeclarations(lines: string[]): InScopeSymbols {
        const variables = new Set<string>();
        const types = new Set<string>(CPP_STANDARD_TYPES);
        const functions = new Set<string>(CPP_BUILTIN_FUNCTIONS);

        for (let i = 0; i < lines.length; i++) {
            const rawLine = lines[i];
            const line = rawLine.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
            if (!line) continue;

            // 1. Class declarations: class Circle : public Shape
            const classMatch = line.match(/\bclass\s+([a-zA-Z_]\w*)(?:\s*:\s*(?:public|protected|private)\s+([a-zA-Z_]\w*))?/);
            if (classMatch) {
                if (classMatch[1]) types.add(classMatch[1]);
                if (classMatch[2]) types.add(classMatch[2]);
            }

            // 2. Struct declarations: struct Node { ... };
            const structMatch = line.match(/\bstruct\s+([a-zA-Z_]\w*)/);
            if (structMatch) {
                types.add(structMatch[1]);
            }

            // 3. Template declarations: template <typename T> or template <class T>
            const templateMatch = line.match(/\btemplate\s*<(?:\s*(?:typename|class)\s+([a-zA-Z_]\w*)\s*,?)+>/);
            if (templateMatch && templateMatch[1]) {
                types.add(templateMatch[1]);
            }

            // 4. Namespace usage: using namespace std;
            const usingNsMatch = line.match(/\busing\s+namespace\s+([a-zA-Z_]\w*)\s*;/);
            if (usingNsMatch) {
                variables.add(usingNsMatch[1]);
            }

            // 5. Method / function declarations: void draw() const override or int getMax(int a, int b)
            const fnMatch = line.match(/(?:virtual\s+|static\s+|inline\s+|constexpr\s+|const\s+|auto\s+|void\s+|int\s+|double\s+|float\s+|bool\s+|string\s+|std::string\s+)*([a-zA-Z_]\w*)\s*\(([^)]*)\)(?:\s*const)?(?:\s*override)?/);
            if (fnMatch && !CPP_RESERVED_KEYWORDS.has(fnMatch[1])) {
                const fnName = fnMatch[1];
                functions.add(fnName);
                variables.add(fnName);

                const params = fnMatch[2];
                if (params && params.trim() !== "void") {
                    const paramList = params.split(",");
                    for (const p of paramList) {
                        const pMatch = p.trim().match(/(?:[a-zA-Z0-9_:<>*&]+\s+)+([a-zA-Z_]\w*)$/);
                        if (pMatch && !CPP_RESERVED_KEYWORDS.has(pMatch[1]) && !types.has(pMatch[1])) {
                            variables.add(pMatch[1]);
                        }
                    }
                }
            }

            // 6. Variable declarations & STL instances: stack<int> s; or std::vector<int> numbers = {1, 2}; or BankAccount acc; or int a = 10, b = 20;
            const typeHeaderMatches = Array.from(line.matchAll(/(?:^|[\s;{(]+)(?:(?:const|static|auto|unsigned|signed)\s+)*(?:(?:std::)?[a-zA-Z_]\w*(?:<[^;{}]+>)?\s*[*&]?\s+)([^;{}=]+)(?:=|[;{])/g));
            for (const thm of typeHeaderMatches) {
                const declBody = thm[1];
                const varNames = Array.from(declBody.matchAll(/(?:^|,)\s*\*?&?\s*([a-zA-Z_]\w*)(?:\[[^\]]*\])?/g));
                for (const vn of varNames) {
                    if (vn[1] && !CPP_RESERVED_KEYWORDS.has(vn[1]) && !types.has(vn[1])) {
                        variables.add(vn[1]);
                    }
                }
            }

            // 7. For loop declarations: for (int i = 0; i < n; i++) or for (std::thread& worker : workers)
            const forLoopMatch = line.match(/\bfor\s*\(\s*(?:(?:const|auto)\s+)?(?:(?:std::)?[a-zA-Z_]\w*(?:<[^>]+>)?\s*[*&]?\s+)+([a-zA-Z_]\w*)\s*(?:=|:)/);
            if (forLoopMatch && forLoopMatch[1] && !CPP_RESERVED_KEYWORDS.has(forLoopMatch[1])) {
                variables.add(forLoopMatch[1]);
            }

            // 8. If / While condition variable declarations: if (Drone* drone = dynamic_cast<...>)
            const condDeclMatch = line.match(/\b(?:if|while)\s*\(\s*(?:(?:const|auto|[a-zA-Z_]\w*)\s*[*&]?\s+)+([a-zA-Z_]\w*)\s*=/);
            if (condDeclMatch && condDeclMatch[1] && !CPP_RESERVED_KEYWORDS.has(condDeclMatch[1])) {
                variables.add(condDeclMatch[1]);
            }

            // 9. Simple constructor instantiations: Book b1("Title", 59.99);
            const objInstMatch = line.match(/(?:^|\s+)(?:[A-Z][a-zA-Z0-9_]*)\s+([a-zA-Z_]\w*)\s*\(/);
            if (objInstMatch && !CPP_RESERVED_KEYWORDS.has(objInstMatch[1])) {
                variables.add(objInstMatch[1]);
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
        // Strip comments before analyzing statement termination
        const trimmed = line.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
            return null;
        }

        if (
            trimmed.endsWith("{") ||
            trimmed.endsWith("}") ||
            trimmed.endsWith(";") ||
            trimmed.endsWith(",") ||
            trimmed.endsWith(":") ||
            trimmed.endsWith("\\") ||
            trimmed.endsWith("<<") ||
            trimmed.endsWith(">>") ||
            trimmed.endsWith("+") ||
            trimmed.endsWith("-") ||
            trimmed.endsWith("*") ||
            trimmed.endsWith("/") ||
            trimmed.endsWith("&&") ||
            trimmed.endsWith("||") ||
            trimmed.endsWith(".") ||
            trimmed.endsWith("->") ||
            trimmed.endsWith("(") ||
            trimmed.endsWith("[")
        ) {
            return null;
        }

        const rawNextLine = allLines && lineIndex + 1 < allLines.length ? allLines[lineIndex + 1] : "";
        const nextLine = rawNextLine.replace(/\/\/.*$/, "").replace(/\/\*.*?\*\//g, "").trim();
        if (
            nextLine.startsWith("{") ||
            nextLine.startsWith(":") ||
            nextLine.startsWith("<<") ||
            nextLine.startsWith(">>") ||
            nextLine.startsWith(".") ||
            nextLine.startsWith("->")
        ) {
            return null;
        }

        if (trimmed.endsWith(")")) {
            if (trimmed.includes("cout") || trimmed.includes("cin") || trimmed.includes("printf") || trimmed.includes("scanf") || trimmed.includes("=")) {
                if (!/^(if|for|while|switch|catch)\b/.test(trimmed)) {
                    return {
                        file: defaultFile,
                        line: lineIndex + 1,
                        column: line.length + 1,
                        severity: "error",
                        type: "Missing Semicolon",
                        message: `Missing semicolon ';' at the end of statement`,
                        explanation: `In C++, executable statements must end with a semicolon ';'.`,
                        correction: trimmed + ";",
                        code: trimmed,
                    };
                }
            }
        }

        if (
            /(\b(cout|cin|cerr|return|break|continue|printf|scanf)\b|=[^=]|^\s*[a-zA-Z_]\w*\s*[\+\-\*\/]?=)/.test(trimmed) &&
            !/^(if|for|while|switch|else|try|catch|class|struct|union|enum|template|public|private|protected)\b/.test(trimmed)
        ) {
            return {
                file: defaultFile,
                line: lineIndex + 1,
                column: line.length + 1,
                severity: "error",
                type: "Missing Semicolon",
                message: `Missing semicolon ';' at the end of statement`,
                explanation: `In C++, executable statements must end with a semicolon ';'.`,
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
        const masked = maskCStyleCode(lines.join("\n"), "cpp");

        // Typo checks for common C++ stream identifiers (e.g. coutt -> cout, cinn -> cin) on masked lines
        for (let i = 0; i < masked.maskedLines.length; i++) {
            const line = masked.maskedLines[i].trim();
            if (!line || line.startsWith("#")) continue;

            if (/\bcoutt\b/.test(line)) {
                diagnostics.push({
                    file: defaultFile,
                    line: i + 1,
                    column: lines[i].indexOf("coutt") + 1,
                    severity: "error",
                    type: "Unknown Identifier",
                    message: `Unknown identifier 'coutt'`,
                    explanation: `Did you mean standard output stream 'cout'?`,
                    correction: lines[i].replace("coutt", "cout"),
                    code: lines[i],
                });
            }

            if (/\bcinn\b/.test(line)) {
                diagnostics.push({
                    file: defaultFile,
                    line: i + 1,
                    column: lines[i].indexOf("cinn") + 1,
                    severity: "error",
                    type: "Unknown Identifier",
                    message: `Unknown identifier 'cinn'`,
                    explanation: `Did you mean standard input stream 'cin'?`,
                    correction: lines[i].replace("cinn", "cin"),
                    code: lines[i],
                });
            }

            if (/\bendll\b|\bendl1\b/.test(line)) {
                const badToken = line.includes("endll") ? "endll" : "endl1";
                diagnostics.push({
                    file: defaultFile,
                    line: i + 1,
                    column: lines[i].indexOf(badToken) + 1,
                    severity: "error",
                    type: "Unknown Identifier",
                    message: `Unknown identifier '${badToken}'`,
                    explanation: `Did you mean standard stream manipulator 'endl'?`,
                    correction: lines[i].replace(badToken, "endl"),
                    code: lines[i],
                });
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

        // Java or Python code in C++
        if (
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
                message: `Invalid C++ syntax: Found Java or Python syntax in C++ file`,
                explanation: `C++ programs use '#include <iostream>' and 'int main() { ... }' with std::cout streams.`,
                correction: `#include <iostream>\n\nint main() {\n    std::cout << "Hello World" << std::endl;\n    return 0;\n}`,
                code: trimmed,
            };
        }

        return null;
    }
};
