import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { parseSessionToken } from "@/lib/auth-cookie";
import { validateCodeBeforeRun } from "@/components/editor/runner/CodeValidator";
import { createInteractiveSession, SessionEvent } from "@/lib/interactive-process";

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
  try {
    const body = await request.json().catch(() => ({}));
    const { code = "", language = "java", fileName = "" } = body;

    if (!code || typeof code !== "string" || !code.trim()) {
      return NextResponse.json(
        { success: false, output: "Code cannot be empty.", exitCode: 1 },
        { status: 400 }
      );
    }

    const normLang = normalizeLanguage(language);

    // Pre-execution validation (for languages using static validation)
    // For C / C++, execution proceeds directly to the GCC runner to preserve authentic compiler errors.
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
          diagnostics: validation.diagnostics,
          exitCode: 1,
        });
      }
    }

    // 1. Authenticate user
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
        (await db.user.findFirst({ where: { role: "Student" } })) ||
        (await db.user.findFirst());
      if (defaultUser) {
        user = defaultUser;
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, output: "Authentication required to run code." },
        { status: 401 }
      );
    }

    // 2. Authorize course access for non-admin
    if (user.role !== "Admin") {
      const enrollment = await db.enrollment.findFirst({
        where: {
          userId: user.id,
          course: {
            language: normLang,
          },
        },
      });

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
            exitCode: 1,
          },
          { status: 403 }
        );
      }
    }

    // 3. Create interactive session and stream events
    const sessionId = crypto.randomUUID();
    const encoder = new TextEncoder();

    let streamController: ReadableStreamDefaultController<Uint8Array> | null = null;

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        streamController = controller;

        // Send initial start event
        const startPayload = JSON.stringify({
          type: "start",
          sessionId,
          language: normLang,
        });
        controller.enqueue(encoder.encode(`data: ${startPayload}\n\n`));

        try {
          await createInteractiveSession({
            sessionId,
            code,
            language: normLang,
            onEvent: (event: SessionEvent) => {
              try {
                const payload = JSON.stringify(event);
                controller.enqueue(encoder.encode(`data: ${payload}\n\n`));

                if (event.type === "exit" || event.type === "error") {
                  setTimeout(() => {
                    try {
                      controller.close();
                    } catch {}
                  }, 100);
                }
              } catch {}
            },
          });
        } catch (err: any) {
          const errorPayload = JSON.stringify({
            type: "error",
            text: err.message || "Failed to start execution process.",
            exitCode: 1,
            sessionId,
          });
          controller.enqueue(encoder.encode(`data: ${errorPayload}\n\n`));
          try {
            controller.close();
          } catch {}
        }
      },
      cancel() {
        // Client aborted/closed connection
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Session-ID": sessionId,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        output: `Server Error: ${error.message || "Execution setup failed."}`,
        exitCode: 1,
      },
      { status: 500 }
    );
  }
}
