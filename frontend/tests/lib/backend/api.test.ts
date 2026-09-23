import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ApiError,
  validateLetterboxdAccount,
  syncWatchlist,
  getRecommendation,
  recordDecision,
  type RecommendRequest,
  type RecommendResponse,
  type RecommendDecisionRequest,
} from "@/lib/backend/api";

describe("validateLetterboxdAccount", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns username and count on 200", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ username: "johndoe", count: 42 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await validateLetterboxdAccount("johndoe");
    expect(result).toEqual({ username: "johndoe", count: 42 });
  });

  it("throws ApiError(404) when user not found", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));
    await expect(validateLetterboxdAccount("unknown")).rejects.toThrow(
      ApiError,
    );
    await expect(validateLetterboxdAccount("unknown")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws ApiError(403) when watchlist is private", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 403 }));
    await expect(validateLetterboxdAccount("private")).rejects.toThrow(
      ApiError,
    );
    await expect(validateLetterboxdAccount("private")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws ApiError(0) on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(validateLetterboxdAccount("johndoe")).rejects.toThrow(
      ApiError,
    );
    await expect(validateLetterboxdAccount("johndoe")).rejects.toMatchObject({
      status: 0,
    });
  });

  it("encodes username in the query string", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ username: "jo hn", count: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await validateLetterboxdAccount("jo hn");
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("jo%20hn");
  });
});

describe("syncWatchlist", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns count and synced_at on 200", async () => {
    const payload = { count: 42, synced_at: "2026-06-25T10:00:00.000Z" };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await syncWatchlist("cinephile", null);
    expect(result).toEqual(payload);
  });

  it("sends letterboxd_username in JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ count: 1, synced_at: "2026-06-25T10:00:00.000Z" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    await syncWatchlist("cinephile", null);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({
      letterboxd_username: "cinephile",
    });
  });

  it("includes Authorization header when token is provided", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ count: 1, synced_at: "2026-06-25T10:00:00.000Z" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    await syncWatchlist("cinephile", "my-token");
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer my-token",
    });
  });

  it("omits Authorization header when token is null", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ count: 1, synced_at: "2026-06-25T10:00:00.000Z" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    await syncWatchlist("cinephile", null);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).not.toHaveProperty(
      "Authorization",
    );
  });

  it("throws ApiError on non-2xx response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 500 }));
    const err = syncWatchlist("cinephile", null);
    await expect(err).rejects.toThrow(ApiError);
    await expect(err).rejects.toMatchObject({ status: 500 });
  });

  it("throws ApiError(0) on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(syncWatchlist("cinephile", null)).rejects.toMatchObject({
      status: 0,
    });
  });
});

const SAMPLE_ANSWERS: RecommendRequest = {
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

describe("getRecommendation", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns candidates and meta on 200", async () => {
    const payload: RecommendResponse = {
      candidates: [
        {
          film_id: "f1",
          title: "Film 1",
          poster_url: null,
          year: 2020,
          runtime: 100,
          overview: null,
          genres: ["35"],
          origin_country: ["FR"],
          director: null,
          rank: 1,
          match_score: 87,
          critique: "Bon choix",
        },
      ],
      meta: { candidates_considered: 5 },
      recommendation_session_id: "session-1",
    };
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const result = await getRecommendation(SAMPLE_ANSWERS, "my-token");
    expect(result).toEqual(payload);
  });

  it("sends the answers as JSON body with Authorization header", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [], meta: { candidates_considered: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    await getRecommendation(SAMPLE_ANSWERS, "my-token");
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/recommend");
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(
      SAMPLE_ANSWERS,
    );
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer my-token",
    });
  });

  it("omits Authorization header when token is null", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ candidates: [], meta: { candidates_considered: 0 } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    await getRecommendation(SAMPLE_ANSWERS, null);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).not.toHaveProperty(
      "Authorization",
    );
  });

  it("throws ApiError(422) when the watchlist has no match", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: { type: "no_candidates" } }), {
        status: 422,
      }),
    );
    await expect(
      getRecommendation(SAMPLE_ANSWERS, "my-token"),
    ).rejects.toMatchObject({
      status: 422,
    });
  });

  it("throws ApiError(0) on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      getRecommendation(SAMPLE_ANSWERS, "my-token"),
    ).rejects.toMatchObject({
      status: 0,
    });
  });
});

describe("recordDecision", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  const SAMPLE_DECISION: RecommendDecisionRequest = {
    recommendation_session_id: "session-1",
    film_id: "f1",
    decision: "skipped",
  };

  it("sends the decision as JSON body with Authorization header", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await recordDecision(SAMPLE_DECISION, "my-token");
    const [url, options] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toContain("/recommend/decision");
    expect(JSON.parse((options as RequestInit).body as string)).toEqual(
      SAMPLE_DECISION,
    );
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer my-token",
    });
  });

  it("throws ApiError(404) when the film was never proposed", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ detail: { type: "unknown_candidate" } }), {
        status: 404,
      }),
    );
    await expect(
      recordDecision(SAMPLE_DECISION, "my-token"),
    ).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws ApiError(0) on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(
      recordDecision(SAMPLE_DECISION, "my-token"),
    ).rejects.toMatchObject({
      status: 0,
    });
  });
});
