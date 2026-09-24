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
import { useSync } from "@/hooks/useSync";
import { cn } from "@/lib/utils";
import { getDisplayName, getAvatarUrl } from "@/lib/profile";

interface TopbarProps {
  variant?: "landing" | "app";
}

/** Classes appended to a nav `Link` to make it inert while a sync is in
 * flight — `pointer-events-none` blocks the click, `aria-disabled` (set by
 * the caller) tells assistive tech, the dimming makes it visible. */
const NAV_LINK_DISABLED_CLASSES = "pointer-events-none opacity-50";

export function Topbar({ variant = "landing" }: TopbarProps) {
  const { user, loading } = useAuth();
  const { profile } = useProfile();
  const { isSyncing } = useSync();
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
        borderBottom: "0.5px solid var(--topbar-border)",
      }}
    >
      {/* Left: logo + nav */}
      <div className="flex items-center gap-8">
        {variant === "app" ? (
          <Link
            to="/home"
            aria-disabled={isSyncing}
            className={cn(
              "font-heading text-[22px] font-medium tracking-[0.04em] text-text-primary hover:opacity-80 transition-opacity",
              isSyncing && NAV_LINK_DISABLED_CLASSES,
            )}
          >
            CinePick
          </Link>
        ) : (
          <span
            className="font-heading text-[22px] font-medium tracking-[0.04em] text-text-primary"
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
              <TabsTrigger value="Aujourd'hui" disabled={isSyncing}>
                Aujourd'hui
              </TabsTrigger>
              {/* <TabsTrigger value="watchlist">Watchlist</TabsTrigger> */}
              <TabsTrigger value="historique" disabled={isSyncing}>
                Historique
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {variant === "app" && user && profile?.letterboxd_username && (
        <Link
          to="/profile"
          aria-disabled={isSyncing}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 hover:opacity-70 transition-opacity",
            isSyncing && NAV_LINK_DISABLED_CLASSES,
          )}
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
            aria-disabled={isSyncing}
            className={cn(
              "flex items-center gap-2 hover:opacity-70 transition-opacity",
              isSyncing && NAV_LINK_DISABLED_CLASSES,
            )}
          >
            <span className="text-sm font-medium text-text-primary">
              {getDisplayName(user, profile).split(" ")[0]}
            </span>
            <Avatar size="default">
              <AvatarImage
                src={getAvatarUrl(user, profile)}
                alt={getDisplayName(user, profile)}
              />
              <AvatarFallback className="bg-accent-subtle text-cp-accent font-semibold">
                {getDisplayName(user, profile)
                  .split(" ")[0]?.[0]
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
