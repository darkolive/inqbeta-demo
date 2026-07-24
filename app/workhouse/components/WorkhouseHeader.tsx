"use client";

import { AppBar } from "@/components/ui/skeleton-react";
import { GlobeIcon, MenuIcon, UserIcon } from "lucide-react";
import { getFederationDisplayName } from "../lib/federation-context";
import { ColorModeToggle } from "./AccessibilityControls";
import { InQbetaLogo } from "./InQbetaLogo";

export function WorkhouseHeader({
  onBalanceClick,
  balanceOpen = false,
  onGlobeClick,
  globeOpen = false,
  onMenuClick,
  menuOpen = false,
}: {
  onBalanceClick?: () => void;
  balanceOpen?: boolean;
  onGlobeClick?: () => void;
  globeOpen?: boolean;
  onMenuClick?: () => void;
  menuOpen?: boolean;
}) {
  return (
    <AppBar className="w-full bg-transparent px-0 py-5 shadow-none">
      <AppBar.Toolbar className="flex w-full items-center justify-between gap-2">
        <AppBar.Lead className="flex shrink-0 items-center justify-start pl-0">
          <InQbetaLogo />
        </AppBar.Lead>
        <AppBar.Trail className="flex shrink-0 items-center justify-end gap-2">
          <ColorModeToggle className="inline-flex items-center justify-center rounded-[var(--radius-base)] p-2 hover:preset-tonal" />
          {onBalanceClick ? (
            <button
              type="button"
              onClick={onBalanceClick}
              className="inline-flex items-center justify-center rounded-[var(--radius-base)] p-2 hover:preset-tonal"
              aria-label="User"
              aria-expanded={balanceOpen}
            >
              <UserIcon size={22} aria-hidden />
            </button>
          ) : null}
          {onGlobeClick ? (
            <button
              type="button"
              onClick={onGlobeClick}
              className="inline-flex items-center justify-center rounded-[var(--radius-base)] p-2 hover:preset-tonal"
              aria-label={getFederationDisplayName()}
              aria-expanded={globeOpen}
            >
              <GlobeIcon size={22} aria-hidden />
            </button>
          ) : null}
          {onMenuClick ? (
            <button
              type="button"
              onClick={onMenuClick}
              className="inline-flex items-center justify-center rounded-[var(--radius-base)] p-2 hover:preset-tonal"
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              <MenuIcon size={22} aria-hidden />
            </button>
          ) : null}
        </AppBar.Trail>
      </AppBar.Toolbar>
    </AppBar>
  );
}
