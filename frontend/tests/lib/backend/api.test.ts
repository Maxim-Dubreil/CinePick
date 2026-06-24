import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, getWatchlistCount } from "@/lib/backend/api";

describe("getWatchlistCount", () => {
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
    const result = await getWatchlistCount("johndoe");
    expect(result).toEqual({ username: "johndoe", count: 42 });
  });

  it("throws ApiError(404) when user not found", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 404 }));
    await expect(getWatchlistCount("unknown")).rejects.toThrow(ApiError);
    await expect(getWatchlistCount("unknown")).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws ApiError(403) when watchlist is private", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 403 }));
    await expect(getWatchlistCount("private")).rejects.toThrow(ApiError);
    await expect(getWatchlistCount("private")).rejects.toMatchObject({
      status: 403,
    });
  });

  it("throws ApiError(0) on network failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(getWatchlistCount("johndoe")).rejects.toThrow(ApiError);
    await expect(getWatchlistCount("johndoe")).rejects.toMatchObject({
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
    await getWatchlistCount("jo hn");
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain("jo%20hn");
  });
});
