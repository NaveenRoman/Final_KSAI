import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { courseId, service, currency = "INR" } = body;

    // 1. Authenticate requesting user session
    const sessionData = await auth.api.getSession({ headers: req.headers });
    let user = sessionData?.user ?? null;

    if (!user && body.userEmail) {
      user = await db.user.findUnique({
        where: { email: String(body.userEmail).toLowerCase().trim() },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Authentication required to initiate payment order." },
        { status: 401 }
      );
    }

    // 2. Derive price strictly from server-side database records (NEVER trust client price)
    let serverAmount = 0;
    let orderNotes: Record<string, string> = {
      userId: user.id,
      userEmail: user.email || "",
    };

    if (courseId) {
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
          { error: "User is already enrolled in this course.", alreadyEnrolled: true },
          { status: 400 }
        );
      }

      serverAmount = course.price;
      orderNotes.courseId = course.id;
      orderNotes.courseTitle = course.title;
    } else if (service === "resume-builder") {
      serverAmount = 1; // ₹1 INR fixed fee for resume studio
      orderNotes.service = "resume-builder";
    } else if (body.amount && process.env.NODE_ENV !== "production") {
      serverAmount = Number(body.amount);
    } else {
      return NextResponse.json(
        { error: "A valid courseId or service identifier is required." },
        { status: 400 }
      );
    }

    if (!serverAmount || serverAmount <= 0) {
      return NextResponse.json(
        { error: "Derived order amount must be greater than zero." },
        { status: 400 }
      );
    }

    const key_id = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    // 3. Fallback mock order handling in development only
    if (!key_id || !key_secret) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Payment gateway is not configured in production environment." },
          { status: 503 }
        );
      }
      return NextResponse.json({
        success: true,
        order: {
          id: `order_mock_${Date.now()}`,
          amount: Math.round(serverAmount * 100),
          currency,
        },
        key: "rzp_test_mock_key_id",
        isMock: true,
      });
    }

    // 4. Create official Razorpay order with server-verified amount
    const razorpay = new Razorpay({
      key_id,
      key_secret,
    });

    const options = {
      amount: Math.round(serverAmount * 100), // convert INR rupees to paise
      currency,
      receipt: `rcpt_${Date.now()}`,
      notes: orderNotes,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({
      success: true,
      order,
      key: key_id,
    });
  } catch (error: any) {
    console.error("Razorpay Order Creation Error:", error);
    const errorMsg =
      error?.error?.description || error?.message || "Failed to create Razorpay order.";
    return NextResponse.json(
      { error: errorMsg, details: error },
      { status: 500 }
    );
  }
}
