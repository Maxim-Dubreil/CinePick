import { Button } from "@/components/ui";

interface OptionChipProps {
  label: string;
  selected: boolean;
  exclusive: boolean;
  onClick: () => void;
}

export function OptionChip({ label, selected, exclusive, onClick }: OptionChipProps) {
  if (selected) {
    return (
      <Button
        variant="glass-accent"
        className="h-10 rounded-full px-[18px]"
        onClick={onClick}
      >
        {label}
      </Button>
    );
  }
  if (exclusive) {
    return (
      <Button
        variant="ghost"
        className="h-10 rounded-full border border-[rgba(255,255,255,0.15)] px-[18px] text-text-secondary"
        onClick={onClick}
      >
        {label}
      </Button>
    );
  }
  return (
    <Button variant="glass" className="h-10 rounded-full px-[18px]" onClick={onClick}>
      {label}
    </Button>
  );
}
