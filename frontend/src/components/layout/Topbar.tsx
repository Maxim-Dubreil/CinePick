import { Button } from "@/components/ui";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

interface TopbarProps {
  variant?: "landing" | "app";
}

export function Topbar({ variant = "landing" }: TopbarProps) {
  const { user, loading } = useAuth();

  return (
    <header
      className="relative z-50 h-[60px] flex items-center justify-between px-10 flex-shrink-0"
      style={{
        background:
          "linear-gradient(180deg, rgba(4,4,10,0.3) 0%, transparent 100%)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderBottom: "0.5px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
      <span
        className="text-[22px] font-medium tracking-[0.04em] text-text-primary"
        style={{ fontFamily: "var(--font-heading)" }}
      >
        CinePick
      </span>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {variant === "app" && user && (
          <div className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-pill bg-bg-card border border-border-default">
            {user.user_metadata?.avatar_url && (
              <img
                src={user.user_metadata.avatar_url}
                alt="avatar"
                className="w-7 h-7 rounded-full"
              />
            )}
            <span className="text-sm text-text-secondary pr-2">
              {user.user_metadata?.full_name?.split(" ")[0]}
            </span>
          </div>
        )}

        {!loading &&
          (!user ? (
            <Button
              variant="glass"
              size="sm"
              onClick={signInWithGoogle}
            >
              Se connecter
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={signOut}>
              Se déconnecter
            </Button>
          ))}
      </div>
    </header>
  );
}
