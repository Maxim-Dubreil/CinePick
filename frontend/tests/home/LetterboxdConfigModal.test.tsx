import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { LetterboxdConfigModal } from "@/components/home/LetterboxdConfigModal";
import { ApiError } from "@/lib/backend/api";

// Garde ApiError réel pour instanceof, mock uniquement getWatchlistCount
vi.mock("@/lib/backend/api", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/backend/api")>();
  return { ...actual, getWatchlistCount: vi.fn() };
});

import { getWatchlistCount } from "@/lib/backend/api";

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
};

describe("LetterboxdConfigModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when open=false", () => {
    render(<LetterboxdConfigModal {...defaultProps} open={false} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders tutorial and input when open=true", () => {
    render(<LetterboxdConfigModal {...defaultProps} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText(/Comment rendre votre watchlist publique/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Pseudo Letterboxd/i)).toBeInTheDocument();
  });

  it("disables Vérifier when input is empty", () => {
    render(<LetterboxdConfigModal {...defaultProps} />);
    expect(
      screen.getByRole("button", { name: /Vérifier/i }),
    ).toBeDisabled();
  });

  it("disables Vérifier when input contains spaces", async () => {
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "john doe",
    );
    expect(
      screen.getByRole("button", { name: /Vérifier/i }),
    ).toBeDisabled();
  });

  it("enables Vérifier with a valid username", async () => {
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    expect(
      screen.getByRole("button", { name: /Vérifier/i }),
    ).toBeEnabled();
  });

  it("shows loading state during API call", async () => {
    vi.mocked(getWatchlistCount).mockImplementation(
      () => new Promise(() => {}), // ne se résout jamais
    );
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Vérifier/i }));
    expect(screen.getByText(/Vérification/i)).toBeInTheDocument();
  });

  it("shows 404 error inline", async () => {
    vi.mocked(getWatchlistCount).mockRejectedValue(
      new ApiError(404, "Not found"),
    );
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Vérifier/i }));
    await waitFor(() =>
      expect(screen.getByText(/Pseudo introuvable/i)).toBeInTheDocument(),
    );
  });

  it("shows 403 error inline", async () => {
    vi.mocked(getWatchlistCount).mockRejectedValue(
      new ApiError(403, "Forbidden"),
    );
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Vérifier/i }));
    await waitFor(() =>
      expect(screen.getByText(/watchlist est privée/i)).toBeInTheDocument(),
    );
  });

  it("shows network error inline", async () => {
    vi.mocked(getWatchlistCount).mockRejectedValue(new Error("Network"));
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Vérifier/i }));
    await waitFor(() =>
      expect(
        screen.getByText(/momentanément inaccessible/i),
      ).toBeInTheDocument(),
    );
  });

  it("shows success state with film count", async () => {
    vi.mocked(getWatchlistCount).mockResolvedValue({
      username: "johndoe",
      count: 760,
    });
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Vérifier/i }));
    await waitFor(() =>
      expect(screen.getByText(/760 films trouvés/i)).toBeInTheDocument(),
    );
  });

  it("Synchroniser button is disabled in success state", async () => {
    vi.mocked(getWatchlistCount).mockResolvedValue({
      username: "johndoe",
      count: 760,
    });
    render(<LetterboxdConfigModal {...defaultProps} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Vérifier/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /Synchroniser/i }),
      ).toBeDisabled(),
    );
  });

  it("calls onSuccess with trimmed username on success", async () => {
    const onSuccess = vi.fn();
    vi.mocked(getWatchlistCount).mockResolvedValue({
      username: "johndoe",
      count: 760,
    });
    render(<LetterboxdConfigModal {...defaultProps} onSuccess={onSuccess} />);
    await userEvent.type(
      screen.getByLabelText(/Pseudo Letterboxd/i),
      "johndoe",
    );
    await userEvent.click(screen.getByRole("button", { name: /Vérifier/i }));
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith("johndoe"),
    );
  });
});
