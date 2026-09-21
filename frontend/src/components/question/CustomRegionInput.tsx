import { Button, Input } from "@/components/ui";

interface CustomRegionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function CustomRegionInput({
  value,
  onChange,
  onSubmit,
}: CustomRegionInputProps) {
  return (
    <form
      className="flex items-center gap-2.5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="custom-region" className="sr-only">
        Nom du pays
      </label>
      <Input
        id="custom-region"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nom du pays…"
        className="h-10 w-[200px] rounded-[var(--radius-md)] border-[var(--border-strong)] bg-[var(--bg-input)]"
      />
      <Button
        variant="glass"
        className="h-10 rounded-[var(--radius-md)] px-[18px]"
        type="submit"
      >
        Ajouter
      </Button>
    </form>
  );
}
