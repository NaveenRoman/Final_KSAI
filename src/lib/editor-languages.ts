/**
 * Shared Editor Languages configuration.
 * Decouples server-side accessible-languages route from frontend component paths.
 */
export {
  LANGUAGES,
  LANGUAGE_MAP,
  getLanguageConfig,
} from "@/components/editor/languages/LanguageConfig";

export type { LanguageConfig } from "@/components/editor/languages/LanguageConfig";
