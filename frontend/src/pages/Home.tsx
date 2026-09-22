import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import {
  HomeHeader,
  HomeCTA,
  WatchlistBanner,
  WatchlistPanel,
  LastFilmPanel,
  LetterboxdConfigModal,
  SyncOverlay,
} from "@/components/home";
import { Question } from "./Question";
import { Result } from "./Result";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useLastAcceptedFilm } from "@/hooks/useLastAcceptedFilm";
import { syncWatchlist } from "@/lib/backend/api";
import { Toast } from "@/components/ui";

export function Home() {
  const { session, user } = useAuth();
  const { profile, loading: profileLoading, refetch } = useProfile();
  const {
    film: lastAcceptedFilm,
    loading: lastAcceptedFilmLoading,
    refetch: refetchLastAcceptedFilm,
  } = useLastAcceptedFilm(user?.id ?? null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // letterboxdUsername: prioritise profile from API, fallback to null
  const letterboxdUsername = profile?.letterboxd_username ?? null;

  const handleResync = async () => {
    if (!letterboxdUsername || !session?.access_token) return;
    setIsSyncing(true);
    setSyncError(null);
    try {
      await syncWatchlist(letterboxdUsername, session.access_token);
      refetch();
    } catch (error) {
      console.error("Home watchlist sync failed", error);
      setSyncError("La synchronisation a échoué. Réessaie dans un instant.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <>
      <Toast
        message={syncError}
        variant="error"
        onDismiss={() => setSyncError(null)}
      />
      <Routes>
        <Route element={<AppLayout />}>
          <Route
            index
            element={
              <>
                <SyncOverlay visible={isSyncing} />
                {!profileLoading && !letterboxdUsername && (
                  <div className="flex justify-end px-4 pt-3">
                    <WatchlistBanner onOpenModal={() => setModalOpen(true)} />
                  </div>
                )}
                <HomeHeader />
                <HomeCTA letterboxdUsername={letterboxdUsername} />

                {profile?.letterboxd_username && (
                  <div className="flex justify-center px-6 pb-10 pt-[100px]">
                    <div className="flex gap-4 w-full max-w-3xl">
                      <div className="flex-1">
                        <LastFilmPanel
                          film={lastAcceptedFilm}
                          loading={lastAcceptedFilmLoading}
                        />
                      </div>
                      <div className="w-72 shrink-0">
                        <WatchlistPanel
                          profile={profile}
                          isSyncing={isSyncing}
                          onResync={() => void handleResync()}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <LetterboxdConfigModal
                  open={modalOpen}
                  onOpenChange={setModalOpen}
                  onSuccess={() => void refetch()}
                  onSyncingChange={setIsSyncing}
                  token={session?.access_token ?? null}
                />
              </>
            }
          />
          <Route
            path="result"
            element={<Result onAccepted={refetchLastAcceptedFilm} />}
          />
        </Route>
        <Route
          path="question"
          element={
            <AppLayout showTopbar={false} showFooter={false}>
              <Question />
            </AppLayout>
          }
        />
      </Routes>
    </>
  );
}
