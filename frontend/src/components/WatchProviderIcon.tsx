import type { WatchProvider } from "@/lib/backend/api";

interface WatchProviderIconProps {
  provider: WatchProvider;
  /** TMDB's "where to watch" page — `null` renders a plain, non-clickable icon. */
  link: string | null;
  size?: number;
}

/** One clickable platform icon — shared by the Result, Home, and Historique
 * "où regarder" blocks (CIN-103). Name on hover + `alt` for accessibility,
 * "avec pub" appended for ad-supported free offers. */
export function WatchProviderIcon({ provider, link, size = 40 }: WatchProviderIconProps) {
  const label = provider.ads ? `${provider.name} (avec pub)` : provider.name;
  const img = (
    <img
      src={provider.logo_url}
      alt={label}
      title={label}
      width={size}
      height={size}
      className="rounded-md"
    />
  );

  if (!link) return img;

  return (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className="block shrink-0 transition-opacity hover:opacity-80"
    >
      {img}
    </a>
  );
}
