import { Check } from "lucide-react";
import { Button } from "@/components/ui";

interface OptionChipProps {
  label: string;
  selected: boolean;
  exclusive: boolean;
  fullWidth?: boolean;
  onClick: () => void;
}

export function OptionChip({
  label,
  selected,
  exclusive,
  fullWidth = false,
  onClick,
}: OptionChipProps) {
  const widthClass = fullWidth ? "w-full" : "";
  if (selected) {
    return (
      <Button
        variant="glass-accent"
        className={`h-10 rounded-full px-[18px] ${widthClass}`}
        onClick={onClick}
        aria-pressed={selected}
      >
        <Check size={14} />
        {label}
      </Button>
    );
  }
  if (exclusive) {
    // Le chemin rapide pour qui ne veut pas se prononcer sur ce critère :
    // doit se remarquer, pas se fondre dans le reste des options.
    return (
      <Button
        variant="ghost"
        className={`h-10 rounded-full border-2 border-[var(--cp-accent)] px-[18px] font-semibold text-[var(--cp-accent)] ${widthClass}`}
        onClick={onClick}
        aria-pressed={selected}
      >
        {label}
      </Button>
    );
  }
  return (
    <Button
      variant="glass"
      className={`h-10 rounded-full px-[18px] ${widthClass}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {label}
    </Button>
  );
}
