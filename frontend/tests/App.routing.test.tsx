import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "@/App";

interface AppLoaderProps {
  visible: boolean;
  onFadeComplete: () => void;
}

// Mock the ThemeToggle to avoid complications
vi.mock("@/components/layout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/components/layout")>();
  return {
    ...actual,
    ThemeToggle: () => <div>Theme Toggle</div>,
    AppLoader: ({ visible, onFadeComplete }: AppLoaderProps) => {
      if (!visible) onFadeComplete();
      return null;
    },
  };
});

// Mock useAuth hook (configurable per test via authMock)
const { authMock } = vi.hoisted(() => ({
  authMock: {
    user: { id: "test-user", created_at: "2024-01-01T00:00:00Z" } as {
      id: string;
      created_at: string;
    } | null,
    loading: false,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authMock,
}));

vi.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({ profile: null, refetch: () => {} }),
}));

describe("App Routing", () => {
  beforeEach(() => {
    // Default: authenticated user
    authMock.user = { id: "test-user", created_at: "2024-01-01T00:00:00Z" };
    authMock.loading = false;
  });

  const renderWithRouter = (initialRoute: string) => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>,
    );
  };

  it("should display Landing page at /", () => {
    renderWithRouter("/");
    // Check for Landing page specific content - the main heading
    const heading = screen.getByRole("heading", {
      name: /Ce soir, tu trouves/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it("should display NotFound page at /invalid", () => {
    const { container } = renderWithRouter("/invalid");
    expect(screen.getByText("Not Found")).toBeInTheDocument();
    expect(
      container.querySelector("svg.lucide-clapperboard"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Désolé, cette page n'existe pas"),
    ).toBeInTheDocument();
  });

  it("should display NotFound page for any undefined route", () => {
    renderWithRouter("/some-random-path");
    expect(screen.getByText("Not Found")).toBeInTheDocument();
  });

  it("should have Retourner à l'accueil button on NotFound page", () => {
    renderWithRouter("/invalid");
    const button = screen.getByRole("button", {
      name: /Retourner à l'accueil/i,
    });
    expect(button).toBeInTheDocument();
  });

  it("should display Profile page at /profile", () => {
    renderWithRouter("/profile");
    expect(screen.getByText("Paramètres du compte")).toBeInTheDocument();
  });

  it("should redirect /profile to Landing when not authenticated", () => {
    authMock.user = null;
    renderWithRouter("/profile");
    expect(
      screen.getByRole("heading", { name: /Ce soir, tu trouves/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Paramètres du compte")).not.toBeInTheDocument();
  });
});
