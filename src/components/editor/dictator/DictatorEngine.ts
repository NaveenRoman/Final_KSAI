import {
    DictatorTeachingUnit,
    tokenizeCode,
    lexCode,
    CodeToken,
    generateTeachingUnits,
    classifyProjectTask,
} from "./DictatorTokenizer";
import {
    getLanguageRules,
    getLanguageDisplayName,
    normalizeLanguage,
    levenshteinDistance,
} from "../runner/rules";

export interface DictatorMessage {
    instruction: string;
    explanation: string;
    expectedToken: string;
    hint?: string;
    correction?: string;
    progress?: string;
    stepNumber: number;
    totalSteps: number;
    isComplete: boolean;
    error?: string | null;
    lineNumber?: number;
    columnNumber?: number;
    speechText: string;
    fullMessageText?: string;
}

export function createDictatorMessage(params: {
    instruction: string;
    explanation: string;
    expectedToken: string;
    hint?: string;
    correction?: string;
    progress?: string;
    stepNumber: number;
    totalSteps: number;
    isComplete: boolean;
    error?: string | null;
    lineNumber?: number;
    columnNumber?: number;
    speechText?: string;
}): DictatorMessage {
    const locText = params.columnNumber
        ? `Line ${params.lineNumber || 1}, Column ${params.columnNumber}`
        : `Line ${params.lineNumber || 1}`;
    const speechText =
        params.speechText ||
        (params.error ? `Error on ${locText}. ${params.explanation}` : params.explanation);

    return {
        instruction: params.instruction,
        explanation: params.explanation,
        expectedToken: params.expectedToken,
        hint: params.hint,
        correction: params.correction,
        progress: params.progress,
        stepNumber: params.stepNumber,
        totalSteps: params.totalSteps,
        isComplete: params.isComplete,
        error: params.error || null,
        lineNumber: params.lineNumber,
        columnNumber: params.columnNumber,
        speechText,
        fullMessageText: params.error || `${params.instruction}\n\n${params.explanation}`,
    };
}

export function createInitialDictatorMessage(
    unit: DictatorTeachingUnit,
    unitIdx: number,
    totalUnits: number
): DictatorMessage {
    const speech = unit.speech || `${unit.title}. ${unit.instruction}`;
    return createDictatorMessage({
        instruction: unit.instruction,
        explanation: unit.explanation || unit.instruction,
        expectedToken: unit.expectedToken,
        hint: unit.hint,
        progress: `Step ${unitIdx + 1} of ${totalUnits}: ${unit.title}`,
        stepNumber: unitIdx + 1,
        totalSteps: totalUnits,
        isComplete: false,
        speechText: speech,
    });
}

export interface DictatorValidationResult {
    correct: boolean;
    status: "correct" | "error" | "typing" | "completed";
    currentUnitIndex: number;
    nextUnitIndex?: number;
    completed: boolean;
    typedToken?: string;
    expectedToken: string;
    message: string;
    speech?: string;
    dictatorMessage?: DictatorMessage;
    unit?: DictatorTeachingUnit;
    line?: number;
    col?: number;
    errorType?:
        | "syntax"
        | "typo"
        | "unexpected_token"
        | "previous_code_corrupted"
        | "bracket"
        | "language_mismatch"
        | "semantic_identifier"
        | "missing_semicolon"
        | "type_mismatch";
}

/**
 * Normalizes code by standardizing whitespace and line breaks
 */
export function normalizeCode(code: string): string {
    return (code || "")
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .trim();
}

/**
 * Formats standardized 5-part error explanation matching Dictator criteria
 */
export function formatDictatorError({
    line,
    col,
    yourCode,
    why,
    correctCode,
}: {
    line: number;
    col?: number;
    yourCode: string;
    why: string;
    correctCode: string;
}): string {
    const locText = col ? `Line ${line}, Column ${col}` : `Line ${line}`;
    return (
        `❌ Error detected\n\n` +
        `📍 Location:\n${locText}\n\n` +
        `🔎 Your code:\n${yourCode}\n\n` +
        `💡 Why:\n${why}\n\n` +
        `✅ Correct code:\n${correctCode}\n\n` +
        `Please correct this before we continue.`
    );
}

/**
 * Finds the 1-indexed line number where a substring or token appears in code
 */
export function findLineNumber(code: string, token: string): number {
    const lines = code.split("\n");
    const normToken = token.trim();
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(normToken)) {
            return i + 1;
        }
    }
    return 1;
}

/**
 * Checks if code delimiters ({, (, [) are balanced and properly closed across languages
 */
