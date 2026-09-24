import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRecommendationStats } from "@/hooks/useRecommendationStats";
import { useHistory } from "@/hooks/useHistory";
import { syncWatchlist, unlinkLetterboxdAccount } from "@/lib/backend/api";
import { signOut } from "@/lib/auth";
import { LetterboxdConfigModal } from "@/components/home";
import { Toast } from "@/components/ui";
import {
  ProfileHero,
  ProfileStats,
  ProfileSync,
  ProfileTaste,
  ProfileHistory,
  UnlinkLetterboxdModal,
} from "@/components/profile";
import { RECENT_COUNT } from "@/components/profile/ProfileHistory";

export function Profile() {
  const { user, session } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const { stats, loading: statsLoading } = useRecommendationStats(user?.id ?? null);
  const { entries: recentEntries, loading: historyLoading } = useHistory(
    user?.id ?? null,
    1,
    RECENT_COUNT,
  );
  // Single gate for the whole page's sections — everyone stays on their skeleton
  // until every hook is ready, then the page reveals in one paint. See
  // frontend/CLAUDE.md "Page-level reveal".
  const pageLoading = profileLoading || statsLoading || historyLoading;
  const [modalOpen, setModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unlinkModalOpen, setUnlinkModalOpen] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleResync = async () => {
    if (!profile?.letterboxd_username || !session?.access_token) return;
    setIsSyncing(true);
    setActionError(null);
    try {
      await syncWatchlist(profile.letterboxd_username, session.access_token);
      refetch();
    } catch (error) {
      console.error("Profile watchlist sync failed", error);
      setActionError("La synchronisation a échoué. Réessaie dans un instant.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUnlink = async () => {
    if (!session?.access_token) return;
    setIsUnlinking(true);
    setActionError(null);
    try {
      await unlinkLetterboxdAccount(session.access_token);
      refetch();
      setUnlinkModalOpen(false);
    } catch (error) {
      console.error("Profile Letterboxd unlink failed", error);
      setActionError("Impossible de délier ce compte pour le moment.");
    } finally {
      setIsUnlinking(false);
    }
  };

  if (!user) return null;

  return (
    <>
      <Toast
        message={actionError}
        variant="error"
        onDismiss={() => setActionError(null)}
      />
      <div className="max-w-5xl mx-auto px-10 py-11 pb-20 flex flex-col gap-5">
        <ProfileHero
          user={user}
          letterboxdUsername={profile?.letterboxd_username ?? null}
        />

        <ProfileStats
          filmCount={profile?.film_count ?? 0}
          stats={stats}
          loading={pageLoading}
        />

        <div className="grid grid-cols-[1.55fr_1fr] items-start gap-4">
          <div className="flex flex-col gap-4">
            <ProfileTaste stats={stats} loading={pageLoading} />
            <ProfileHistory entries={recentEntries} loading={pageLoading} />
          </div>

          <div className="flex flex-col gap-4">
            <ProfileSync
              profile={profile}
              loading={pageLoading}
              isSyncing={isSyncing}
              onResync={() => void handleResync()}
              onOpenModal={() => setModalOpen(true)}
            />
            <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] shadow-[var(--shadow-glass)] px-6 py-5 flex flex-col gap-1">
              {/* TODO: implémenter la page paramètres du compte */}
              <AccountButton label="Paramètres du compte" disabled />
              {profile?.letterboxd_username && (
                <AccountButton
                  label="Délier le compte Letterboxd"
                  destructive
                  onClick={() => setUnlinkModalOpen(true)}
                />
              )}
              <AccountButton
                label="Se déconnecter"
                onClick={() => void signOut()}
              />
            </div>
          </div>
        </div>

        <LetterboxdConfigModal
          open={modalOpen}
          mode={profile?.letterboxd_username ? "change" : "link"}
          onOpenChange={setModalOpen}
          onSuccess={() => void refetch()}
          onSyncingChange={setIsSyncing}
          token={session?.access_token ?? null}
        />

        <UnlinkLetterboxdModal
          open={unlinkModalOpen}
          onOpenChange={setUnlinkModalOpen}
          onConfirm={() => void handleUnlink()}
          isUnlinking={isUnlinking}
        />
      </div>
    </>
  );
}

interface AccountButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

function AccountButton({
  label,
  onClick,
  disabled,
  destructive,
}: AccountButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex items-center h-9 px-1 text-sm transition-colors disabled:opacity-40 disabled:pointer-events-none text-left ${
        destructive
          ? "text-destructive hover:text-destructive/80"
          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      }`}
    >
      {label}
    </button>
  );
}
