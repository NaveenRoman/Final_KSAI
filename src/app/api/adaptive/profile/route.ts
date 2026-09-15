import { NextResponse } from "next/server";
import {
  getLanguageLearningProfile,
  getStudentFullProfile,
  getTopicLearningProfile,
} from "@/lib/adaptive/profile-service";
import { getAuthenticatedUser } from "@/lib/adaptive/auth-helper";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedEmail = searchParams.get("userEmail");
    const requestedId = searchParams.get("userId");
    const course = searchParams.get("course");
    const topic = searchParams.get("topic");

    // Server-side authoritative authentication check
    const authUser = await getAuthenticatedUser();
    let identifier = requestedId || requestedEmail;

    if (authUser) {
      const isPrivileged =
        authUser.role === "Admin" ||
        authUser.role === "Faculty" ||
        authUser.role === "Instructor";

      // Security Isolation: regular students cannot query other students' profiles
      if (!isPrivileged && identifier) {
        const isSelf =
          (requestedId && requestedId === authUser.id) ||
          (requestedEmail && requestedEmail.toLowerCase() === authUser.email.toLowerCase());

        if (!isSelf) {
          return NextResponse.json(
            {
              success: false,
              error: "Forbidden: You cannot access another student's adaptive learning profile.",
            },
            { status: 403 }
          );
        }
      }

      // Default to authoritative authenticated user
      identifier = authUser.id;
    }

    if (!identifier) {
      return NextResponse.json(
        { success: false, error: "Authentication or user identifier is required" },
        { status: 400 }
      );
    }

    // 1. Topic Profile
    if (course && topic) {
      const profile = await getTopicLearningProfile(identifier, course, topic);
      return NextResponse.json({
        success: true,
        type: "TOPIC",
        profile,
      });
    }

    // 2. Language Profile (e.g. Java or Python)
    if (course) {
      const profile = await getLanguageLearningProfile(identifier, course);
      return NextResponse.json({
        success: true,
        type: "LANGUAGE",
        profile,
      });
    }

    // 3. Overall Student Profile across all languages
    const profile = await getStudentFullProfile(identifier);
    return NextResponse.json({
      success: true,
      type: "FULL_STUDENT",
      profile,
    });
  } catch (error: any) {
    console.error("Adaptive Profile API Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load profile" },
      { status: 500 }
    );
  }
}
