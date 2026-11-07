"use client";

import { X, Circle } from "lucide-react";

import { useTabs } from "./TabContext";
import { useEditorTheme } from "../EditorTheme";
import TabItem from "./TabItem";

export default function TabBar() {
  const { tabs } = useTabs();

  const { darkMode } = useEditorTheme();

  if (tabs.length === 0) {
    return (
      <div
        className={`h-11 flex items-center px-4 border-b ${
          darkMode
            ? "bg-[#11131B] border-white/10 text-gray-400"
            : "bg-white border-gray-300 text-gray-500"
        }`}
      >
        <Circle size={8} className="mr-2" />

        No file opened
      </div>
    );
  }

  return (
    <div
      className={`h-11 flex items-center overflow-x-auto no-scrollbar border-b shrink-0 ${
        darkMode
          ? "bg-[#11131B] border-white/10"
          : "bg-white border-gray-300"
      }`}
    >
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
        />
      ))}
    </div>
  );
}
