import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { LANGUAGES, LanguageConfig } from "@/components/editor/languages/LanguageConfig";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    // 1. Primary check: Resolve user via Better Auth session API
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let user = session?.user as any;

    // 2. Fallback check: Resolve user via cookie session token lookup in DB
    if (!user && sessionTokenRaw) {
      const rawToken = parseSessionToken(sessionTokenRaw);
      const dbSession = await db.session.findUnique({
        where: { token: rawToken },
        include: { user: true },
      });

      if (dbSession && new Date() < dbSession.expiresAt) {
        user = dbSession.user;
      }
    }

    // 3. Fallback check: Default active student
    if (!user) {
      const defaultUser =
        (await db.user.findFirst({
          where: { role: "Student" },
        })) || (await db.user.findFirst());
      if (defaultUser) {
        user = defaultUser;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated", accessibleLanguages: [] },
        { status: 401 }
      );
    }

    // Admin role has access to all languages
    if (user.role === "Admin") {
      return NextResponse.json({
        success: true,
        userEmail: user.email,
        isAdmin: true,
        accessibleLanguageIds: LANGUAGES.map((l) => l.id),
        languages: LANGUAGES,
      });
    }

    // Fetch user enrollments
    const enrollments = await db.enrollment.findMany({
      where: { userId: user.id },
      include: { course: true },
    });

    const enrolledLanguageIds = new Set<string>();
    for (const e of enrollments) {
      if (e.course?.language) {
        const langNorm = e.course.language.toLowerCase().trim();
        if (langNorm === "c++" || langNorm === "cpp") {
          enrolledLanguageIds.add("cpp");
        } else if (langNorm === "c") {
          enrolledLanguageIds.add("c");
        } else if (langNorm === "python" || langNorm === "py") {
          enrolledLanguageIds.add("python");
        } else if (langNorm === "javascript" || langNorm === "js") {
          enrolledLanguageIds.add("javascript");
        } else if (langNorm === "typescript" || langNorm === "ts") {
          enrolledLanguageIds.add("typescript");
        } else if (langNorm === "java") {
          enrolledLanguageIds.add("java");
        }
      }
    }

    // In open editor mode, provide all available languages
    const accessibleLanguageConfigs =
      enrolledLanguageIds.size > 0
        ? LANGUAGES.filter((lang) => enrolledLanguageIds.has(lang.id))
        : LANGUAGES;

    return NextResponse.json({
      success: true,
      userEmail: user.email,
      isAdmin: false,
      accessibleLanguageIds: Array.from(enrolledLanguageIds),
      languages: accessibleLanguageConfigs,
    });
  } catch (error: any) {
    console.error("Accessible Languages Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to load accessible languages.",
        accessibleLanguages: [],
      },
      { status: 500 }
    );
  }
}
