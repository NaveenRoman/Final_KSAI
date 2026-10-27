"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { safeParseResponse } from "@/lib/safe-json";
import {
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  CheckCircle2,
  Edit2,
  Loader2,
} from "lucide-react";

interface SignUpFormProps {
  onSubmitSuccess: (user: { name: string; email: string; role: string }) => void;
  onSwitchToLogin: () => void;
  googlePrefill?: {
    name: string;
    email: string;
    googleId?: string;
    emailVerified?: boolean;
  } | null;
}

interface FormTouchedState {
  name: boolean;
  email: boolean;
  phone: boolean;
  collegeName: boolean;
  department: boolean;
  currentYear: boolean;
  password: boolean;
  confirmPassword: boolean;
  acceptTerms: boolean;
}

const DEPARTMENT_OPTIONS = [
  "Artificial Intelligence & Data Science",
  "Computer Science Engineering",
  "Information Technology",
  "Electronics & Communication Engineering",
  "Electrical & Electronics Engineering",
  "Mechanical Engineering",
  "Civil Engineering",
  "Chemical Engineering",
  "MBA",
  "MCA",
  "BCA",
  "BSc",
  "Other",
];

const YEAR_OPTIONS = ["B.Tech I", "B.Tech II", "B.Tech III", "B.Tech IV", "Others"];

interface DarkSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  hasError: boolean;
  onBlur?: () => void;
}

