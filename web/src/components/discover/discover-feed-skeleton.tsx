/**
 * Placeholder layout while Discover feed hydrates (Suspense fallback).
 * Mimics card aspect ratio so CLS stays low vs a lone spinner.
 */
export function DiscoverFeedSkeleton() {
  return (
    <div
      className="w-full space-y-3 px-0 sm:space-y-4"
      role="status"
      aria-busy="true"
      aria-label="Events werden geladen"
    >
      <span className="sr-only">Discover-Feed wird geladen</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-full overflow-hidden rounded-none border-b border-[#2a2521]/80 bg-[#141210]/30"
        >
          <div className="aspect-[16/9] w-full animate-pulse bg-gradient-to-br from-[#221c18] via-[#1a1613] to-[#151210]" />
          <div className="space-y-2.5 p-3 sm:p-4">
            <div className="h-5 w-[88%] max-w-md animate-pulse rounded-md bg-[#2c2622]" />
            <div className="h-3.5 w-[40%] animate-pulse rounded-md bg-[#252019]" />
            <div className="flex gap-2 pt-1">
              <div className="h-8 w-24 animate-pulse rounded-full bg-[#2a2420]" />
              <div className="h-8 flex-1 max-w-[140px] animate-pulse rounded-full bg-[#2a2420]" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
