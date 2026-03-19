import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary-100)] text-[var(--color-primary-800)]",
        success: "bg-[var(--color-success-50)] text-[var(--color-success-700)]",
        warning: "bg-[var(--color-warning-50)] text-[var(--color-warning-700)]",
        danger: "bg-[var(--color-danger-50)] text-[var(--color-danger-700)]",
        info: "bg-[var(--color-info-50)] text-[var(--color-info-700)]",
      },
      size: {
        sm: "px-2 py-0.5 text-xs",
        md: "px-2.5 py-0.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size, className }))} {...props} />;
}

export { Badge, badgeVariants };
