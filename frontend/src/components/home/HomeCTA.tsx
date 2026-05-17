import { useState, useEffect } from "react";
import { Clapperboard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { type TimeOfDay, getTimeOfDay } from "@/lib/timeOfDay";

const ctaLabel: Record<TimeOfDay, string> = {
  morning: "Lancer le pick de ce matin",
  afternoon: "Lancer le pick de cet après-midi",
  evening: "Lancer le pick de ce soir",
  night: "Lancer le pick de cette nuit",
};

export function HomeCTA() {
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const timeOfDay = getTimeOfDay(now.getHours());

  return (
    <section className="flex flex-col items-center pt-8 pb-6">
      <Button
        variant="glass-primary"
        size="lg"
        className="h-12 px-8 text-[15px] gap-3"
        style={{ borderRadius: "var(--radius-xl)" }}
        onClick={() => navigate("/home/question")}
      >
        <Clapperboard size={18} />
        {ctaLabel[timeOfDay]}
      </Button>
    </section>
  );
}
