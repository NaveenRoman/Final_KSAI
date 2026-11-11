"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Plus,
  Trophy,
  Code2,
  Layers,
  ExternalLink,
  Star,
  Edit,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Search,
} from "lucide-react";

interface CourseItem {
  id: string;
  title: string;
  description: string;
  language: string;
  price: number;
  validityDays: number;
  instructor: string;
  level: string;
  category: string;
  thumbnail: string;
  duration: string;
  lessons: number;
  rating: number;
  createdAt: string | Date;
  chapters: Array<{ id: string; title: string; orderNumber: number }>;
  _count: { enrollments: number };
}

interface CourseManagementClientProps {
  initialCourses: CourseItem[];
  autoOpenCreate?: boolean;
}

export function CourseManagementClient({
  initialCourses,
  autoOpenCreate = false,
}: CourseManagementClientProps) {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseItem[]>(initialCourses);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(autoOpenCreate);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createLang, setCreateLang] = useState("cpp");
  const [createPrice, setCreatePrice] = useState(1999);
  const [createValidity, setCreateValidity] = useState(90);
  const [createLevel, setCreateLevel] = useState("Beginner");
  const [createLessons, setCreateLessons] = useState(12);
  const [createDuration, setCreateDuration] = useState("40 Hours");
  const [createInstructor, setCreateInstructor] = useState("KnowledgeStream Faculty");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState(1999);
  const [editValidity, setEditValidity] = useState(90);
  const [editInstructor, setEditInstructor] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (createTitle.trim().length < 3) {
      setCreateError("Title must be at least 3 characters.");
      return;
    }
    if (createDesc.trim().length < 10) {
      setCreateError("Description must be at least 10 characters.");
      return;
    }

    try {
      setCreateSubmitting(true);
      const res = await fetch("/api/admin/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDesc.trim(),
          language: createLang,
          price: Number(createPrice),
          validityDays: Number(createValidity),
          level: createLevel,
          lessons: Number(createLessons),
          duration: createDuration.trim(),
          instructor: createInstructor.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create course");
      }

      setFeedback(`Course "${createTitle}" created successfully.`);
      setIsCreateOpen(false);
      setCreateTitle("");
      setCreateDesc("");
      router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create course");
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    setEditError(null);

    try {
      setEditSubmitting(true);
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCourse.id,
          title: editTitle.trim(),
          description: editDesc.trim(),
          price: Number(editPrice),
          validityDays: Number(editValidity),
          instructor: editInstructor.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update course");
      }

      setFeedback(`Course "${editTitle}" updated successfully.`);
      setEditingCourse(null);
      router.refresh();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setEditError(err.message || "Failed to update course");
    } finally {
      setEditSubmitting(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    const matchesLang = selectedLanguage === "ALL" || c.language.toLowerCase() === selectedLanguage.toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q);
    return matchesLang && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Quick Nav Pills to Contests, Submissions, Leaderboard */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/contests"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200 transition-colors"
          >
            <Trophy size={13} />
            <span>Manage Contests</span>
          </Link>
          <Link
            href="/admin/submissions"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors"
          >
            <Code2 size={13} />
            <span>Student Submissions</span>
          </Link>
          <Link
            href="/admin/leaderboard"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs border border-purple-200 transition-colors"
          >
            <Layers size={13} />
            <span>Leaderboard Monitor</span>
          </Link>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
        >
          <Plus size={14} />
          <span>Add New Course</span>
        </button>
      </div>

      {/* Success Notification Banner */}
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span className="font-semibold">{feedback}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "c", "cpp", "python", "java"].map((lang) => (
            <button
              key={lang}
              onClick={() => setSelectedLanguage(lang)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer ${
                selectedLanguage === lang
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lang === "ALL" ? "All Tracks" : lang.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search curriculum tracks..."
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
          />
          <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
        </div>
      </div>

      {/* Courses Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredCourses.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-3xl bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                  {c.language.toUpperCase()}
                </span>
                <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star size={12} className="fill-amber-400" /> {c.rating}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900 line-clamp-2 leading-snug">
                  {c.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Chapters</span>
                  <strong className="text-slate-900 font-black">{c.chapters.length} Modules</strong>
                </div>
                <div className="p-2 rounded-xl bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Enrolled</span>
                  <strong className="text-blue-600 font-black">{c._count.enrollments} Students</strong>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-black text-slate-900">₹{c.price.toLocaleString("en-IN")}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setEditingCourse(c);
                    setEditTitle(c.title);
                    setEditDesc(c.description);
                    setEditPrice(c.price);
                    setEditValidity(c.validityDays);
                    setEditInstructor(c.instructor);
                    setEditError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Edit size={11} />
                  <span>Edit</span>
                </button>
                <Link
                  href={`/courses/${c.language}/overview`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <span>Syllabus</span>
                  <ExternalLink size={12} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE COURSE MODAL */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" />
                Add New Curriculum Course
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Advanced DSA & Algorithms Architecture"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Enter comprehensive curriculum overview..."
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Language Track *</label>
                  <select
                    value={createLang}
                    onChange={(e) => setCreateLang(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="cpp">C++ (cpp)</option>
                    <option value="c">C Language (c)</option>
                    <option value="python">Python (python)</option>
                    <option value="java">Java (java)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={createPrice}
                    onChange={(e) => setCreatePrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Level</label>
                  <select
                    value={createLevel}
                    onChange={(e) => setCreateLevel(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Lessons</label>
                  <input
                    type="number"
                    min="1"
                    value={createLessons}
                    onChange={(e) => setCreateLessons(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="30"
                    value={createValidity}
                    onChange={(e) => setCreateValidity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instructor Name</label>
                <input
                  type="text"
                  value={createInstructor}
                  onChange={(e) => setCreateInstructor(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {createSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Create Course</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COURSE MODAL */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit size={18} className="text-blue-600" />
                Edit Course Metadata
              </h3>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateCourse} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Course Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Description *</label>
                <textarea
                  rows={2}
                  required
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Price (₹ INR) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editPrice}
                    onChange={(e) => setEditPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Validity (Days)</label>
                  <input
                    type="number"
                    min="30"
                    value={editValidity}
                    onChange={(e) => setEditValidity(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Instructor Name</label>
                <input
                  type="text"
                  value={editInstructor}
                  onChange={(e) => setEditInstructor(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingCourse(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  {editSubmitting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
