/**
 * Shared Dictator Tokenizer module.
 * Decouples server-side autocode route from frontend component paths.
 */
export {
  synthesizeUniversalProgram,
  normalizeToken,
} from "@/components/editor/dictator/DictatorTokenizer";

export type {
  DictatorTeachingUnit,
  CurriculumTask,
} from "@/components/editor/dictator/DictatorTokenizer";