export function checkBracketBalance(
    code: string,
    allowUnclosedOpening: boolean = false,
    language: string = "java"
): { valid: boolean; error?: string; line?: number } {
    const normLang = normalizeLanguage(language);
    const stack: Array<{ char: string; line: number; col: number }> = [];
    const lines = code.split("\n");
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inLineComment = false;
    let inBlockComment = false;

    for (let l = 0; l < lines.length; l++) {
        const line = lines[l];
        inLineComment = false;

        for (let c = 0; c < line.length; c++) {
            const char = line[c];
            const next = line[c + 1];

            if (!inSingleQuote && !inDoubleQuote) {
                if (normLang === "python" && char === "#") {
                    inLineComment = true;
                    break;
                }
                if (!inBlockComment && char === "/" && next === "/") {
                    inLineComment = true;
                    break;
                }
                if (!inBlockComment && char === "/" && next === "*") {
                    inBlockComment = true;
                    c++;
                    continue;
                }
                if (inBlockComment && char === "*" && next === "/") {
                    inBlockComment = false;
                    c++;
                    continue;
                }
            }

            if (inLineComment || inBlockComment) continue;

            if (char === '"' && !inSingleQuote && line[c - 1] !== "\\") {
                inDoubleQuote = !inDoubleQuote;
                continue;
            }
            if (char === "'" && !inDoubleQuote && line[c - 1] !== "\\") {
                inSingleQuote = !inSingleQuote;
                continue;
            }

            if (inSingleQuote || inDoubleQuote) continue;

            if (char === "{" || char === "(" || char === "[") {
                stack.push({ char, line: l + 1, col: c + 1 });
            } else if (char === "}" || char === ")" || char === "]") {
                if (stack.length === 0) {
                    return {
                        valid: false,
                        line: l + 1,
                        error: `Unexpected closing '${char}' at line ${l + 1}, col ${c + 1} with no matching opening delimiter.`,
                    };
                }

                const last = stack.pop()!;
                const expected = last.char === "{" ? "}" : last.char === "(" ? ")" : "]";
                if (char !== expected) {
                    return {
                        valid: false,
                        line: l + 1,
                        error: `Mismatched delimiter: found '${char}' at line ${l + 1}, col ${c + 1}, but expected '${expected}' to close '${last.char}' opened at line ${last.line}.`,
                    };
                }
            }
        }
    }

    if (!allowUnclosedOpening && stack.length > 0) {
        const unclosed = stack[stack.length - 1];
        return {
            valid: false,
            line: unclosed.line,
            error: `Unclosed '${unclosed.char}' opened at line ${unclosed.line}, col ${unclosed.col}.`,
        };
    }

    return { valid: true };
}

/**
 * Checks for type mismatches (e.g. int balance = "1000";)
 */
export function checkTypeMismatch(
    code: string,
    language: string
): { valid: boolean; error?: { line: number; yourCode: string; why: string; correctCode: string } } {
    const lines = code.split("\n");
    const normLang = normalizeLanguage(language);

    if (normLang === "java" || normLang === "c" || normLang === "cpp") {
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) continue;

            // int balance = "1000";
            const intStrMatch = line.match(/^int\s+([A-Za-z0-9_]+)\s*=\s*"([^"]*)";?$/);
            if (intStrMatch) {
                const varName = intStrMatch[1];
                const strVal = intStrMatch[2];
                const numericVal = strVal.replace(/[^0-9-]/g, "") || "0";
                return {
                    valid: false,
                    error: {
                        line: i + 1,
                        yourCode: line,
                        why: `${varName} is declared as an integer (int), but "${strVal}" in double quotes is a String.`,
                        correctCode: `int ${varName} = ${numericVal};`,
                    },
                };
            }

            // double/float balance = "1000";
            const floatStrMatch = line.match(/^(double|float)\s+([A-Za-z0-9_]+)\s*=\s*"([^"]*)";?$/);
            if (floatStrMatch) {
                const typeName = floatStrMatch[1];
                const varName = floatStrMatch[2];
                const strVal = floatStrMatch[3];
                const numericVal = strVal.replace(/[^0-9.-]/g, "") || "0.0";
                return {
                    valid: false,
                    error: {
                        line: i + 1,
                        yourCode: line,
                        why: `${varName} is declared as ${typeName}, but "${strVal}" in double quotes is a String.`,
                        correctCode: `${typeName} ${varName} = ${numericVal};`,
                    },
                };
            }

            // boolean flag = 123;
            if (normLang === "java") {
                const boolMatch = line.match(/^boolean\s+([A-Za-z0-9_]+)\s*=\s*([^;]+);?$/);
                if (boolMatch) {
                    const varName = boolMatch[1];
                    const val = boolMatch[2].trim();
                    if (
                        val !== "true" &&
                        val !== "false" &&
                        !val.includes("==") &&
                        !val.includes("!=") &&
                        !val.includes("<") &&
                        !val.includes(">")
                    ) {
                        return {
                            valid: false,
                            error: {
                                line: i + 1,
                                yourCode: line,
                                why: `${varName} is declared as boolean, which only accepts true or false, but received '${val}'.`,
                                correctCode: `boolean ${varName} = true;`,
                            },
                        };
                    }
                }
            }
        }
    }
    return { valid: true };
}

/**
 * Generates clear, pedagogical typo explanations across all languages
 */
