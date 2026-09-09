"use client";

import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FileCode2,
  FileText,
  File,
} from "lucide-react";

import { useTabs } from "../tabs/TabContext";

import { ExplorerItem } from "./ExplorerTypes";

import { useExplorer } from "./ExplorerContext";

import { useState } from "react";

import ExplorerContextMenu from "./ExplorerContextMenu";

interface Props {
  items: ExplorerItem[];
}

export default function ExplorerTree({
  items,
}: Props) {

  const {

  selectedFile,

  setSelectedFile,

  createFile,

  createFolder,

  renameItem,

  deleteItem,

  toggleFolder,

} = useExplorer();

const {
  openTab,
} = useTabs();

const [menu, setMenu] = useState<{

  x: number;

  y: number;

  item: ExplorerItem;

} | null>(null);

  return (

    <div className="space-y-1">

      {items.map((item) => {

        if (item.type === "folder") {

          return (

            <div key={item.id}>

              <div

  onClick={() => toggleFolder(item.id)}

  onContextMenu={(e) => {

    e.preventDefault();

    setMenu({

      x: e.clientX,

      y: e.clientY,

      item,

    });

  }}

  className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-white/5 cursor-pointer"

>

                {item.expanded ? (

                  <ChevronDown size={15} />

                ) : (

                  <ChevronRight size={15} />

                )}

                {item.expanded ? (

                  <FolderOpen
                    size={16}
                    className="text-yellow-400"
                  />

                ) : (

                  <Folder
                    size={16}
                    className="text-yellow-400"
                  />

                )}

                <span>

                  {item.name}

                </span>

              </div>

              {item.expanded &&
                item.children && (

                  <div className="ml-5 mt-1">

                    <ExplorerTree
                      items={item.children}
                    />

                  </div>

                )}

            </div>

          );

        }

        const active =
          selectedFile?.id === item.id;

        return (

          <button

  onContextMenu={(e) => {

    e.preventDefault();

    setMenu({

      x: e.clientX,

      y: e.clientY,

      item,

    });

  }}
            key={item.id}
            onClick={() => {

  setSelectedFile(item);

  const getCanonicalLang = (fileName: string, ext?: string): string => {
    const fn = (fileName || "").toLowerCase();
    if (fn.endsWith(".py")) return "python";
    if (fn.endsWith(".java")) return "java";
    if (fn.endsWith(".cpp") || fn.endsWith(".cc") || fn.endsWith(".cxx") || fn.endsWith(".h") || fn.endsWith(".hpp")) return "cpp";
    if (fn.endsWith(".c")) return "c";
    if (fn.endsWith(".js") || fn.endsWith(".jsx")) return "javascript";
    if (fn.endsWith(".ts") || fn.endsWith(".tsx")) return "typescript";
    if (fn.endsWith(".md")) return "markdown";
    if (fn.endsWith(".json")) return "json";
    return ext?.replace(".", "") || "text";
  };

  openTab({
    id: item.id,
    name: item.name,
    path: item.name,
    language: getCanonicalLang(item.name, item.extension),
    content: item.content || "",
    isDirty: false,
    isPinned: false,
  });

}}
            className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg text-left transition ${
              active
                ? "bg-blue-600 text-white"
                : "hover:bg-white/5"
            }`}
          >

            {item.extension === ".md" ? (

              <FileText size={15} />

            ) : item.extension === "" ? (

              <File size={15} />

            ) : (

              <FileCode2
                size={15}
                className="text-cyan-400"
              />

            )}

            {item.name}

          </button>

        );

      })}


      {menu && (

  <ExplorerContextMenu

    x={menu.x}

    y={menu.y}

    onClose={() => setMenu(null)}

    onNewFile={() => {

      createFile(menu.item.id);

      setMenu(null);

    }}

    onNewFolder={() => {

      createFolder(menu.item.id);

      setMenu(null);

    }}

    onRename={() => {

      const name = prompt(

        "Rename",

        menu.item.name

      );

      if (name) {

        renameItem(

          menu.item.id,

          name

        );

      }

      setMenu(null);

    }}

    onDelete={() => {

      deleteItem(menu.item.id);

      setMenu(null);

    }}

    onCopy={() => {

      alert("Copy coming soon");

      setMenu(null);

    }}

    onPaste={() => {

      alert("Paste coming soon");

      setMenu(null);

    }}

    onFavorite={() => {

      alert("Favorites coming soon");

      setMenu(null);

    }}

  />

)}

    </div>

  );

}