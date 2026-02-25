import { Skeleton } from "@/components/ui/skeleton";

interface LoadingSkeletonProps {
  type?: "table" | "cards" | "detail";
  rows?: number;
}

export function LoadingSkeleton({ type = "cards", rows = 3 }: LoadingSkeletonProps) {
  if (type === "table") {
    return (
      <div className="glass-card rounded-xl p-4 space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (type === "detail") {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}
