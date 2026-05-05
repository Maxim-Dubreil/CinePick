import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Step {
  number: string;
  title: string;
  description: string;
  variant: "default" | "accent";
}

const STEPS: Step[] = [
  {
    number: "01",
    title: "Ta watchlist",
    description:
      "On scrape ta watchlist Letterboxd et enrichit chaque film via TMDB.",
    variant: "default",
  },
  {
    number: "02",
    title: "8 questions",
    description: "Mood, durée, ambiance — on cerne ce que tu veux ce soir.",
    variant: "accent",
  },
  {
    number: "03",
    title: "Un film",
    description: "L'IA recommande un seul film — forcément dans ta watchlist.",
    variant: "default",
  },
];

export function StepsSection() {
  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-155">
      {STEPS.map((step) => (
        <Card key={step.number} variant={step.variant}>
          <CardHeader>
            <p className="text-[11px] font-medium uppercase tracking-widest mb-2 text-text-disabled">
              {step.number}
            </p>
            <CardTitle>{step.title}</CardTitle>
            <CardDescription>{step.description}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
