"use client";

import { useEffect, useRef, useCallback } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dialogContentVariants = cva(
  "relative w-full rounded-xl bg-white p-6 shadow-lg dark:bg-[var(--color-neutral-900)] border border-border",
  {
    variants: {
      size: {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
      },
    },
    defaultVariants: { size: "md" },
  }
);

interface DialogProps extends VariantProps<typeof dialogContentVariants> {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

function Dialog({ open, onClose, children, title, description, size, className }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-desc" : undefined}
    >
      <div className={cn(dialogContentVariants({ size }), className)}>
        {title && (
          <h2 id="dialog-title" className="text-lg font-semibold text-foreground mb-1">
            {title}
          </h2>
        )}
        {description && (
          <p id="dialog-desc" className="text-sm text-muted-foreground mb-4">
            {description}
          </p>
        )}
        {children}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export { Dialog };
