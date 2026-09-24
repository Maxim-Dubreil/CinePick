import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { FilmCard } from "@/components/result/FilmCard";
import type { RecommendedFilm } from "@/lib/backend/api";

const { getWatchProvidersMock, getRatingMock } = vi.hoisted(() => ({
  getWatchProvidersMock: vi.fn(),
  getRatingMock: vi.fn(),
}));

vi.mock("@/lib/backend/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend/api")>();
  return { ...actual, getWatchProviders: getWatchProvidersMock, getRating: getRatingMock };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ session: null }),
}));

const baseFilm: RecommendedFilm = {
  film_id: "f1",
  tmdb_id: null,
  title: "Blade Runner",
  poster_url: null,
  year: 1982,
  runtime: 117,
  overview: "Un chasseur de primes...",
  genres: ["878"],
  origin_country: ["US"],
  director: "Ridley Scott",
  actors: [],
  rank: 1,
  match_score: null,
  critique: null,
};

describe("FilmCard", () => {
  it("renders title and year as separate fields", () => {
    render(<FilmCard film={baseFilm} />);
    expect(screen.getByText("Blade Runner")).toBeInTheDocument();
    expect(screen.getByText("1982")).toBeInTheDocument();
  });

  it("renders the title alone when year is null", () => {
    render(<FilmCard film={{ ...baseFilm, year: null }} />);
    expect(screen.getByText("Blade Runner")).toBeInTheDocument();
  });

  it("hides critique and match score when both are null (short-circuit path)", () => {
    render(<FilmCard film={baseFilm} />);
    expect(screen.queryByText(/% de match/)).not.toBeInTheDocument();
  });

  it("shows critique and match score when present", () => {
    const film: RecommendedFilm = {
      ...baseFilm,
      match_score: 87,
      critique: "Un choix parfait pour ce soir.",
    };
    render(<FilmCard film={film} />);
    expect(screen.getByText("87% de match")).toBeInTheDocument();
    expect(
      screen.getByText("Un choix parfait pour ce soir."),
    ).toBeInTheDocument();
  });
});

describe("FilmCard watch providers gate", () => {
  const enrichedFilm: RecommendedFilm = { ...baseFilm, tmdb_id: 78 };

  beforeEach(() => {
    getWatchProvidersMock.mockReset();
    getRatingMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a skeleton, not the card, while watch providers load", () => {
    getWatchProvidersMock.mockReturnValue(new Promise(() => {}));
    getRatingMock.mockReturnValue(new Promise(() => {}));
    const onReadyChange = vi.fn();
    render(<FilmCard film={enrichedFilm} onReadyChange={onReadyChange} />);

    expect(screen.queryByText("Blade Runner")).not.toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
  });

  it("shows the whole card at once when watch providers resolve", async () => {
    getWatchProvidersMock.mockResolvedValue({ providers: [], link: null });
    getRatingMock.mockResolvedValue({ vote_average: null });
    const onReadyChange = vi.fn();
    render(<FilmCard film={enrichedFilm} onReadyChange={onReadyChange} />);

    expect(await screen.findByText("Blade Runner")).toBeInTheDocument();
    expect(screen.getByText("Pas disponible en streaming en France")).toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it("shows the card after the max wait even if TMDB never answers", () => {
    vi.useFakeTimers();
    getWatchProvidersMock.mockReturnValue(new Promise(() => {}));
    getRatingMock.mockReturnValue(new Promise(() => {}));
    const onReadyChange = vi.fn();
    render(<FilmCard film={enrichedFilm} onReadyChange={onReadyChange} />);

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.queryByText("Blade Runner")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Blade Runner")).toBeInTheDocument();
    // The streaming block itself is still loading: no result text yet.
    expect(
      screen.queryByText("Pas disponible en streaming en France"),
    ).not.toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it("never waits for a film that was not TMDB-enriched", () => {
    const onReadyChange = vi.fn();
    render(<FilmCard film={baseFilm} onReadyChange={onReadyChange} />);

    expect(screen.getByText("Blade Runner")).toBeInTheDocument();
    expect(getWatchProvidersMock).not.toHaveBeenCalled();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });
});
