/**
 * KnowledgeStream AI - Platform & Course Assistant Knowledge Base
 * Focused on:
 * 1. Founder, CEO & Administration (Kasi - Founder & CEO)
 * 2. Course Prices, Subscription Plans & Fees
 * 3. KnowledgeStream AI Courses & Features
 * 4. Course Comparisons & Enrollment Recommendations
 * 5. Platform Tools (Skill Passport, Resume Builder, Mock Interview, Leaderboard, Pomodoro, Editor)
 * 6. Friendly Out-of-Scope Redirection to Course Lessons & Code Editor
 */

export interface KnowledgeEntry {
  id: string;
  category: string;
  keywords: string[];
  patterns: RegExp[];
  answer: string;
}

export const COPILOT_KNOWLEDGE_BASE: KnowledgeEntry[] = [
  // =========================================================================
  // CATEGORY 0: FOUNDER, CEO & COMPANY LEADERSHIP (TOP PRIORITY MATCH)
  // =========================================================================
  {
    id: "founder1",
    category: "Company Leadership",
    keywords: [
      "founder", "ceo", "who is the founder", "who is the ceo", "owner",
      "who created", "who built", "who is kasi system admin", "kasi system admin",
      "kasi admin", "about company", "leadership", "creator"
    ],
    patterns: [
      /founder/i, /ceo/i, /owner/i, /leadership/i, /creator/i,
      /who\s+(is|created|built|runs)\s+(the\s+)?(founder|ceo|owner|admin|knowledgestream|ksai)/i,
      /kasi/i
    ],
    answer: "👨‍💼 **Founder & CEO of KnowledgeStream AI:**\n\n**KnowledgeStream AI** was founded and created by **Kasi (KASI System Admin)** (`admin@ksai.local`). As Founder & CEO, Kasi leads the platform's vision, course curriculum architecture, AI mentor systems, and student career placement initiatives."
  },

  // =========================================================================
  // CATEGORY 1: COURSE PRICES & SUBSCRIPTION PLANS
  // =========================================================================
  {
    id: "price1",
    category: "Prices & Fees",
    keywords: ["prices of courses", "price", "prices", "cost", "course price", "course cost", "how much", "fee", "fees", "pricing"],
    patterns: [/price/i, /prices/i, /cost/i, /fee/i, /how\s+much/i, /pricing/i],
    answer: "💎 **KnowledgeStream AI Course & Subscription Pricing:**\n\n### 📚 Individual Course Prices (90 Days Full Access):\n- ☕ **Java Enterprise Architecture:** ₹1,999\n- 🗄️ **DBMS & SQL Query Mastery:** ₹1,499\n- 🐍 **Python AI Architecture:** ₹2,499\n- ⚡ **C++ Object-Oriented & STL:** ₹1,999\n- 💻 **C Language System Mastery:** ₹1,499\n\n### 🚀 Platform Membership Plans:\n- 🆓 **Starter Plan (Free):** ₹0 / $0 Forever — Includes basic AI courses, 50 AI queries/month, and Community Sandbox access.\n- ⚡ **Pro Developer Plan:** $29/month (or $23/mo billed annually) — Unlocks **Unlimited AI Curriculum**, Unlimited AI Mentor queries, 10 Cloud Sandboxes, and Verified PDF Certificates.\n- 🏢 **Enterprise Plan:** Custom pricing for Universities & Engineering Teams."
  },

  // =========================================================================
  // CATEGORY 2: COURSE RECOMMENDATIONS & WHICH COURSE IS BEST
  // =========================================================================
  {
    id: "c1",
    category: "Courses & Recommendations",
    keywords: ["which course is best", "best course", "which course should i take", "course recommendation", "which course best bro", "recommend a course"],
    patterns: [/which\s+course\s+(is\s+)?best/i, /recommend\s+(a\s+)?course/i, /best\s+course/i],
    answer: "🔥 **KnowledgeStream AI Course Recommendations:**\n\n1. ☕ **Java Full Stack Developer Masterclass** *(Top Pick for IT Placement)*\n   - **Features:** 45+ Modules, Real Enterprise Projects, Spring Boot, Microservices & REST APIs.\n   - **Best For:** Students aiming for Backend / Full-Stack Developer jobs.\n\n2. 🗄️ **DBMS & SQL Query Mastery** *(Essential Core Skill)*\n   - **Features:** Complex Joins, Indexing, Query Optimization, Schema Design, Real DB Challenges.\n   - **Best For:** Every developer wanting strong database fundamentals.\n\n3. 🐍 **Python Programming & AI Foundation** *(Best for Beginners)*\n   - **Features:** Scripting, Data Structures, Automation, AI Basics & Hands-on Coding.\n   - **Best For:** Beginners, Data Analysts & AI Enthusiasts.\n\n4. ⚡ **C++ Systems & DSA Architecture** *(Best for High Performance)*\n   - **Features:** Memory Management, Pointers, STL, Advanced Algorithms & Problem Solving.\n   - **Best For:** Competitive Programmers & System Software Developers.\n\n💡 **Pro Tip:** For top developer placement, enroll in **Java Full Stack + DBMS & SQL**!"
  },

  {
    id: "c2",
    category: "Course Features",
    keywords: ["java course features", "what java course offers", "about java course", "java full stack"],
    patterns: [/java\s+course/i, /what\s+does\s+java\s+offer/i, /about\s+java/i],
    answer: "☕ **Java Full Stack Masterclass — Course Overview & Features:**\n\n- **Price:** ₹1,999 (90 Days Access)\n- **Curriculum:** Core Java (OOPs, Collections, Multithreading), Advanced Java (JDBC, Servlets), Spring Boot & RESTful Microservices.\n- **Features Offered:**\n  - Interactive Chapter Lessons with built-in code runner\n  - Chapter-wise AI Practice Quizzes\n  - Capstone Enterprise Project\n  - Verified Skill Passport Certificate on completion\n  - Lifetime access & AI Copilot assistance"
  },
  {
    id: "c3",
    category: "Course Features",
    keywords: ["sql course features", "dbms course", "what sql course offers", "about dbms"],
    patterns: [/sql\s+course/i, /dbms\s+course/i, /about\s+sql/i],
    answer: "🗄️ **DBMS & SQL Query Mastery — Course Overview & Features:**\n\n- **Price:** ₹1,499 (90 Days Access)\n- **Curriculum:** Relational Database Design, SQL DDL/DML, Advanced Joins, Indexing (B-Tree/Hash), Normalization (1NF to BCNF), Transactions & ACID properties.\n- **Features Offered:**\n  - Real-time SQL Playground\n  - 50+ Real-world Query Challenges\n  - Query Performance Optimization tips\n  - End-of-Course Verified Certificate"
  },
  {
    id: "c4",
    category: "Course Features",
    keywords: ["python course features", "about python course", "what python offers"],
    patterns: [/python\s+course/i, /about\s+python/i],
    answer: "🐍 **Python Programming & AI Foundation — Course Overview & Features:**\n\n- **Price:** ₹2,499 (90 Days Access)\n- **Curriculum:** Python Syntax, Data Structures (Lists, Tuples, Dicts), Functions, Decorators, File Handling & Intro to AI Scripting.\n- **Features Offered:**\n  - Hands-on Python Editor\n  - Automated Code Checker\n  - AI-assisted Code Explanations\n  - Completion Certificate"
  },
  {
    id: "c5",
    category: "Course Features",
    keywords: ["cpp course features", "c++ course", "about c++"],
    patterns: [/c\+\+\s+course/i, /cpp\s+course/i, /about\s+c\+\+/i],
    answer: "⚡ **C++ Systems & DSA Architecture — Course Overview & Features:**\n\n- **Price:** ₹1,999 (90 Days Access)\n- **Curriculum:** Object-Oriented C++, Pointers & Dynamic Memory, Smart Pointers, STL Containers & Complex Data Structures.\n- **Features Offered:**\n  - High-performance C++ Compiler runner\n  - DSA Problem Sets\n  - Verified Skill Passport Certificate"
  },

  // =========================================================================
  // CATEGORY 3: PLATFORM TOOLS & COMPANY INFORMATION
  // =========================================================================
  {
    id: "f1",
    category: "Platform Features",
    keywords: ["what features are available", "platform features", "what does knowledge stream offer", "company features"],
    patterns: [/what\s+features/i, /platform\s+features/i, /what\s+does\s+knowledgestream\s+offer/i],
    answer: "🌟 **KnowledgeStream AI Platform Features:**\n\n1. 📚 **Interactive Course Catalog:** Structured learning paths for Java, SQL, Python, C, and C++.\n2. ⏱️ **Focus Pomodoro Timer:** Customizable timer (15m to 90m+) to boost daily study focus.\n3. 🎯 **AI Practice Quiz Generator:** Generates instant quizzes tailored to your active learning topic.\n4. 🏆 **Live Student Leaderboard:** Tracks XP, daily study streaks, and ranks top coders.\n5. 📜 **Skill Passport & Certificates:** Earn verified digital certificates on course completion.\n6. 📄 **AI Resume Builder & ATS Scanner:** Formats ATS-compliant resumes and scores job match rates.\n7. 🎤 **AI Mock Interviewer:** Real-time 1-on-1 technical & behavioral interview practice.\n8. 💻 **Online Multi-Language Code Editor:** Built-in runner for Java, Python, C++, and SQL."
  },
  {
    id: "f3",
    category: "Platform Features",
    keywords: ["how to get certificate", "certificate", "download certificate", "skill passport"],
    patterns: [/how\s+to\s+get\s+certificate/i, /download\s+certificate/i, /skill\s+passport/i],
    answer: "📜 **Earning Certificates on KnowledgeStream AI:**\n\n1. Complete 100% of chapter lessons in your enrolled course.\n2. Pass the end-of-course AI practice assessment.\n3. Go to **Certificates / Skill Passport** on the left menu to view, download as PDF, or share your verified credential on LinkedIn!"
  },
  {
    id: "f4",
    category: "Platform Features",
    keywords: ["resume builder", "ats scanner", "how to build resume"],
    patterns: [/resume\s+builder/i, /ats\s+scanner/i, /how\s+to\s+build\s+resume/i],
    answer: "📄 **AI Resume Builder & ATS Scanner:**\n\nOur built-in **Resume Builder** lets you create professional developer resumes, test them against ATS scanner algorithms, and export ready-to-use PDFs for job applications!"
  },
  {
    id: "f5",
    category: "Platform Features",
    keywords: ["interview prep", "mock interview", "ai interview"],
    patterns: [/interview\s+prep/i, /mock\s+interview/i],
    answer: "🎯 **AI Mock Interviewer Feature:**\n\nHead to **Interview Prep** on the left menu! You can select target roles (Java Backend, SQL Specialist, etc.) and conduct realistic 1-on-1 AI mock interviews with instant voice/text feedback."
  },

  // =========================================================================
  // CATEGORY 4: GREETINGS & OUT-OF-SCOPE REDIRECTION
  // =========================================================================
  {
    id: "g1",
    category: "Greetings",
    keywords: ["hi", "hello", "hey", "namaste", "good morning", "good evening", "yo"],
    patterns: [/^(hi|hello|hey|yo|namaste|good\s+morning|good\s+evening)$/i],
    answer: "👋 **Hi Chandu! Welcome to KnowledgeStream Copilot.**\n\nI am your dedicated **Course & Platform Advisor**!\n\nAsk me anything about:\n- 👨‍💼 **Founder & CEO** (Kasi)\n- 💎 **Course Prices & Subscriptions** (e.g. *\"prices of courses\"*)\n- 📚 **Our Courses** (Java Full Stack, DBMS & SQL, Python AI, C++)\n- ✨ **Platform Features** (Certificates, Resume Builder, Mock Interviews, Pomodoro Timer)\n- 💡 **Course Recommendations** (e.g. *\"Which course is best for IT jobs?\"*)"
  },
  {
    id: "g2",
    category: "Out of Scope",
    keywords: ["what is sql", "what is python", "what is java", "explain sql", "explain python", "write code for", "what is oops"],
    patterns: [/what\s+is\s+(sql|python|java|c\+\+|html|css|javascript|code)/i, /write\s+(a\s+)?code/i, /explain\s+(sql|python|java|c\+\+)\s+concept/i],
    answer: "💡 **Course Lesson & Code Editor Assistant:**\n\nI am specialized in **KnowledgeStream AI Courses, Prices, Features & Platform Guidance**!\n\nFor deep technical code tutorials, syntax definitions, and interactive code execution, please check out:\n1. 📖 **Course Chapters & Curriculum** (in Course Catalog)\n2. 💻 **Interactive Code Editor** (on left menu with built-in AI Code Mentor)\n3. ⚡ **AI Practice Quiz Generator**\n\nAsk me anything about our **Courses**, **Founder & CEO**, **Prices**, or **Certificates**!"
  }
];

