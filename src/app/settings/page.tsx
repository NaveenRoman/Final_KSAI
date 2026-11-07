"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { LeftSidebar } from "@/components/dashboard/LeftSidebar";
import {
  User, Lock, ShieldCheck, Check, Key, Eye, EyeOff,
  Save, Sparkles, CheckCircle2, RefreshCw, AlertTriangle, Menu
} from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // User Profile Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [college, setCollege] = useState("");
  const [department, setDepartment] = useState("");
  const [currentYear, setCurrentYear] = useState("");
  const [country, setCountry] = useState("United States");
  const [role, setRole] = useState("Student");

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Eye toggle state for password viewing
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback States
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Validation Rules (Same criteria as Signup)
  const passwordRules = useMemo(() => {
    return {
      minLength: newPassword.length >= 8,
      hasUpper: /[A-Z]/.test(newPassword),
      hasLower: /[a-z]/.test(newPassword),
      hasNumber: /[0-9]/.test(newPassword),
      hasSpecial: /[^A-Za-z0-9]/.test(newPassword),
    };
  }, [newPassword]);

  const isNewPasswordValid = useMemo(() => {
    return Object.values(passwordRules).every(Boolean);
  }, [passwordRules]);

  const doPasswordsMatch = useMemo(() => {
    return newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  }, [newPassword, confirmPassword]);

  // Load user data on mount
  useEffect(() => {
    async function loadUserData() {
      try {
        const res = await fetch("/api/auth/me");
        const json = await res.json();
        if (res.ok && json.user) {
          const u = json.user;
          setName(u.name || "");
          setEmail(u.email || "");
          setPhone(u.phone || "");
          setCollege(u.college || "");
          setDepartment(u.department || "");
          setCurrentYear(u.currentYear || "");
          setCountry(u.country || "United States");
          setRole(u.role || "Student");
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
      } finally {
        setLoading(false);
      }
    }
    if (!isPending) {
      if (!session) {
        // Fallback: verify server session before redirecting to avoid client-side race conditions
        fetch("/api/auth/me")
          .then((res) => {
            if (!res.ok) {
              router.push("/auth");
            } else {
              loadUserData();
            }
          })
          .catch(() => router.push("/auth"));
      } else {
        loadUserData();
      }
    }
  }, [session, isPending, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/settings/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          currentYear,
          country,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage("Profile settings updated successfully!");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(data.error || "Failed to update profile settings.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Network error updating profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!isNewPasswordValid) {
      setErrorMessage("New password does not meet security requirements.");
      setSavingPassword(false);
      return;
    }

    if (!doPasswordsMatch) {
      setErrorMessage("New passwords do not match.");
      setSavingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/settings/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccessMessage("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(data.error || "Failed to change password.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Network error changing password.");
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading || isPending) {
    return (
      <div className="h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#4F46E5]" size={32} />
          <span className="text-xs font-bold text-slate-500 font-mono">Loading Settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#F8FAFC] text-slate-800 flex overflow-hidden font-sans antialiased">
      {/* Left Sidebar Menu */}
      <LeftSidebar
        activeTab="Settings"
        fullHeight={true}
      />

      {/* Main Workspace Content Area */}
      <main className="flex-1 h-full flex flex-col overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 w-full custom-scrollbar">
        {/* Top Header Banner */}
        <div className="glass-panel p-4 sm:p-6 rounded-3xl border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            {/* Mobile Global Navigation Toggle (< 768px) */}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("ksai-toggle-mobile-sidebar"));
                }
              }}
              aria-label="Open navigation menu"
              className="md:hidden w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 transition-all cursor-pointer shrink-0 mt-0.5"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-[#4F46E5] text-xs font-bold border border-blue-100 mb-2">
                <Sparkles size={13} /> Account &amp; Preferences
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Settings ⚙️
              </h1>
              <p className="text-slate-500 text-xs sm:text-sm mt-1">
                Manage your personal profile and security password options.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-mono font-bold border border-slate-200">
              Role: <span className="text-[#4F46E5] font-black">{role}</span>
            </span>
          </div>
        </div>

        {/* Global Feedback Banners */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-sm">
            <AlertTriangle size={18} className="text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Settings Tab Navigation & Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          {/* Left Sub-Tab Navigation Pills */}
          <div className="lg:col-span-3 space-y-1.5">
            <button
              onClick={() => setActiveTab("profile")}
              className={`w-full p-3.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer border ${
                activeTab === "profile"
                  ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-md shadow-indigo-500/20"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <User size={16} /> Profile Details
            </button>

            <button
              onClick={() => setActiveTab("security")}
              className={`w-full p-3.5 rounded-2xl text-xs font-black flex items-center gap-3 transition-all cursor-pointer border ${
                activeTab === "security"
                  ? "bg-[#4F46E5] text-white border-[#4F46E5] shadow-md shadow-indigo-500/20"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Lock size={16} /> Security &amp; Password
            </button>
          </div>

          {/* Main Right Content Panel */}
          <div className="lg:col-span-9 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
            {/* Tab 1: Profile Details */}
            {activeTab === "profile" && (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <User size={18} className="text-[#4F46E5]" /> Personal Profile
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    View registered account information and update contact details.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name (Non-editable) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700">Full Name</label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">🔒 Signup Field</span>
                    </div>
                    <input
                      type="text"
                      value={name}
                      disabled
                      title="Name provided at registration is non-editable"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Email Address (Non-editable) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700">Email Address (Account ID)</label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">🔒 Signup Field</span>
                    </div>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-mono font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Phone Number (Editable) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Country (Editable) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700">Country / Region</label>
                    <input
                      type="text"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="India"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                    />
                  </div>

                  {/* College / Institution (Non-editable) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700">College / Institution</label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">🔒 Registered College</span>
                    </div>
                    <input
                      type="text"
                      value={college}
                      disabled
                      title="College name provided at signup is non-editable"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Department / Branch (Non-editable) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-700">Department / Branch</label>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">🔒 Registered Branch</span>
                    </div>
                    <input
                      type="text"
                      value={department}
                      disabled
                      title="Branch provided at signup is non-editable"
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-500 cursor-not-allowed"
                    />
                  </div>

                  {/* Current Year (Editable) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-black text-slate-700">Current Year of Study</label>
                    <select
                      value={currentYear}
                      onChange={(e) => setCurrentYear(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-all cursor-pointer"
                    >
                      <option value="1st Year (Freshman)">1st Year (Freshman)</option>
                      <option value="2nd Year (Sophomore)">2nd Year (Sophomore)</option>
                      <option value="3rd Year (Junior)">3rd Year (Junior)</option>
                      <option value="4th Year (Senior)">4th Year (Senior)</option>
                      <option value="Postgraduate / Alumni">Postgraduate / Alumni</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save Profile Changes
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Security & Password */}
            {activeTab === "security" && (
              <form onSubmit={handleChangePassword} className="space-y-6">
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <Lock size={18} className="text-[#4F46E5]" /> Security &amp; Password
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Update your account password. View password as you type using the eye toggle.
                  </p>
                </div>

                <div className="space-y-4 max-w-md">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        placeholder="Enter current password"
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        placeholder="Enter new password"
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {/* Password Strength Requirements Indicator (Signup Criteria) */}
                    {newPassword.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[11px]">
                        <div className="font-bold text-slate-700">Password Requirements:</div>
                        <div className="grid grid-cols-2 gap-1 font-semibold">
                          <span className={passwordRules.minLength ? "text-emerald-600 flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                            {passwordRules.minLength ? "✓" : "○"} 8+ Characters
                          </span>
                          <span className={passwordRules.hasUpper ? "text-emerald-600 flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                            {passwordRules.hasUpper ? "✓" : "○"} Uppercase (A-Z)
                          </span>
                          <span className={passwordRules.hasLower ? "text-emerald-600 flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                            {passwordRules.hasLower ? "✓" : "○"} Lowercase (a-z)
                          </span>
                          <span className={passwordRules.hasNumber ? "text-emerald-600 flex items-center gap-1" : "text-slate-400 flex items-center gap-1"}>
                            {passwordRules.hasNumber ? "✓" : "○"} Number (0-9)
                          </span>
                          <span className={`${passwordRules.hasSpecial ? "text-emerald-600 flex items-center gap-1" : "text-slate-400 flex items-center gap-1"} col-span-2`}>
                            {passwordRules.hasSpecial ? "✓" : "○"} Special Character (!@#$%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="Confirm new password"
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:outline-none focus:border-[#4F46E5] focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>

                    {confirmPassword.length > 0 && (
                      <div className="text-[11px] font-bold">
                        {doPasswordsMatch ? (
                          <span className="text-emerald-600 flex items-center gap-1">✓ Passwords match</span>
                        ) : (
                          <span className="text-red-500 flex items-center gap-1">✗ Passwords do not match</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 space-y-2">
                  <div className="text-xs font-extrabold text-[#4F46E5] flex items-center gap-1.5">
                    <ShieldCheck size={16} /> Active Session Security
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                    Your password will be encrypted with bcrypt (salt round 10) and synchronized across session storage.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingPassword || (newPassword.length > 0 && (!isNewPasswordValid || !doPasswordsMatch))}
                    className="px-6 py-2.5 rounded-xl bg-[#4F46E5] hover:bg-[#4338CA] text-white text-xs font-black flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
                  >
                    {savingPassword ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Key size={14} />
                    )}
                    Update Password
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
