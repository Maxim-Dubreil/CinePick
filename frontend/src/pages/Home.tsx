import { Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout";
import { HomeHeader, HomeCTA } from "@/components/home";
import { Profile } from "./Profile";
import { Question } from "./Question";
import { Result } from "./Result";

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
