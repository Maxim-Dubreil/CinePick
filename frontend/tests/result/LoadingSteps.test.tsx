import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LoadingSteps, STEP_DURATION_MS } from "@/components/result/LoadingSteps";

describe("LoadingSteps", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts on the first step", () => {
    render(<LoadingSteps />);
    expect(screen.getByText("Filtrage de ta watchlist")).toBeInTheDocument();
  });

  it("advances through the steps on a fixed timer, then stays on the last one", () => {
    vi.useFakeTimers();
    render(<LoadingSteps />);

    act(() => {
      vi.advanceTimersByTime(STEP_DURATION_MS);
    });
    expect(screen.getByText("Sélection des meilleurs films")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(STEP_DURATION_MS);
    });
    expect(screen.getByText("Finalisation…")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(STEP_DURATION_MS * 5);
    });
    expect(screen.getByText("Finalisation…")).toBeInTheDocument();
  });
});
