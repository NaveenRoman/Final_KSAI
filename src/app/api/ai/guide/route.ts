import { NextRequest, NextResponse } from "next/server";
import { validateCodeBeforeRun } from "@/components/editor/runner/CodeValidator";

interface RuntimeExceptionInfo {
    type: string;
    message: string;
    line?: number;
    explanation: string;
    suggestedFix: string;
}

function detectRuntimeException(output: string, language: string): RuntimeExceptionInfo | null {
    if (!output || typeof output !== "string") return null;
    const trimmed = output.trim();
    if (!trimmed) return null;

    const normLang = language.toLowerCase();

    // 1. Java Exception detection
    if (normLang.includes("java")) {
        const javaMatch = trimmed.match(/Exception in thread "([^"]+)"\s+([a-zA-Z0-9_$.]+(?:Exception|Error))(?::\s*([^\n\r]+))?/i);
        const lineMatch = trimmed.match(/at\s+[A-Za-z0-9_$.]+\([A-Za-z0-9_$.]+:(\d+)\)/);
        if (javaMatch) {
            const excType = javaMatch[2].replace(/^java\.lang\./, "");
            const excMsg = (javaMatch[3] || "").trim();
            const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;
            return {
                type: excType,
                message: excMsg || excType,
                line,
                explanation: getJavaRuntimeExplanation(excType),
                suggestedFix: getJavaRuntimeFix(excType),
            };
        }
    }

    // 2. Python Exception detection
    if (normLang.includes("py")) {
        const pyMatch = trimmed.match(/Traceback\s*\(most recent call last\):[\s\S]*?([A-Za-z0-9_]+Error|[A-Za-z0-9_]+Exception):\s*([^\n\r]+)/);
        const pyLineMatch = trimmed.match(/File\s+"[^"]+",\s+line\s+(\d+)/);
        if (pyMatch) {
            const excType = pyMatch[1];
            const excMsg = pyMatch[2].trim();
            const line = pyLineMatch ? parseInt(pyLineMatch[1], 10) : undefined;
            return {
                type: excType,
                message: excMsg,
                line,
                explanation: getPythonRuntimeExplanation(excType),
                suggestedFix: getPythonRuntimeFix(excType),
            };
        }
    }

    // 3. C / C++ Crash detection
    if (normLang.includes("c") || normLang.includes("cpp")) {
        if (/segmentation fault|sigsegv/i.test(trimmed)) {
            return {
                type: "Segmentation Fault (SIGSEGV)",
                message: "Program attempted to access illegal memory.",
                explanation: "A segmentation fault occurs when your program attempts to read or write memory it does not own, such as dereferencing a NULL pointer, accessing an array out of bounds, or using unallocated memory.",
                suggestedFix: "Check pointer initializations, ensure array indices are within bounds (0 to size-1), and verify dynamically allocated memory before accessing.",
            };
        }
        if (/floating point exception|sigfpe/i.test(trimmed)) {
            return {
                type: "Floating Point Exception (SIGFPE)",
                message: "Illegal arithmetic operation, typically integer division by zero.",
                explanation: "Your program performed an invalid mathematical operation, most commonly dividing an integer by zero or calculating modulo zero.",
                suggestedFix: "Check divisors before performing division (`/`) or modulo (`%`) operations to ensure the denominator is not zero.",
            };
        }
        const cppThrowMatch = trimmed.match(/terminate called after throwing an instance of '([^']+)'(?:[\s\S]*?what\(\):\s*([^\n\r]+))?/);
        if (cppThrowMatch) {
            return {
                type: cppThrowMatch[1],
                message: cppThrowMatch[2] || "Unhandled C++ exception",
                explanation: `An unhandled C++ exception of type \`${cppThrowMatch[1]}\` terminated the program.`,
                suggestedFix: "Wrap the throwing operation in a `try { ... } catch (...)` block or validate the parameters before invoking the operation.",
            };
        }
    }

    return null;
}

function getJavaRuntimeExplanation(type: string): string {
    switch (type) {
        case "ArithmeticException":
            return "Occurs when an exceptional arithmetic condition occurs, such as dividing an integer by zero (`x / 0`).";
        case "NullPointerException":
            return "Occurs when your code attempts to access a field or method on a variable that currently refers to `null`.";
        case "ArrayIndexOutOfBoundsException":
        case "IndexOutOfBoundsException":
            return "Occurs when your code attempts to access an array or collection index that is negative, or greater than or equal to its size.";
        case "NumberFormatException":
            return "Occurs when parsing a string into a numeric value (e.g., `Integer.parseInt`) and the string contains non-numeric characters.";
        case "StackOverflowError":
            return "Occurs when recursive function calls continue without a terminating base case, exhausting call stack memory.";
        default:
            return `A runtime exception of type \`${type}\` was thrown during execution.`;
    }
}

