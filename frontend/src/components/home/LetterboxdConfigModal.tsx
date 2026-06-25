import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui";
import { ApiError, getWatchlistCount } from "@/lib/backend/api";

interface LetterboxdConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (username: string) => void;
}

type Status = "idle" | "loading" | "success" | "error";
type ErrorType = "404" | "403" | "network";

const ERROR_MESSAGES: Record<ErrorType, string> = {
  "404": "Pseudo introuvable, vérifie l'orthographe",
  "403": "Ta watchlist est privée — voir le tuto ci-dessus",
  network: "Letterboxd est momentanément inaccessible",
};

function isValidUsername(value: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(value.trim());
}

export function LetterboxdConfigModal({
  open,
  onOpenChange,
  onSuccess,
}: LetterboxdConfigModalProps) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorType, setErrorType] = useState<ErrorType | null>(null);
  const [filmCount, setFilmCount] = useState<number | null>(null);

  function handleOpenChange(value: boolean) {
    if (!value) {
      setUsername("");
      setStatus("idle");
      setErrorType(null);
      setFilmCount(null);
    }
    onOpenChange(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidUsername(username)) return;
    setStatus("loading");
    setErrorType(null);
    try {
      const { count } = await getWatchlistCount(username.trim());
      setFilmCount(count);
      setStatus("success");
      onSuccess(username.trim());
    } catch (err) {
      setStatus("error");
      if (err instanceof ApiError) {
        if (err.status === 404) setErrorType("404");
        else if (err.status === 403) setErrorType("403");
        else setErrorType("network");
      } else {
        setErrorType("network");
      }
    }
  }

  const isSubmitDisabled = !isValidUsername(username) || status === "loading";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg gap-5 p-6 rounded-[var(--radius-xl)] ring-1 ring-[var(--glass-border)] shadow-[var(--shadow-glass-primary)]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Configurer votre Letterboxd
          </DialogTitle>
          <DialogDescription>
            Connectez votre watchlist pour recevoir des recommandations
            personnalisées.
          </DialogDescription>
        </DialogHeader>

        {/* Tutorial */}
        <div className="rounded-[var(--radius-md)] border-l-2 border-[var(--cp-accent)] bg-[var(--accent-subtle)] py-3 px-4">
          <p className="mb-2.5 text-sm font-semibold text-[var(--text-primary)]">
            Comment rendre votre watchlist publique
          </p>
          <ol className="list-inside list-decimal space-y-1.5 text-sm text-[var(--text-secondary)]">
            <li>Allez sur votre profil Letterboxd</li>
            <li>Cliquez sur « Watchlist » dans le sous-menu</li>
            <li>Cliquez sur « Make this list public » à droite de la page</li>
          </ol>
          <p className="mt-2.5 text-xs text-[var(--warning)]">
            ⚠ Une watchlist privée ne peut pas être importée.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            <label
              htmlFor="letterboxd-username"
              className="font-heading text-base font-medium text-[var(--text-primary)]"
            >
              Entrez votre pseudo Letterboxd
            </label>
            <Input
              id="letterboxd-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (status === "error" || status === "success") {
                  setStatus("idle");
                  setErrorType(null);
                  setFilmCount(null);
                }
              }}
              placeholder="cinephile"
              disabled={status === "loading"}
              aria-invalid={status === "error"}
              className="h-10 rounded-[var(--radius-md)] border-[var(--border-strong)] bg-[var(--bg-input)]"
            />
            {status === "error" && errorType !== null && (
              <p className="text-sm text-[var(--danger)]">
                {ERROR_MESSAGES[errorType]}
              </p>
            )}
          </div>

          <Button type="submit" disabled={isSubmitDisabled} className="w-full">
            {status === "loading" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Vérification…
              </>
            ) : (
              "Vérifier"
            )}
          </Button>
        </form>

        {/* Success */}
        {status === "success" && filmCount !== null && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">
                {filmCount} films trouvés
              </span>
            </div>
            <div className="flex gap-3">
              <Button variant="glass-primary" className="flex-1" disabled>
                Synchroniser
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Plus tard
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
