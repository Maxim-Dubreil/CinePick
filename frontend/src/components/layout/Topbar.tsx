import { Avatar, AvatarFallback, Button, Tabs, TabsList, TabsTrigger } from "@/components/ui";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";

interface TopbarProps {
  variant?: "landing" | "app";
}

export function Topbar({ variant = "landing" }: TopbarProps) {
  const { user, loading } = useAuth();

  return (
    <header
      className="z-50 h-15 flex items-center justify-between px-10 shrink-0"
      style={{
        background: "var(--topbar-gradient)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderBottom: "0.5px solid var(--topbar-border)",
      }}
    >
      {/* Left: logo + nav */}
      <div className="flex items-center gap-8">
        <span
          className="text-[22px] font-medium tracking-[0.04em] text-text-primary"
          style={{ fontFamily: "var(--font-heading)" }}
        >
          CinePick
        </span>

        {variant === "app" && (
          <Tabs defaultValue="Aujourd'hui">
            <TabsList variant="line">
              <TabsTrigger value="Aujourd'hui">Aujourd'hui</TabsTrigger>
              <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
              <TabsTrigger value="historique">Historique</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {variant === "app" && user && (
          <div className="flex items-center gap-2 pl-3 pr-1 py-1 rounded-pill bg-bg-card border border-border-default">
            <span className="text-sm font-medium text-text-primary">
              {user.user_metadata?.full_name?.split(" ")[0]}
            </span>
            <Avatar size="sm">
              <AvatarFallback className="bg-accent-subtle text-cp-accent font-semibold">
                {user.user_metadata?.full_name?.split(" ")[0]?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {!loading &&
          (!user ? (
            <Button variant="glass" size="sm" onClick={signInWithGoogle}>
              Se connecter
            </Button>
          ) : (
            <Button variant="glass" size="sm" onClick={signOut}>
              Se déconnecter
            </Button>
          ))}
      </div>
    </header>
  );
}
