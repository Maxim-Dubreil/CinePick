import { Topbar } from "@/components/layout/Topbar";
import { LandingBackground } from "@/components/layout/LandingBackground";
import {
  GoogleAuthButton,
  StepsSection,
  LandingFooter,
} from "@/components/landing";

interface LandingProps {
  onLoaded?: () => void;
}

export function Landing({ onLoaded }: LandingProps) {
  return (
    <div className="relative h-screen w-full overflow-hidden flex flex-col">
      <LandingBackground onLoaded={onLoaded} />
      <Topbar variant="landing" />

      {/* Hero section - vertically centered */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center flex-1 px-10 pb-20">
        {/* Main title */}
        <h1
          className="text-[58px] font-medium leading-[1.05] tracking-[-0.5px] text-(--text-primary) mb-4"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          Ce soir, tu trouves
          <br />
          <em className="text-(--cp-accent)">le bon film.</em>
        </h1>

        {/* Subtitle description */}
        <p className="text-[15px] leading-[1.7] text-(--text-secondary) max-w-95 mb-8">
          CinePick analyse ta watchlist Letterboxd et te recommande un seul film
          en 2 minutes — adapté à ton humeur.
        </p>

        {/* Google authentication button */}
        <GoogleAuthButton />

        {/* Feature steps section */}
        <StepsSection />
      </main>

      {/* Footer - fixed at bottom */}
      <LandingFooter />
    </div>
  );
}
