import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  variant?: "default" | "success" | "warning" | "danger";
}

const variantColors = {
  default: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

function Progress({ value, max = 100, label, showPercentage = false, className, variant = "default" }: ProgressProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {showPercentage && <span className="text-sm text-muted-foreground">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}>
        <div
          className={cn("h-full rounded-full transition-all duration-300", variantColors[variant])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export { Progress };
