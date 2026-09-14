import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Landing } from "@/pages/Landing";
import { Home } from "@/pages/Home";
import { Profile } from "@/pages/Profile";
import { NotFound } from "@/pages/NotFound";
import { AppLayout, AppLoader, ThemeToggle } from "@/components/layout";

function App() {
  const { user, loading: authLoading } = useAuth();
  const [loaderMounted, setLoaderMounted] = useState(true);

  return (
    <>
      {loaderMounted && (
        <AppLoader
          visible={authLoading}
          onFadeComplete={() => setLoaderMounted(false)}
        />
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/home/*"
          element={
            authLoading ? null : user ? <Home /> : <Navigate to="/" replace />
          }
        />
        <Route
          path="/profile"
          element={
            authLoading ? null : user ? (
              <AppLayout>
                <Profile />
              </AppLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <ThemeToggle />
    </>
  );
}

export default App;
