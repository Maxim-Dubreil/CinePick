import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { HomeHeader, HomeCTA } from "@/components/home";
import { Profile } from "./Profile";
import { Question } from "./Question";
import { Résultat } from "./Résultat";

export function Home() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          index
          element={
            <>
              <HomeHeader />
              <HomeCTA />
            </>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route path="résultat" element={<Résultat />} />
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
