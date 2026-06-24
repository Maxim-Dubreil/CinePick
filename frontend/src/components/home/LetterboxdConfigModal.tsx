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

  const isSubmitDisabled =
    !isValidUsername(username) ||
    status === "loading" ||
    status === "success";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configurer votre Letterboxd</DialogTitle>
          <DialogDescription>
            Connectez votre watchlist pour recevoir des recommandations
            personnalisées.
          </DialogDescription>
        </DialogHeader>

        {/* Tutorial */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--accent-subtle)] p-4 text-sm">
          <p className="mb-2 font-medium text-[var(--text-primary)]">
            Comment rendre votre watchlist publique
          </p>
          <ol className="list-inside list-decimal space-y-1 text-[var(--text-secondary)]">
            <li>Allez sur votre profil Letterboxd</li>
            <li>Cliquez sur votre Watchlist</li>
            <li>Cliquez sur l&apos;icône paramètres ⚙</li>
            <li>Passez la visibilité sur « Public »</li>
          </ol>
          <p className="mt-2 text-xs text-[var(--warning)]">
            ⚠ Une watchlist privée ne peut pas être importée.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="letterboxd-username"
              className="text-sm font-medium text-[var(--text-primary)]"
            >
              Pseudo Letterboxd
            </label>
            <Input
              id="letterboxd-username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (status === "error") {
                  setStatus("idle");
                  setErrorType(null);
                }
              }}
              placeholder="johndoe"
              disabled={status === "loading" || status === "success"}
              aria-invalid={status === "error"}
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
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[var(--success)]">
              <CheckCircle2 size={16} />
              <span className="text-sm font-medium">
                {filmCount} films trouvés
              </span>
            </div>
            <Button variant="glass-primary" className="w-full" disabled>
              Synchroniser
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
