import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { executeCode } from "@/lib/code-execution";
import { validateCodeBeforeRun } from "@/components/editor/runner/CodeValidator";

export const dynamic = "force-dynamic";

function normalizeLanguage(lang: string): string {
  const norm = (lang || "").toLowerCase().trim();
  if (norm === "c++" || norm === "cpp") return "cpp";
  if (norm === "c") return "c";
  if (norm === "py" || norm === "python") return "python";
  if (norm === "java") return "java";
  return norm || "java";
}

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json().catch(() => ({}));
    const { code = "", language = "java", stdin = "", files = [] } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json({
        success: false,
        output: "Code cannot be empty.",
        executionTime: 0,
        exitCode: 1,
      });
    }

    const normLang = normalizeLanguage(language);
    const fileName = body.fileName || "";

    // Pre-execution validation check
    // For C / C++, allow the real GCC compiler to provide authentic compilation diagnostics.
    if (normLang !== "c" && normLang !== "cpp") {
      const validation = validateCodeBeforeRun({
        language: normLang,
        fileName,
        code,
      });

      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          output: validation.errorMessage,
          executionTime: 0,
          exitCode: 1,
        });
      }
    }

    // 1. Authenticate user session
    const cookieStore = await cookies();
    const sessionTokenRaw =
      cookieStore.get("better-auth.session_token")?.value ||
      cookieStore.get("sessionToken")?.value;

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    let user = session?.user as any;

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
        {
          success: false,
          output: "Authentication required to run code.",
          executionTime: 0,
          exitCode: 1,
        },
        { status: 401 }
      );
    }

    // 2. Authorize course access for non-admin users
    if (user.role !== "Admin") {
      const enrollment = await db.enrollment.findFirst({
        where: {
          userId: user.id,
          course: {
            language: normLang,
          },
        },
      });

      // Also check preview eligibility if user is auto-enrolled or preview student
      if (!enrollment) {
        const langDisplayName =
          normLang === "cpp"
            ? "C++"
            : normLang === "c"
            ? "C"
            : normLang === "python"
            ? "Python"
            : "Java";

        return NextResponse.json(
          {
            success: false,
            output: `Access Denied: You have not enrolled in the ${langDisplayName} course. Please enroll to unlock execution access.`,
            executionTime: 0,
            exitCode: 1,
          },
          { status: 403 }
        );
      }
    }

    // 3. Execute authorized code
    const execResult = await executeCode({
      code,
      language: normLang,
      stdin,
      files,
    });

    const duration = Date.now() - startTime;
    const outputText = (
      execResult.stdout ||
      execResult.stderr ||
      execResult.error ||
      (execResult.success ? "Program finished successfully with no console output." : "Execution finished with an error.")
    ).trim();

    return NextResponse.json({
      success: execResult.success,
      output: outputText,
      executionTime: duration,
      exitCode: execResult.exitCode ?? (execResult.success ? 0 : 1),
    });
  } catch (error: any) {
    const duration = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        output: `Execution Error: ${error.message || "Failed to execute code."}`,
        executionTime: duration,
        exitCode: 1,
      },
      { status: 500 }
    );
  }
}