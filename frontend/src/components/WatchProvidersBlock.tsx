import { Skeleton } from "@/components/ui";
import { WatchProviderIcon } from "@/components/WatchProviderIcon";
import { WatchProvidersAttribution } from "@/components/WatchProvidersAttribution";
import { groupWatchProvidersByCategory } from "@/lib/watchProviders";
import type { UseWatchProvidersResult } from "@/hooks/useWatchProviders";

interface WatchProvidersBlockProps {
  tmdbId: number | null;
  /** Fetched by the caller (`FilmCard`), which gates its own render on them
   * so the whole card appears at once. */
  watchProviders: UseWatchProvidersResult;
}

/** "Où regarder" block: 3 columns (Gratuit/Abonnement/Location-achat), one
 * per non-empty category (CIN-103) — shared by Result and Historique, whose
 * layouts are otherwise identical at this granularity. Home's compact
 * variant (capped icons + "+N") stays separate in `LastFilmPanel`, it's
 * genuinely different, not the same layout squeezed into a smaller box. */
export function WatchProvidersBlock({ tmdbId, watchProviders }: WatchProvidersBlockProps) {
  const { providers, link, loading } = watchProviders;

  // TMDB error: hide the block entirely rather than showing a broken one.
  if (tmdbId !== null && !loading && providers === null) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
        Où regarder
      </h3>
      {tmdbId === null ? (
        // Enrichment never ran/failed for this film — distinct from "we
        // checked, nothing found": we never got to check at all.
        <p className="text-sm text-[var(--text-secondary)]">
          Infos streaming indisponibles pour ce film
        </p>
      ) : loading ? (
        <div className="flex gap-2">
          <Skeleton className="size-10" />
          <Skeleton className="size-10" />
          <Skeleton className="size-10" />
        </div>
      ) : providers && providers.length === 0 ? (
        // min-h-10 matches the loading skeleton's row, so swapping skeleton ->
        // text doesn't shift the layout.
        <p className="flex min-h-10 items-center text-sm text-[var(--text-secondary)]">
          Pas disponible en streaming en France
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-6">
            {groupWatchProvidersByCategory(providers ?? []).map((group) => (
              <div key={group.category} className="flex flex-col gap-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                  {group.label}
                </span>
                <div className="flex flex-wrap gap-2">
                  {group.providers.map((provider) => (
                    <WatchProviderIcon
                      key={provider.provider_id}
                      provider={provider}
                      link={link}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <WatchProvidersAttribution />
        </>
      )}
    </section>
  );
}
