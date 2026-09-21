import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { signInWithGoogle, signOut } from "@/lib/auth";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface TopbarProps {
  variant?: "landing" | "app";
}

export function Topbar({ variant = "landing" }: TopbarProps) {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab =
    location.pathname === "/home"
      ? "Aujourd'hui"
      : location.pathname === "/history"
        ? "historique"
        : "";

  return (
    <header
      className="relative z-50 h-15 flex items-center justify-between px-10 shrink-0"
      style={{
        background: "var(--topbar-gradient)",
        backdropFilter: "blur(40px)",
        WebkitBackdropFilter: "blur(40px)",
        borderBottom: "0.5px solid var(--topbar-border)",
      }}
    >
      {/* Left: logo + nav */}
      <div className="flex items-center gap-8">
        {variant === "app" ? (
          <Link
            to="/home"
            className="text-[22px] font-medium tracking-[0.04em] text-text-primary hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            CinePick
          </Link>
        ) : (
          <span
            className="text-[22px] font-medium tracking-[0.04em] text-text-primary"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            CinePick
          </span>
        )}

        {variant === "app" && (
          <Tabs
            value={activeTab}
            onValueChange={(val) => {
              if (val === "Aujourd'hui") navigate("/home");
              if (val === "historique") navigate("/history");
            }}
          >
            <TabsList variant="line">
              <TabsTrigger value="Aujourd'hui">Aujourd'hui</TabsTrigger>
              {/* <TabsTrigger value="watchlist">Watchlist</TabsTrigger> */}
              <TabsTrigger value="historique">Historique</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {variant === "app" && user && profile?.letterboxd_username && (
        <Link
          to="/profile"
          className="absolute left-1/2 -translate-x-1/2 hover:opacity-70 transition-opacity"
        >
          <Badge variant="letterboxd">
            <LetterboxdDots />@{profile.letterboxd_username}
          </Badge>
        </Link>
      )}

      {/* Right side */}
      <div className="flex items-center gap-6">
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

        {variant === "app" && user && (
          <Link
            to="/profile"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <span className="text-sm font-medium text-text-primary">
              {user.user_metadata?.full_name?.split(" ")[0]}
            </span>
            <Avatar size="default">
              <AvatarImage
                src={user.user_metadata?.picture}
                alt={user.user_metadata?.full_name ?? "Avatar"}
              />
              <AvatarFallback className="bg-accent-subtle text-cp-accent font-semibold">
                {user.user_metadata?.full_name
                  ?.split(" ")[0]?.[0]
                  ?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
    </header>
  );
}

function LetterboxdDots() {
  return (
    <svg width="13" height="13" viewBox="0 0 60 60" aria-hidden="true">
      <circle cx="14" cy="30" r="9" fill="#00E054" />
      <circle cx="30" cy="30" r="9" fill="#40BCF4" />
      <circle cx="46" cy="30" r="9" fill="#FF8000" />
    </svg>
  );
}
