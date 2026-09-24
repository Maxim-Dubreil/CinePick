import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Question } from "@/pages/Question";
import type {
  UseQuestionFlowOptions,
  UseQuestionFlowResult,
} from "@/hooks/useQuestionFlow";

const { navigateMock, captured, getCurrentRecommendationMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  captured: {
    onComplete: null as UseQuestionFlowOptions["onComplete"] | null,
  },
  getCurrentRecommendationMock: vi.fn(),
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/lib/backend/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend/api")>();
  return { ...actual, getCurrentRecommendation: getCurrentRecommendationMock };
});

vi.mock("@/hooks/useQuestionFlow", () => ({
  useQuestionFlow: (options: UseQuestionFlowOptions) => {
    captured.onComplete = options.onComplete;
    const result: UseQuestionFlowResult = {
      step: 0,
      totalSteps: 8,
      currentQuestion: {
        id: "genre",
        label: "Genre ?",
        phase: "Contenu",
        hard: true,
        multi: false,
        options: [],
      },
      filmCount: 42,
      fallbackNote: null,
      loading: false,
      showBackButton: false,
      watchlistStatus: "ready",
      retryWatchlistFetch: vi.fn(),
      selectedIds: [],
      hasSelection: false,
      customRegionOpen: false,
      customRegionValue: "",
      onSelectSingle: vi.fn(),
      onToggleMulti: vi.fn(),
      onConfirmMulti: vi.fn(),
      onOpenCustomRegion: vi.fn(),
      onCustomRegionValueChange: vi.fn(),
      onCustomRegionSubmit: vi.fn(),
      onBack: vi.fn(),
    };
    return result;
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ session: null, user: null, loading: false }),
}));

describe("Question — onComplete", () => {
  beforeEach(() => {
    getCurrentRecommendationMock.mockReset();
    getCurrentRecommendationMock.mockResolvedValue(null);
  });

  it("navigates to /home/result with filmCount and the full answers, plus the fixed subtitles field", () => {
    render(
      <MemoryRouter>
        <Question />
      </MemoryRouter>,
    );

    const answers = { genre: ["35"], seen: "any" } as never;
    captured.onComplete?.(3, answers);

    expect(navigateMock).toHaveBeenCalledWith("/home/result", {
      state: {
        filmCount: 3,
        answers: { genre: ["35"], seen: "any", subtitles: "any" },
      },
    });
  });
});
