import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Background } from "@/components/layout/Background";

const MIN_DISPLAY_MS = 800;

interface AppLoaderProps {
  visible: boolean;
  onFadeComplete?: () => void;
}

export function AppLoader({ visible, onFadeComplete }: AppLoaderProps) {
  const [opacity, setOpacity] = useState(1);
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
      setOpacity(0);
      const timer = setTimeout(() => {
        setMounted(false);
        onFadeComplete?.();
      }, 400); // fade duration
      return () => clearTimeout(timer);
    }
  }, [visible, minTimePassed]);

  if (!mounted) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center transition-opacity duration-400"
      style={{ opacity }}
    >
      <Background variant="app" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Shimmer effect logo */}
        <span
          className="text-[48px] font-bold tracking-[0.04em]"
          style={{
            fontFamily: "var(--font-heading)",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.5) 0%, #fff 40%, rgba(255,255,255,0.5) 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            animation: "shimmer 2.5s linear infinite",
          }}
        >
          CinePick
        </span>

        {/* Custom styled Spinner component */}
        <Spinner className="size-8" style={{ color: "var(--cp-accent)" }} />
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </div>
  );
}