function DarkSelect({ value, onChange, options, placeholder, hasError, onBlur }: DarkSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedLabel = options.find((option) => option === value) ?? placeholder;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false);
          onBlur?.();
        }
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400 ${
          hasError ? "border-red-500/70 focus:border-red-400" : "border-white/15"
        } ${value ? "text-white" : "text-slate-400"}`}
        style={{ backgroundColor: "#161626" }}
      >
        <span className="truncate">{selectedLabel}</span>
        <span className="ml-2 text-slate-400">▾</span>
      </button>

      {isOpen && (
        <div className="absolute z-30 mt-1.5 w-full rounded-xl border border-white/15 bg-[#0C0C14]/95 p-1.5 shadow-2xl backdrop-blur-xl max-h-48 overflow-y-auto custom-scrollbar">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option);
                setIsOpen(false);
              }}
              className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-xs sm:text-sm transition-colors ${
                value === option ? "bg-cyan-500/20 text-cyan-300 font-bold" : "text-slate-200 hover:bg-white/10 hover:text-white"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function validatePassword(password: string) {
  const checks = [
    { label: "8+ characters", passed: password.length >= 8 },
    { label: "Uppercase", passed: /[A-Z]/.test(password) },
    { label: "Lowercase", passed: /[a-z]/.test(password) },
    { label: "Number", passed: /\d/.test(password) },
    { label: "Special character", passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const passedCount = checks.filter((check) => check.passed).length;
  const strength = passedCount <= 2 ? "Weak" : passedCount <= 4 ? "Good" : "Strong";

  return { checks, strength, passed: passedCount === checks.length };
}

function validateName(name: string) {
  if (!name.trim()) return "Full name is required.";
  if (name.trim().length < 3 || name.trim().length > 50) return "Name must be between 3 and 50 characters.";
  return null;
}

function validateEmail(email: string) {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email.trim()) return "Email is required.";
  if (!emailPattern.test(email.trim().toLowerCase())) return "Please enter a valid email address.";
  return null;
}

function validatePhone(phone: string) {
  if (!phone.trim()) return "Phone number is required.";
  if (!/^[0-9]{10}$/.test(phone.replace(/\D/g, ""))) return "Phone number must be exactly 10 digits.";
  return null;
}

function validateCollegeName(value: string) {
  if (!value.trim()) return "College name is required for students.";
  return null;
}

function validateDepartment(value: string) {
  if (!value) return "Department is required for students.";
  return null;
}

function validateCurrentYear(value: string) {
  if (!value) return "Current studying year is required for students.";
  return null;
}

function validateTerms(value: boolean) {
  if (!value) return "Please accept the terms and privacy policy.";
  return null;
}

export function SignUpForm({ onSubmitSuccess, onSwitchToLogin, googlePrefill }: SignUpFormProps) {
  const [step, setStep] = useState<"email" | "otp" | "profile">(googlePrefill ? "profile" : "email");
  const [name, setName] = useState(googlePrefill?.name || "");
  const [email, setEmail] = useState(googlePrefill?.email || "");
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [phone, setPhone] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [department, setDepartment] = useState("");
  const [currentYear, setCurrentYear] = useState("");
  const [customDepartment, setCustomDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpInputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (googlePrefill) {
      if (googlePrefill.name) setName(googlePrefill.name);
      if (googlePrefill.email) setEmail(googlePrefill.email);
      setStep("profile");
    }
  }, [googlePrefill]);

  useEffect(() => {
    if (otpCountdown <= 0) return;
    const timer = window.setInterval(() => setOtpCountdown((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [otpCountdown]);

  useEffect(() => {
    if (step === "otp" && otpDigits.join("").length === 6 && !verifyingOtp) {
      void handleVerifyOtp();
    }
  }, [otpDigits, step, verifyingOtp]);

  const [touched, setTouched] = useState<FormTouchedState>({
    name: false,
    email: false,
    phone: false,
    collegeName: false,
    department: false,
    currentYear: false,
    password: false,
    confirmPassword: false,
    acceptTerms: false,
  });

  const passwordState = useMemo(() => validatePassword(password), [password]);
  const role = "Student";
  const otpCode = otpDigits.join("");

  const validationErrors = useMemo(() => ({
    name: touched.name ? validateName(name) : null,
    email: touched.email ? validateEmail(email) : null,
    phone: touched.phone ? validatePhone(phone) : null,
    collegeName: touched.collegeName ? validateCollegeName(collegeName) : null,
    department: touched.department ? validateDepartment(department) : null,
    currentYear: touched.currentYear ? validateCurrentYear(currentYear) : null,
    password: touched.password ? (passwordState.passed ? null : "Password must include 8+ characters, uppercase, lowercase, number, and a special character.") : null,
    confirmPassword: touched.confirmPassword ? (confirmPassword && confirmPassword === password ? null : "Passwords do not match.") : null,
    acceptTerms: touched.acceptTerms ? validateTerms(acceptTerms) : null,
  }), [acceptTerms, collegeName, confirmPassword, currentYear, department, email, name, password, passwordState.passed, phone, touched]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }

    setSendingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup" }),
      });

      const parsed = await safeParseResponse<{ error?: string; success?: boolean }>(res, "Signup OTP");
      if (!parsed.ok || parsed.data?.error) {
        setError(parsed.data?.error || parsed.error || "Failed to send OTP code.");
        setSendingOtp(false);
        return;
      }

      setOtpDigits(Array(6).fill(""));
      setOtpCountdown(60);
      setSuccessMessage("Verification code sent successfully. We have sent a verification code to your email.");
      setStep("otp");
    } catch (err) {
      console.error(err);
      setError("Network error sending OTP code.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const code = otpDigits.join("");
    if (!code || code.length !== 6) {
      return;
    }

    setVerifyingOtp(true);
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: code }),
      });

      const parsed = await safeParseResponse<{ error?: string; success?: boolean }>(res, "OTP Verification");
      if (!parsed.ok || parsed.data?.error) {
        setError(parsed.data?.error || parsed.error || "Verification failed.");
        setVerifyingOtp(false);
        return;
      }

      setSuccessMessage("Email verified successfully. Continue to complete your profile.");
      setStep("profile");
    } catch (err) {
      console.error(err);
      setError("Network error verifying OTP code.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      name: true,
      email: true,
      phone: true,
      collegeName: true,
      department: true,
      currentYear: true,
      password: true,
      confirmPassword: true,
      acceptTerms: true,
    });

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.replace(/\D/g, "");
    const nameError = validateName(trimmedName);
    const emailError = validateEmail(trimmedEmail);
    const phoneError = validatePhone(trimmedPhone);
    const collegeError = validateCollegeName(collegeName);
    const departmentError = validateDepartment(department);
    const yearError = validateCurrentYear(currentYear);
    const passwordError = passwordState.passed ? null : "Password must meet all complexity requirements.";
    const confirmError = password !== confirmPassword ? "Passwords do not match." : null;
    const termsError = validateTerms(acceptTerms);

    const formErrors = [nameError, emailError, phoneError, collegeError, departmentError, yearError, passwordError, confirmError, termsError].filter(Boolean);

    if (formErrors.length > 0) {
      setError("Please complete all required fields before continuing.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          password,
          phone: trimmedPhone,
          collegeName: collegeName.trim() || null,
          department: department === "Other" ? customDepartment.trim() || null : department || null,
          currentYear: currentYear || null,
          role,
          googleId: googlePrefill?.googleId || null,
        }),
      });

      const parsed = await safeParseResponse<{ user?: any; error?: string }>(res, "Registration");

      if (!parsed.ok || !parsed.data?.user) {
        setError(parsed.data?.error || parsed.error || "Registration failed.");
        setSubmitting(false);
        return;
      }

      onSubmitSuccess(parsed.data.user);
    } catch (err) {
      console.error(err);
      setError("Network error creating your account.");
      setSubmitting(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const sanitized = value.replace(/\D/g, "").slice(0, 1);
    const nextDigits = [...otpDigits];
    nextDigits[index] = sanitized;
    setOtpDigits(nextDigits);

    if (sanitized && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !otpDigits[index] && index > 0) {
      const nextDigits = [...otpDigits];
      nextDigits[index - 1] = "";
      setOtpDigits(nextDigits);
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    event.preventDefault();
    const nextDigits = Array(6).fill("");
    pasted.split("").forEach((digit, index) => {
      nextDigits[index] = digit;
    });
    setOtpDigits(nextDigits);
  };

  const inputClassName = (hasError: boolean) =>
    `w-full px-3.5 py-2.5 rounded-xl bg-[#161626] border text-white placeholder-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/40 ${
      hasError ? "border-red-500/70 focus:border-red-400" : "border-white/15"
    }`;

  const fieldLabelClassName = "text-xs font-bold uppercase tracking-wider text-slate-200 block mb-1";

  return (
    <div className="w-full">
      {error && (
        <div className="p-2.5 mb-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-2.5 mb-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-medium">
          <span className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 size={15} className="text-emerald-400 shrink-0" /> {successMessage}
          </span>
        </div>
      )}

      {step === "email" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="text-center space-y-1.5 py-2">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400 mb-2 shadow-lg">
              <ShieldCheck size={26} />
            </div>
            <h3 className="text-xl font-bold text-white">Verify Your Email First</h3>
            <p className="text-xs text-slate-300 font-medium max-w-sm mx-auto">
              Enter your email address below to receive a secure 6-digit verification code.
            </p>
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <label className={fieldLabelClassName}>Email Address</label>
            <div className="relative">
              <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cyan-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                placeholder="alex@tech.com"
                className={`pl-11 pr-4 ${inputClassName(false)}`}
              />
            </div>
          </div>

          <div className="pt-2 space-y-3 max-w-md mx-auto">
            <button
              type="submit"
              disabled={sendingOtp || !email.trim()}
              className="w-full py-3 rounded-xl font-extrabold text-white text-xs sm:text-sm bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 glow-btn flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl"
            >
              {sendingOtp ? "Sending OTP Code..." : "Verify Email & Send OTP"}
              {sendingOtp ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium">
              <span>Already have an account?</span>
              <button type="button" onClick={onSwitchToLogin} className="text-cyan-400 font-bold hover:underline">
                Login &rarr;
              </button>
            </div>
          </div>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="text-center space-y-1.5 py-1">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-purple-400 mb-2 shadow-lg">
              <KeyRound size={26} />
            </div>
            <h3 className="text-xl font-bold text-white">Verify Your Email</h3>
            <p className="text-xs text-slate-300 font-medium">
              We sent a 6-digit code to <strong className="text-cyan-300 font-mono">{email}</strong>.
            </p>
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <div className="flex items-center justify-between">
              <label className={fieldLabelClassName}>Verification Code</label>
              <button type="button" onClick={() => setStep("email")} className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-semibold">
                <Edit2 size={12} /> Change email
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(node) => {
                    otpInputRefs.current[index] = node;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus={index === 0}
                  maxLength={1}
                  value={digit}
                  onChange={(event) => handleOtpChange(index, event.target.value)}
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  className="h-11 w-10 rounded-xl border border-purple-500/40 bg-[#161626] text-center text-base font-bold text-white outline-none focus:border-cyan-400"
                />
              ))}
            </div>
          </div>

          <div className="pt-2 space-y-3 max-w-md mx-auto">
            <button
              type="submit"
              disabled={verifyingOtp || otpCode.length !== 6}
              className="w-full py-3 rounded-xl font-extrabold text-white text-xs sm:text-sm bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 glow-btn flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl"
            >
              {verifyingOtp ? "Verifying..." : "Verify OTP Code & Proceed"}
              {verifyingOtp ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-300 px-1">
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={sendingOtp || otpCountdown > 0}
                className="text-cyan-400 hover:underline flex items-center gap-1 font-bold disabled:text-slate-500"
              >
                <RotateCcw size={14} /> {sendingOtp ? "Resending..." : otpCountdown > 0 ? `Resend in ${otpCountdown}s` : "Resend OTP"}
              </button>

              <button type="button" onClick={onSwitchToLogin} className="text-slate-300 hover:text-white font-medium">
                Back to Login
              </button>
            </div>
          </div>
        </form>
      )}

      {step === "profile" && (
        <form onSubmit={handleSubmitProfile} className="space-y-3.5">
          {/* Email Verified Badge Bar */}
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between font-medium">
            <span className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 size={15} className="text-emerald-400 shrink-0" /> Verified Email
            </span>
            <span className="font-mono text-cyan-300 text-xs font-semibold">{email}</span>
          </div>

          {/* Clean 2-Column Responsive Grid (No Scrolling Needed!) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Row 1: Full Name & Phone Number */}
            <div className="space-y-1">
              <label className={fieldLabelClassName}>Full Name</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, name: true }))}
                  placeholder="Alex Rivera"
                  className={`pl-9 ${inputClassName(Boolean(validationErrors.name))}`}
                />
              </div>
              {validationErrors.name && <p className="text-[11px] text-red-300">{validationErrors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className={fieldLabelClassName}>Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onBlur={() => setTouched((prev) => ({ ...prev, phone: true }))}
                  placeholder="9876543210"
                  className={`pl-9 ${inputClassName(Boolean(validationErrors.phone))}`}
                />
              </div>
              {validationErrors.phone && <p className="text-[11px] text-red-300">{validationErrors.phone}</p>}
            </div>

            {/* Row 2: College Name & Department */}
            <div className="space-y-1">
              <label className={fieldLabelClassName}>College Name</label>
              <input
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                onBlur={() => setTouched((prev) => ({ ...prev, collegeName: true }))}
                placeholder="Enter College Name"
                className={inputClassName(Boolean(validationErrors.collegeName))}
              />
              {validationErrors.collegeName && <p className="text-[11px] text-red-300">{validationErrors.collegeName}</p>}
            </div>

            <div className="space-y-1">
              <label className={fieldLabelClassName}>Department</label>
              <DarkSelect
                value={department}
                onChange={(value) => {
                  setDepartment(value);
                  setTouched((prev) => ({ ...prev, department: true }));
                }}
                options={DEPARTMENT_OPTIONS}
                placeholder="Select Department"
                hasError={Boolean(validationErrors.department)}
                onBlur={() => setTouched((prev) => ({ ...prev, department: true }))}
              />
              {validationErrors.department && <p className="text-[11px] text-red-300">{validationErrors.department}</p>}
            </div>

            {/* Row 3: Current Studying Year & Custom Dept (if applicable) */}
            <div className="space-y-1">
              <label className={fieldLabelClassName}>Current Studying Year</label>
              <DarkSelect
                value={currentYear}
                onChange={(value) => {
                  setCurrentYear(value);
                  setTouched((prev) => ({ ...prev, currentYear: true }));
                }}
                options={YEAR_OPTIONS}
                placeholder="Select Year"
                hasError={Boolean(validationErrors.currentYear)}
                onBlur={() => setTouched((prev) => ({ ...prev, currentYear: true }))}
              />
              {validationErrors.currentYear && <p className="text-[11px] text-red-300">{validationErrors.currentYear}</p>}
            </div>

            {department === "Other" ? (
              <div className="space-y-1">
                <label className={fieldLabelClassName}>Custom Department</label>
                <input
                  type="text"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  placeholder="Enter Department"
                  className={inputClassName(false)}
                />
              </div>
            ) : null}

            {/* Row 4: Password & Confirm Password */}
            <div className="space-y-1">
              <label className={fieldLabelClassName}>Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
                  placeholder="••••••••"
                  className={`pl-9 pr-8 ${inputClassName(Boolean(validationErrors.password))}`}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {validationErrors.password && <p className="text-[11px] text-red-300">{validationErrors.password}</p>}
            </div>

            <div className="space-y-1">
              <label className={fieldLabelClassName}>Confirm Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setTouched((prev) => ({ ...prev, confirmPassword: true }))}
                  placeholder="••••••••"
                  className={`pl-9 pr-8 ${inputClassName(Boolean(validationErrors.confirmPassword))}`}
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {validationErrors.confirmPassword && <p className="text-[11px] text-red-300">{validationErrors.confirmPassword}</p>}
            </div>
          </div>

          {/* Bottom Actions & Terms */}
          <div className="pt-2 border-t border-white/15 space-y-2.5">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptTerms}
                onChange={(e) => {
                  setAcceptTerms(e.target.checked);
                  setTouched((prev) => ({ ...prev, acceptTerms: true }));
                }}
                className="rounded border-white/20 bg-white/5 text-cyan-500 w-4 h-4 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-slate-300 cursor-pointer font-medium">
                I agree to KnowledgeStream AI <a href="#" onClick={(e) => e.preventDefault()} className="text-cyan-400 underline font-semibold">Terms of Service</a> &amp; <a href="#" onClick={(e) => e.preventDefault()} className="text-cyan-400 underline font-semibold">Privacy Policy</a>
              </label>
            </div>
            {validationErrors.acceptTerms && <p className="text-xs text-red-300">{validationErrors.acceptTerms}</p>}

            <button
              type="submit"
              disabled={submitting || !acceptTerms || !passwordState.passed || password !== confirmPassword}
              className="w-full py-3 rounded-xl font-extrabold text-white text-sm bg-gradient-to-r from-blue-600 via-purple-600 to-cyan-500 glow-btn flex items-center justify-center gap-2 group disabled:opacity-50 shadow-xl"
            >
              {submitting ? "Creating Account..." : "Create Account & Start"}
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-300 font-medium">
              <span>Already have an account?</span>
              <button type="button" onClick={onSwitchToLogin} className="text-cyan-400 font-bold hover:underline">
                Login &rarr;
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
