"use client";

import { useEffect, useId, useRef } from "react";
import { ChevronDown, X } from "lucide-react";
import "./pill-editor.css";

/** Compact values stay readable; their editor opens in a desktop dialog / phone sheet. */
export default function PillEditor({ label, description, value, icon, open, onOpen, onClose, children }: {
  label: string;
  description?: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ReactNode;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const id = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
    return () => { if (element.open) element.close(); };
  }, [open]);
  return <div className="uf-pill-row">
    {icon && <span className="uf-pill-icon" aria-hidden="true">{icon}</span>}
    <div className="uf-pill-copy"><span id={`${id}-label`} className="uf-pill-label">{label}</span>
      {description && <span className="uf-pill-description">{description}</span>}
    </div>
    <button ref={trigger} type="button" className="uf-value-pill" aria-labelledby={`${id}-label ${id}-value`}
      aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} onClick={onOpen}>
      <span id={`${id}-value`}>{value}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    <dialog ref={dialog} id={`${id}-dialog`} className="uf-pill-dialog" aria-labelledby={`${id}-title`}
      onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={() => { trigger.current?.focus(); }}>
      <div className="uf-pill-dialog-head"><h3 id={`${id}-title`}>{label}</h3>
        <button type="button" className="uf-pill-close" aria-label={`Close ${label}`} onClick={onClose}><X size={20} /></button>
      </div>
      <div className="uf-pill-dialog-body">{open && children}</div>
      <button type="button" className="uf-pill-done" onClick={onClose}>Done</button>
    </dialog>
  </div>;
}