export function generateTypoExplanation(
    typed: string,
    expected: string,
    language: string
): { reason: string; fixHint: string } {
    const tLower = (typed || "").toLowerCase().trim();
    const eLower = (expected || "").toLowerCase().trim();
    const normLang = normalizeLanguage(language);
    const displayName = getLanguageDisplayName(normLang);

    // 1. Partial keyword typing
    if (eLower.startsWith(tLower) && typed.length < expected.length) {
        return {
            reason: `You're close. The keyword is '${expected}'. You typed '${typed}', but the complete keyword is '${expected}'.`,
            fixHint: `Complete the keyword as '${expected}'.`,
        };
    }

    // 2. Case-sensitivity errors
    if (tLower === eLower && typed !== expected) {
        if (
            expected === "public" ||
            expected === "class" ||
            expected === "static" ||
            expected === "void" ||
            expected === "int" ||
            expected === "def" ||
            expected === "return"
        ) {
            return {
                reason: `In ${displayName}, keywords are strictly lowercase. You wrote '${typed}', but the standard keyword is '${expected}'.`,
                fixHint: `Change '${typed}' to lowercase '${expected}'.`,
            };
        }
        if (expected === "String") {
            return {
                reason: `In Java, 'String' is a standard class and must start with a capital 'S'.`,
                fixHint: `Change '${typed}' to capitalized 'String'.`,
            };
        }
        if (expected === "Main") {
            return {
                reason: `Class names follow PascalCase conventions. Expected 'Main'.`,
                fixHint: `Change '${typed}' to 'Main'.`,
            };
        }
    }

    // 3. Method / Function Typos
    if (tLower === "printl" || tLower.includes(".printl")) {
        return {
            reason: `The method name is incorrect. Java uses println(), not printl().`,
            fixHint: `Change 'printl' to 'println'.`,
        };
    }

    if (tLower === "pirntln" || tLower.includes(".pirntln") || tLower === "printn") {
        return {
            reason: `'println' is misspelled as '${typed}'.`,
            fixHint: `Correct the spelling to 'println'.`,
        };
    }

    if (tLower === "printt" || tLower === "prnt") {
        return {
            reason: `The function name is print(), not ${typed}().`,
            fixHint: `Change '${typed}' to 'print'.`,
        };
    }

    if (tLower === "printff" || tLower === "prntf") {
        return {
            reason: `Standard C/C++ formatted print is 'printf', not '${typed}'.`,
            fixHint: `Change '${typed}' to 'printf'.`,
        };
    }

    if (tLower === "coutt") {
        return {
            reason: `C++ standard output stream is 'cout', not 'coutt'.`,
            fixHint: `Change 'coutt' to 'cout'.`,
        };
    }

    if (tLower === "cinn") {
        return {
            reason: `C++ standard input stream is 'cin', not 'cinn'.`,
            fixHint: `Change 'cinn' to 'cin'.`,
        };
    }

    // 4. Common Keyword Typos
    if (tLower === "publci" || tLower === "pubic" || tLower === "pbulic") {
        return {
            reason: `'public' is misspelled as '${typed}'. It is an access modifier keyword.`,
            fixHint: `Correct the spelling to 'public'.`,
        };
    }

    if (tLower === "statci" || tLower === "satitc" || tLower === "stat") {
        return {
            reason: `'static' is misspelled as '${typed}'. It designates a class-level member.`,
            fixHint: `Correct the spelling to 'static'.`,
        };
    }

    if (tLower === "viod" || tLower === "voide") {
        return {
            reason: `'void' is misspelled as '${typed}'. It specifies that the method returns no value.`,
            fixHint: `Correct the spelling to 'void'.`,
        };
    }

    if (tLower === "mian" || tLower === "maain") {
        return {
            reason: `'main' is misspelled as '${typed}'. 'main' is the required entry point name.`,
            fixHint: `Change '${typed}' to 'main'.`,
        };
    }

    if (tLower === "calss" || tLower === "clas") {
        return {
            reason: `'class' is misspelled as '${typed}'.`,
            fixHint: `Correct the spelling to 'class'.`,
        };
    }

    if (tLower === "deff" || tLower === "functon") {
        return {
            reason: `Python defines functions using the reserved keyword 'def'.`,
            fixHint: `Change '${typed}' to 'def'.`,
        };
    }

    if (tLower === "<stdoi.h>" || tLower === "stdoi.h") {
        return {
            reason: `C standard I/O header is '<stdio.h>', not '${typed}'.`,
            fixHint: `Change to '<stdio.h>'.`,
        };
    }

    if (tLower === "<iostrem>" || tLower === "iostrem") {
        return {
            reason: `C++ standard I/O stream header is '<iostream>', not '${typed}'.`,
            fixHint: `Change to '<iostream>'.`,
        };
    }

    return {
        reason: `Expected '${expected}', but found '${typed}'.`,
        fixHint: `Type '${expected}'.`,
    };
}

/**
 * Validates semantic integrity and variable consistency
 */
export function validateSemanticIntegrity(
    code: string,
    language: string
): { valid: boolean; result?: DictatorValidationResult } {
    const normLang = normalizeLanguage(language);
    const lines = code.split("\n");

    if (normLang === "java" || normLang === "c" || normLang === "cpp" || normLang === "python") {
        let declaredNumbersArray = false;
        let declaredNumberVar = false;

        for (let l = 0; l < lines.length; l++) {
            const line = lines[l].trim();
            if (line.includes("int[] numbers") || line.includes("int numbers[]") || line.includes("numbers = [") || line.includes("vector<int> numbers")) {
                declaredNumbersArray = true;
            }
            if (line.includes("int number =") || line.includes("int num =") || line.includes("number = 10")) {
                declaredNumberVar = true;
            }

            if (declaredNumbersArray && !declaredNumberVar) {
                if (line.includes("number.length") || line.includes("number[") || line.includes("len(number)")) {
                    const lineNum = l + 1;
                    const incorrect = line.includes("number.length")
                        ? "number.length"
                        : line.includes("len(number)")
                        ? "len(number)"
                        : "number[";
                    const correct = line.includes("number.length")
                        ? "numbers.length"
                        : line.includes("len(number)")
                        ? "len(numbers)"
                        : "numbers[";
                    const formatted = formatDictatorError({
                        line: lineNum,
                        yourCode: line,
                        why: `You declared the array as 'numbers' (plural), but here you referenced 'number' (singular).`,
                        correctCode: line.replace(incorrect, correct),
                    });
                    return {
                        valid: false,
                        result: {
                            correct: false,
                            status: "error",
                            currentUnitIndex: 0,
                            completed: false,
                            typedToken: incorrect,
                            expectedToken: correct,
                            errorType: "semantic_identifier",
                            line: lineNum,
                            message: formatted,
                            speech: `Error on line ${lineNum}. Variable identifier mismatch. Use numbers plural.`,
                        },
                    };
                }
            }
        }
    }

    return { valid: true };
}

/**
 * LAYER A: Full program integrity check across the entire editor
 */
