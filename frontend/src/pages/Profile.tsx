import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { syncWatchlist } from "@/lib/backend/api";
import { signOut } from "@/lib/auth";
import { LetterboxdConfigModal } from "@/components/home";
import {
  ProfileHero,
  ProfileStats,
  ProfileSync,
  ProfileTaste,
  ProfileHistory,
  ProfilePreferences,
} from "@/components/profile";

export function Profile() {
  const { user, session } = useAuth();
  const { profile, refetch } = useProfile();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleResync = async () => {
    if (!profile?.letterboxd_username || !session?.access_token) return;
    setIsSyncing(true);
    try {
      await syncWatchlist(profile.letterboxd_username, session.access_token);
      refetch();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-10 py-11 pb-20 flex flex-col gap-5">
      <ProfileHero
        user={user}
        letterboxdUsername={profile?.letterboxd_username ?? null}
      />

      <ProfileStats filmCount={profile?.film_count ?? 0} />

      <div className="grid grid-cols-[1.55fr_1fr] items-start gap-4">
        <div className="flex flex-col gap-4">
          <ProfileTaste />
          <ProfileHistory />
        </div>

        <div className="flex flex-col gap-4">
          <ProfileSync
            profile={profile}
            isSyncing={isSyncing}
            onResync={() => void handleResync()}
            onOpenModal={() => setModalOpen(true)}
          />
          <ProfilePreferences />
          <div className="rounded-[var(--radius-xl)] bg-[var(--glass-bg)] border border-[var(--glass-border)] backdrop-blur-xl shadow-[var(--shadow-glass)] px-6 py-5 flex flex-col gap-1">
            {/* TODO: implémenter la page paramètres du compte */}
            <AccountButton label="Paramètres du compte" disabled />
            <AccountButton
              label="Se déconnecter"
              onClick={() => void signOut()}
            />
          </div>
        </div>
      </div>

      <LetterboxdConfigModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => void refetch()}
        onSyncingChange={setIsSyncing}
        token={session?.access_token ?? null}
      />
    </div>
  );
}

interface AccountButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

function AccountButton({ label, onClick, disabled }: AccountButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex items-center h-9 px-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:pointer-events-none text-left"
    >
      {label}
    </button>
  );
}
