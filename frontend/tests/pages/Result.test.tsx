import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Result } from "@/pages/Result";
import { ApiError, type RecommendRequest } from "@/lib/backend/api";

const { getRecommendationMock, recordDecisionMock, getCurrentRecommendationMock } =
  vi.hoisted(() => ({
    getRecommendationMock: vi.fn(),
    recordDecisionMock: vi.fn(),
    getCurrentRecommendationMock: vi.fn(),
  }));

vi.mock("@/lib/backend/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend/api")>();
  return {
    ...actual,
    getRecommendation: getRecommendationMock,
    recordDecision: recordDecisionMock,
    getCurrentRecommendation: getCurrentRecommendationMock,
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    session: { access_token: "test-token" },
    user: null,
    loading: false,
  }),
}));

const ANSWERS: RecommendRequest = {
  genre: ["35"],
  emotion: ["any"],
  ambiance: ["any"],
  withWho: "any",
  duration: "any",
  era: "any",
  region: ["none"],
  subtitles: "any",
  seen: "any",
};

function renderResult(initialState?: {
  filmCount: number;
  answers: RecommendRequest;
}) {
  return render(
    <MemoryRouter
      initialEntries={[
        initialState
          ? { pathname: "/home/result", state: initialState }
          : "/home/result",
      ]}
    >
      <Routes>
        <Route path="/home/result" element={<Result onAccepted={() => {}} />} />
        <Route path="/home/question" element={<div>Questions page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Result page", () => {
  beforeEach(() => {
    getRecommendationMock.mockReset();
    recordDecisionMock.mockReset();
    recordDecisionMock.mockResolvedValue(undefined);
    getCurrentRecommendationMock.mockReset();
    getCurrentRecommendationMock.mockResolvedValue(null);
  });

  it("redirects to Questions when router state is missing and nothing is pending", async () => {
    renderResult();
    await waitFor(() =>
      expect(screen.getByText("Questions page")).toBeInTheDocument(),
    );
  });

  it("shows the recommended film and lets the user accept it", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [
        {
          film_id: "f1",
          title: "Blade Runner",
          poster_url: null,
          year: 1982,
          runtime: 117,
          overview: null,
          genres: [],
          origin_country: [],
          rank: 1,
          match_score: 87,
          critique: "Un choix parfait.",
        },
      ],
      meta: { candidates_considered: 1 },
    });
    renderResult({ filmCount: 1, answers: ANSWERS });

    await waitFor(
      () => expect(screen.getByText("Blade Runner")).toBeInTheDocument(),
      { timeout: 2000 },
    );
    expect(screen.getByText("1982")).toBeInTheDocument();
    expect(screen.getByText("Un choix parfait.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Accepter" }));

    expect(await screen.findByText("Bonne séance !")).toBeInTheDocument();
    expect(recordDecisionMock).toHaveBeenCalledWith(
      {
        recommendation_session_id: "",
        film_id: "f1",
        decision: "accepted",
      },
      "test-token",
    );
  });

  it("shows the no-match dead-end screen on a 422", async () => {
    getRecommendationMock.mockRejectedValue(new ApiError(422, "no_candidates"));
    renderResult({ filmCount: 0, answers: ANSWERS });

    expect(
      await screen.findByText(
        "Aucun film ne correspond à tes critères.",
        {},
        { timeout: 2000 },
      ),
    ).toBeInTheDocument();
  });
});
