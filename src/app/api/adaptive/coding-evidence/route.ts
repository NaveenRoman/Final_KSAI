import { NextResponse } from "next/server";
import { recordCodingEvidence } from "@/lib/adaptive/profile-service";
import { getAuthenticatedUser } from "@/lib/adaptive/auth-helper";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      userEmail,
      course,
      chapterId,
      topic,
      testCasesPassed = 0,
      totalTestCases = 0,
      success = false,
      compileError = null,
      infrastructureError = false,
    } = body;

    if (!topic || !course) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: topic, course" },
        { status: 400 }
      );
    }

    // Authoritative server-side identity
    const authUser = await getAuthenticatedUser();
    const effectiveUserId = authUser ? authUser.id : (userId || "");
    const effectiveUserEmail = authUser ? authUser.email : userEmail;

    const result = await recordCodingEvidence({
      userId: effectiveUserId,
      userEmail: effectiveUserEmail,
      course,
      chapterId,
      topic,
      testCasesPassed,
      totalTestCases,
      success,
      compileError,
      infrastructureError,
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error("Adaptive Coding Evidence API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record coding evidence" },
      { status: 500 }
    );
  }
}
