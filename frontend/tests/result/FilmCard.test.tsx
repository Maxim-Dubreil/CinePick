import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilmCard } from "@/components/result/FilmCard";
import type { RecommendedFilm } from "@/lib/backend/api";

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
