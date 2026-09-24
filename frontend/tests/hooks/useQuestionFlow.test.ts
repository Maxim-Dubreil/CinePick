import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  useQuestionFlow,
  type UseQuestionFlowResult,
} from "@/hooks/useQuestionFlow";
import type { WatchlistFilterFilm } from "@/lib/backend/api";

const { getWatchlistForFilterMock } = vi.hoisted(() => ({
  getWatchlistForFilterMock: vi.fn(),
}));

vi.mock("@/lib/backend/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend/api")>();
  return { ...actual, getWatchlistForFilter: getWatchlistForFilterMock };
});

// Mirrors LOADING_DELAY_MS in useQuestionFlow.ts.
const LOADING_DELAY_MS = 420;
const COMEDY = "35";
const CRIME = "80";

function film(overrides: Partial<WatchlistFilterFilm> = {}): WatchlistFilterFilm {
  return {
    id: "f",
    genres: [],
    duration: null,
    era: null,
    origin_country: [],
    last_proposed_at: null,
    ...overrides,
  };
}

const FILMS = [
  film({ duration: "lt90", genres: [COMEDY], origin_country: ["FR"] }),
  film({ duration: "90-120", genres: [COMEDY, CRIME], origin_country: ["US"] }),
  film({ duration: "90-120", genres: [CRIME], origin_country: ["BR"] }),
];

type Hook = { current: UseQuestionFlowResult };

async function renderFlow(onComplete = vi.fn()) {
  const hook = renderHook(() =>
    useQuestionFlow({ token: "tok", ready: true, onComplete }),
  );
  // Flush the watchlist fetch promise.
  await act(async () => {});
  return { ...hook, onComplete };
}

function finishLoading() {
  act(() => {
    vi.advanceTimersByTime(LOADING_DELAY_MS);
  });
}

function selectSingle(result: Hook, optionId: string) {
  act(() => result.current.onSelectSingle(optionId));
  finishLoading();
}

function toggle(result: Hook, optionId: string) {
  act(() => result.current.onToggleMulti(optionId));
}

/** Answers every question with its "no preference" option up to `step`
 * (exclusive). Question order: duration, withWho, genre, era, region,
 * emotion, ambiance, seen. */
function skipTo(result: Hook, step: number) {
  while (result.current.step < step) {
    const { exclusiveId, multi } = result.current.currentQuestion;
    if (multi) {
      toggle(result, exclusiveId as string);
      finishLoading();
    } else {
      selectSingle(result, exclusiveId as string);
    }
  }
}

