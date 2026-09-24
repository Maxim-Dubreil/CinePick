import type { Question } from "@/lib/question/types";
import { OptionChip } from "./OptionChip";

interface OptionChipGroupProps {
  question: Question;
  selectedIds: string[];
  onSelectSingle: (optionId: string) => void;
  onToggleMulti: (optionId: string) => void;
  onOpenCustomRegion: () => void;
}

// Au-delà de ce nombre d'options, le wrap centré (lignes de longueur
// variable) devient dur à scanner — on passe en grille alignée.
const GRID_THRESHOLD = 8;

export function OptionChipGroup({
  question,
  selectedIds,
  onSelectSingle,
  onToggleMulti,
  onOpenCustomRegion,
}: OptionChipGroupProps) {
  const useGrid = question.options.length > GRID_THRESHOLD;
  const containerClass = useGrid
    ? "grid max-w-[600px] grid-cols-2 gap-3 sm:grid-cols-3"
    : "flex max-w-[600px] flex-wrap justify-center gap-3";

  return (
    <div className={containerClass}>
      {question.options.map((option) => {
        if (option.id === "other") {
          return (
            <OptionChip
              key={option.id}
              label={option.label}
              selected={false}
              exclusive={false}
              fullWidth={useGrid}
              onClick={onOpenCustomRegion}
            />
          );
        }
        const selected = question.multi && selectedIds.includes(option.id);
        const exclusive = option.id === question.exclusiveId && !selected;
        return (
          <OptionChip
            key={option.id}
            label={option.label}
            selected={selected}
            exclusive={exclusive}
            fullWidth={useGrid}
            onClick={() =>
              question.multi ? onToggleMulti(option.id) : onSelectSingle(option.id)
            }
          />
        );
      })}
    </div>
  );
}
