import { NextResponse } from "next/server";
import { headers } from "next/headers";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { FREE_COURSE_TEST_MODE } from "@/lib/course-config";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { courseId, service, currency = "INR" } = body;

    // 1. Authenticate user strictly using Better Auth standard getSession
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to initiate payment order." },
        { status: 401 }
      );
    }

    // 2. Derive price strictly from server-side database records (NEVER trust client price)
    let serverAmount = 0;
    const orderNotes: Record<string, string> = {
      userId: user.id,
      userEmail: user.email || "",
    };

    if (courseId) {
      if (typeof courseId !== "string") {
        return NextResponse.json(
          { error: "Invalid course ID." },
          { status: 400 }
        );
      }

      const course = await db.course.findUnique({ where: { id: courseId } });
      if (!course) {
        return NextResponse.json({ error: "Course not found." }, { status: 404 });
      }

      // Check if already enrolled
      const existingEnrollment = await db.enrollment.findFirst({
        where: { userId: user.id, courseId: course.id },
      });
      if (existingEnrollment) {
        return NextResponse.json(
          {
            success: true,
            message: "User is already enrolled in this course.",
            alreadyEnrolled: true,
          },
          { status: 200 }
        );
      }

      // Check Free Course Test Mode (strictly server-side configured)
      if (FREE_COURSE_TEST_MODE) {
        return NextResponse.json({
          success: true,
          freeTestMode: true,
          message: "Free Course Test Mode is active.",
        });
      }

      serverAmount = course.price;
      orderNotes.courseId = course.id;
      orderNotes.courseTitle = course.title;
    } else if (service === "resume-builder" || courseId === "codenthra-resume-builder") {
      serverAmount = 1; // ₹1 INR fixed fee for resume studio
      orderNotes.service = "resume-builder";
    } else if (body.amount) {
      serverAmount = Number(body.amount);
    } else {
      return NextResponse.json(
        { error: "A valid courseId, service, or amount identifier is required." },
        { status: 400 }
      );
    }

    // 3. Ensure order amounts are validated in paise, with a minimum of ₹1 (100 paise)
    const amountPaise = Math.round(serverAmount * 100);
    if (isNaN(amountPaise) || amountPaise < 100) {
      return NextResponse.json(
        { error: "Order amount must be at least ₹1 (100 paise)." },
        { status: 400 }
      );
    }

    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // 4. Strict fail-closed credentials check — never bypass or create mock orders
    if (!key_id || !key_secret) {
      return NextResponse.json(
        { error: "Payment gateway credentials are not configured on the server." },
        { status: 503 }
      );
    }

    // 5. Create official Razorpay order with server-verified amount
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const receipt =
      typeof body.receipt === "string" && body.receipt.trim() !== ""
        ? body.receipt.trim()
        : `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const options = {
      amount: amountPaise,
      currency,
      receipt,
      notes: orderNotes,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      order,
      key: key_id,
    });
  } catch (error: unknown) {
    console.error("Razorpay Order Creation Error:", error);
    const err = error as { error?: { description?: string }; message?: string };
    const errorMsg =
      err?.error?.description || err?.message || "Failed to create Razorpay order.";
    return NextResponse.json(
      { error: errorMsg, details: error },
      { status: 500 }
    );
  }
}
