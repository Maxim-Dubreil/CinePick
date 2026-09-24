import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppBackground, Footer } from "@/components/layout";

const REPO_URL = "https://github.com/Maxim-Dubreil/CinePick";
const CONTACT_EMAIL = "maxim.dubreil@epitech.eu";

/** Public page (no auth guard): repo link, third-party credits and contact. */
export function About() {
  return (
    <div className="relative h-screen flex flex-col overflow-hidden">
      <AppBackground />

      <main className="relative z-10 flex-1 overflow-auto flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--shadow-glass)] p-7 flex flex-col gap-6">
          <Link
            to="/"
            className="flex items-center gap-2 text-sm text-(--text-secondary) hover:opacity-70 transition-opacity w-fit"
          >
            <ArrowLeft size={16} />
            Retour
          </Link>

          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium text-(--text-primary) font-(family-name:--font-heading)">
              CinePick
            </h1>
            <p className="text-[15px] leading-[1.7] text-(--text-secondary)">
              CinePick analyse ta watchlist Letterboxd et te recommande un seul film en 2
              minutes — adapté à ton humeur.
            </p>
          </div>

          <Button variant="glass" asChild className="w-fit">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              Voir le code sur GitHub
              <ExternalLink />
            </a>
          </Button>

          <section className="flex flex-col gap-3 border-t border-[var(--glass-border)] pt-5">
            <h2 className="text-[11px] tracking-[0.08em] text-(--text-secondary)">CRÉDITS</h2>
            <div className="flex flex-col gap-2">
              <img src="/logos/tmdb.svg" alt="TMDB" className="h-3 w-fit" />
              <p className="text-xs text-(--text-secondary)">
                This product uses the TMDB API but is not endorsed or certified by TMDB.
              </p>
            </div>
            <p className="text-sm text-(--text-secondary)">
              Watchlist : Letterboxd (non affilié)
            </p>
            <p className="text-sm text-(--text-secondary)">
              Recommandations : Gemini (Google)
            </p>
          </section>

          <p className="border-t border-[var(--glass-border)] pt-5 text-sm text-(--text-secondary)">
            Fait par Maxim Dubreil ·{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-(--text-primary) hover:opacity-70 transition-opacity"
            >
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>
      </main>

      <Footer variant="app" />
    </div>
  );
}
