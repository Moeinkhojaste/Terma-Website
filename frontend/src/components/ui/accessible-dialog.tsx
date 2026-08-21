"use client";

import { useEffect, useRef, type ReactNode } from "react";

export function AccessibleDialog({ open, onClose, children, className = "", label }: { open: boolean; onClose: () => void; children: ReactNode; className?: string; label: string }) {
  const reference = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = reference.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      document.body.classList.add("dialog-open");
    } else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = reference.current;
    if (!dialog) return;
    const handleClose = () => {
      const remainingDialogs = document.querySelectorAll("dialog[open]");
      if (remainingDialogs.length <= 1) {
        document.body.classList.remove("dialog-open");
      }
      returnFocus.current?.focus();
      if (open) onClose();
    };
    const handleCancel = (event: Event) => { event.preventDefault(); onClose(); };
    dialog.addEventListener("close", handleClose);
    dialog.addEventListener("cancel", handleCancel);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("cancel", handleCancel);
      const remainingDialogs = document.querySelectorAll("dialog[open]");
      if (remainingDialogs.length === 0) {
        document.body.classList.remove("dialog-open");
      }
    };
  }, [onClose, open]);

  return (
    <dialog ref={reference} className={`accessible-dialog ${className}`} aria-label={label} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      {children}
    </dialog>
  );
}
