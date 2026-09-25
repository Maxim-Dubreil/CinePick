import { Routes, Route, Navigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { SyncProvider } from "@/contexts/SyncContext";
import { Landing } from "@/pages/Landing";
import { Home } from "@/pages/Home";
import { Profile } from "@/pages/Profile";
import { History } from "@/pages/History";
import { NotFound } from "@/pages/NotFound";
import { About } from "@/pages/About";
import { Legal } from "@/pages/Legal";
import { AppLayout, AppLoader, ThemeToggle } from "@/components/layout";

function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const [loaderMounted, setLoaderMounted] = useState(true);

  return (
    <SyncProvider>
      <ProfileProvider>
        {loaderMounted && (
          <AppLoader
            visible={authLoading}
            onFadeComplete={() => setLoaderMounted(false)}
          />
        )}
        <Routes>
          <Route
            path="/"
            element={
              authLoading ? null : user ? <Navigate to="/home" replace /> : <Landing />
            }
          />
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
          <Route
            path="/history"
            element={
              authLoading ? null : user ? (
                <AppLayout>
                  <History />
                </AppLayout>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/about" element={<About />} />
          <Route path="/mentions-legales" element={<Legal />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <ThemeToggle />
      </ProfileProvider>
    </SyncProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
