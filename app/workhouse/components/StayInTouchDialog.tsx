"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog, Portal } from "@/components/ui/skeleton-react";

import {
  HELP_SIGNAL_CONFIRMATION,
  saveStayInTouchSignal,
  STAY_IN_TOUCH_OPTIONS,
  type StayInTouchOption,
} from "../lib/help-signals";

const STAY_IN_TOUCH_TITLE = "Stay in touch";

export function StayInTouchDialog({
  open,
  onOpenChange,
  characterUsername,
  characterId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  characterUsername?: string;
  characterId?: string;
}) {
  const [selected, setSelected] = useState<StayInTouchOption[]>([]);
  const [saved, setSaved] = useState(false);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  useEffect(() => {
    if (!open) {
      setSelected([]);
      setSaved(false);
    }
  }, [open]);

  function handleSave() {
    saveStayInTouchSignal({ selected, characterUsername, characterId });
    setSaved(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      role="alertdialog"
      closeOnInteractOutside
      closeOnEscape
    >
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Positioner className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <Dialog.Content className="card preset-filled-surface-50-950 preset-outlined-surface-200-800 w-full max-w-md p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="h5 font-semibold">
              {STAY_IN_TOUCH_TITLE}
            </Dialog.Title>

            {saved ? (
              <p className="mt-4 text-sm opacity-90">{HELP_SIGNAL_CONFIRMATION}</p>
            ) : (
              <div className="mt-4 grid gap-2">
                {STAY_IN_TOUCH_OPTIONS.map((label) => (
                  <label
                    key={label}
                    className="flex items-start gap-2 text-sm opacity-90"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSet.has(label)}
                      onChange={() => {
                        setSelected((prev) =>
                          prev.includes(label)
                            ? prev.filter((v) => v !== label)
                            : [...prev, label],
                        );
                      }}
                      className="mt-1"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {saved ? (
                <Dialog.CloseTrigger
                  type="button"
                  className="btn preset-outlined-surface-200-800"
                >
                  Close
                </Dialog.CloseTrigger>
              ) : (
                <>
                  <Dialog.CloseTrigger
                    type="button"
                    className="btn preset-outlined-surface-200-800"
                  >
                    Close
                  </Dialog.CloseTrigger>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn preset-filled-primary-500"
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog>
  );
}
