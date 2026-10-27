import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import { sendOtpEmail } from "@/lib/email-template";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, purpose = "signup" } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser && existingUser.passwordHash && purpose === "signup") {
      return NextResponse.json(
        { error: "An account with this email already exists. Please log in." },
        { status: 409 }
      );
    }

    const identifier = `otp:${cleanEmail}`;

    const existingVerification = await db.verification.findFirst({
      where: { identifier },
    });

    if (existingVerification) {
      const timeElapsed = Date.now() - new Date(existingVerification.createdAt).getTime();
      if (timeElapsed < 60 * 1000) {
        const remainingSeconds = Math.ceil((60 * 1000 - timeElapsed) / 1000);
        return NextResponse.json(
          { error: `Please wait ${remainingSeconds} seconds before requesting another OTP.` },
          { status: 429 }
        );
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otpCode, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.verification.deleteMany({
      where: { identifier },
    });

    await db.verification.create({
      data: {
        identifier,
        value: JSON.stringify({ otpHash, attempts: 0 }),
        expiresAt,
      },
    });

    const emailResult = await sendOtpEmail({
      to: cleanEmail,
      otp: otpCode,
      purpose: purpose === "reset-password" ? "reset-password" : "signup",
    });

    if (!emailResult.ok) {
      if (emailResult.reason === "missing-provider") {
        return NextResponse.json(
          { error: "Email delivery service is currently not configured. Please contact support." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "Failed to deliver verification email. Please check your email address or try again shortly." },
        { status: 502 }
      );
    }

    console.log(`[OTP SENT] ${cleanEmail} | purpose=${purpose}`);

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully. We have sent a verification code to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("OTP Send API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error sending OTP." },
      { status: 500 }
    );
  }
}
