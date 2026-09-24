import { WatchProviderIcon } from "@/components/WatchProviderIcon";
import { WatchProvidersAttribution } from "@/components/WatchProvidersAttribution";
import { Skeleton } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { useWatchProviders } from "@/hooks/useWatchProviders";

/** How many icons fit before falling back to a "+N" badge — Home's panel is
 * narrow, unlike Result/Historique's wider boxes. */
const MAX_VISIBLE_PROVIDERS = 5;

/** Narrow-column variant of `WatchProvidersBlock` (Result/Historique): small
 * icons capped at `MAX_VISIBLE_PROVIDERS`, preceded by a divider. Hidden
 * entirely on a TMDB error rather than showing a broken block. */
export function WatchProvidersCompact({ tmdbId }: { tmdbId: number | null }) {
  const { session } = useAuth();
  const { providers, link, loading } = useWatchProviders(
    tmdbId,
    session?.access_token ?? null,
  );

  if (tmdbId !== null && !loading && providers === null) return null;

  const visible = (providers ?? []).slice(0, MAX_VISIBLE_PROVIDERS);
  const hiddenCount = (providers?.length ?? 0) - visible.length;

  return (
    <>
      <div className="h-px bg-[var(--border)]" />
      <div className="flex flex-col gap-2">
        {tmdbId === null ? (
          // Enrichment never ran/failed for this film — distinct from "we
          // checked, nothing found": we never got to check at all.
          <p className="text-xs text-[var(--text-tertiary)]">
            Infos streaming indisponibles pour ce film
          </p>
        ) : loading ? (
          <div className="flex gap-2">
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
            <Skeleton className="size-8" />
          </div>
        ) : providers && providers.length === 0 ? (
          <p className="text-xs text-[var(--text-tertiary)]">
            Pas disponible en streaming en France
          </p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {visible.map((provider) => (
                <WatchProviderIcon
                  key={provider.provider_id}
                  provider={provider}
                  link={link}
                  size={32}
                />
              ))}
              {hiddenCount > 0 && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--muted)] text-xs font-medium text-[var(--text-tertiary)]">
                  +{hiddenCount}
                </span>
              )}
            </div>
            <WatchProvidersAttribution />
          </>
        )}
      </div>
    </>
  );
}
