import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export type ConfirmTone = "danger" | "primary";

const toneStyles: Record<ConfirmTone, { ring: string; icon: string; button: string }> = {
  danger: {
    ring: "bg-danger-soft",
    icon: "text-danger",
    button: "rounded-md border border-danger px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-soft",
  },
  primary: {
    ring: "bg-accent-soft",
    icon: "text-accent",
    button: "rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-ink hover:brightness-110",
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
 * Vendored from Tailwind Plus overlays/modal-dialogs, "Centered with single
 * action" — one place every irreversible or confirm-gated action in the app
 * asks "are you sure", instead of each call site rolling its own inline
 * yes/no swap.
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
  const styles = toneStyles[tone];
  return (
    <Dialog open={open} onClose={onCancel} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-ink/50 transition-opacity data-closed:opacity-0 data-enter:duration-300 data-leave:duration-200"
      />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-surface px-4 pt-5 pb-4 text-left shadow-xl outline outline-line transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full sm:max-w-sm sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95"
          >
            <div className="sm:flex sm:items-start">
              <div
                className={`mx-auto flex size-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-10 ${styles.ring}`}
              >
                <ExclamationTriangleIcon aria-hidden="true" className={`size-6 ${styles.icon}`} />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <DialogTitle as="h3" className="text-base font-semibold text-ink">
                  {title}
                </DialogTitle>
                {description ? <p className="mt-2 text-sm text-ink-soft">{description}</p> : null}
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:mt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                className="rounded-md border border-transparent px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-surface-sunk"
                onClick={onCancel}
              >
                {cancelText}
              </button>
              <button type="button" className={styles.button} aria-label={confirmAriaLabel ?? confirmText} onClick={onConfirm}>
                {confirmText}
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
