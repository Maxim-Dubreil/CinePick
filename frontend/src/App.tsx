import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Landing } from "@/pages/Landing";
import { AppLoader } from "@/components/layout";
import { ThemeToggle } from "@/components/layout";

function App() {
  const { loading: authLoading } = useAuth();
  const [appLoaded, setAppLoaded] = useState(false);
  const [loaderMounted, setLoaderMounted] = useState(true);

  const showLoader = authLoading || !appLoaded;

  return (
    <>
      {loaderMounted && (
        <AppLoader
          visible={showLoader}
          onFadeComplete={() => setLoaderMounted(false)}
        />
      )}
      <Landing onLoaded={() => setAppLoaded(true)} />
      <ThemeToggle />
    </>
  );
}

export default App;
