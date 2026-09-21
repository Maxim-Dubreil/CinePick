import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Question } from "@/pages/Question";
import type {
  UseQuestionFlowOptions,
  UseQuestionFlowResult,
} from "@/hooks/useQuestionFlow";

const { navigateMock, captured } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  captured: {
    onComplete: null as UseQuestionFlowOptions["onComplete"] | null,
  },
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/hooks/useQuestionFlow", () => ({
  useQuestionFlow: (options: UseQuestionFlowOptions) => {
    captured.onComplete = options.onComplete;
    const result: UseQuestionFlowResult = {
      step: 0,
      totalSteps: 9,
      currentQuestion: {
        id: "genre",
        label: "Genre ?",
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
  it("navigates to /home/result with filmCount and the full answers", () => {
    render(
      <MemoryRouter>
        <Question />
      </MemoryRouter>,
    );

    const answers = { genre: ["35"], seen: "any" } as never;
    captured.onComplete?.(3, answers);

    expect(navigateMock).toHaveBeenCalledWith("/home/result", {
      state: { filmCount: 3, answers },
    });
  });
});
