import { Skeleton } from "./skeleton";

export function PageSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-48" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
