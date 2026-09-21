import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toast, TOAST_DURATION_MS } from "@/components/ui/toast";

describe("Toast", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when message is null", () => {
    render(<Toast message={null} onDismiss={vi.fn()} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the message when set", () => {
    render(<Toast message="Petit souci réseau" onDismiss={vi.fn()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Petit souci réseau");
  });

  it("calls onDismiss automatically after the fixed duration", () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Petit souci réseau" onDismiss={onDismiss} />);
    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(TOAST_DURATION_MS);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
