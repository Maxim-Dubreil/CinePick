import { render, screen } from "@testing-library/react";
import { AppLayout } from "@/components/layout/AppLayout";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

describe("AppLayout", () => {
  it("renders children", () => {
    render(
      <AppLayout>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders topbar by default", () => {
    render(
      <AppLayout>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.getByText("CinePick")).toBeInTheDocument();
  });

  it("hides topbar when showTopbar=false", () => {
    render(
      <AppLayout showTopbar={false}>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.queryByText("CinePick")).not.toBeInTheDocument();
  });

  it("renders footer by default", () => {
    render(
      <AppLayout>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.getByText("LETTERBOXD")).toBeInTheDocument();
  });

  it("hides footer when showFooter=false", () => {
    render(
      <AppLayout showFooter={false}>
        <p>content</p>
      </AppLayout>,
    );
    expect(screen.queryByText("LETTERBOXD")).not.toBeInTheDocument();
  });
});
