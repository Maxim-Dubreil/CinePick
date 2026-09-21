import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AcceptedScreen } from "@/components/result/AcceptedScreen";
import type { RecommendedFilm } from "@/lib/backend/api";

const film: RecommendedFilm = {
  film_id: "f1",
  title: "Blade Runner",
  poster_url: null,
  year: 1982,
  runtime: 117,
  overview: null,
  genres: [],
  origin_country: [],
  director: null,
  rank: 1,
  match_score: 87,
  critique: "Bon choix",
};

describe("AcceptedScreen", () => {
  it("shows the accepted film and a way back home", async () => {
    const onBackHome = vi.fn();
    render(<AcceptedScreen film={film} onBackHome={onBackHome} />);
    expect(screen.getByText("Bonne séance !")).toBeInTheDocument();
    expect(screen.getByText("Blade Runner (1982)")).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Retour à l'accueil" }),
    );
    expect(onBackHome).toHaveBeenCalledTimes(1);
  });
});
