import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useHistory } from "@/hooks/useHistory";

// Records every query-builder call (`from`, `select`, `delete`, `eq`, `in`…)
// and resolves any chain to an empty result, so a test can assert on the
// exact filters a query was built with.
const calls: unknown[][] = [];
const chain: Record<string, unknown> = {};
for (const method of ["select", "delete", "eq", "in", "order", "range"]) {
  chain[method] = (...args: unknown[]) => {
    calls.push([method, ...args]);
    return chain;
  };
}
chain.then = (resolve: (value: unknown) => void) =>
  resolve({ data: [], count: 0, error: null });

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      calls.push(["from", table]);
      return chain;
    },
  },
}));

describe("useHistory.clearHistory", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("deletes only the user's accepted/skipped rows, never in-flight proposals", async () => {
    const { result } = renderHook(() => useHistory("user-1", 1));
    await waitFor(() => expect(result.current.loading).toBe(false));
    calls.length = 0;

    await act(() => result.current.clearHistory());

    const deleteAt = calls.findIndex(([method]) => method === "delete");
    expect(deleteAt).toBeGreaterThan(-1);
    const deleteQuery = calls.slice(deleteAt);
    expect(deleteQuery).toContainEqual(["eq", "user_id", "user-1"]);
    expect(deleteQuery).toContainEqual(["in", "decision", ["accepted", "skipped"]]);
  });
});
