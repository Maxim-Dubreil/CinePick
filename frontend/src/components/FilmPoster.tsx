interface FilmPosterProps {
  posterUrl: string | null;
  alt: string;
  className?: string;
  /** Whether to render a placeholder block when `posterUrl` is null, or
   * nothing at all (e.g. `AcceptedScreen`, which has no fixed-size slot to
   * fill). Defaults to `true`. */
  showPlaceholder?: boolean;
}

/** Poster image with a consistent aspect ratio and rounding, shared between
 * the home "last film" panel and the result screens. */
export function FilmPoster({
  posterUrl,
  alt,
  className = "",
  showPlaceholder = true,
}: FilmPosterProps) {
  if (posterUrl) {
    return (
      <img
        src={posterUrl}
        alt={alt}
        className={`aspect-[2/3] rounded-[var(--radius-lg)] object-cover ${className}`}
      />
    );
  }
  if (!showPlaceholder) return null;
  return (
    <div
      className={`aspect-[2/3] rounded-[var(--radius-lg)] bg-[var(--glass-bg)] ${className}`}
    />
  );
}