export function validateFullProgramIntegrity(
    studentCode: string,
    units: DictatorTeachingUnit[],
    currentUnitIndex: number,
    language: string = "java"
): { valid: boolean; result?: DictatorValidationResult } {
    const normLang = normalizeLanguage(language);
    const rules = getLanguageRules(normLang);
    const lines = studentCode.split("\n");

    // 0. Assignment Mutation Check: int a == 10; or let x == 10;
    for (let l = 0; l < lines.length; l++) {
        const trimmed = lines[l].trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*") || trimmed.startsWith("#")) continue;

        const assignEqMatch = trimmed.match(/^(?:(?:public|private|protected|static|final|const|auto|unsigned|signed)\s+)*(?:int|double|float|char|long|short|String|auto|bool|let|var)\s+([a-zA-Z_]\w*)\s*==\s*([^;]+);?/);
        if (assignEqMatch) {
            const lineNum = l + 1;
            const formatted = formatDictatorError({
                line: lineNum,
                yourCode: trimmed,
                why: `Invalid assignment syntax. '=' is used for variable assignment, whereas '==' is comparison.`,
                correctCode: trimmed.replace("==", "="),
            });
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: "==",
                    expectedToken: "=",
                    errorType: "syntax",
                    line: lineNum,
                    message: formatted,
                    speech: `Error on line ${lineNum}. Use single equal sign for variable assignment.`,
                },
            };
        }
    }

    // 1. Method Name Typos across languages
    for (let l = 0; l < lines.length; l++) {
        const trimmed = lines[l].trim();
        if (normLang === "java" && (trimmed.includes(".printl(") || trimmed.includes("printl("))) {
            const lineNum = l + 1;
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: "printl",
                    expectedToken: "println",
                    errorType: "typo",
                    line: lineNum,
                    message: formatDictatorError({
                        line: lineNum,
                        yourCode: trimmed,
                        why: "Java uses println(), not printl().",
                        correctCode: trimmed.replace("printl", "println"),
                    }),
                    speech: `Error on line ${lineNum}. Java uses println, not printl.`,
                },
            };
        }

        if (normLang === "python" && /\bprintt\s*\(/.test(trimmed)) {
            const lineNum = l + 1;
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: "printt",
                    expectedToken: "print",
                    errorType: "typo",
                    line: lineNum,
                    message: formatDictatorError({
                        line: lineNum,
                        yourCode: trimmed,
                        why: "Python uses print(), not printt().",
                        correctCode: trimmed.replace("printt", "print"),
                    }),
                    speech: `Error on line ${lineNum}. Python uses print, not printt.`,
                },
            };
        }

        if (normLang === "c" && /\bprintff\s*\(/.test(trimmed)) {
            const lineNum = l + 1;
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: "printff",
                    expectedToken: "printf",
                    errorType: "typo",
                    line: lineNum,
                    message: formatDictatorError({
                        line: lineNum,
                        yourCode: trimmed,
                        why: "C uses printf(), not printff().",
                        correctCode: trimmed.replace("printff", "printf"),
                    }),
                    speech: `Error on line ${lineNum}. C uses printf, not printff.`,
                },
            };
        }

        if (normLang === "cpp" && /\bcoutt\b/.test(trimmed)) {
            const lineNum = l + 1;
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: "coutt",
                    expectedToken: "cout",
                    errorType: "typo",
                    line: lineNum,
                    message: formatDictatorError({
                        line: lineNum,
                        yourCode: trimmed,
                        why: "C++ uses standard output stream 'cout', not 'coutt'.",
                        correctCode: trimmed.replace("coutt", "cout"),
                    }),
                    speech: `Error on line ${lineNum}. C++ uses cout, not coutt.`,
                },
            };
        }
    }

    // 2. Language Mismatch Check
    for (let l = 0; l < lines.length; l++) {
        const trimmed = lines[l].trim();
        if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) continue;

        const mismatchDiag = rules.checkLanguageMismatch ? rules.checkLanguageMismatch(trimmed, l, rules.defaultFileName) : null;
        if (mismatchDiag) {
            const formatted = formatDictatorError({
                line: l + 1,
                yourCode: trimmed,
                why: mismatchDiag.explanation || mismatchDiag.message,
                correctCode: mismatchDiag.correction || "",
            });
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: trimmed,
                    expectedToken: mismatchDiag.correction || "",
                    errorType: "language_mismatch",
                    line: l + 1,
                    message: formatted,
                    speech: `Language mismatch on line ${l + 1}.`,
                },
            };
        }
    }

    // 3. Delimiter Balance Check (allow open brackets during partial typing)
    const bracketRes = checkBracketBalance(studentCode, true, normLang);
    if (!bracketRes.valid) {
        const lineNum = bracketRes.line || 1;
        const formatted = formatDictatorError({
            line: lineNum,
            yourCode: lines[lineNum - 1] || "Unclosed / mismatched bracket",
            why: bracketRes.error || "Mismatched or unclosed delimiters ({, (, [).",
            correctCode: "Ensure every opening delimiter has a corresponding matching closing delimiter.",
        });
        return {
            valid: false,
            result: {
                correct: false,
                status: "error",
                currentUnitIndex,
                completed: false,
                expectedToken: "}",
                errorType: "bracket",
                line: lineNum,
                message: formatted,
                speech: `Syntax error on line ${lineNum}. Delimiters are mismatched or unclosed.`,
            },
        };
    }

    // 4. Type Mismatch Check (e.g. int balance = "1000";)
    const typeCheck = checkTypeMismatch(studentCode, normLang);
    if (!typeCheck.valid && typeCheck.error) {
        const err = typeCheck.error;
        const formatted = formatDictatorError({
            line: err.line,
            yourCode: err.yourCode,
            why: err.why,
            correctCode: err.correctCode,
        });
        return {
            valid: false,
            result: {
                correct: false,
                status: "error",
                currentUnitIndex,
                completed: false,
                typedToken: err.yourCode,
                expectedToken: err.correctCode,
                errorType: "type_mismatch",
                line: err.line,
                message: formatted,
                speech: `Type mismatch error on line ${err.line}. ${err.why}`,
            },
        };
    }

    // 5. Keyword Typo & Previous-Line Corruption Scan
    const tokens = lexCode(studentCode);
    for (let i = 0; i < tokens.length; i++) {
        const tok = tokens[i];
        const tLower = tok.value.toLowerCase();

        if (normLang === "java" || normLang === "c" || normLang === "cpp") {
            if (tLower === "publci" || tLower === "pubic" || tLower === "pbulic") {
                return {
                    valid: false,
                    result: {
                        correct: false,
                        status: "error",
                        currentUnitIndex,
                        completed: false,
                        typedToken: tok.value,
                        expectedToken: "public",
                        errorType: "previous_code_corrupted",
                        line: tok.line,
                        message: formatDictatorError({
                            line: tok.line,
                            yourCode: lines[tok.line - 1] || tok.value,
                            why: `'public' is an access modifier keyword and is misspelled as '${tok.value}'.`,
                            correctCode: (lines[tok.line - 1] || "").replace(tok.value, "public"),
                        }),
                        speech: `Error on line ${tok.line}. Public keyword is misspelled.`,
                    },
                };
            }

            if (tLower === "mian" || tLower === "maain") {
                return {
                    valid: false,
                    result: {
                        correct: false,
                        status: "error",
                        currentUnitIndex,
                        completed: false,
                        typedToken: tok.value,
                        expectedToken: "main",
                        errorType: "previous_code_corrupted",
                        line: tok.line,
                        message: formatDictatorError({
                            line: tok.line,
                            yourCode: lines[tok.line - 1] || tok.value,
                            why: `'main' is the required entry point method name and is misspelled as '${tok.value}'.`,
                            correctCode: (lines[tok.line - 1] || "").replace(tok.value, "main"),
                        }),
                        speech: `Error on line ${tok.line}. Main method name is misspelled.`,
                    },
                };
            }

            if (tLower === "clas" || tLower === "calss") {
                return {
                    valid: false,
                    result: {
                        correct: false,
                        status: "error",
                        currentUnitIndex,
                        completed: false,
                        typedToken: tok.value,
                        expectedToken: "class",
                        errorType: "previous_code_corrupted",
                        line: tok.line,
                        message: formatDictatorError({
                            line: tok.line,
                            yourCode: lines[tok.line - 1] || tok.value,
                            why: `'class' is the reserved keyword for defining classes.`,
                            correctCode: (lines[tok.line - 1] || "").replace(tok.value, "class"),
                        }),
                        speech: `Error on line ${tok.line}. Class keyword is misspelled.`,
                    },
                };
            }
        }

        if (normLang === "python") {
            if (tLower === "deff" || tLower === "functon") {
                return {
                    valid: false,
                    result: {
                        correct: false,
                        status: "error",
                        currentUnitIndex,
                        completed: false,
                        typedToken: tok.value,
                        expectedToken: "def",
                        errorType: "previous_code_corrupted",
                        line: tok.line,
                        message: formatDictatorError({
                            line: tok.line,
                            yourCode: lines[tok.line - 1] || tok.value,
                            why: `Python uses the reserved keyword 'def' to define functions.`,
                            correctCode: (lines[tok.line - 1] || "").replace(tok.value, "def"),
                        }),
                        speech: `Error on line ${tok.line}. Def keyword is misspelled.`,
                    },
                };
            }
        }

        if (normLang === "c" && (tLower === "<stdoi.h>" || tLower === "stdoi.h")) {
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: tok.value,
                    expectedToken: "<stdio.h>",
                    errorType: "typo",
                    line: tok.line,
                    message: formatDictatorError({
                        line: tok.line,
                        yourCode: lines[tok.line - 1] || tok.value,
                        why: `C standard I/O library header is '<stdio.h>', not '${tok.value}'.`,
                        correctCode: (lines[tok.line - 1] || "").replace(tok.value, "<stdio.h>"),
                    }),
                    speech: `Error on line ${tok.line}. Stdio header is misspelled.`,
                },
            };
        }

        if (normLang === "cpp" && (tLower === "<iostrem>" || tLower === "iostrem")) {
            return {
                valid: false,
                result: {
                    correct: false,
                    status: "error",
                    currentUnitIndex,
                    completed: false,
                    typedToken: tok.value,
                    expectedToken: "<iostream>",
                    errorType: "typo",
                    line: tok.line,
                    message: formatDictatorError({
                        line: tok.line,
                        yourCode: lines[tok.line - 1] || tok.value,
                        why: `C++ standard I/O stream header is '<iostream>', not '${tok.value}'.`,
                        correctCode: (lines[tok.line - 1] || "").replace(tok.value, "<iostream>"),
                    }),
                    speech: `Error on line ${tok.line}. Iostream header is misspelled.`,
                },
            };
        }
    }

    // 6. Semantic Identifier Check
    const semanticRes = validateSemanticIntegrity(studentCode, normLang);
    if (!semanticRes.valid && semanticRes.result) {
        semanticRes.result.currentUnitIndex = currentUnitIndex;
        return semanticRes;
    }

    return { valid: true };
}

