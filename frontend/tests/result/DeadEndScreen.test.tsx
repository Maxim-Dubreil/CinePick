import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeadEndScreen } from "@/components/result/DeadEndScreen";

describe("DeadEndScreen", () => {
  it("shows the technical failure message", () => {
    render(<DeadEndScreen reason="technical" onReset={vi.fn()} />);
    expect(
      screen.getByText("On n'arrive pas à te proposer un film pour l'instant."),
    ).toBeInTheDocument();
  });

  it("shows the no-match message", () => {
    render(<DeadEndScreen reason="no_match" onReset={vi.fn()} />);
    expect(
      screen.getByText("Aucun film ne correspond à tes critères."),
    ).toBeInTheDocument();
  });

  it("shows the rate-limited message", () => {
    render(<DeadEndScreen reason="rate_limited" onReset={vi.fn()} />);
    expect(
      screen.getByText(
        "Tu as demandé beaucoup de films d'un coup. Fais une pause et réessaie dans un moment.",
      ),
    ).toBeInTheDocument();
  });

  it("calls onReset when the button is clicked", async () => {
    const onReset = vi.fn();
    render(<DeadEndScreen reason="no_match" onReset={onReset} />);
    await userEvent.click(
      screen.getByRole("button", { name: "Retour aux Questions" }),
    );
    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
