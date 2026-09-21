export type QuestionId =
  | "genre"
  | "emotion"
  | "ambiance"
  | "withWho"
  | "duration"
  | "era"
  | "region"
  | "subtitles"
  | "seen";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Question {
  id: QuestionId;
  label: string;
  hard: boolean;
  multi: boolean;
  exclusiveId?: string;
  options: QuestionOption[];
}

export type AnswerValue = string | string[];

export type FilmDuration = "lt90" | "90-120" | "120-150" | "150plus";

export type FilmEra =
  | "silent"
  | "golden"
  | "newwave"
  | "blockbuster"
  | "2000s"
  | "recent";

/** A watchlist film as returned by `GET /watchlist`, ready for client-side
 * filtering — `duration`/`era` are `null` when unknown, never excluded by
 * their respective filter (mirrors `filtering.py`). */
export interface FilterFilm {
  genres: string[];
  duration: FilmDuration | null;
  era: FilmEra | null;
  origin_country: string[];
  last_proposed_at: string | null;
}

export interface AppliedFilter {
  questionId: QuestionId;
  test: (film: FilterFilm) => boolean;
}
