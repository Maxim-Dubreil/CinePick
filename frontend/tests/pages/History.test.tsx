import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { History } from "@/pages/History";
import type { HistoryEntry, UseHistoryResult } from "@/hooks/useHistory";

function renderHistory() {
  return render(
    <MemoryRouter>
      <History />
    </MemoryRouter>,
  );
}

const entry: HistoryEntry = {
  id: "entry-1",
  filmId: "film-1",
  title: "The Fall",
  year: 2006,
  posterUrl: null,
  genres: ["Aventure"],
  runtime: 117,
  decision: "accepted",
  decidedAt: "2026-09-18T12:00:00.000Z",
  aiSummary: null,
  overview: null,
};

const removeEntry = vi.fn().mockResolvedValue(undefined);

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useHistory", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useHistory")>();
  return {
    ...actual,
    useHistory: (): UseHistoryResult => ({
      entries: [entry],
      totalCount: 1,
      loading: false,
      removeEntry,
    }),
  };
});

describe("History delete flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not delete immediately when clicking the delete button", async () => {
    renderHistory();
    await userEvent.click(
      screen.getByRole("button", { name: /Supprimer de l'historique/i }),
    );
    expect(removeEntry).not.toHaveBeenCalled();
  });

  it("opens a confirmation dialog naming the film", async () => {
    renderHistory();
    await userEvent.click(
      screen.getByRole("button", { name: /Supprimer de l'historique/i }),
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/The Fall/)).toBeInTheDocument();
  });

  it("does not delete when cancelling", async () => {
    renderHistory();
    await userEvent.click(
      screen.getByRole("button", { name: /Supprimer de l'historique/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(removeEntry).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("deletes the entry when confirming", async () => {
    renderHistory();
    await userEvent.click(
      screen.getByRole("button", { name: /Supprimer de l'historique/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() => expect(removeEntry).toHaveBeenCalledWith("entry-1"));
  });

  it("closes the dialog after a successful deletion", async () => {
    renderHistory();
    await userEvent.click(
      screen.getByRole("button", { name: /Supprimer de l'historique/i }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Supprimer" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });
});
