import type { Metadata, Viewport } from "next";
import "./globals.css";

import { SmoothScroll } from "@/components/providers/SmoothScroll";
import { Providers } from "@/components/providers/Providers";
import { ThemeManager } from "@/components/providers/ThemeManager";
import { NotificationProvider } from "@/components/ui/NotificationContext"; // ✅ ADD THIS

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090B" },
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
  ],
};

export const metadata: Metadata = {
  title: "KnowledgeStream AI — Futuristic AI Operating System",
  description:
    "An intelligent ecosystem for students, developers, companies, and educators combining AI learning, coding assistance, workforce management, and productivity.",
  keywords: [
    "KnowledgeStream AI",
    "AI Learning Platform",
    "AI Code Assistant",
    "Autonomous AI Workforce",
    "Futuristic 3D Platform",
    "Developer Tools",
  ],
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className="bg-[#09090B] text-white antialiased selection:bg-blue-500 selection:text-white">
        <Providers>
          <ThemeManager />

          {/* ✅ THIS IS THE FIX */}
          <NotificationProvider>
            <SmoothScroll>{children}</SmoothScroll>
          </NotificationProvider>

        </Providers>
      </body>
    </html>
  );
}