describe("useQuestionFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getWatchlistForFilterMock.mockReset();
    getWatchlistForFilterMock.mockResolvedValue({ films: FILMS });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("watchlist fetch", () => {
    it("does not fetch until ready", () => {
      renderHook(() =>
        useQuestionFlow({ token: "tok", ready: false, onComplete: vi.fn() }),
      );
      expect(getWatchlistForFilterMock).not.toHaveBeenCalled();
    });

    it("starts with the full watchlist count once loaded", async () => {
      const { result } = await renderFlow();
      expect(getWatchlistForFilterMock).toHaveBeenCalledWith("tok");
      expect(result.current.watchlistStatus).toBe("ready");
      expect(result.current.filmCount).toBe(3);
    });

    it("exposes the error and refetches on retry", async () => {
      getWatchlistForFilterMock.mockRejectedValueOnce(new Error("network"));
      const { result } = await renderFlow();
      expect(result.current.watchlistStatus).toBe("error");

      act(() => result.current.retryWatchlistFetch());
      await act(async () => {});
      expect(getWatchlistForFilterMock).toHaveBeenCalledTimes(2);
      expect(result.current.watchlistStatus).toBe("ready");
      expect(result.current.filmCount).toBe(3);
    });
  });

  describe("single-choice questions", () => {
    it("a hard answer narrows the count, then advances after the delay", async () => {
      const { result } = await renderFlow();
      act(() => result.current.onSelectSingle("90-120"));
      expect(result.current.loading).toBe(true);
      expect(result.current.filmCount).toBe(2);
      expect(result.current.step).toBe(0);

      finishLoading();
      expect(result.current.loading).toBe(false);
      expect(result.current.step).toBe(1);
    });

    it("a soft answer never changes the count", async () => {
      const { result } = await renderFlow();
      skipTo(result, 1);
      selectSingle(result, "amis");
      expect(result.current.filmCount).toBe(3);
    });

    it("zero-result fallback ignores the filter and explains it", async () => {
      const { result } = await renderFlow();
      selectSingle(result, "lt90");
      skipTo(result, 2);
      // The only lt90 film is a comedy — no crime film survives.
      toggle(result, CRIME);
      act(() => result.current.onConfirmMulti());
      expect(result.current.filmCount).toBe(1);
      expect(result.current.fallbackNote).not.toBeNull();
    });
  });

  describe("multi-choice questions", () => {
    it("toggling previews the count without advancing", async () => {
      const { result } = await renderFlow();
      skipTo(result, 2);
      toggle(result, COMEDY);
      expect(result.current.selectedIds).toEqual([COMEDY]);
      expect(result.current.filmCount).toBe(2);
      expect(result.current.loading).toBe(false);

      toggle(result, CRIME);
      expect(result.current.filmCount).toBe(1);

      toggle(result, CRIME);
      expect(result.current.selectedIds).toEqual([COMEDY]);
      expect(result.current.filmCount).toBe(2);
    });

    it("confirming applies the selection and advances", async () => {
      const { result } = await renderFlow();
      skipTo(result, 2);
      toggle(result, CRIME);
      act(() => result.current.onConfirmMulti());
      finishLoading();
      expect(result.current.step).toBe(3);
      expect(result.current.filmCount).toBe(2);
    });

    it("confirming an empty selection does nothing", async () => {
      const { result } = await renderFlow();
      skipTo(result, 2);
      act(() => result.current.onConfirmMulti());
      expect(result.current.loading).toBe(false);
      expect(result.current.step).toBe(2);
    });

    it("the exclusive option confirms immediately", async () => {
      const { result } = await renderFlow();
      skipTo(result, 2);
      toggle(result, "none");
      expect(result.current.loading).toBe(true);
      finishLoading();
      expect(result.current.step).toBe(3);
    });
  });

  describe("custom region", () => {
    it("adds a typed country before 'other', selects it and previews the count", async () => {
      const { result } = await renderFlow();
      skipTo(result, 4);
      act(() => result.current.onOpenCustomRegion());
      act(() => result.current.onCustomRegionValueChange("br"));
      act(() => result.current.onCustomRegionSubmit());

      const ids = result.current.currentQuestion.options.map((o) => o.id);
      expect(ids.slice(-2)).toEqual(["BR", "other"]);
      expect(result.current.selectedIds).toEqual(["BR"]);
      expect(result.current.filmCount).toBe(1);
      expect(result.current.customRegionValue).toBe("");
    });

    it("ignores an unknown country", async () => {
      const { result } = await renderFlow();
      skipTo(result, 4);
      act(() => result.current.onCustomRegionValueChange("Atlantide"));
      act(() => result.current.onCustomRegionSubmit());
      expect(result.current.selectedIds).toEqual([]);
      expect(result.current.customRegionValue).toBe("Atlantide");
    });
  });

  describe("back navigation", () => {
    it("is a no-op on the first question", async () => {
      const { result } = await renderFlow();
      expect(result.current.showBackButton).toBe(false);
      act(() => result.current.onBack());
      expect(result.current.step).toBe(0);
    });

    it("is a no-op while an answer is loading", async () => {
      const { result } = await renderFlow();
      skipTo(result, 1);
      act(() => result.current.onSelectSingle("amis"));
      act(() => result.current.onBack());
      expect(result.current.step).toBe(1);
    });

    it("drops an unconfirmed multi-select preview", async () => {
      const { result } = await renderFlow();
      skipTo(result, 2);
      toggle(result, CRIME);
      expect(result.current.filmCount).toBe(2);
      act(() => result.current.onBack());
      expect(result.current.step).toBe(1);
      expect(result.current.filmCount).toBe(3);
    });

    it("re-answering a question replaces its previous filter", async () => {
      const { result } = await renderFlow();
      selectSingle(result, "90-120");
      act(() => result.current.onBack());
      selectSingle(result, "lt90");
      expect(result.current.filmCount).toBe(1);
      expect(result.current.fallbackNote).toBeNull();
    });

    it("a re-answer falling back to zero drops the previous filter too", async () => {
      getWatchlistForFilterMock.mockResolvedValue({
        films: [film({ duration: "lt90" }), film({ duration: "90-120" })],
      });
      const { result } = await renderFlow();
      selectSingle(result, "lt90");
      act(() => result.current.onBack());
      selectSingle(result, "150plus");
      expect(result.current.filmCount).toBe(2);
      expect(result.current.fallbackNote).not.toBeNull();

      // Going back recounts from the applied filters: the stale lt90 one must be gone.
      act(() => result.current.onBack());
      expect(result.current.filmCount).toBe(2);
    });
  });

  it("answering the last question reports the count and every answer", async () => {
    const { result, onComplete } = await renderFlow();
    selectSingle(result, "90-120");
    skipTo(result, 7);
    selectSingle(result, "any");

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(2, {
      duration: "90-120",
      withWho: "any",
      genre: ["none"],
      era: "any",
      region: ["none"],
      emotion: ["none"],
      ambiance: ["none"],
      seen: "any",
    });
  });
});
