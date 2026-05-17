import { useState, useEffect, useMemo } from "react";
import { Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

const periodLabel: Record<TimeOfDay, string> = {
  morning: "CE MATIN",
  afternoon: "CET APRÈS-MIDI",
  evening: "CE SOIR",
  night: "CETTE NUIT",
};

const greetings: Record<TimeOfDay, string[]> = {
  morning: ["Bonjour", "Bonne matinée"],
  afternoon: ["Bon après-midi", "Bonjour"],
  evening: ["Bonsoir", "Bonne soirée"],
  night: ["Encore debout", "Bonne nuit"],
};

const subtitles: Record<TimeOfDay, string[]> = {
  morning: [
    "Prêt à trouver le bon film ?",
    "Qu'est-ce qu'on regarde ce matin ?",
  ],
  afternoon: [
    "Qu'est-ce qu'on regarde aujourd'hui ?",
    "On trouve quelque chose pour cet après-midi ?",
  ],
  evening: [
    "Prêt à trouver le bon film ?",
    "Qu'est-ce qu'on regarde ce soir ?",
    "On trouve quelque chose ce soir ?",
  ],
  night: ["Tant qu'à faire, un film...", "Un dernier film avant de dormir ?"],
};

function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 24) return "evening";
  return "night";
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function HomeHeader() {
  const { user } = useAuth();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] ?? "toi";
  const timeOfDay = getTimeOfDay(now.getHours());

  const { greeting, subtitle } = useMemo(
    () => ({
      greeting: pickRandom(greetings[timeOfDay]),
      subtitle: pickRandom(subtitles[timeOfDay]),
    }),
    [timeOfDay, firstName],
  );

  return (
    <section className="flex flex-col items-center text-center px-10 pt-16 pb-8">
      {/* Time label */}
      <div className="flex items-center gap-2 text-xs font-medium tracking-widest text-text-tertiary uppercase mb-6">
        <span>{periodLabel[timeOfDay]}</span>
        <span>•</span>
        <Clock size={12} className="text-text-tertiary" />
        <span className="text-cp-accent">{formatTime(now)}</span>
      </div>

      {/* Title */}
      <h1
        className="text-[52px] font-medium leading-[1.1] tracking-[-0.5px] max-w-155"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        <span className="text-text-primary block">
          {greeting}, {firstName}.
        </span>
        <em className="text-cp-accent/90 block">{subtitle}</em>
      </h1>
    </section>
  );
}
