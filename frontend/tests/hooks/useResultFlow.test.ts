import { act, renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  useResultFlow,
  MIN_LOADING_MS,
  type ResultFlowStart,
} from "@/hooks/useResultFlow";
import {
  ApiError,
  type RecommendRequest,
  type RecommendedFilm,
} from "@/lib/backend/api";

const { getRecommendationMock, recordDecisionMock } = vi.hoisted(() => ({
  getRecommendationMock: vi.fn(),
  recordDecisionMock: vi.fn(),
}));

vi.mock("@/lib/backend/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/backend/api")>();
  return {
    ...actual,
    getRecommendation: getRecommendationMock,
    recordDecision: recordDecisionMock,
  };
});

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

const START: ResultFlowStart = { type: "fresh", answers: ANSWERS };

function film(overrides: Partial<RecommendedFilm> = {}): RecommendedFilm {
  return {
    film_id: "f1",
    tmdb_id: null,
    title: "Film",
    poster_url: null,
    year: 2020,
    runtime: 100,
    overview: null,
    genres: [],
    origin_country: [],
    director: null,
    actors: [],
    rank: 1,
    match_score: null,
    critique: null,
    ...overrides,
  };
}

describe("useResultFlow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    getRecommendationMock.mockReset();
    recordDecisionMock.mockReset();
    recordDecisionMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in loading, then shows the first candidate on success", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [film({ film_id: "f1" }), film({ film_id: "f2", rank: 2 })],
      meta: { candidates_considered: 2 },
    });
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    expect(result.current.phase).toBe("loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(result.current.phase).toBe("card");
    expect(result.current.currentFilm?.film_id).toBe("f1");
  });

  it("does not call getRecommendation while ready is false, then fires once when ready flips true", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [film({ film_id: "f1" })],
      meta: { candidates_considered: 1 },
    });
    const { result, rerender } = renderHook(
      ({ token, ready }: { token: string | null; ready: boolean }) =>
        useResultFlow(START, token, ready),
      { initialProps: { token: null as string | null, ready: false } },
    );

    expect(result.current.phase).toBe("loading");
    expect(getRecommendationMock).not.toHaveBeenCalled();

    rerender({ token: "real-token", ready: true });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(getRecommendationMock).toHaveBeenCalledTimes(1);
    expect(getRecommendationMock).toHaveBeenCalledWith(ANSWERS, "real-token");
    expect(result.current.phase).toBe("card");
  });

  it("transitions to the no_match dead-end when the response has zero candidates", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [],
      meta: { candidates_considered: 0 },
    });
    const { result } = renderHook(() => useResultFlow(START, "token", true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("no_match");
  });

  it("maps a 422 failure to the no_match dead-end", async () => {
    getRecommendationMock.mockRejectedValue(new ApiError(422, "no_candidates"));
    const { result } = renderHook(() => useResultFlow(START, "token", true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("no_match");
  });

  it("maps a request-validation 422 to the technical dead-end, not no_match", async () => {
    getRecommendationMock.mockRejectedValue(
      new ApiError(
        422,
        JSON.stringify({ detail: [{ loc: ["body", "emotion", 0], msg: "too long" }] }),
      ),
    );
    const { result } = renderHook(() => useResultFlow(START, "token", true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("technical");
  });

  it("maps a 429 failure to the rate_limited dead-end", async () => {
    getRecommendationMock.mockRejectedValue(new ApiError(429, "rate_limited"));
    const { result } = renderHook(() => useResultFlow(START, "token", true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("rate_limited");
  });

  it("maps a 502/network failure to the technical dead-end", async () => {
    getRecommendationMock.mockRejectedValue(new ApiError(502, "ai_error"));
    const { result } = renderHook(() => useResultFlow(START, "token", true));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("technical");
  });

  it("accepting ends the flow without calling /recommend again", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [film({ film_id: "f1" })],
      meta: { candidates_considered: 1 },
    });
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    await act(async () => {
      result.current.onAccept();
    });

    expect(result.current.phase).toBe("accepted");
    expect(result.current.acceptedFilm?.film_id).toBe("f1");
    expect(recordDecisionMock).toHaveBeenCalledWith(
      {
        recommendation_session_id: "",
        film_id: "f1",
        decision: "accepted",
      },
      "token",
    );
    expect(getRecommendationMock).toHaveBeenCalledTimes(1);
  });

  it("skipping shows the next cached candidate without a new /recommend call", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [film({ film_id: "f1" }), film({ film_id: "f2", rank: 2 })],
      meta: { candidates_considered: 2 },
    });
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    act(() => {
      result.current.onSkip();
    });

    expect(result.current.phase).toBe("card");
    expect(result.current.currentFilm?.film_id).toBe("f2");
    expect(getRecommendationMock).toHaveBeenCalledTimes(1);
  });

  it("skipping every candidate of attempt 1 triggers a second /recommend call", async () => {
    getRecommendationMock.mockResolvedValueOnce({
      candidates: [film({ film_id: "f1" })],
      meta: { candidates_considered: 2 },
    });
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    getRecommendationMock.mockResolvedValueOnce({
      candidates: [film({ film_id: "f2" })],
      meta: { candidates_considered: 1 },
    });

    act(() => {
      result.current.onSkip();
    });
    expect(result.current.phase).toBe("loading");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(getRecommendationMock).toHaveBeenCalledTimes(2);
    expect(result.current.phase).toBe("card");
    expect(result.current.currentFilm?.film_id).toBe("f2");
  });

  it("skipping every candidate of attempt 2 dead-ends without a 3rd call", async () => {
    getRecommendationMock.mockResolvedValueOnce({
      candidates: [film({ film_id: "f1" })],
      meta: { candidates_considered: 2 },
    });
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    getRecommendationMock.mockResolvedValueOnce({
      candidates: [film({ film_id: "f2" })],
      meta: { candidates_considered: 2 },
    });
    act(() => {
      result.current.onSkip();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    act(() => {
      result.current.onSkip();
    });

    expect(getRecommendationMock).toHaveBeenCalledTimes(2);
    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("no_match");
  });

  it("skipping the last candidate of an exhausted pool dead-ends without a retry", async () => {
    getRecommendationMock.mockResolvedValueOnce({
      candidates: [film({ film_id: "f1" })],
      meta: { candidates_considered: 1 },
    });
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    act(() => {
      result.current.onSkip();
    });

    expect(getRecommendationMock).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("exhausted");
  });

  it("maps a 422 on the retry of a resumed session to exhausted", async () => {
    const resumed: ResultFlowStart = {
      type: "resumed",
      response: {
        candidates: [film({ film_id: "f1" })],
        meta: { candidates_considered: 1 },
        recommendation_session_id: "s1",
        answers: ANSWERS,
      },
    };
    getRecommendationMock.mockRejectedValueOnce(new ApiError(422, "no_candidates"));
    const { result } = renderHook(() => useResultFlow(resumed, "token", true));

    act(() => {
      result.current.onSkip();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    expect(getRecommendationMock).toHaveBeenCalledTimes(1);
    expect(result.current.phase).toBe("dead-end");
    expect(result.current.deadEndReason).toBe("exhausted");
  });

  it("shows a retry-worthy toast and still advances when recordDecision fails with a network error", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [film({ film_id: "f1" }), film({ film_id: "f2", rank: 2 })],
      meta: { candidates_considered: 2 },
    });
    recordDecisionMock.mockRejectedValue(new ApiError(0, "Network error"));
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    await act(async () => {
      result.current.onSkip();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.phase).toBe("card");
    expect(result.current.currentFilm?.film_id).toBe("f2");
    expect(result.current.toastMessage).toBe(
      "Petit souci réseau — ta dernière décision n'a peut-être pas été enregistrée.",
    );
  });

  it("shows the no-retry toast wording on a 404 unknown_candidate", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [film({ film_id: "f1" })],
      meta: { candidates_considered: 1 },
    });
    recordDecisionMock.mockRejectedValue(
      new ApiError(404, "unknown_candidate"),
    );
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });

    await act(async () => {
      result.current.onAccept();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.toastMessage).toBe(
      "Cette décision n'a pas pu être enregistrée.",
    );
  });

  it("dismissToast clears the toast message", async () => {
    getRecommendationMock.mockResolvedValue({
      candidates: [film({ film_id: "f1" })],
      meta: { candidates_considered: 1 },
    });
    recordDecisionMock.mockRejectedValue(new ApiError(0, "Network error"));
    const { result } = renderHook(() => useResultFlow(START, "token", true));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MIN_LOADING_MS);
    });
    await act(async () => {
      result.current.onAccept();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.toastMessage).not.toBeNull();

    act(() => {
      result.current.dismissToast();
    });
    expect(result.current.toastMessage).toBeNull();
  });
});
