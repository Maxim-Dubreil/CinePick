import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, validateLetterboxdAccount, syncWatchlist } from "@/lib/backend/api";

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
    await expect(validateLetterboxdAccount("unknown")).rejects.toThrow(ApiError);
    await expect(validateLetterboxdAccount("unknown")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws ApiError(403) when watchlist is private", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 403 }));
    await expect(validateLetterboxdAccount("private")).rejects.toThrow(ApiError);
    await expect(validateLetterboxdAccount("private")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws ApiError(0) on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(validateLetterboxdAccount("johndoe")).rejects.toThrow(ApiError);
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

  it("sends username in JSON body", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ count: 1, synced_at: "2026-06-25T10:00:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await syncWatchlist("cinephile", null);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect(JSON.parse((options as RequestInit).body as string)).toEqual({
      username: "cinephile",
    });
  });

  it("includes Authorization header when token is provided", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ count: 1, synced_at: "2026-06-25T10:00:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await syncWatchlist("cinephile", "my-token");
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).toMatchObject({
      Authorization: "Bearer my-token",
    });
  });

  it("omits Authorization header when token is null", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ count: 1, synced_at: "2026-06-25T10:00:00.000Z" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    await syncWatchlist("cinephile", null);
    const [, options] = vi.mocked(fetch).mock.calls[0];
    expect((options as RequestInit).headers).not.toHaveProperty("Authorization");
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
