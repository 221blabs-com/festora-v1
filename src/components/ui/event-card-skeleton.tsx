export function EventCardSkeleton() {
  return (
    <div className="corner-bracket h-full flex flex-col bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4">
      <div className="shimmer aspect-video mb-4 border border-[var(--border-subtle)]" />
      <div className="flex justify-between mb-3">
        <div className="shimmer h-3 w-16 rounded" />
        <div className="shimmer h-3 w-10 rounded" />
      </div>
      <div className="shimmer h-5 w-3/4 rounded mb-2" />
      <div className="shimmer h-5 w-1/2 rounded mb-4" />
      <div className="shimmer h-3 w-2/3 rounded mb-6" />
      <div className="mt-auto pt-4 border-t border-[var(--border-subtle)] flex justify-between">
        <div className="shimmer h-3 w-20 rounded" />
        <div className="shimmer h-3 w-3 rounded" />
      </div>
    </div>
  );
}

export function EventCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}
