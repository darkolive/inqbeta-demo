"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "lucide-react";

export const COLOR_MODE_STORAGE_KEY = "inqbeta-color-mode";

type ColorMode = "light" | "dark";

function applyColorMode(mode: ColorMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
  } catch {
    // The visual preference still applies when storage is unavailable.
  }
}

export function ColorModeToggle({
  className,
}: {
  className?: string;
}) {
  const [colorMode, setColorMode] = useState<ColorMode>("light");

  useEffect(() => {
    const root = document.documentElement;

    setColorMode(root.classList.contains("dark") ? "dark" : "light");
    root.style.removeProperty("--user-font-scale");
    try {
      localStorage.removeItem("inqbeta-text-scale");
    } catch {
      // Ignore unavailable storage while removing the retired preference.
    }
  }, []);

  function toggleColorMode() {
    const nextMode = colorMode === "light" ? "dark" : "light";
    setColorMode(nextMode);
    applyColorMode(nextMode);
  }

  const isDark = colorMode === "dark";

  return (
    <button
      type="button"
      onClick={toggleColorMode}
      aria-pressed={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={className}
    >
      {isDark ? (
        <MoonIcon className="size-5 shrink-0" aria-hidden />
      ) : (
        <SunIcon className="size-5 shrink-0" aria-hidden />
      )}
    </button>
  );
}
