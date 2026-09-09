import fs from "fs";
import path from "path";
import { execSync } from "child_process";

let cachedCCompiler: string | null | undefined = undefined;
let cachedCppCompiler: string | null | undefined = undefined;

/**
 * Ensures the compiler's bin directory is prepended to process.env.PATH
 * so that both the compiler and the compiled executable find necessary runtime DLLs.
 */
export function ensureCompilerOnPath(compilerPath: string): void {
  try {
    const binDir = path.dirname(compilerPath);
    const currentPath = process.env.PATH || "";
    const paths = currentPath.split(path.delimiter);
    if (!paths.includes(binDir)) {
      process.env.PATH = `${binDir}${path.delimiter}${currentPath}`;
    }
  } catch {}
}

/**
 * Resolves the full path to a valid C or C++ compiler.
 * Searches:
 * 1. Current process.env.PATH
 * 2. WinGet package directories (e.g. WinLibs, MinGW)
 * 3. Standard Windows locations (C:\MinGW, C:\mingw64, C:\msys64, C:\TDM-GCC, etc.)
 */
export function resolveCompiler(isCpp: boolean = false): string | null {
  if (isCpp && cachedCppCompiler !== undefined) return cachedCppCompiler;
  if (!isCpp && cachedCCompiler !== undefined) return cachedCCompiler;

  const binaryBase = isCpp ? "g++" : "gcc";
  const binaryExe = process.platform === "win32" ? `${binaryBase}.exe` : binaryBase;

  // 1. Check if compiler is already accessible via PATH
  try {
    const checkCmd = process.platform === "win32" ? `where ${binaryBase}` : `which ${binaryBase}`;
    const output = execSync(checkCmd, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
      env: process.env,
    }).trim();

    if (output) {
      const firstLine = output.split(/\r?\n/)[0].trim();
      if (fs.existsSync(firstLine)) {
        ensureCompilerOnPath(firstLine);
        if (isCpp) cachedCppCompiler = firstLine;
        else cachedCCompiler = firstLine;
        return firstLine;
      }
    }
  } catch {}

  // 2. On Windows, search known toolchain installation directories
  if (process.platform === "win32") {
    const candidatePaths: string[] = [];

    const localAppData = process.env.LOCALAPPDATA || "";
    const userProfile = process.env.USERPROFILE || "";
    const programFiles = process.env.ProgramFiles || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

    // A. WinGet Packages directory
    if (localAppData) {
      const wingetPkgsDir = path.join(localAppData, "Microsoft", "WinGet", "Packages");
      if (fs.existsSync(wingetPkgsDir)) {
        try {
          const pkgs = fs.readdirSync(wingetPkgsDir);
          for (const pkg of pkgs) {
            candidatePaths.push(
              path.join(wingetPkgsDir, pkg, "mingw64", "bin", binaryExe),
              path.join(wingetPkgsDir, pkg, "bin", binaryExe),
              path.join(wingetPkgsDir, pkg, "ucrt64", "bin", binaryExe)
            );
          }
        } catch {}
      }
      candidatePaths.push(path.join(localAppData, "Microsoft", "WinGet", "Links", binaryExe));
    }

    // B. Standard root and program directories
    candidatePaths.push(
      `C:\\mingw64\\bin\\${binaryExe}`,
      `C:\\MinGW\\bin\\${binaryExe}`,
      `C:\\msys64\\ucrt64\\bin\\${binaryExe}`,
      `C:\\msys64\\mingw64\\bin\\${binaryExe}`,
      `C:\\msys64\\usr\\bin\\${binaryExe}`,
      `C:\\TDM-GCC-64\\bin\\${binaryExe}`,
      `C:\\TDM-GCC-32\\bin\\${binaryExe}`,
      `C:\\Strawberry\\c\\bin\\${binaryExe}`,
      `C:\\w64devkit\\bin\\${binaryExe}`,
      path.join(programFiles, "CodeBlocks", "MinGW", "bin", binaryExe),
      path.join(programFilesX86, "Dev-Cpp", "MinGW64", "bin", binaryExe)
    );

    // C. UserProfile Scoop and custom folders
    if (userProfile) {
      candidatePaths.push(
        path.join(userProfile, "scoop", "apps", "gcc", "current", "bin", binaryExe),
        path.join(userProfile, "AppData", "Local", "Programs", "w64devkit", "bin", binaryExe),
        path.join(userProfile, "w64devkit", "bin", binaryExe)
      );
    }

    for (const cand of candidatePaths) {
      if (fs.existsSync(cand)) {
        ensureCompilerOnPath(cand);
        if (isCpp) cachedCppCompiler = cand;
        else cachedCCompiler = cand;
        return cand;
      }
    }
  }

  // Not found
  if (isCpp) cachedCppCompiler = null;
  else cachedCCompiler = null;
  return null;
}

/**
 * Returns the exact terminal message when compiler is missing (Case B).
 */
export function getCompilerMissingMessage(isCpp: boolean = false): string {
  if (isCpp) {
    return [
      "C++ Compiler Not Available",
      "",
      "G++ was not found on this system.",
      "",
      "The C++ program could not be compiled because the execution environment does not currently have a C++ compiler configured.",
    ].join("\n");
  }

  return [
    "C Compiler Not Available",
    "",
    "GCC was not found on this system.",
    "",
    "The C program could not be compiled because the execution environment does not currently have a C compiler configured.",
  ].join("\n");
}
