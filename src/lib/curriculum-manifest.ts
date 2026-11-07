/**
 * KnowledgeStream AI — Complete Curriculum Source Coverage Manifest
 *
 * Authoritative module for decomposing curriculum chapters into granular,
 * identifiable source elements (headings, paragraphs, lists, table rows,
 * code blocks, outputs, diagrams, callouts, and exercises).
 *
 * Provides stable item IDs and algorithmic coverage auditing to ensure
 * Codenthra never skips any meaningful teaching material.
 */

import markdownBundle from "./course-markdown-bundle.json";

export type SourceItemType =
  | "HEADING"
  | "SUBHEADING"
  | "PARAGRAPH"
  | "LIST_ITEM"
  | "TABLE_ROW"
  | "DIAGRAM"
  | "CODE_BLOCK"
  | "CODE_OUTPUT"
  | "CALLOUT"
  | "EXERCISE"
  | "SUMMARY";

export interface SourceItem {
  id: string;
  course: string;
  chapterOrder: number;
  sectionTitle: string;
  type: SourceItemType;
  title: string;
  rawContent: string;
  normalizedContent: string;
  lineNumber: number;
  orderIndex: number;
}

export interface ChapterManifest {
  course: string;
  chapterOrder: number;
  totalItems: number;
  items: SourceItem[];
  breakdown: Record<SourceItemType, number>;
  sections: string[];
}

export interface CoverageAuditResult {
  course: string;
  chapterOrder: number;
  sectionTitle: string;
  totalSourceItems: number;
  coveredItems: number;
  omittedItems: number;
  coveragePercentage: number;
  uncoveredItemDetails: Array<{
    id: string;
    type: SourceItemType;
    title: string;
    snippet: string;
  }>;
}

/**
 * Normalizes text for robust semantic matching by removing extra whitespace,
 * punctuation, and markdown formatting.
 */
