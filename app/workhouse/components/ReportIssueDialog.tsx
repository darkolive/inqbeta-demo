"use client";

import { useEffect, useState } from "react";
import { Dialog, Portal } from "@/components/ui/skeleton-react";

import {
  HELP_SIGNAL_CONFIRMATION,
  saveReportIssueSignal,
  type IssueCategory,
} from "../lib/help-signals";

const REPORT_ISSUE_TITLE = "Report an issue";

const ISSUE_CATEGORIES = [
  "Bug",
  "Confusing",
  "Didn't work as expected",
  "Accessibility",
  "Other",
] as const satisfies readonly IssueCategory[];

export function ReportIssueDialog({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IssueCategory | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setCategory(null);
      setSaved(false);
    }
  }, [open]);

  function handleSave() {
    saveReportIssueSignal({
      title,
      description,
      category,
      characterUsername,
      characterId,
    });
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
          <Dialog.Content className="card preset-filled-surface-50-950 border-2 border-surface-500 w-full max-w-md p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="h5 font-semibold">
              {REPORT_ISSUE_TITLE}
            </Dialog.Title>

            {saved ? (
              <p className="mt-4 text-sm opacity-90">{HELP_SIGNAL_CONFIRMATION}</p>
            ) : (
              <div className="mt-4 grid gap-4">
                <label className="grid gap-1.5">
                  Issue title
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input"
                  />
                </label>

                <label className="grid gap-1.5">
                  Issue description
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input min-h-28 resize-y"
                  />
                </label>

                <section className="grid gap-2">
                  <p className="text-sm opacity-80">Category</p>
                  <div className="grid gap-2">
                    {ISSUE_CATEGORIES.map((c) => (
                      <label key={c} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="issue-category"
                          value={c}
                          checked={category === c}
                          onChange={() => setCategory(c)}
                          className="radio"
                        />
                        <span className="text-sm">{c}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {saved ? (
                <Dialog.CloseTrigger
                  type="button"
                  className="btn border-2 border-surface-500"
                >
                  Close
                </Dialog.CloseTrigger>
              ) : (
                <>
                  <Dialog.CloseTrigger
                    type="button"
                    className="btn border-2 border-surface-500"
                  >
                    Close
                  </Dialog.CloseTrigger>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn preset-filled-brand"
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
