/**
 * Common interfaces and types for language-specific validation rules.
 */

export interface CodeDiagnostic {
    file: string;
    line: number;
    column: number;
    severity: "error" | "warning";
    type: string;
    message: string;
    explanation?: string;
    correction?: string;
    code?: string;
}

export interface CodeValidationResult {
    valid: boolean;
    errorTitle?: string;
    errorMessage: string;
    details?: string;
    line?: number;
    col?: number;
    diagnostics?: CodeDiagnostic[];
}

export interface InScopeSymbols {
    variables: Set<string>;
    types: Set<string>;
    functions: Set<string>;
}

export interface LanguageRuleSet {
    name: "java" | "python" | "c" | "cpp" | "javascript" | "typescript";
    displayName: string;
    defaultFileName: string;
    validExtensions: string[];
    reservedKeywords: Set<string>;
    standardTypes: Set<string>;
    builtInFunctions: Set<string>;
    standardLibrarySymbols: Set<string>;

    /**
     * Extracts declared variables, classes/types, and functions/methods from code lines
     */
    extractDeclarations: (lines: string[]) => InScopeSymbols;

    /**
     * Checks if a line requires statement termination (e.g. semicolon in C/C++/Java, colon in Python)
     */
    checkStatementTermination?: (
        line: string,
        allLines: string[],
        lineIndex: number,
        defaultFile: string
    ) => CodeDiagnostic | null;

    /**
     * Performs language-specific type/function/identifier typo analysis
     */
    checkLanguageSpecificDiagnostics?: (
        lines: string[],
        symbols: InScopeSymbols,
        defaultFile: string
    ) => CodeDiagnostic[];

    /**
     * Checks for cross-language mismatch code
     */
    checkLanguageMismatch?: (
        line: string,
        lineIndex: number,
        defaultFile: string
    ) => CodeDiagnostic | null;
}
