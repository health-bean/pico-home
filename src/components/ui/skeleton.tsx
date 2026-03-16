import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

function SkeletonText({ className }: SkeletonProps) {
  return <div className={cn("h-4 w-3/4 animate-pulse rounded bg-muted", className)} />;
}

function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-xl border border-border p-6 space-y-4", className)}>
      <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
      <div className="space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
      </div>
      <div className="h-8 w-24 animate-pulse rounded-lg bg-muted" />
    </div>
  );
}

function SkeletonAvatar({ className }: SkeletonProps) {
  return <div className={cn("h-10 w-10 animate-pulse rounded-full bg-muted", className)} />;
}

export { Skeleton, SkeletonText, SkeletonCard, SkeletonAvatar };
