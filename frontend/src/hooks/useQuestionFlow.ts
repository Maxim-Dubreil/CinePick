import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { getQuestions } from "@/lib/question/questionnaire";
import { buildFilterTest, countMatchingFilms } from "@/lib/question/filters";
import { getWatchlistForFilter } from "@/lib/backend/api";
import type {
  AnswerValue,
  AppliedFilter,
  FilterFilm,
  Question,
  QuestionId,
  QuestionOption,
} from "@/lib/question/types";

const LOADING_DELAY_MS = 420;
const QUESTIONS = getQuestions();

interface FlowState {
  step: number;
  answers: Record<string, AnswerValue>;
  multiSelections: Record<string, string[]>;
  appliedFilters: AppliedFilter[];
  filmCount: number;
  fallbackNote: string | null;
  loading: boolean;
  customRegionOpen: boolean;
  customRegionValue: string;
  customRegions: QuestionOption[];
}

type FlowAction =
  | { type: "SELECT_SINGLE"; optionId: string }
  | { type: "TOGGLE_MULTI"; optionId: string }
  | { type: "CONFIRM_MULTI" }
  | { type: "FINISH_LOADING" }
  | { type: "GO_BACK" }
  | { type: "OPEN_CUSTOM_REGION" }
  | { type: "SET_CUSTOM_REGION_VALUE"; value: string }
  | { type: "SUBMIT_CUSTOM_REGION" }
  | { type: "FILMS_LOADED"; count: number };

function createInitialState(totalFilms: number): FlowState {
  return {
    step: 0,
    answers: {},
    multiSelections: {},
    appliedFilters: [],
    filmCount: totalFilms,
    fallbackNote: null,
    loading: false,
    customRegionOpen: false,
    customRegionValue: "",
    customRegions: [],
  };
}

function confirmAnswer(
  state: FlowState,
  films: FilterFilm[],
  questionId: QuestionId,
  answer: AnswerValue,
): FlowState {
  const question = QUESTIONS.find((q) => q.id === questionId);
  if (!question) return state;

  let appliedFilters = state.appliedFilters;
  let filmCount = state.filmCount;
  let fallbackNote: string | null = null;

  if (question.hard) {
    const candidateFilter: AppliedFilter = {
      questionId,
      test: buildFilterTest(questionId, answer),
    };
    const candidateFilters = [...state.appliedFilters, candidateFilter];
    const candidateCount = countMatchingFilms(films, candidateFilters);
    if (candidateCount === 0) {
      fallbackNote = FALLBACK_NOTE;
      filmCount = countMatchingFilms(films, state.appliedFilters);
    } else {
      appliedFilters = candidateFilters;
      filmCount = candidateCount;
    }
  }

  return {
    ...state,
    answers: { ...state.answers, [questionId]: answer },
    appliedFilters,
    filmCount,
    fallbackNote,
    loading: true,
  };
}

const FALLBACK_NOTE =
  "Aucun film ne correspond pile à ce critère — on l'ignore et on te montre les films les plus proches.";

/** Live preview of the count while a multi-select question is still being
 * built (before "Continuer") — same computation as `confirmAnswer`, but
 * doesn't touch `appliedFilters`/`answers` since nothing is confirmed yet. */
function previewMultiSelection(
  state: FlowState,
  films: FilterFilm[],
  question: Question,
  selection: string[],
): Pick<FlowState, "filmCount" | "fallbackNote"> {
  const baseCount = countMatchingFilms(films, state.appliedFilters);
  if (!question.hard || selection.length === 0) {
    return { filmCount: baseCount, fallbackNote: null };
  }
  const candidateFilters = [
    ...state.appliedFilters,
    { questionId: question.id, test: buildFilterTest(question.id, selection) },
  ];
  const candidateCount = countMatchingFilms(films, candidateFilters);
  if (candidateCount === 0) {
    return { filmCount: baseCount, fallbackNote: FALLBACK_NOTE };
  }
  return { filmCount: candidateCount, fallbackNote: null };
}

