"use client";

import { useEffect, useState } from "react";
import { ALargeSmallIcon, MoonIcon, SunIcon } from "lucide-react";

export const COLOR_MODE_STORAGE_KEY = "inqbeta-color-mode";
export const TEXT_SCALE_STORAGE_KEY = "inqbeta-text-scale";

const DEFAULT_TEXT_SCALE = 100;
const MIN_TEXT_SCALE = 90;
const MAX_TEXT_SCALE = 150;
const TEXT_SCALE_STEP = 10;

type ColorMode = "light" | "dark";

function applyColorMode(mode: ColorMode) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
}

function applyTextScale(scale: number) {
  document.documentElement.style.setProperty(
    "--user-font-scale",
    String(scale / 100),
  );
  localStorage.setItem(TEXT_SCALE_STORAGE_KEY, String(scale));
}

export function AccessibilityControls() {
  const [colorMode, setColorMode] = useState<ColorMode>("light");
  const [textScale, setTextScale] = useState(DEFAULT_TEXT_SCALE);
  const [textControlsOpen, setTextControlsOpen] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const savedScale = Number(localStorage.getItem(TEXT_SCALE_STORAGE_KEY));
    const initialScale =
      Number.isFinite(savedScale) &&
      savedScale >= MIN_TEXT_SCALE &&
      savedScale <= MAX_TEXT_SCALE
        ? savedScale
        : DEFAULT_TEXT_SCALE;

    setColorMode(root.classList.contains("dark") ? "dark" : "light");
    setTextScale(initialScale);
    root.style.setProperty("--user-font-scale", String(initialScale / 100));
  }, []);

  function toggleColorMode() {
    const nextMode = colorMode === "light" ? "dark" : "light";
    setColorMode(nextMode);
    applyColorMode(nextMode);
  }

  function updateTextScale(nextScale: number) {
    const clampedScale = Math.min(
      MAX_TEXT_SCALE,
      Math.max(MIN_TEXT_SCALE, nextScale),
    );
    setTextScale(clampedScale);
    applyTextScale(clampedScale);
  }

  const isDark = colorMode === "dark";

  return (
    <section className="space-y-3" aria-labelledby="display-settings-heading">
      <p id="display-settings-heading" className="text-base font-semibold">
        Reading and display
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={toggleColorMode}
          aria-pressed={isDark}
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          className="btn btn-lg border-2 border-surface-600 bg-transparent text-surface-800 hover:bg-surface-100 dark:border-surface-300 dark:text-surface-50 dark:hover:bg-surface-900"
        >
          {isDark ? (
            <MoonIcon className="size-5 shrink-0" aria-hidden />
          ) : (
            <SunIcon className="size-5 shrink-0" aria-hidden />
          )}
          <span>{isDark ? "Dark mode" : "Light mode"}</span>
        </button>

        <button
          type="button"
          onClick={() => setTextControlsOpen((open) => !open)}
          aria-expanded={textControlsOpen}
          aria-controls="workhouse-text-size-controls"
          className="btn btn-lg border-2 border-surface-600 bg-transparent text-surface-800 hover:bg-surface-100 dark:border-surface-300 dark:text-surface-50 dark:hover:bg-surface-900"
        >
          <ALargeSmallIcon className="size-5 shrink-0" aria-hidden />
          <span>Text size</span>
        </button>
      </div>

      {textControlsOpen ? (
        <div
          id="workhouse-text-size-controls"
          className="card grid gap-3 border-2 border-surface-500 bg-surface-100-900 p-3"
        >
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="workhouse-text-size" className="font-semibold">
              Text size
            </label>
            <output
              htmlFor="workhouse-text-size"
              className="font-semibold tabular-nums"
              aria-live="polite"
            >
              {textScale}%
            </output>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold" aria-hidden>
              A
            </span>
            <input
              id="workhouse-text-size"
              type="range"
              min={MIN_TEXT_SCALE}
              max={MAX_TEXT_SCALE}
              step={TEXT_SCALE_STEP}
              value={textScale}
              onChange={(event) => updateTextScale(Number(event.target.value))}
              aria-valuetext={`${textScale}%`}
              className="min-w-0 flex-1 accent-primary-500"
            />
            <span className="text-xl font-semibold" aria-hidden>
              A
            </span>
          </div>

          {textScale !== DEFAULT_TEXT_SCALE ? (
            <button
              type="button"
              onClick={() => updateTextScale(DEFAULT_TEXT_SCALE)}
              className="btn btn-sm justify-self-start border-2 border-surface-600 bg-transparent text-surface-800 dark:border-surface-300 dark:text-surface-50"
            >
              Reset to 100%
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
