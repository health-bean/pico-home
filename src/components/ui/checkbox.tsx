"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id={checkboxId}
          ref={ref}
          className={cn(
            "h-4 w-4 rounded border-border text-primary accent-primary transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        />
        {label && (
          <label htmlFor={checkboxId} className="text-sm text-foreground cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