/**
 * RIGOROUS FINAL COMPLETION VALIDATION ACROSS LANGUAGES
 */
export function validateCompleteProgram(
    studentCode: string,
    units: DictatorTeachingUnit[],
    language: string = "java",
    project: string = "array"
): { valid: boolean; message: string; speech?: string; dictatorMessage?: DictatorMessage } {
    const normLang = normalizeLanguage(language);
    const task = classifyProjectTask(project);
    const trimmed = studentCode.trim();

    // 1. Bracket Balance must be 100% closed and valid
    const bracketCheck = checkBracketBalance(studentCode, false, normLang);
    if (!bracketCheck.valid) {
        return {
            valid: false,
            message: `❌ Cannot finish program: ${bracketCheck.error}`,
            speech: `Cannot finish program. Syntax delimiter error: ${bracketCheck.error}`,
        };
    }

    // 2. Semantic Integrity Check
    const semanticCheck = validateSemanticIntegrity(studentCode, normLang);
    if (!semanticCheck.valid && semanticCheck.result) {
        return {
            valid: false,
            message: semanticCheck.result.message,
            speech: semanticCheck.result.speech,
        };
    }

    // 3. Task-specific required logic existence check
    if (task === "atm") {
        if (!trimmed.toLowerCase().includes("balance")) {
            return {
                valid: false,
                message: "❌ ATM program is incomplete: Missing account balance state.",
                speech: "The ATM program is not complete. Missing balance state.",
            };
        }
        if (!trimmed.toLowerCase().includes("withdraw") && !trimmed.toLowerCase().includes("deposit")) {
            return {
                valid: false,
                message: "❌ ATM program is incomplete: Missing deposit/withdrawal transaction logic.",
                speech: "The ATM program is not complete. Missing transaction logic.",
            };
        }
    } else if (task === "linked_list") {
        if (!trimmed.toLowerCase().includes("next") || (!trimmed.toLowerCase().includes("node") && !trimmed.includes("Node"))) {
            return {
                valid: false,
                message: "❌ Linked List program is incomplete: Missing Node structure or 'next' pointer chaining.",
                speech: "Linked List program is incomplete. Missing Node structure or pointer chaining.",
            };
        }
    } else if (task === "student_management") {
        if (
            !trimmed.toLowerCase().includes("student") &&
            !trimmed.toLowerCase().includes("mark") &&
            !trimmed.toLowerCase().includes("grade") &&
            !trimmed.toLowerCase().includes("gpa")
        ) {
            return {
                valid: false,
                message: "❌ Student Management program is incomplete: Missing student data or grade evaluation.",
                speech: "Student management program is incomplete.",
            };
        }
    }

    // 4. Output Statement Existence Check
    if (normLang === "java" && !trimmed.includes("System.out.print")) {
        return {
            valid: false,
            message: "❌ Java program is incomplete: Missing output statement (System.out.println).",
            speech: "Program is not complete. Output statement is missing.",
        };
    }
    if (normLang === "python" && !trimmed.includes("print(")) {
        return {
            valid: false,
            message: "❌ Python program is incomplete: Missing output statement (print).",
            speech: "Program is not complete. Print statement is missing.",
        };
    }
    if (normLang === "c" && !trimmed.includes("printf(")) {
        return {
            valid: false,
            message: "❌ C program is incomplete: Missing output statement (printf).",
            speech: "Program is not complete. Printf statement is missing.",
        };
    }
    if (normLang === "cpp" && !trimmed.includes("cout")) {
        return {
            valid: false,
            message: "❌ C++ program is incomplete: Missing output stream (cout).",
            speech: "Program is not complete. Cout stream is missing.",
        };
    }

    const completeMsg = createDictatorMessage({
        instruction: "The program is completed. Now run the code.",
        explanation: `🎉 Excellent Work! Program Complete!\n\nAll architectural components and requirements have been verified.\n\nThe program is completed. Now run the code.`,
        expectedToken: "",
        progress: `🎉 Program Complete!`,
        stepNumber: units.length,
        totalSteps: units.length,
        isComplete: true,
        speechText: `The program is completed. Now run the code.`,
    });

    return {
        valid: true,
        message: completeMsg.explanation,
        speech: completeMsg.speechText,
        dictatorMessage: completeMsg,
    };
}