function mergeCustomRegionOptions(
  options: QuestionOption[],
  customRegions: QuestionOption[],
): QuestionOption[] {
  const otherIndex = options.findIndex((o) => o.id === "other");
  if (otherIndex === -1) return options;
  return [
    ...options.slice(0, otherIndex),
    ...customRegions,
    options[otherIndex],
  ];
}

function createFlowReducer(films: FilterFilm[]) {
  return function flowReducer(state: FlowState, action: FlowAction): FlowState {
    const question = QUESTIONS[state.step];

    switch (action.type) {
      case "SELECT_SINGLE":
        return confirmAnswer(state, films, question.id, action.optionId);

      case "TOGGLE_MULTI": {
        const exclusiveId = question.exclusiveId;
        if (action.optionId === exclusiveId) {
          return confirmAnswer(state, films, question.id, [exclusiveId]);
        }
        const current = state.multiSelections[question.id] ?? [];
        const withoutExclusive = current.filter((id) => id !== exclusiveId);
        const next = withoutExclusive.includes(action.optionId)
          ? withoutExclusive.filter((id) => id !== action.optionId)
          : [...withoutExclusive, action.optionId];
        return {
          ...state,
          multiSelections: { ...state.multiSelections, [question.id]: next },
          ...previewMultiSelection(state, films, question, next),
        };
      }

      case "CONFIRM_MULTI": {
        const selection = state.multiSelections[question.id] ?? [];
        if (selection.length === 0) return state;
        return confirmAnswer(state, films, question.id, selection);
      }

      case "FINISH_LOADING":
        return {
          ...state,
          loading: false,
          step: state.step + 1,
          customRegionOpen: false,
          customRegionValue: "",
        };

      case "GO_BACK":
        if (state.step === 0 || state.loading) return state;
        // Drop any live preview from an unconfirmed multi-select toggle —
        // the count must reflect only confirmed answers once we navigate away.
        return {
          ...state,
          step: state.step - 1,
          fallbackNote: null,
          filmCount: countMatchingFilms(films, state.appliedFilters),
        };

      case "OPEN_CUSTOM_REGION":
        return { ...state, customRegionOpen: true };

      case "SET_CUSTOM_REGION_VALUE":
        return { ...state, customRegionValue: action.value };

      case "SUBMIT_CUSTOM_REGION": {
        const value = state.customRegionValue.trim();
        if (!value) return state;
        const code = value.slice(0, 3).toUpperCase();
        const alreadyAdded = state.customRegions.some((r) => r.id === code);
        const currentSelection = (state.multiSelections.region ?? []).filter(
          (id) => id !== "none",
        );
        const nextSelection = currentSelection.includes(code)
          ? currentSelection
          : [...currentSelection, code];
        return {
          ...state,
          customRegions: alreadyAdded
            ? state.customRegions
            : [...state.customRegions, { id: code, label: value }],
          multiSelections: { ...state.multiSelections, region: nextSelection },
          customRegionValue: "",
          ...previewMultiSelection(state, films, question, nextSelection),
        };
      }

      case "FILMS_LOADED":
        // Only meaningful before the first answer — the watchlist fetch
        // resolves while the flow still shows step 0 with no filters applied.
        return { ...state, filmCount: action.count };

      default:
        return state;
    }
  };
}

export interface UseQuestionFlowOptions {
  token: string | null;
  ready: boolean;
  onComplete: (
    filmCount: number,
    answers: Record<QuestionId, AnswerValue>,
  ) => void;
}

export type WatchlistFetchStatus = "loading" | "error" | "ready";

