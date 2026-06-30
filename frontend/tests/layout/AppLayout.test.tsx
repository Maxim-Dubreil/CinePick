import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const renderInRouter = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe("AppLayout", () => {
  it("renders children", () => {
    renderInRouter(
      <AppLayout>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders topbar by default", () => {
    renderInRouter(
      <AppLayout>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.getByText("CinePick")).toBeInTheDocument();
  });

  it("hides topbar when showTopbar=false", () => {
    renderInRouter(
      <AppLayout showTopbar={false}>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.queryByText("CinePick")).not.toBeInTheDocument();
  });

  it("renders footer by default", () => {
    renderInRouter(
      <AppLayout>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.getByText("LETTERBOXD")).toBeInTheDocument();
  });

  it("hides footer when showFooter=false", () => {
    renderInRouter(
      <AppLayout showFooter={false}>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.queryByText("LETTERBOXD")).not.toBeInTheDocument();
  });
});