function getJavaRuntimeFix(type: string): string {
    switch (type) {
        case "ArithmeticException":
            return "Add a guard check before division: `if (divisor != 0) { ... } else { System.out.println(\"Cannot divide by zero\"); }`";
        case "NullPointerException":
            return "Ensure objects are properly initialized before use, or add a null check: `if (obj != null) { ... }`";
        case "ArrayIndexOutOfBoundsException":
        case "IndexOutOfBoundsException":
            return "Verify that index `i` satisfies `0 <= i && i < array.length` before indexing into the array.";
        case "NumberFormatException":
            return "Validate the input string format or wrap parsing in a `try { Integer.parseInt(str); } catch (NumberFormatException e) { ... }` block.";
        case "StackOverflowError":
            return "Check your recursion base cases to ensure recursive calls always make progress toward terminating.";
        default:
            return "Review the stack trace line number, inspect variables at that location, and validate preconditions before execution.";
    }
}

function getPythonRuntimeExplanation(type: string): string {
    switch (type) {
        case "ZeroDivisionError":
            return "Occurs when dividing a number by zero or performing a modulo operation with zero as the divisor.";
        case "IndexError":
            return "Occurs when attempting to access a list or sequence index that is outside its valid range.";
        case "KeyError":
            return "Occurs when attempting to look up a key that does not exist in a dictionary.";
        case "TypeError":
            return "Occurs when an operation or function is applied to an object of inappropriate type (e.g., adding a string to an integer).";
        case "ValueError":
            return "Occurs when a function receives an argument that has the right type but an inappropriate value (e.g., `int('abc')`).";
        case "AttributeError":
            return "Occurs when attempting to access an attribute or method that does not exist on that object, often when an object is `None`.";
        case "RecursionError":
            return "Occurs when maximum recursion depth is exceeded due to infinite recursion.";
        default:
            return `A runtime error of type \`${type}\` halted script execution.`;
    }
}

