import { Outlet } from "react-router-dom";
import { AppBackground } from "./AppBackground";
import { Topbar } from "./Topbar";
import { Footer } from "./Footer";

interface AppLayoutProps {
  children?: React.ReactNode;
  showTopbar?: boolean;
  showFooter?: boolean;
}

export function AppLayout({
  children,
  showTopbar = true,
  showFooter = true,
}: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <AppBackground />
      {showTopbar && <Topbar variant="app" />}
      <main className="flex-1 overflow-auto">{children ?? <Outlet />}</main>
      {showFooter && <Footer variant="app" />}
    </div>
  );
}
