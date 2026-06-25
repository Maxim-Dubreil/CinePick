import { useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import {
  HomeHeader,
  HomeCTA,
  WatchlistBanner,
  LetterboxdConfigModal,
} from "@/components/home";
import { Profile } from "./Profile";
import { Question } from "./Question";
import { Result } from "./Result";
import { useAuth } from "@/hooks/useAuth";

export function Home() {
  const { session } = useAuth();
  const [letterboxdUsername, setLetterboxdUsername] = useState<string | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <>
              {!letterboxdUsername && (
                <div className="flex justify-end px-4 pt-3">
                  <WatchlistBanner onOpenModal={() => setModalOpen(true)} />
                </div>
              )}
              <HomeHeader />
              <HomeCTA letterboxdUsername={letterboxdUsername} />
              <LetterboxdConfigModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                onSuccess={setLetterboxdUsername}
                onSyncingChange={() => {}}
                token={session?.access_token ?? null}
              />
            </>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route path="result" element={<Result />} />
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
  );
}
