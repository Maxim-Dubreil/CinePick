import { Button, Input } from "@/components/ui";

interface CustomRegionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function CustomRegionInput({ value, onChange, onSubmit }: CustomRegionInputProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nom du pays…"
        className="h-10 w-[200px] rounded-[var(--radius-md)] border-[var(--border-strong)] bg-[var(--bg-input)]"
      />
      <Button
        variant="glass"
        className="h-10 rounded-[var(--radius-md)] px-[18px]"
        onClick={onSubmit}
      >
        Ajouter
      </Button>
    </div>
  );
}