export interface UseQuestionFlowResult {
  watchlistStatus: WatchlistFetchStatus;
  retryWatchlistFetch: () => void;
  step: number;
  totalSteps: number;
  currentQuestion: Question;
  filmCount: number;
  fallbackNote: string | null;
  loading: boolean;
  showBackButton: boolean;
  selectedIds: string[];
  hasSelection: boolean;
  customRegionOpen: boolean;
  customRegionValue: string;
  onSelectSingle: (optionId: string) => void;
  onToggleMulti: (optionId: string) => void;
  onConfirmMulti: () => void;
  onOpenCustomRegion: () => void;
  onCustomRegionValueChange: (value: string) => void;
  onCustomRegionSubmit: () => void;
  onBack: () => void;
}

export function useQuestionFlow({
  token,
  ready,
  onComplete,
}: UseQuestionFlowOptions): UseQuestionFlowResult {
  const [films, setFilms] = useState<FilterFilm[]>([]);
  const [watchlistStatus, setWatchlistStatus] =
    useState<WatchlistFetchStatus>("loading");
  const [retryCount, setRetryCount] = useState(0);

  const reducer = useMemo(() => createFlowReducer(films), [films]);
  const [state, dispatch] = useReducer(reducer, 0, createInitialState);

  // React 19 StrictMode (see frontend/src/main.tsx) mounts effects twice in
  // dev — without this guard, that would fire two /watchlist calls on load.
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (!ready || hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    getWatchlistForFilter(token)
      .then((response) => {
        setFilms(response.films);
        setWatchlistStatus("ready");
        dispatch({ type: "FILMS_LOADED", count: response.films.length });
      })
      .catch(() => {
        setWatchlistStatus("error");
      });
  }, [ready, token, retryCount]);

  useEffect(() => {
    if (!state.loading) return;
    const isLastQuestion = state.step === QUESTIONS.length - 1;
    const timeoutId = window.setTimeout(() => {
      if (isLastQuestion) {
        // `state.answers` is `Record<string, AnswerValue>` internally (it starts
        // empty and fills in over the flow); by the time the last question is
        // answered every QuestionId key is present, so this cast is safe.
        onComplete(
          state.filmCount,
          state.answers as Record<QuestionId, AnswerValue>,
        );
      } else {
        dispatch({ type: "FINISH_LOADING" });
      }
    }, LOADING_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [state.loading, state.step, state.filmCount, state.answers, onComplete]);

  const question = QUESTIONS[state.step];
  const currentQuestion: Question =
    question.id === "region"
      ? {
          ...question,
          options: mergeCustomRegionOptions(
            question.options,
            state.customRegions,
          ),
        }
      : question;

  const selectedIds = state.multiSelections[question.id] ?? [];

  const retryWatchlistFetch = () => {
    hasFetchedRef.current = false;
    setWatchlistStatus("loading");
    setRetryCount((c) => c + 1);
  };

  return {
    watchlistStatus,
    retryWatchlistFetch,
    step: state.step,
    totalSteps: QUESTIONS.length,
    currentQuestion,
    filmCount: state.filmCount,
    fallbackNote: state.fallbackNote,
    loading: state.loading,
    showBackButton: state.step > 0,
    selectedIds,
    hasSelection: selectedIds.length > 0,
    customRegionOpen: state.customRegionOpen,
    customRegionValue: state.customRegionValue,
    onSelectSingle: (optionId) => dispatch({ type: "SELECT_SINGLE", optionId }),
    onToggleMulti: (optionId) => dispatch({ type: "TOGGLE_MULTI", optionId }),
    onConfirmMulti: () => dispatch({ type: "CONFIRM_MULTI" }),
    onOpenCustomRegion: () => dispatch({ type: "OPEN_CUSTOM_REGION" }),
    onCustomRegionValueChange: (value) =>
      dispatch({ type: "SET_CUSTOM_REGION_VALUE", value }),
    onCustomRegionSubmit: () => dispatch({ type: "SUBMIT_CUSTOM_REGION" }),
    onBack: () => dispatch({ type: "GO_BACK" }),
  };
}
