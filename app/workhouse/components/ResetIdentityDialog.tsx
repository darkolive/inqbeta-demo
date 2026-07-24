"use client";

import { Dialog, Portal } from "@/components/ui/skeleton-react";
import {
  RESET_IDENTITY_DIALOG_BODY,
  RESET_IDENTITY_DIALOG_TITLE,
} from "../lib/reset-identity-ui";

type ResetIdentityDialogProps = {
  open: boolean;
  busy?: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ResetIdentityDialog({
  open,
  busy = false,
  error = "",
  onOpenChange,
  onConfirm,
}: ResetIdentityDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      role="alertdialog"
      closeOnInteractOutside={!busy}
      closeOnEscape={!busy}
    >
      <Portal>
        <Dialog.Backdrop className="fixed inset-0 z-100 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Positioner className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <Dialog.Content className="card preset-filled-surface-50-950 border-2 border-surface-500 w-full max-w-md p-5 shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
            <Dialog.Title className="h5 font-semibold">
              {RESET_IDENTITY_DIALOG_TITLE}
            </Dialog.Title>
            <Dialog.Description className="mt-3 text-sm opacity-80">
              {RESET_IDENTITY_DIALOG_BODY}
            </Dialog.Description>
            {error ? (
              <div
                role="alert"
                className="card preset-filled-error-100-900 border-2 border-error-600 dark:border-error-300 mt-3 px-3 py-2.5 text-sm"
              >
                {error}
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Dialog.CloseTrigger
                type="button"
                disabled={busy}
                className="btn btn-lg border-2 bg-transparent border-surface-600 text-surface-800 hover:bg-surface-100 dark:border-surface-300 dark:text-surface-50 dark:hover:bg-surface-900"
              >
                No
              </Dialog.CloseTrigger>
              <button
                type="button"
                disabled={busy}
                onClick={onConfirm}
                className="btn preset-filled-error-500"
              >
                {busy ? "Destroying…" : "Yes, destroy character"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog>
  );
}
