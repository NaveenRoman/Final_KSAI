/**
 * Language validation and pre-execution integrity checker for Codenthra IDE.
 * Architecture:
 * CodeValidator
 *     ↓
 * LanguageDetector / Selected Language Rules
 *     ↓
 * Common Multi-Layer Validation Pipeline (Delimiters, Scope, Typos, Semicolons/Colons, Undeclared Identifiers)
 *     ↓
 * Diagnostics Collection, Deduplication & Run-Gate Output
 */

import {
    CodeDiagnostic,
    CodeValidationResult,
    InScopeSymbols,
    LanguageRuleSet,
    getLanguageRules,
    getLanguageDisplayName,
    normalizeLanguage,
    levenshteinDistance,
} from "./rules/index";
import { maskStringsAndComments } from "./lexing/CodeLexer";

export type { CodeDiagnostic, CodeValidationResult, InScopeSymbols, LanguageRuleSet };
export { getLanguageRules, getLanguageDisplayName, normalizeLanguage, levenshteinDistance };

/**
 * Validates file extension against selected language
 */
export function validateFileExtension(
    language: string,
    fileName: string
): { valid: boolean; error?: string } {
    const normLang = normalizeLanguage(language);
    const lowerName = (fileName || "").toLowerCase().trim();
    const displayName = getLanguageDisplayName(normLang);
    const rules = getLanguageRules(normLang);

    if (!lowerName) {
        return { valid: true };
    }

    const matchesExt = rules.validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!matchesExt) {
        return {
            valid: false,
            error: `❌ Language Mismatch: Selected language is ${displayName}, but active file is '${fileName}'. Please switch language or select a ${rules.validExtensions.join("/")} file.`,
        };
    }

    return { valid: true };
}

/**
 * Checks if code delimiters ({, (, [) are balanced across all languages,
 * properly respecting string literals and language-specific comments.
 */
export function checkBracketBalance(
    code: string,
    language: string = "java"
): { valid: boolean; diagnostics: CodeDiagnostic[] } {
    const normLang = normalizeLanguage(language);
    const defaultFile = normLang === "python" ? "main.py" : normLang === "c" ? "main.c" : normLang === "cpp" ? "main.cpp" : "Main.java";
    const diagnostics: CodeDiagnostic[] = [];
    const stack: { char: string; line: number; col: number }[] = [];
    const pairs: Record<string, string> = { ")": "(", "}": "{", "]": "[" };
    const lines = (code || "").split(/\r?\n/);

    let inBlockComment = false;
    let inTripleDoubleQuote = false;
    let inTripleSingleQuote = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let inSingleQuote = false;
        let inDoubleQuote = false;

        for (let j = 0; j < line.length; j++) {
            const ch = line[j];
            const nextCh = line[j + 1];

            // Python Triple Quotes
            if (normLang === "python") {
                const threeChars = line.slice(j, j + 3);
                if (threeChars === '"""' && !inSingleQuote && !inTripleSingleQuote) {
                    inTripleDoubleQuote = !inTripleDoubleQuote;
                    j += 2;
                    continue;
                }
                if (threeChars === "'''" && !inDoubleQuote && !inTripleDoubleQuote) {
                    inTripleSingleQuote = !inTripleSingleQuote;
                    j += 2;
                    continue;
                }
            }

            if (inTripleDoubleQuote || inTripleSingleQuote) continue;

            // Single line comments
            if (!inSingleQuote && !inDoubleQuote && !inBlockComment) {
                if (normLang === "python" && ch === "#") {
                    break;
                }
                if ((normLang === "java" || normLang === "c" || normLang === "cpp") && ch === "/" && nextCh === "/") {
                    break;
                }
            }

            // Block comments for C / C++ / Java
            if (normLang !== "python") {
                if (!inSingleQuote && !inDoubleQuote) {
                    if (!inBlockComment && ch === "/" && nextCh === "*") {
                        inBlockComment = true;
                        j++;
                        continue;
                    }
                    if (inBlockComment && ch === "*" && nextCh === "/") {
                        inBlockComment = false;
                        j++;
                        continue;
                    }
                }
            }

            if (inBlockComment) continue;

            // String literals
            if (ch === '"' && !inSingleQuote && line[j - 1] !== "\\") {
                inDoubleQuote = !inDoubleQuote;
                continue;
            }
            if (ch === "'" && !inDoubleQuote && line[j - 1] !== "\\") {
                inSingleQuote = !inSingleQuote;
                continue;
            }

            if (inSingleQuote || inDoubleQuote) continue;

            // Delimiter analysis
            if (ch === "(" || ch === "{" || ch === "[") {
                stack.push({ char: ch, line: i + 1, col: j + 1 });
            } else if (ch === ")" || ch === "}" || ch === "]") {
                const expected = pairs[ch];
                const last = stack.pop();
                if (!last || last.char !== expected) {
                    diagnostics.push({
                        file: defaultFile,
                        line: i + 1,
                        column: j + 1,
                        severity: "error",
                        type: "Unmatched Delimiter",
                        message: `Unmatched closing '${ch}'`,
                        explanation: `Found closing '${ch}' without a matching opening '${expected}'.`,
                        code: line.trim(),
                    });
                }
            }
        }
    }

    while (stack.length > 0) {
        const unclosed = stack.pop()!;
        diagnostics.push({
            file: defaultFile,
            line: unclosed.line,
            column: unclosed.col,
            severity: "error",
            type: "Unclosed Delimiter",
            message: `Unclosed opening '${unclosed.char}'`,
            explanation: `Opening '${unclosed.char}' on line ${unclosed.line} is missing a matching closing bracket.`,
            code: lines[unclosed.line - 1]?.trim() || "",
        });
    }

    return {
        valid: diagnostics.length === 0,
        diagnostics,
    };
}

