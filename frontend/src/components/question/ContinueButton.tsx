import { Button } from "@/components/ui";

interface ContinueButtonProps {
  visible: boolean;
  enabled: boolean;
  onClick: () => void;
}

export function ContinueButton({ visible, enabled, onClick }: ContinueButtonProps) {
  if (!visible) return null;
  return (
    <Button
      variant={enabled ? "glass-accent" : "glass"}
      disabled={!enabled}
      onClick={onClick}
      className="mt-2 h-12 rounded-[var(--radius-xl)] px-8"
    >
      Continuer →
    </Button>
  );
}
