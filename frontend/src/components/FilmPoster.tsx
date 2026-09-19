interface FilmPosterProps {
  posterUrl: string | null;
  alt: string;
  className?: string;
}

/** Poster image with a consistent aspect ratio and rounding, shared between
 * the home "last film" panel and the result screens. Renders a placeholder
 * block when `posterUrl` is null — callers with no fixed-size slot to fill
 * (e.g. `AcceptedScreen`) should guard the render themselves instead. */
export function FilmPoster({ posterUrl, alt, className = "" }: FilmPosterProps) {
  if (posterUrl) {
    return (
      <img
        src={posterUrl}
        alt={alt}
        className={`aspect-[2/3] rounded-[var(--radius-lg)] object-cover ${className}`}
      />
    );
  }
  return (
    <div
      className={`aspect-[2/3] rounded-[var(--radius-lg)] bg-[var(--glass-bg)] ${className}`}
    />
  );
}