/**
 * Validates source content syntax against the target language collecting ALL independent diagnostics
 */
export function validateCodeBeforeRun({
    language,
    fileName,
    code,
}: {
    language: string;
    fileName?: string;
    code: string;
}): CodeValidationResult {
    const normLang = normalizeLanguage(language);
    const rules = getLanguageRules(normLang);
    const displayName = rules.displayName;
    const trimmedCode = (code || "").trim();
    const defaultFile = fileName || rules.defaultFileName;

    if (!trimmedCode) {
        return {
            valid: false,
            errorTitle: "Empty Source Code",
            errorMessage: "❌ Cannot execute empty code. Please write a program in the editor.",
            diagnostics: [],
        };
    }

    // File extension mismatch check if filename is provided
    if (fileName) {
        const fileCheck = validateFileExtension(normLang, fileName);
        if (!fileCheck.valid && fileCheck.error) {
            const diag: CodeDiagnostic = {
                file: fileName,
                line: 1,
                column: 1,
                severity: "error",
                type: "Language Mismatch",
                message: fileCheck.error,
                explanation: `The selected language is ${displayName}, but the active file extension does not match.`,
                code: trimmedCode.split("\n")[0] || "",
            };
            return {
                valid: false,
                errorTitle: "Language Mismatch",
                errorMessage: fileCheck.error,
                diagnostics: [diag],
                line: 1,
                col: 1,
            };
        }
    }

    const diagnostics: CodeDiagnostic[] = [];
    const lines = trimmedCode.split(/\r?\n/);
    const masked = maskStringsAndComments(trimmedCode, normLang);
    const maskedLines = masked.maskedLines;

    // =========================================================
    // LAYER 1: Bracket & Delimiter Balance Check
    // =========================================================
    const bracketCheck = checkBracketBalance(trimmedCode, normLang);
    if (!bracketCheck.valid) {
        diagnostics.push(...bracketCheck.diagnostics);
    }

    // =========================================================
    // LAYER 2: Cross-Language Mismatch Checks & Syntax Checks
    // =========================================================
    if (rules.checkLanguageMismatch) {
        for (let i = 0; i < lines.length; i++) {
            const mismatchDiag = rules.checkLanguageMismatch(lines[i], i, defaultFile);
            if (mismatchDiag) {
                diagnostics.push(mismatchDiag);
            }
        }
    }

    // Check for assignment mutation syntax error: int a == 10;
    for (let i = 0; i < maskedLines.length; i++) {
        const trimmed = maskedLines[i].trim();
        if (!trimmed) continue;
        if (normLang === "cpp" && /\boperator\s*==/.test(trimmed)) continue;

        const assignEqMatch = trimmed.match(/(?:^|\s+)(?:(?:public|private|protected|static|final|const|auto|unsigned|signed)\s+)*(?:int|double|float|char|long|short|String|auto|bool|let|var)\s+([a-zA-Z_]\w*)\s*==\s*([^;]+);?/);
        if (assignEqMatch) {
            const varName = assignEqMatch[1];
            if (varName === "operator") continue;
            diagnostics.push({
                file: defaultFile,
                line: i + 1,
                column: lines[i].indexOf("==") + 1,
                severity: "error",
                type: "Syntax Error",
                message: `Invalid variable assignment: Use '=' instead of '==' to assign a value to '${varName}'`,
                explanation: `In ${displayName}, '=' is the assignment operator, while '==' is used for comparison.`,
                correction: lines[i].replace("==", "="),
                code: lines[i],
            });
        }
    }

    // =========================================================
    // LAYER 3: Extract In-Scope Symbols (Variables, Types, Functions)
    // =========================================================
    const inScope = rules.extractDeclarations(lines);

    // =========================================================
    // LAYER 4: Language-Specific Diagnostics (Typos in Types, Methods, Streams)
    // =========================================================
    if (rules.checkLanguageSpecificDiagnostics) {
        const langDiags = rules.checkLanguageSpecificDiagnostics(lines, inScope, defaultFile);
        diagnostics.push(...langDiags);
    }

    // =========================================================
    // LAYER 5: Statement Termination Checks (Semicolons in Java/C/C++, Colons in Python)
    // =========================================================
    if (rules.checkStatementTermination) {
        for (let i = 0; i < lines.length; i++) {
            const termDiag = rules.checkStatementTermination(lines[i], lines, i, defaultFile);
            if (termDiag) {
                diagnostics.push(termDiag);
            }
        }
    }

    // =========================================================
    // LAYER 6: Undeclared Variables & Typo Detection (With Qualified Member Handling)
    // =========================================================
    for (let i = 0; i < maskedLines.length; i++) {
        const line = maskedLines[i].trim();
        if (!line || line.startsWith("@") || line.startsWith("#")) continue;

        // Skip standard type declarations
        if (/^(?:(?:public|private|protected|static|final|abstract|synchronized|volatile|transient|native|strictfp|const|auto|virtual|override|inline)\s+)*(?:int|double|float|String|boolean|char|long|short|byte|auto|const|void|class|interface|struct|enum|record)\b/.test(line)) {
            continue;
        }

        // Strip all dot-qualified, arrow-qualified, and scope-qualified members:
        // Java/Python: .member (e.g. .PI, .println, .length, .append, .sqrt, .account_holder)
        // C/C++: ->member (e.g. ->next, ->data)
        // C++: ::member (e.g. ::cout, ::vector)
        let clean = line;
        clean = clean.replace(/\.[a-zA-Z_]\w*/g, "");
        clean = clean.replace(/->[a-zA-Z_]\w*/g, "");
        clean = clean.replace(/::[a-zA-Z_]\w*/g, "");

        const varUsageMatches = Array.from(clean.matchAll(/\b([a-zA-Z_]\w*)\b/g));

        for (const vMatch of varUsageMatches) {
            const word = vMatch[1];
            if (
                rules.reservedKeywords.has(word) ||
                rules.standardTypes.has(word) ||
                rules.builtInFunctions.has(word) ||
                rules.standardLibrarySymbols.has(word) ||
                inScope.variables.has(word) ||
                inScope.types.has(word) ||
                inScope.functions.has(word)
            ) {
                continue;
            }

            // Check if word is a close typo to declared variables (only for identifiers of length >= 3)
            if (word.length >= 3) {
                let closestVar = "";
                let minDistance = 3;
                const maxAllowedDist = word.length <= 4 ? 1 : 2;
                for (const decVar of Array.from(inScope.variables)) {
                    if (decVar.length < 3 || decVar === "std" || decVar === "main") continue;
                    const dist = levenshteinDistance(word.toLowerCase(), decVar.toLowerCase());
                    if (dist > 0 && dist <= maxAllowedDist && dist < minDistance) {
                        minDistance = dist;
                        closestVar = decVar;
                    }
                }

                if (closestVar) {
                    diagnostics.push({
                        file: defaultFile,
                        line: i + 1,
                        column: lines[i].indexOf(word) + 1,
                        severity: "error",
                        type: "Unknown Variable",
                        message: `Unknown variable '${word}'`,
                        explanation: `The variable '${word}' is not declared. Did you mean '${closestVar}'?`,
                        correction: lines[i].replace(new RegExp(`\\b${word}\\b`), closestVar),
                        code: lines[i],
                    });
                }
            }
        }
    }

    // =========================================================
    // Deduplication & Cascading Filter
    // =========================================================
    const uniqueDiagnostics: CodeDiagnostic[] = [];
    const seen = new Set<string>();
    for (const d of diagnostics) {
        const key = `${d.line}:${d.type}:${d.message}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueDiagnostics.push(d);
        }
    }

    const errorCount = uniqueDiagnostics.filter((d) => d.severity === "error").length;
    let errorMessage = "";
    if (errorCount > 0) {
        errorMessage = `❌ Found ${errorCount} ${errorCount === 1 ? "Error" : "Errors"} (${displayName}):\n\n` +
            uniqueDiagnostics
                .map((d, idx) => `${idx + 1}. Line ${d.line} — ${d.message}\n   ${d.explanation ? d.explanation + "\n   " : ""}Fix: ${d.correction || d.code || ""}`)
                .join("\n\n");
    }

    return {
        valid: uniqueDiagnostics.length === 0,
        diagnostics: uniqueDiagnostics,
        errorMessage,
        line: uniqueDiagnostics[0]?.line,
        col: uniqueDiagnostics[0]?.column,
    };
}