function getPythonRuntimeFix(type: string): string {
    switch (type) {
        case "ZeroDivisionError":
            return "Add a condition: `if divisor != 0: result = x / divisor else: print('Cannot divide by zero')`";
        case "IndexError":
            return "Verify the list length before indexing: `if 0 <= index < len(items): item = items[index]`";
        case "KeyError":
            return "Use `.get(key, default)` or verify membership with `if key in my_dict:` before indexing.";
        case "TypeError":
            return "Convert types explicitly (e.g., `int(x)`, `str(x)`) or verify object types using `isinstance()`.";
        case "ValueError":
            return "Validate user input before type conversion, or wrap with `try: ... except ValueError: ...`.";
        case "AttributeError":
            return "Ensure the object is not `None` before calling methods: `if obj is not None: obj.method()`";
        case "RecursionError":
            return "Ensure your recursive function includes a clear terminating base case.";
        default:
            return "Inspect the line identified in the traceback and verify variable values and types before execution.";
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { language = "java", code = "", errors = [], output = "", fileName = "", learningLevel = "beginner" } = body;

        // Ensure errors list is populated
        let errorList = Array.isArray(errors) ? errors : [];
        if (errorList.length === 0 && code.trim()) {
            const val = validateCodeBeforeRun({
                language,
                fileName,
                code,
            });
            if (val.diagnostics && val.diagnostics.length > 0) {
                errorList = val.diagnostics;
            }
        }

        const apiKey = process.env.GEMINI_API_KEY;

        // =========================================================
        // TIER 1: Direct Google Gemini 3.6 Flash AI Guide (REST)
        // =========================================================
        if (apiKey) {
            try {
                const errorDescriptions = errorList.length > 0
                    ? errorList.map((e: Record<string, unknown>, idx: number) =>
                        `Error ${idx + 1}: Line ${e.line}, Column ${e.column || 1} -> Type: ${e.type || 'Error'}, Message: ${e.message}, Fix: ${e.correction || ''}`
                    ).join("\n")
                    : "No compiler errors reported.";

                const prompt = `You are Codenthra AI Guide, an expert programming mentor and debugger.
The student is writing in ${language.toUpperCase()}.
Learning Level: ${learningLevel.toUpperCase()}

Active File: ${fileName || 'Source Code'}
Current Code:
\`\`\`${language}
${code}
\`\`\`

Detected Errors & Diagnostics (${errorList.length} total):
${errorDescriptions}

Program Output:
${output || 'None'}

INSTRUCTIONS:
1. If compiler errors exist (${errorList.length} problems found), systematically explain ALL ${errorList.length} errors one by one in order. DO NOT skip any errors.
2. For EVERY error provide:
   - Location (Line number)
   - What went wrong
   - Why it is invalid according to ${language} language rules
   - Exact corrected code snippet
3. If 0 compiler errors exist but a runtime error/exception or crash is present in the Program Output, explain the runtime crash, identify the line, explain why it occurred, and provide the fix.
4. Keep the tone encouraging, clear, and tailored to ${learningLevel} level.
5. If 0 errors and no runtime crashes exist, congratulate the student and suggest a next optimization or feature to add.`;

                const models = [
                    "gemini-3.6-flash",
                    "gemini-2.5-flash",
                    "gemini-3.5-flash",
                    "gemini-3.7-flash",
                    "gemini-3.1-flash-lite",
                    "gemini-flash-latest",
                ];

                for (const model of models) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 8000);

                        const geminiRes = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                            {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                signal: controller.signal,
                                body: JSON.stringify({
                                    contents: [{ parts: [{ text: prompt }] }],
                                }),
                            }
                        );
                        clearTimeout(timeoutId);

                        if (geminiRes.ok) {
                            const data = await geminiRes.json();
                            const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                            if (answer && answer.trim()) {
                                return NextResponse.json({
                                    success: true,
                                    response: answer,
                                    data: {
                                        intent: "guide",
                                        response: answer,
                                        guide: {
                                            explanation: answer,
                                            errorCount: errorList.length,
                                        },
                                    },
                                });
                            }
                        }
                    } catch {
                        // try next model
                    }
                }
            } catch (geminiError) {
                console.warn("Direct Gemini AI Guide failed, falling back to secondary providers:", geminiError);
            }
        }

        // =========================================================
        // TIER 2: Proxy to Django Backend
        // =========================================================
        try {
            const djangoGuideUrl =
                process.env.DJANGO_GUIDE_URL ||
                (process.env.DJANGO_TEACH_URL
                    ? process.env.DJANGO_TEACH_URL.replace(/\/ai\/teach\/?$/, "/ai/guide/")
                    : "http://127.0.0.1:8000/api/ai/guide/");

            const backendHeaders: Record<string, string> = { "Content-Type": "application/json" };
            if (process.env.INTERNAL_API_SECRET) {
                backendHeaders["X-Internal-Secret"] = process.env.INTERNAL_API_SECRET;
            }

            const djangoRes = await fetch(djangoGuideUrl, {
                method: "POST",
                headers: backendHeaders,
                body: JSON.stringify({
                    language,
                    code,
                    errors: errorList,
                    output,
                    file_name: fileName,
                    learning_level: learningLevel,
                }),
            });

            if (djangoRes.ok) {
                const data = await djangoRes.json();
                if (data.success && (data.response || data.data?.response || data.data?.guide?.explanation)) {
                    return NextResponse.json(data);
                }
            }
        } catch (djangoErr) {
            console.warn("Django AI Guide backend unreachable, using contextual multi-error guide engine:", djangoErr);
        }

        // =========================================================
        // TIER 3: Intelligent Contextual Multi-Error & Crash Guide Generator
        // =========================================================
        let guideExplanation = "";
        const runtimeCrash = detectRuntimeException(output, language);

        if (errorList.length === 0 && !runtimeCrash) {
            guideExplanation = `✅ **No errors detected!**\n\nYour ${language} code compiles cleanly with no syntax or runtime errors. Click **Run** in the bottom dock to execute your program.`;
        } else if (runtimeCrash && errorList.length === 0) {
            guideExplanation = `⚡ **Runtime Crash Detected:**\nYour code compiled successfully, but crashed during execution with a runtime error:\n\n` +
                `### ⚠️ ${runtimeCrash.type}${runtimeCrash.line ? ` (near Line ${runtimeCrash.line})` : ""}\n` +
                `• **What happened:** ${runtimeCrash.message}\n` +
                `• **Why this happened:** ${runtimeCrash.explanation}\n` +
                `• **How to fix:**\n${runtimeCrash.suggestedFix}\n\n` +
                `💡 **Next Step:** Update your code with the correction above and run your program again!`;
        } else {
            const count = errorList.length;
            guideExplanation = `🔍 **I found ${count} ${count === 1 ? "problem" : "problems"} in your ${language} code:**\n\n` +
                errorList.map((err: Record<string, unknown>, idx: number) => {
                    const lineNum = err.line || 1;
                    const msg = err.message || "Syntax error";
                    const exp = err.explanation || "";
                    const fix = err.correction || "";

                    let block = `### ${idx + 1}. Line ${lineNum} — ${msg}\n`;
                    if (exp) {
                        block += `• **Why this happened:** ${exp}\n`;
                    }
                    if (fix) {
                        block += `• **How to fix:**\n\`\`\`${language}\n${fix}\n\`\`\`\n`;
                    }
                    return block;
                }).join("\n") +
                (runtimeCrash
                    ? `\n\n⚡ **Also observed runtime crash:**\n${runtimeCrash.type}: ${runtimeCrash.message}\n${runtimeCrash.suggestedFix}\n`
                    : "") +
                `\n💡 **Next Step:** Update the lines above with the suggested corrections and test your code again!`;
        }

        return NextResponse.json({
            success: true,
            response: guideExplanation,
            data: {
                intent: "guide",
                response: guideExplanation,
                guide: {
                    explanation: guideExplanation,
                    errorCount: errorList.length,
                    hasRuntimeCrash: Boolean(runtimeCrash),
                },
            },
        });
    } catch (error: unknown) {
        console.error("AI Guide Top-Level Error:", error);
        const errMsg = error instanceof Error ? error.message : "Failed to process AI Guide request.";
        return NextResponse.json(
            {
                success: false,
                message: errMsg,
            },
            { status: 500 }
        );
    }
}
