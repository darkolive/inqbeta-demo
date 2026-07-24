"use client";

import { useEffect, useState } from "react";
import { Dialog, Portal } from "@/components/ui/skeleton-react";
import { RatingGroup } from "@skeletonlabs/skeleton-react";

import {
  HELP_SIGNAL_CONFIRMATION,
  saveReviewExperienceSignal,
} from "../lib/help-signals";

const REVIEW_EXPERIENCE_TITLE = "Review this experience";

export function ReviewExperienceDialog({
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
  const [easy, setEasy] = useState(0);
  const [safe, setSafe] = useState(0);
  const [clear, setClear] = useState(0);
  const [useAgain, setUseAgain] = useState(0);
  const [comments, setComments] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) {
      setEasy(0);
      setSafe(0);
      setClear(0);
      setUseAgain(0);
      setComments("");
      setSaved(false);
    }
  }, [open]);

  function handleSave() {
    saveReviewExperienceSignal({
      easy,
      safe,
      clear,
      useAgain,
      comments,
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
              {REVIEW_EXPERIENCE_TITLE}
            </Dialog.Title>

            {saved ? (
              <p className="mt-4 text-sm opacity-90">{HELP_SIGNAL_CONFIRMATION}</p>
            ) : (
              <div className="mt-4 grid gap-4">
                <div className="grid gap-2">
                  <p className="text-sm font-medium">Was it easy?</p>
                  <RatingGroup
                    count={5}
                    name="review-easy"
                    value={easy}
                    onValueChange={({ value }) => setEasy(value)}
                  >
                    <RatingGroup.Control className="flex gap-1 text-primary-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <RatingGroup.Item key={i} index={i + 1} />
                      ))}
                    </RatingGroup.Control>
                    <RatingGroup.HiddenInput />
                  </RatingGroup>
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Did you feel safe?</p>
                  <RatingGroup
                    count={5}
                    name="review-safe"
                    value={safe}
                    onValueChange={({ value }) => setSafe(value)}
                  >
                    <RatingGroup.Control className="flex gap-1 text-primary-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <RatingGroup.Item key={i} index={i + 1} />
                      ))}
                    </RatingGroup.Control>
                    <RatingGroup.HiddenInput />
                  </RatingGroup>
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Was the language clear?</p>
                  <RatingGroup
                    count={5}
                    name="review-language"
                    value={clear}
                    onValueChange={({ value }) => setClear(value)}
                  >
                    <RatingGroup.Control className="flex gap-1 text-primary-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <RatingGroup.Item key={i} index={i + 1} />
                      ))}
                    </RatingGroup.Control>
                    <RatingGroup.HiddenInput />
                  </RatingGroup>
                </div>

                <div className="grid gap-2">
                  <p className="text-sm font-medium">Would you use it again?</p>
                  <RatingGroup
                    count={5}
                    name="review-use-again"
                    value={useAgain}
                    onValueChange={({ value }) => setUseAgain(value)}
                  >
                    <RatingGroup.Control className="flex gap-1 text-primary-500">
                      {Array.from({ length: 5 }, (_, i) => (
                        <RatingGroup.Item key={i} index={i + 1} />
                      ))}
                    </RatingGroup.Control>
                    <RatingGroup.HiddenInput />
                  </RatingGroup>
                </div>

                <label className="grid gap-1.5">
                  Optional comments
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="input min-h-24 resize-y"
                  />
                </label>
              </div>
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {saved ? (
                <Dialog.CloseTrigger
                  type="button"
                  className="btn btn-lg border-2 border-surface-500"
                >
                  Close
                </Dialog.CloseTrigger>
              ) : (
                <>
                  <Dialog.CloseTrigger
                    type="button"
                    className="btn btn-lg border-2 border-surface-500"
                  >
                    Close
                  </Dialog.CloseTrigger>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="btn btn-lg preset-filled-brand"
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
