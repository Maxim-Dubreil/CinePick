import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { AppBackground } from "@/components/layout/AppBackground";

const MIN_DISPLAY_MS = 800;

interface AppLoaderProps {
  visible: boolean;
  onFadeComplete?: () => void;
}

export function AppLoader({ visible, onFadeComplete }: AppLoaderProps) {
  const [mounted, setMounted] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);

  // Minimum display duration
  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Fade out when visible=false AND minimum duration has passed
  useEffect(() => {
    if (!visible && minTimePassed) {
      const timer = setTimeout(() => {
        setMounted(false);
        onFadeComplete?.();
      }, 400); // fade duration
      return () => clearTimeout(timer);
    }
  }, [visible, minTimePassed, onFadeComplete]);

  const opacity = !visible && minTimePassed ? 0 : 1;

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center transition-opacity duration-400"
      style={{ opacity }}
    >
      <AppBackground />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Shimmer effect logo */}
        <span
          className="text-[48px] font-bold tracking-[0.04em] animate-shimmer"
          style={{
            fontFamily: "var(--font-heading)",
            background: "var(--logo-shimmer)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          CinePick
        </span>

        {/* Custom styled Spinner component */}
        <Spinner className="size-8 text-cp-accent" />
      </div>
    </div>
  );
}