/**
 * TOKEN-BASED PROGRESSIVE VALIDATOR:
 * Compares the student's token stream against the expected token sequence across Java, Python, C, and C++.
 */
export function validateStudentCode(
    studentCode: string,
    units: DictatorTeachingUnit[],
    currentUnitIndex: number,
    language: string = "java",
    project: string = "array"
): DictatorValidationResult {
    if (!units || units.length === 0) {
        const emptyMsg = createDictatorMessage({
            instruction: "Program complete.",
            explanation: "All steps completed.",
            expectedToken: "",
            stepNumber: 0,
            totalSteps: 0,
            isComplete: true,
            speechText: "Program plan complete.",
        });
        return {
            correct: true,
            status: "completed",
            currentUnitIndex: 0,
            completed: true,
            expectedToken: "",
            message: "🎉 Program plan complete.",
            speech: emptyMsg.speechText,
            dictatorMessage: emptyMsg,
        };
    }

    const safeIndex = Math.min(Math.max(0, currentUnitIndex), units.length - 1);
    const targetUnit = units[safeIndex];
    const normCode = normalizeCode(studentCode);
    const lines = studentCode.split("\n");

    // =========================================================
    // LAYER A: FULL PROGRAM INTEGRITY & PREVIOUS LINE CHECKS
    // =========================================================
    if (normCode) {
        const fullCheck = validateFullProgramIntegrity(studentCode, units, safeIndex, language);
        if (!fullCheck.valid && fullCheck.result) {
            const res = fullCheck.result;
            const errMsg = createDictatorMessage({
                instruction: `Fix the error on Line ${res.line || 1} before continuing.`,
                explanation: res.message,
                expectedToken: res.expectedToken || "",
                progress: `Error detected on Line ${res.line || 1}`,
                stepNumber: safeIndex + 1,
                totalSteps: units.length,
                isComplete: false,
                error: res.message,
                lineNumber: res.line || 1,
                speechText: res.speech || `Error detected on line ${res.line || 1}.`,
            });
            res.dictatorMessage = errMsg;
            return res;
        }
    } else {
        const initialMsg = createInitialDictatorMessage(targetUnit, safeIndex, units.length);
        return {
            correct: false,
            status: "typing",
            currentUnitIndex: safeIndex,
            completed: false,
            expectedToken: targetUnit.expectedToken,
            message: `👉 Step ${safeIndex + 1}: ${targetUnit.title}\n\n${targetUnit.instruction}`,
            speech: initialMsg.speechText,
            dictatorMessage: initialMsg,
            unit: targetUnit,
        };
    }

    // =========================================================
    // LAYER B: TOKEN-BASED PROGRESSION & SEQUENCE VALIDATION
    // =========================================================
    const studentTokens = lexCode(studentCode);
    const expectedTokens = lexCode(targetUnit.fullAccumulatedCode);

    // 1. Compare token-by-token
    for (let i = 0; i < studentTokens.length; i++) {
        const sTok = studentTokens[i];

        // Extra token beyond the expected sequence for this unit
        if (i >= expectedTokens.length) {
            // Check if student has already completed subsequent units
            for (let uIdx = safeIndex + 1; uIdx < units.length; uIdx++) {
                const nextUnitTokens = lexCode(units[uIdx].fullAccumulatedCode);
                if (studentTokens.length <= nextUnitTokens.length) {
                    let matchesNext = true;
                    for (let k = 0; k < studentTokens.length; k++) {
                        if (studentTokens[k].value !== nextUnitTokens[k].value) {
                            matchesNext = false;
                            break;
                        }
                    }
                    if (matchesNext) {
                        // Student is ahead, safely advance to that unit
                        return validateStudentCode(studentCode, units, uIdx, language, project);
                    }
                }
            }

            const lineContent = lines[sTok.line - 1] || sTok.value;
            const whyText = `'${sTok.value}' is an unexpected token at this position.`;
            const formatted = formatDictatorError({
                line: sTok.line,
                col: sTok.col,
                yourCode: lineContent,
                why: whyText,
                correctCode: targetUnit.fullAccumulatedCode,
            });

            const errMsg = createDictatorMessage({
                instruction: `Fix the unexpected token '${sTok.value}' on Line ${sTok.line}, Column ${sTok.col}.`,
                explanation: whyText,
                expectedToken: targetUnit.expectedToken,
                correction: targetUnit.fullAccumulatedCode,
                progress: `Unexpected: ${sTok.value}`,
                stepNumber: safeIndex + 1,
                totalSteps: units.length,
                isComplete: false,
                error: formatted,
                lineNumber: sTok.line,
                columnNumber: sTok.col,
                speechText: `Stop. ${sTok.value} is not expected here.`,
            });

            return {
                correct: false,
                status: "error",
                currentUnitIndex: safeIndex,
                completed: false,
                typedToken: sTok.value,
                expectedToken: targetUnit.expectedToken,
                line: sTok.line,
                col: sTok.col,
                errorType: "unexpected_token",
                message: formatted,
                speech: errMsg.speechText,
                dictatorMessage: errMsg,
                unit: targetUnit,
            };
        }

        const expTok = expectedTokens[i];

        if (sTok.value !== expTok.value) {
            const isLastStudentToken = i === studentTokens.length - 1;
            const sLower = sTok.value.toLowerCase();
            const expLower = expTok.value.toLowerCase();
            const lineContent = lines[sTok.line - 1] || sTok.value;

            // Incomplete keyword or identifier prefix (e.g. 'pub' vs 'public', 'def' vs 'def main')
            if (isLastStudentToken && expLower.startsWith(sLower) && sTok.value.length < expTok.value.length) {
                const explanation = generateTypoExplanation(sTok.value, expTok.value, language);
                const formatted = formatDictatorError({
                    line: sTok.line,
                    col: sTok.col,
                    yourCode: lineContent,
                    why: explanation.reason,
                    correctCode: lineContent.replace(sTok.value, expTok.value),
                });

                const errMsg = createDictatorMessage({
                    instruction: `Complete the keyword '${expTok.value}'.`,
                    explanation: explanation.reason,
                    expectedToken: expTok.value,
                    correction: lineContent.replace(sTok.value, expTok.value),
                    progress: `Typing: ${sTok.value}`,
                    stepNumber: safeIndex + 1,
                    totalSteps: units.length,
                    isComplete: false,
                    error: formatted,
                    lineNumber: sTok.line,
                    columnNumber: sTok.col,
                    speechText: `You're close. The keyword is ${expTok.value}.`,
                });

                return {
                    correct: false,
                    status: "error",
                    currentUnitIndex: safeIndex,
                    completed: false,
                    typedToken: sTok.value,
                    expectedToken: expTok.value,
                    line: sTok.line,
                    col: sTok.col,
                    errorType: "typo",
                    message: formatted,
                    speech: errMsg.speechText,
                    dictatorMessage: errMsg,
                    unit: targetUnit,
                };
            }

            // Method / Keyword typos
            const explanation = generateTypoExplanation(sTok.value, expTok.value, language);
            const formatted = formatDictatorError({
                line: sTok.line,
                col: sTok.col,
                yourCode: lineContent,
                why: explanation.reason,
                correctCode: lineContent.replace(sTok.value, expTok.value),
            });

            const errMsg = createDictatorMessage({
                instruction: `Fix typo '${sTok.value}' on Line ${sTok.line}, Column ${sTok.col}.`,
                explanation: explanation.reason,
                expectedToken: expTok.value,
                correction: lineContent.replace(sTok.value, expTok.value),
                progress: `Typo: ${sTok.value}`,
                stepNumber: safeIndex + 1,
                totalSteps: units.length,
                isComplete: false,
                error: formatted,
                lineNumber: sTok.line,
                columnNumber: sTok.col,
                speechText: `Stop. ${explanation.reason}`,
            });

            return {
                correct: false,
                status: "error",
                currentUnitIndex: safeIndex,
                completed: false,
                typedToken: sTok.value,
                expectedToken: expTok.value,
                line: sTok.line,
                col: sTok.col,
                errorType: "typo",
                message: formatted,
                speech: errMsg.speechText,
                dictatorMessage: errMsg,
                unit: targetUnit,
            };
        }
    }

    // 2. If student has completed all tokens for this unit
    if (studentTokens.length >= expectedTokens.length) {
        // Is this the final step?
        if (safeIndex === units.length - 1) {
            const finalCheck = validateCompleteProgram(studentCode, units, language, project);
            if (finalCheck.valid) {
                const completeMsg = finalCheck.dictatorMessage || createDictatorMessage({
                    instruction: "The program is completed. Now run the code.",
                    explanation: "🎉 Excellent Work! Program Complete!\n\nThe complete program has been written and verified.\n\nThe program is completed. Now run the code.",
                    expectedToken: "",
                    progress: "🎉 Program Complete!",
                    stepNumber: units.length,
                    totalSteps: units.length,
                    isComplete: true,
                    speechText: "The program is completed. Now run the code.",
                });
                return {
                    correct: true,
                    status: "completed",
                    currentUnitIndex: units.length - 1,
                    completed: true,
                    expectedToken: targetUnit.expectedToken,
                    message: completeMsg.explanation,
                    speech: completeMsg.speechText,
                    dictatorMessage: completeMsg,
                    unit: units[units.length - 1],
                };
            } else {
                const errFinalMsg = createDictatorMessage({
                    instruction: "Complete the remaining program requirements.",
                    explanation: finalCheck.message,
                    expectedToken: targetUnit.expectedToken,
                    progress: "Verification incomplete",
                    stepNumber: units.length,
                    totalSteps: units.length,
                    isComplete: false,
                    error: finalCheck.message,
                    speechText: finalCheck.speech || "The program requirements are incomplete.",
                });
                return {
                    correct: false,
                    status: "error",
                    currentUnitIndex: units.length - 1,
                    completed: false,
                    expectedToken: targetUnit.expectedToken,
                    message: finalCheck.message,
                    speech: errFinalMsg.speechText,
                    dictatorMessage: errFinalMsg,
                    unit: units[units.length - 1],
                };
            }
        }

        // Advance to next unit
        const nextIdx = safeIndex + 1;
        const nextUnit = units[nextIdx];
        const advanceMsg = createDictatorMessage({
            instruction: `Now let's move to Step ${nextIdx + 1}: ${nextUnit.title}.\n\n${nextUnit.instruction}`,
            explanation: `Good. You completed '${targetUnit.title}'.\n\nNow let's move to Step ${nextIdx + 1}: ${nextUnit.title}.\n\n${nextUnit.explanation || nextUnit.instruction}`,
            expectedToken: nextUnit.expectedToken,
            hint: nextUnit.hint,
            progress: `✓ Correct: ${targetUnit.title}`,
            stepNumber: nextIdx + 1,
            totalSteps: units.length,
            isComplete: false,
            speechText: `Good! Now let's move to ${nextUnit.title}.`,
        });

        return {
            correct: true,
            status: "correct",
            currentUnitIndex: nextIdx,
            nextUnitIndex: nextIdx,
            completed: false,
            expectedToken: nextUnit.expectedToken,
            message: advanceMsg.explanation,
            speech: advanceMsg.speechText,
            dictatorMessage: advanceMsg,
            unit: nextUnit,
        };
    }

    // 3. Student is currently typing through this step progressively
    const nextExpectedToken = expectedTokens[studentTokens.length]?.value || targetUnit.expectedToken;
    const completedTokensText = studentTokens.map((t: CodeToken) => t.value).join(" ");
    const lastToken = studentTokens[studentTokens.length - 1]?.value || "";

    let instruction = `Now type '${nextExpectedToken}'.`;
    let explanation = `Good. '${completedTokensText}' is correct.\n\nNow type '${nextExpectedToken}'.\n\n${targetUnit.explanation || ""}`.trim();
    let speechText = `Good. ${lastToken} is correct. Now type ${nextExpectedToken}.`;
    let progress = `✓ Correct: ${completedTokensText}`;

    if (studentTokens.length === 0) {
        progress = `Step ${safeIndex + 1}: ${targetUnit.title}`;
        instruction = targetUnit.instruction;
        explanation = targetUnit.explanation || targetUnit.instruction;
        speechText = targetUnit.speech || `${targetUnit.title}. ${targetUnit.instruction}`;
    }

    const typingMsg = createDictatorMessage({
        instruction,
        explanation,
        expectedToken: nextExpectedToken,
        hint: targetUnit.hint,
        progress,
        stepNumber: safeIndex + 1,
        totalSteps: units.length,
        isComplete: false,
        speechText,
    });

    return {
        correct: false,
        status: "typing",
        currentUnitIndex: safeIndex,
        completed: false,
        expectedToken: nextExpectedToken,
        message: typingMsg.explanation,
        speech: typingMsg.speechText,
        dictatorMessage: typingMsg,
        unit: targetUnit,
    };
}

/**
 * Legacy adapter
 */
export function checkDictatorStep(
    code: string,
    step: number,
    project: string,
    language: string = "java",
    activePlan?: any[]
) {
    const units = generateTeachingUnits(project, language);
    const unitIndex = Math.min(step - 1, units.length - 1);
    const res = validateStudentCode(code, units, unitIndex, language, project);

    return {
        correct: res.correct,
        completed: res.completed,
        nextStep: (res.nextUnitIndex ?? unitIndex) + 1,
        message: res.message,
        speech: res.speech,
    };
}
