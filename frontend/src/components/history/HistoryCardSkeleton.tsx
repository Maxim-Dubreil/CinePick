import { Card, Skeleton } from "@/components/ui";

/** Placeholder for one {@link HistoryCard} row while the page's history is loading. */
export function HistoryCardSkeleton() {
  return (
    <Card size="sm" className="flex-row items-center gap-4">
      <Skeleton className="aspect-[2/3] w-16 shrink-0 rounded-[var(--radius-lg)]" />
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <Skeleton className="size-8 shrink-0 rounded-md" />
    </Card>
  );
}
