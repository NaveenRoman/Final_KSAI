/**
 * Shared Code Validator module.
 * Decouples server-side execution and analysis routes from frontend component paths.
 */
export {
  validateCodeBeforeRun,
  validateFileExtension,
  normalizeLanguage,
  getLanguageRules,
  getLanguageDisplayName,
  levenshteinDistance,
} from "@/components/editor/runner/CodeValidator";

export type {
  CodeDiagnostic,
  CodeValidationResult,
  InScopeSymbols,
  LanguageRuleSet,
} from "@/components/editor/runner/CodeValidator";
