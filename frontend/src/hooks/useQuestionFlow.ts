import { useEffect, useMemo, useReducer, useState } from "react";
import { getQuestions } from "@/lib/question/questionnaire";
import { generateMockFilms } from "@/lib/question/mockFilms";
import { buildFilterTest, countMatchingFilms } from "@/lib/question/filters";
import type {
  AnswerValue,
  AppliedFilter,
  MockFilm,
  Question,
  QuestionId,
  QuestionOption,
} from "@/lib/question/types";

const TOTAL_MOCK_FILMS = 150;
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
  | { type: "SUBMIT_CUSTOM_REGION" };

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
  films: MockFilm[],
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
      fallbackNote =
        "Aucun film ne correspond pile à ce critère — on l'ignore et on te montre les films les plus proches.";
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

function createFlowReducer(films: MockFilm[]) {
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
        return { ...state, step: state.step - 1, fallbackNote: null };

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
        };
      }

      default:
        return state;
    }
  };
}

export interface UseQuestionFlowOptions {
  onComplete: (filmCount: number) => void;
}

export interface UseQuestionFlowResult {
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
  onComplete,
}: UseQuestionFlowOptions): UseQuestionFlowResult {
  const [films] = useState(() => generateMockFilms(TOTAL_MOCK_FILMS));

  const reducer = useMemo(() => createFlowReducer(films), [films]);
  const [state, dispatch] = useReducer(reducer, films.length, createInitialState);

  useEffect(() => {
    if (!state.loading) return;
    const isLastQuestion = state.step === QUESTIONS.length - 1;
    const timeoutId = window.setTimeout(() => {
      if (isLastQuestion) {
        onComplete(state.filmCount);
      } else {
        dispatch({ type: "FINISH_LOADING" });
      }
    }, LOADING_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [state.loading, state.step, state.filmCount, onComplete]);

  const question = QUESTIONS[state.step];
  const currentQuestion: Question =
    question.id === "region"
      ? {
          ...question,
          options: mergeCustomRegionOptions(question.options, state.customRegions),
        }
      : question;

  const selectedIds = state.multiSelections[question.id] ?? [];

  return {
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
