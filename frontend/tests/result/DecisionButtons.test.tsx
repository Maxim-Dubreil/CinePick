import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DecisionButtons } from "@/components/result/DecisionButtons";

describe("DecisionButtons", () => {
  it("calls onAccept when Accepter is clicked", async () => {
    const onAccept = vi.fn();
    render(<DecisionButtons onAccept={onAccept} onSkip={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Accepter" }));
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it("calls onSkip when Passer is clicked", async () => {
    const onSkip = vi.fn();
    render(<DecisionButtons onAccept={vi.fn()} onSkip={onSkip} />);
    await userEvent.click(screen.getByRole("button", { name: "Passer" }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
