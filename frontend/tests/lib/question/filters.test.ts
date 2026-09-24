import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildFilterTest,
  countMatchingFilms,
} from "@/lib/question/filters";
import type { AppliedFilter, FilterFilm } from "@/lib/question/types";

// Case names mirror backend/tests/test_filtering.py so a behavior change can be
// traced to its counterpart in the other suite.

const NOW = new Date("2026-06-01T12:00:00Z");
const COMEDY = "35";
const CRIME = "80";

function film(overrides: Partial<FilterFilm> = {}): FilterFilm {
  return {
    genres: [],
    duration: null,
    era: null,
    origin_country: [],
    last_proposed_at: null,
    ...overrides,
  };
}

function minutesAgo(minutes: number): string {
  return new Date(NOW.getTime() - minutes * 60 * 1000).toISOString();
}

describe("buildFilterTest", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("genre", () => {
    it("none bypasses the filter", () => {
      const test = buildFilterTest("genre", ["none"]);
      expect(test(film({ genres: [] }))).toBe(true);
    });

    it("multi selection requires all genres", () => {
      const test = buildFilterTest("genre", [COMEDY, CRIME]);
      expect(test(film({ genres: [COMEDY, CRIME, "18"] }))).toBe(true);
    });

    it("multi selection excludes a film matching only one genre", () => {
      const test = buildFilterTest("genre", [COMEDY, CRIME]);
      expect(test(film({ genres: [COMEDY] }))).toBe(false);
    });
  });

  describe.each([
    { questionId: "duration", answer: "90-120", other: "150plus" },
    { questionId: "era", answer: "recent", other: "golden" },
  ] as const)("$questionId", ({ questionId, answer, other }) => {
    it("any bypasses the filter", () => {
      const test = buildFilterTest(questionId, "any");
      expect(test(film({ [questionId]: other }))).toBe(true);
    });

    it("keeps a film in the selected bucket", () => {
      const test = buildFilterTest(questionId, answer);
      expect(test(film({ [questionId]: answer }))).toBe(true);
    });

    it("excludes a film in another bucket", () => {
      const test = buildFilterTest(questionId, answer);
      expect(test(film({ [questionId]: other }))).toBe(false);
    });

    it("missing value is not excluded", () => {
      const test = buildFilterTest(questionId, answer);
      expect(test(film({ [questionId]: null }))).toBe(true);
    });
  });

  describe("region", () => {
    it("none bypasses the filter", () => {
      const test = buildFilterTest("region", ["none"]);
      expect(test(film({ origin_country: [] }))).toBe(true);
    });

    it("matches on origin_country", () => {
      const test = buildFilterTest("region", ["GB"]);
      expect(test(film({ origin_country: ["GB"] }))).toBe(true);
      expect(test(film({ origin_country: ["US"] }))).toBe(false);
    });

    it("ignores the other option and keeps custom countries", () => {
      const test = buildFilterTest("region", ["other", "BR"]);
      expect(test(film({ origin_country: ["BR"] }))).toBe(true);
    });
  });

  describe("seen", () => {
    it.each(["any", "nouveau"])(
      "never proposed film passes with %s",
      (answer) => {
        const test = buildFilterTest("seen", answer);
        expect(test(film({ last_proposed_at: null }))).toBe(true);
      },
    );

    it("recent history excluded even with seen any", () => {
      const test = buildFilterTest("seen", "any");
      expect(test(film({ last_proposed_at: minutesAgo(5) }))).toBe(false);
    });

    it("seen any allows old history", () => {
      const test = buildFilterTest("seen", "any");
      expect(test(film({ last_proposed_at: minutesAgo(60) }))).toBe(true);
    });

    it("excludes old history when asking for something new", () => {
      const test = buildFilterTest("seen", "nouveau");
      expect(test(film({ last_proposed_at: minutesAgo(60) }))).toBe(false);
    });

    it("session window ends exactly at 15 minutes", () => {
      const test = buildFilterTest("seen", "any");
      expect(test(film({ last_proposed_at: minutesAgo(15) }))).toBe(true);
    });
  });

  it("soft questions never filter", () => {
    const test = buildFilterTest("emotion", "Mélancolique");
    expect(test(film())).toBe(true);
  });
});

describe("countMatchingFilms", () => {
  const films = [
    film({ genres: [COMEDY], origin_country: ["FR"] }),
    film({ genres: [COMEDY], origin_country: ["US"] }),
    film({ genres: [CRIME], origin_country: ["FR"] }),
  ];

  it("counts every film when no filter is applied", () => {
    expect(countMatchingFilms(films, [])).toBe(3);
  });

  it("counts only films passing every filter", () => {
    const filters: AppliedFilter[] = [
      { questionId: "genre", test: buildFilterTest("genre", [COMEDY]) },
      { questionId: "region", test: buildFilterTest("region", ["FR"]) },
    ];
    expect(countMatchingFilms(films, filters)).toBe(1);
  });
});
