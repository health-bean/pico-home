import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary-100)] text-[var(--color-primary-800)] dark:bg-[var(--color-primary-900)] dark:text-[var(--color-primary-200)]",
        success: "bg-[var(--color-success-50)] text-[var(--color-success-700)] dark:bg-emerald-950 dark:text-emerald-200",
        warning: "bg-[var(--color-warning-50)] text-[var(--color-warning-700)] dark:bg-orange-950 dark:text-orange-200",
        danger: "bg-[var(--color-danger-50)] text-[var(--color-danger-700)] dark:bg-red-950 dark:text-red-200",
        info: "bg-[var(--color-info-50)] text-[var(--color-info-700)] dark:bg-sky-950 dark:text-sky-200",
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
