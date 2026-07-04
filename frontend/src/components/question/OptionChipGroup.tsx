import type { Question } from "@/lib/question/types";
import { OptionChip } from "./OptionChip";

interface OptionChipGroupProps {
  question: Question;
  selectedIds: string[];
  onSelectSingle: (optionId: string) => void;
  onToggleMulti: (optionId: string) => void;
  onOpenCustomRegion: () => void;
}

export function OptionChipGroup({
  question,
  selectedIds,
  onSelectSingle,
  onToggleMulti,
  onOpenCustomRegion,
}: OptionChipGroupProps) {
  return (
    <div className="flex max-w-[600px] flex-wrap justify-center gap-3">
      {question.options.map((option) => {
        if (option.id === "other") {
          return (
            <OptionChip
              key={option.id}
              label={option.label}
              selected={false}
              exclusive={false}
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
            onClick={() =>
              question.multi ? onToggleMulti(option.id) : onSelectSingle(option.id)
            }
          />
        );
      })}
    </div>
  );
}
