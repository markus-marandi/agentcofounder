import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export type ConfirmTone = "danger" | "primary";

const tones: Record<ConfirmTone, { disc: string; icon: string; confirm: string }> = {
  danger: {
    disc: "bg-danger-soft",
    icon: "text-danger",
    confirm: "rounded-md border border-danger/60 bg-danger-soft px-3 py-2 text-sm font-semibold text-danger hover:border-danger",
  },
  primary: {
    disc: "bg-accent-soft",
    icon: "text-accent",
    confirm: "rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:brightness-110",
  },
};

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmText: string;
  /** Falls back to `confirmText` — set this when the button needs a more specific accessible name than its visible label. */
  confirmAriaLabel?: string;
  cancelText?: string;
  tone?: ConfirmTone;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * The one place every irreversible or confirm-gated action asks "are you
 * sure", instead of each call site rolling its own inline yes/no swap.
 * Headless UI owns focus trapping, dismissal, and the transitions; this
 * component owns the wording and the two buttons.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText,
  confirmAriaLabel,
  cancelText = "Cancel",
  tone = "danger",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = tones[tone];
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-50">
      <DialogBackdrop transition className="fixed inset-0 bg-ink/50 duration-200 data-closed:opacity-0" />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
          <DialogPanel
            transition
            className="w-full rounded-xl border border-line bg-surface p-5 shadow-xl duration-200 data-closed:translate-y-2 data-closed:opacity-0 sm:max-w-md sm:p-6"
          >
            <div className="sm:flex sm:gap-4">
              <div className={`mx-auto flex size-10 shrink-0 items-center justify-center rounded-full sm:mx-0 ${t.disc}`}>
                <ExclamationTriangleIcon aria-hidden="true" className={`size-5 ${t.icon}`} />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <DialogTitle as="h3" className="text-base font-semibold text-ink">
                  {title}
                </DialogTitle>
                {description ? <p className="mt-1.5 text-sm text-ink-soft">{description}</p> : null}
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md px-3 py-2 text-sm font-medium text-ink-soft hover:bg-surface-sunk hover:text-ink"
                onClick={onCancel}
              >
                {cancelText}
              </button>
              <button type="button" className={t.confirm} aria-label={confirmAriaLabel ?? confirmText} onClick={onConfirm}>
                {confirmText}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
