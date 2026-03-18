"use client";

import { useState } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const avatarVariants = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary-100)] text-[var(--color-primary-700)] font-medium",
  {
    variants: {
      size: {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-sm",
        lg: "h-14 w-14 text-lg",
      },
    },
    defaultVariants: { size: "md" },
  }
);

interface AvatarProps extends VariantProps<typeof avatarVariants> {
  src?: string | null;
  alt?: string;
  fallback?: string;
  className?: string;
}

function Avatar({ src, alt, fallback, size, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initials = fallback
    ? fallback
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className={cn(avatarVariants({ size }), className)}>
      {src && !imgError ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={src} alt={alt || ""} className="h-full w-full object-cover" onError={() => setImgError(true)} />
      ) : (
        <span aria-label={alt || fallback}>{initials}</span>
      )}
    </div>
  );
}

export { Avatar };
