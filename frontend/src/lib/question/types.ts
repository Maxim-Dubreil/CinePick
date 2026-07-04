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

export interface MockFilm {
  genres: string[];
  duration: FilmDuration;
  era: FilmEra;
  country: string;
  seen: boolean;
}

export interface AppliedFilter {
  questionId: QuestionId;
  test: (film: MockFilm) => boolean;
}