/**
 * Searches the Knowledge Base for exact pattern or keyword matches.
 * Returns formatted trained answer or null if no match.
 */
export function findTrainedAnswer(question: string): string | null {
  const qClean = question.trim().toLowerCase();
  if (!qClean) return null;

  // 1. Founder & CEO Direct Match (Highest Priority)
  if (
    qClean.includes("founder") ||
    qClean.includes("ceo") ||
    qClean.includes("owner") ||
    qClean.includes("kasi") ||
    qClean.includes("creator") ||
    qClean.includes("leadership")
  ) {
    return COPILOT_KNOWLEDGE_BASE[0].answer;
  }

  // 2. Direct Pricing Match
  if (
    qClean.includes("price") ||
    qClean.includes("prices") ||
    qClean.includes("cost") ||
    qClean.includes("fee") ||
    qClean.includes("how much") ||
    qClean.includes("pricing") ||
    qClean.includes("rate") ||
    qClean.includes("amount")
  ) {
    return COPILOT_KNOWLEDGE_BASE[1].answer;
  }

  // 3. Exact Pattern Match
  for (const entry of COPILOT_KNOWLEDGE_BASE) {
    for (const pattern of entry.patterns) {
      if (pattern.test(qClean)) {
        return entry.answer;
      }
    }
  }

  // 4. Keyword Combination Scoring
  let bestEntry: KnowledgeEntry | null = null;
  let highestScore = 0;

  for (const entry of COPILOT_KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (qClean.includes(kw.toLowerCase())) {
        score += kw.length;
      }
    }
    if (score > highestScore && score >= 4) {
      highestScore = score;
      bestEntry = entry;
    }
  }

  if (bestEntry) {
    return bestEntry.answer;
  }

  // 5. Explicit Keyword Match (no loose fallback)
  if (qClean.includes("certificate") || qClean.includes("passport")) {
    return COPILOT_KNOWLEDGE_BASE.find(e => e.id === "f3")?.answer || null;
  }

  if (qClean.includes("feature")) {
    return COPILOT_KNOWLEDGE_BASE.find(e => e.id === "f1")?.answer || null;
  }

  if (qClean.includes("recommend") || (qClean.includes("which course") && qClean.includes("best"))) {
    return COPILOT_KNOWLEDGE_BASE.find(e => e.id === "c1")?.answer || null;
  }

  return null;
}
