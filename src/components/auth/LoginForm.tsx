"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { safeParseResponse } from "@/lib/safe-json";
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Loader2, KeyRound, RotateCcw, Edit2 } from "lucide-react";

interface LoginFormProps {
  onSubmitSuccess: (user: { name: string; email: string; role: string }) => void;
  onSwitchToSignUp: () => void;
  onGooglePrefill?: (data: {
    name: string;
    email: string;
    googleId?: string;
    emailVerified?: boolean;
  }) => void;
  prefillEmail?: string;
  prefillPassword?: string;
}

function validatePassword(password: string) {
  const checks = [
    { label: "8+ characters", passed: password.length >= 8 },
    { label: "Uppercase", passed: /[A-Z]/.test(password) },
    { label: "Lowercase", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /\d/.test(password) },
    { label: "Special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  return {
    checks,
    passed: checks.every((check) => check.passed),
  };
}

export function LoginForm({
  onSubmitSuccess,
  onSwitchToSignUp,
  onGooglePrefill,
  prefillEmail,
  prefillPassword,
}: LoginFormProps) {
  const [email, setEmail] = useState(prefillEmail || "");
  const [password, setPassword] = useState(prefillPassword || "");

  useEffect(() => {
    if (prefillEmail !== undefined) setEmail(prefillEmail);
    if (prefillPassword !== undefined) setPassword(prefillPassword);
  }, [prefillEmail, prefillPassword]);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotStep, setForgotStep] = useState<"login" | "email" | "otp" | "password">("login");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtpDigits, setForgotOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [forgotPassword, setForgotPassword] = useState("");
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  const [forgotSendingOtp, setForgotSendingOtp] = useState(false);
  const [forgotVerifyingOtp, setForgotVerifyingOtp] = useState(false);
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotCountdown, setForgotCountdown] = useState(0);
  const forgotInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const forgotPasswordState = useMemo(() => validatePassword(forgotPassword), [forgotPassword]);

  const handleSubmit = async (e?: React.FormEvent | React.KeyboardEvent) => {
    if (e) e.preventDefault();

    if (submitting) return;

    if (!email.trim() || !password) {
      setError("Please enter both email address and password.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, rememberMe }),
      });

      const parsed = await safeParseResponse<{ success?: boolean; user?: any; error?: string }>(
        res,
        "Login"
      );

      if (!parsed.ok || !parsed.data?.user) {
        setError(parsed.data?.error || parsed.error || "Login failed. Please check your credentials.");
        setSubmitting(false);
        return;
      }

      onSubmitSuccess(parsed.data.user);
    } catch (err) {
      console.error(err);
      setError("Network error connecting to authentication server.");
      setSubmitting(false);
    }
  };

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleKeyDownEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSubmit(e);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSuccessMessage(null);
    setGoogleLoading(true);

    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard/student",
      });
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError(err?.message || "Google Sign-In failed. Please check your connection and try again.");
      setGoogleLoading(false);
    }
  };

  const handleForgotOtpSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!forgotEmail.trim()) {
      setError("Please enter the email address associated with your account.");
      return;
    }

    setForgotSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, purpose: "reset-password" }),
      });

      const parsed = await safeParseResponse<{ error?: string; success?: boolean }>(res, "Password reset OTP");
      if (!parsed.ok || parsed.data?.error) {
        setError(parsed.data?.error || parsed.error || "Unable to send a reset code right now.");
        setForgotSendingOtp(false);
        return;
      }

      setForgotOtpDigits(Array(6).fill(""));
      setForgotCountdown(60);
      setSuccessMessage("Verification code sent successfully. We have sent a reset code to your email.");
      setForgotStep("otp");
    } catch (err) {
      console.error(err);
      setError("Network error sending reset code.");
    } finally {
      setForgotSendingOtp(false);
    }
  };

  const handleForgotOtpVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const code = forgotOtpDigits.join("");
    if (code.length !== 6) return;

    setForgotVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, otp: code }),
      });

      const parsed = await safeParseResponse<{ error?: string; success?: boolean }>(res, "OTP Verification");
      if (!parsed.ok || parsed.data?.error) {
        setError(parsed.data?.error || parsed.error || "The reset code is invalid or has expired.");
        setForgotVerifyingOtp(false);
        return;
      }

      setSuccessMessage("OTP verified. Please enter your new password.");
      setForgotStep("password");
    } catch (err) {
      console.error(err);
      setError("Network error verifying reset code.");
    } finally {
      setForgotVerifyingOtp(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!forgotPasswordState.passed) {
      setError("Use a stronger password with 8+ characters, uppercase, number, and a special character.");
      return;
    }

    if (forgotPassword !== forgotConfirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setForgotSubmitting(true);
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail, password: forgotPassword }),
      });

      const parsed = await safeParseResponse<{ error?: string; success?: boolean }>(res, "Password reset");
      if (!parsed.ok || parsed.data?.error) {
        setError(parsed.data?.error || parsed.error || "Unable to reset password.");
        setForgotSubmitting(false);
        return;
      }

      setSuccessMessage("Password updated successfully. You can now sign in with your new password.");
      setForgotStep("login");
      setForgotPassword("");
      setForgotConfirmPassword("");
    } catch (err) {
      console.error(err);
      setError("Network error updating password.");
    } finally {
      setForgotSubmitting(false);
    }
  };

  const handleForgotOtpChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 1);
    const nextDigits = [...forgotOtpDigits];
    nextDigits[index] = sanitized;
    setForgotOtpDigits(nextDigits);

    if (sanitized && index < 5) {
      forgotInputRefs.current[index + 1]?.focus();
    }
  };

  const handleForgotOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !forgotOtpDigits[index] && index > 0) {
      const nextDigits = [...forgotOtpDigits];
      nextDigits[index - 1] = "";
      setForgotOtpDigits(nextDigits);
      forgotInputRefs.current[index - 1]?.focus();
    }
  };

  const handleForgotOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const nextDigits = Array(6).fill("");
    pasted.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });
    setForgotOtpDigits(nextDigits);
  };

  const renderForgotPasswordFlow = () => {
    if (forgotStep === "email") {
      return (
        <form onSubmit={handleForgotOtpSend} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-200 block">Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#161626] border border-white/15 text-base sm:text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 min-h-[48px]"
                placeholder="you@company.com"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={forgotSendingOtp || !forgotEmail.trim()}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg min-h-[48px] cursor-pointer"
          >
            {forgotSendingOtp ? "Sending reset code..." : "Send OTP"}
            {forgotSendingOtp ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
          <button type="button" onClick={() => setForgotStep("login")} className="text-xs text-cyan-400 font-semibold hover:underline min-h-[36px] flex items-center cursor-pointer">
            Back to login
          </button>
        </form>
      );
    }

    if (forgotStep === "otp") {
      return (
        <form onSubmit={handleForgotOtpVerify} className="space-y-4">
          <div className="text-center text-xs text-slate-300">
            Enter the 6-digit code sent to <span className="text-cyan-300 font-mono font-bold">{forgotEmail}</span>.
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-2.5" onPaste={handleForgotOtpPaste}>
            {forgotOtpDigits.map((digit, index) => (
              <input
                key={index}
                ref={(node) => {
                  forgotInputRefs.current[index] = node;
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(event) => handleForgotOtpChange(index, event.target.value)}
                onKeyDown={(event) => handleForgotOtpKeyDown(index, event)}
                className="h-12 w-10 sm:w-11 rounded-xl border border-purple-500/40 bg-[#161626] text-center text-base font-bold text-white focus:outline-none focus:border-cyan-400 min-h-[44px]"
              />
            ))}
          </div>
          <button
            type="submit"
            disabled={forgotVerifyingOtp || forgotOtpDigits.join("").length !== 6}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg min-h-[48px] cursor-pointer"
          >
            {forgotVerifyingOtp ? "Verifying..." : "Verify OTP"}
            {forgotVerifyingOtp ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          </button>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <button type="button" onClick={() => handleForgotOtpSend()} className="text-cyan-400 hover:underline flex items-center gap-1 font-semibold min-h-[36px]" disabled={forgotSendingOtp || forgotCountdown > 0}>
              <RotateCcw size={14} /> {forgotSendingOtp ? "Sending..." : forgotCountdown > 0 ? `Resend in ${forgotCountdown}s` : "Resend OTP"}
            </button>
            <button type="button" onClick={() => setForgotStep("email")} className="hover:text-white font-semibold min-h-[36px] flex items-center">
              Change email
            </button>
          </div>
        </form>
      );
    }

    if (forgotStep === "password") {
      return (
        <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-200 block">New Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type={showForgotPassword ? "text" : "password"}
                value={forgotPassword}
                onChange={(e) => setForgotPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[#161626] border border-white/15 text-base sm:text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-cyan-400 min-h-[48px]"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowForgotPassword(!showForgotPassword)} className="w-10 h-10 absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#6b7280] hover:text-cyan-400 cursor-pointer">
                {showForgotPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-200 block">Confirm Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
              <input
                type={showForgotConfirmPassword ? "text" : "password"}
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                className="w-full pl-11 pr-11 py-3 rounded-2xl bg-[#161626] border border-white/15 text-base sm:text-sm text-white placeholder-[#6b7280] focus:outline-none focus:border-cyan-400 min-h-[48px]"
                placeholder="••••••••"
              />
              <button type="button" onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)} className="w-10 h-10 absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-[#6b7280] hover:text-cyan-400 cursor-pointer">
                {showForgotConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {forgotPassword.length > 0 && !forgotPasswordState.passed && (
            <ul className="ml-4 text-xs text-slate-400 list-disc space-y-1">
              {forgotPasswordState.checks.map((check) => (
                <li key={check.label}>{check.label}</li>
              ))}
            </ul>
          )}
          <button
            type="submit"
            disabled={forgotSubmitting || !forgotPasswordState.passed || forgotPassword !== forgotConfirmPassword}
            className="w-full py-3.5 rounded-2xl font-bold text-white text-sm bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg min-h-[48px] cursor-pointer"
          >
            {forgotSubmitting ? "Updating password..." : "Update Password"}
            {forgotSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
          <button type="button" onClick={() => setForgotStep("login")} className="text-xs text-cyan-400 font-semibold hover:underline min-h-[36px] flex items-center cursor-pointer">
            Back to login
          </button>
        </form>
      );
    }

    return null;
  };

  return (
    <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col justify-between">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        {error && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs sm:text-sm flex items-center gap-2">
            <AlertCircle size={18} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {forgotStep !== "login" ? (
          renderForgotPasswordFlow()
        ) : (
          <>
            <div className="space-y-1.5">
              <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 block">
                Email Address
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={handleKeyDownEnter}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-[#161626] border border-white/15 text-base sm:text-sm text-white placeholder-slate-400 font-medium focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 transition-all shadow-inner min-h-[48px]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200">
                  Password
                </label>
                <button type="button" onClick={() => setForgotStep("email")} className="text-xs text-cyan-400 font-semibold hover:underline min-h-[36px] flex items-center cursor-pointer">
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDownEnter}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-[#161626] border border-white/15 text-base sm:text-sm text-white placeholder-slate-400 font-medium focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 transition-all shadow-inner min-h-[48px]"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="w-10 h-10 absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center text-slate-400 hover:text-cyan-400 cursor-pointer">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1 min-h-[36px]">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-purple-500/40 bg-[#161626] text-cyan-400 focus:ring-cyan-400 focus:ring-offset-0 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs sm:text-sm text-slate-300 font-medium cursor-pointer select-none">
                Remember me on this device
              </label>
            </div>
          </>
        )}
      </div>

      <div className="flex-shrink-0 pt-3 space-y-3">
        {forgotStep === "login" ? (
          <>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 sm:py-4 rounded-2xl font-black text-white text-sm sm:text-base bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 flex items-center justify-center gap-2.5 group shadow-[0_0_20px_rgba(34,211,238,0.3),0_0_40px_rgba(139,92,246,0.2)] disabled:opacity-60 transition-all min-h-[48px] cursor-pointer"
            >
              {submitting ? "Signing in..." : "Login to AI Workspace"}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/15" />
              </div>
              <span className="relative px-3 bg-[#0C0C14] text-[10px] sm:text-xs uppercase font-extrabold text-slate-400 tracking-wider">
                OR CONTINUE WITH
              </span>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || submitting}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 hover:border-cyan-500/50 text-xs sm:text-sm font-bold text-slate-200 hover:text-white flex items-center justify-center gap-2.5 transition-all min-h-[46px] cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {googleLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-cyan-400" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center pt-2 text-xs sm:text-sm text-slate-300 font-medium">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={onSwitchToSignUp} className="text-cyan-400 font-extrabold hover:underline cursor-pointer ml-1 inline-flex items-center min-h-[36px]">
                Create Account &rarr;
              </button>
            </div>
          </>
        ) : null}
      </div>
    </form>
  );
}
