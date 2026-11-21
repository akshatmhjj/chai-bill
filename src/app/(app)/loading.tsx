import { Skeleton, SkeletonRow } from "@/components/ui/Skeleton";

/** Shown while a screen's data loads. Mirrors the common shape: a title, a hero block, then rows. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="flex items-start justify-between pb-5 pt-2">
        <div className="space-y-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="size-10 rounded-full lg:hidden" />
      </div>
      <Skeleton className="h-44 w-full rounded-card" />
      <div className="mt-6 rounded-card border border-line bg-surface px-4">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    </div>
  );
}