export function normalizeTextForAudit(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[*_`#~|>\-\+]/g, " ")
    .replace(/\[![\w]+\]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Parses raw chapter Markdown into a comprehensive manifest of traceable items.
 */
export function parseChapterManifest(
  course: string,
  chapterOrder: number,
  markdown: string
): ChapterManifest {
  const lines = markdown.split(/\r?\n/g);
  const items: SourceItem[] = [];
  const sectionsSet = new Set<string>();

  let currentSection = "Introduction";
  let orderIndex = 0;

  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  let inTable = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    // 1. Code block handling
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        const codeText = codeBlockLines.join("\n");
        const isMermaid =
          /^(mermaid|graph)/i.test(codeBlockLang) ||
          codeText.includes("graph TD") ||
          codeText.includes("flowchart");
        const isOutput =
          /^(text|output|bash|console)/i.test(codeBlockLang) &&
          (codeText.includes("Output") ||
            codeText.includes("Welcome") ||
            codeText.includes("Result") ||
            !codeText.includes(";"));

        const itemType: SourceItemType = isMermaid
          ? "DIAGRAM"
          : isOutput
          ? "CODE_OUTPUT"
          : "CODE_BLOCK";

        items.push({
          id: `${course.toLowerCase()}_ch${chapterOrder}_item_${++orderIndex}`,
          course,
          chapterOrder,
          sectionTitle: currentSection,
          type: itemType,
          title: isMermaid
            ? "Architecture Diagram"
            : isOutput
            ? "Expected Output"
            : `Code Example (${codeBlockLang || "code"})`,
          rawContent: codeText,
          normalizedContent: codeText.replace(/\s+/g, " ").trim(),
          lineNumber: i + 1,
          orderIndex,
        });

        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockLines = [];
      } else {
        inCodeBlock = true;
        codeBlockLang = line.slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(rawLine);
      continue;
    }

    // Skip empty lines outside code blocks
    if (!line) continue;

    // 2. Headings & Subheadings
    if (line.startsWith("#")) {
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const headingText = headingMatch[2].trim();

        if (level === 1) {
          // Chapter Title — high-level container
          continue;
        } else if (level === 2 || level === 3 || (level === 5 && /^\d+\.\d+/.test(headingText))) {
          currentSection = headingText;
          sectionsSet.add(currentSection);

          const isExercise = /exercise|practice|challenge/i.test(headingText);
          const isSummary = /summary|conclusion|takeaway|recap/i.test(headingText);

          items.push({
            id: `${course.toLowerCase()}_ch${chapterOrder}_item_${++orderIndex}`,
            course,
            chapterOrder,
            sectionTitle: currentSection,
            type: isExercise ? "EXERCISE" : isSummary ? "SUMMARY" : "HEADING",
            title: `Section: ${headingText}`,
            rawContent: line,
            normalizedContent: headingText,
            lineNumber: i + 1,
            orderIndex,
          });
        } else {
          // Level 4, 5, 6 — Subheading
          items.push({
            id: `${course.toLowerCase()}_ch${chapterOrder}_item_${++orderIndex}`,
            course,
            chapterOrder,
            sectionTitle: currentSection,
            type: "SUBHEADING",
            title: `Subheading: ${headingText}`,
            rawContent: line,
            normalizedContent: headingText,
            lineNumber: i + 1,
            orderIndex,
          });
        }
        continue;
      }
    }

    // 3. Callout Notes & Tips (> [!NOTE], > [!TIP], > ...)
    if (line.startsWith(">")) {
      const calloutText = line.replace(/^>\s*(\[![\w]+\])?\s*/, "").trim();
      if (calloutText.length > 5) {
        items.push({
          id: `${course.toLowerCase()}_ch${chapterOrder}_item_${++orderIndex}`,
          course,
          chapterOrder,
          sectionTitle: currentSection,
          type: "CALLOUT",
          title: "Insight Note / Callout",
          rawContent: line,
          normalizedContent: calloutText,
          lineNumber: i + 1,
          orderIndex,
        });
      }
      continue;
    }

    // 4. Tables (Data rows)
    if (line.startsWith("|") && line.endsWith("|")) {
      // Table separator row (|---|---|)
      if (/^\|[\s\-:]+(\|[\s\-:]+)+\|$/.test(line)) {
        continue;
      }

      const cells = line
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());

      if (!inTable) {
        inTable = true;
        // Table header is structural
        continue;
      } else {
        const rowLabel = cells[0].replace(/\*\*/g, "").trim();
        const rowDesc = cells.slice(1).join(" — ").replace(/\*\*/g, "").trim();
        items.push({
          id: `${course.toLowerCase()}_ch${chapterOrder}_item_${++orderIndex}`,
          course,
          chapterOrder,
          sectionTitle: currentSection,
          type: "TABLE_ROW",
          title: `Table Row: ${rowLabel}`,
          rawContent: line,
          normalizedContent: `${rowLabel}: ${rowDesc}`,
          lineNumber: i + 1,
          orderIndex,
        });
      }
      continue;
    } else {
      inTable = false;
    }

    // 5. Numbered or Bullet list items
    const listMatch = line.match(/^(\d+\.|\*|-|•)\s+(.+)$/);
    if (listMatch) {
      const itemBody = listMatch[2].trim();
      const boldTitleMatch = itemBody.match(/^\*\*([^*]+)\*\*[:\-]?\s*(.*)$/);
      const title = boldTitleMatch ? boldTitleMatch[1].trim() : itemBody.slice(0, 40);

      items.push({
        id: `${course.toLowerCase()}_ch${chapterOrder}_item_${++orderIndex}`,
        course,
        chapterOrder,
        sectionTitle: currentSection,
        type: "LIST_ITEM",
        title: `Item: ${title}`,
        rawContent: line,
        normalizedContent: itemBody.replace(/\*\*/g, ""),
        lineNumber: i + 1,
        orderIndex,
      });
      continue;
    }

    // 6. Substantive Paragraphs
    if (line.length > 25 && !line.startsWith("---") && !line.startsWith("===")) {
      items.push({
        id: `${course.toLowerCase()}_ch${chapterOrder}_item_${++orderIndex}`,
        course,
        chapterOrder,
        sectionTitle: currentSection,
        type: "PARAGRAPH",
        title: `Paragraph: ${line.slice(0, 45)}...`,
        rawContent: line,
        normalizedContent: line,
        lineNumber: i + 1,
        orderIndex,
      });
    }
  }

  const breakdown: Record<SourceItemType, number> = {
    HEADING: 0,
    SUBHEADING: 0,
    PARAGRAPH: 0,
    LIST_ITEM: 0,
    TABLE_ROW: 0,
    DIAGRAM: 0,
    CODE_BLOCK: 0,
    CODE_OUTPUT: 0,
    CALLOUT: 0,
    EXERCISE: 0,
    SUMMARY: 0,
  };

  for (const it of items) {
    breakdown[it.type] = (breakdown[it.type] || 0) + 1;
  }

  return {
    course,
    chapterOrder,
    totalItems: items.length,
    items,
    breakdown,
    sections: Array.from(sectionsSet),
  };
}

/**
 * Audits an AI-generated or fallback explanation against the manifest items of a section.
 * Verifies that key entities, terminology, and concept definitions were actually taught.
 */
export function auditExplanationCoverage(
  manifest: ChapterManifest,
  sectionTitle: string,
  explanationText: string
): CoverageAuditResult {
  const normExp = normalizeTextForAudit(explanationText);

  // Find all items associated with this section
  const normTargetSection = normalizeTextForAudit(sectionTitle);
  const cleanTarget = normalizeTextForAudit(sectionTitle.replace(/^[\d\.\-\s:]+/, ""));

  const sectionItems = manifest.items.filter((it) => {
    const normSec = normalizeTextForAudit(it.sectionTitle);
    const cleanSec = normalizeTextForAudit(it.sectionTitle.replace(/^[\d\.\-\s:]+/, ""));
    return (
      normSec === normTargetSection ||
      normSec.includes(normTargetSection) ||
      normTargetSection.includes(normSec) ||
      (cleanTarget.length >= 4 && (cleanSec === cleanTarget || cleanSec.includes(cleanTarget) || cleanTarget.includes(cleanSec)))
    );
  });

  if (sectionItems.length === 0) {
    return {
      course: manifest.course,
      chapterOrder: manifest.chapterOrder,
      sectionTitle,
      totalSourceItems: 0,
      coveredItems: 0,
      omittedItems: 0,
      coveragePercentage: 100,
      uncoveredItemDetails: [],
    };
  }

  let coveredCount = 0;
  const uncoveredItems: Array<{
    id: string;
    type: SourceItemType;
    title: string;
    snippet: string;
  }> = [];

  for (const item of sectionItems) {
    let isCovered = false;

    // Check title tokens
    const itemTitleNorm = normalizeTextForAudit(item.title.replace(/^[^:]+:\s*/, ""));
    const titleTokens = itemTitleNorm.split(" ").filter((t) => t.length >= 4);

    if (titleTokens.length > 0) {
      const matchTokenCount = titleTokens.filter((token) => normExp.includes(token)).length;
      if (matchTokenCount / titleTokens.length >= 0.5) {
        isCovered = true;
      }
    }

    // Check substantive content tokens
    if (!isCovered) {
      const contentNorm = normalizeTextForAudit(item.normalizedContent);
      const contentTokens = contentNorm.split(" ").filter((t) => t.length >= 5);
      if (contentTokens.length > 0) {
        const matches = contentTokens.filter((token) => normExp.includes(token)).length;
        if (matches >= 2 || matches / contentTokens.length >= 0.35) {
          isCovered = true;
        }
      }
    }

    if (isCovered) {
      coveredCount++;
    } else {
      uncoveredItems.push({
        id: item.id,
        type: item.type,
        title: item.title,
        snippet: item.normalizedContent.slice(0, 80),
      });
    }
  }

  const coveragePercentage = Math.round((coveredCount / sectionItems.length) * 100);

  return {
    course: manifest.course,
    chapterOrder: manifest.chapterOrder,
    sectionTitle,
    totalSourceItems: sectionItems.length,
    coveredItems: coveredCount,
    omittedItems: uncoveredItems.length,
    coveragePercentage,
    uncoveredItemDetails: uncoveredItems,
  };
}

/**
 * Parses and returns the manifests for ALL 50 curriculum chapters across Java, C++, Python, and C.
 */
export function getAllCurriculumManifests(): {
  grandTotal: number;
  courseTotals: Record<string, number>;
  chapters: ChapterManifest[];
} {
  const bundle = markdownBundle as Record<string, string>;
  const coursesConfig = [
    { course: "Java", count: 15, prefix: "java" },
    { course: "CPP", count: 15, prefix: "cpp" },
    { course: "Python", count: 10, prefix: "python" },
    { course: "C", count: 10, prefix: "c" },
  ];

  const chapters: ChapterManifest[] = [];
  const courseTotals: Record<string, number> = {
    Java: 0,
    CPP: 0,
    Python: 0,
    C: 0,
  };
  let grandTotal = 0;

  for (const cfg of coursesConfig) {
    for (let ch = 1; ch <= cfg.count; ch++) {
      const keyNum = `${cfg.prefix}/${ch}`;
      const keyMd = `${cfg.prefix}/chapter${ch}.md`;
      const keyAlt = `content/${cfg.prefix}/chapter${ch}.md`;

      const content = bundle[keyNum] || bundle[keyMd] || bundle[keyAlt] || "";
      if (!content) continue;

      const manifest = parseChapterManifest(cfg.course, ch, content);
      chapters.push(manifest);
      courseTotals[cfg.course] += manifest.totalItems;
      grandTotal += manifest.totalItems;
    }
  }

  return {
    grandTotal,
    courseTotals,
    chapters,
  };
}
