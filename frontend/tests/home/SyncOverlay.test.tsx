import { render, screen } from "@testing-library/react";
import { SyncOverlay } from "@/components/home/SyncOverlay";

describe("SyncOverlay", () => {
  it("renders nothing when visible=false", () => {
    render(<SyncOverlay visible={false} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText(/Synchronisation en cours/i)).not.toBeInTheDocument();
  });

  it("renders spinner and text when visible=true", () => {
    render(<SyncOverlay visible={true} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Synchronisation en cours…")).toBeInTheDocument();
  });

  it("overlay is not aria-hidden when visible", () => {
    const { container } = render(<SyncOverlay visible={true} />);
    const overlay = container.firstChild as HTMLElement;
    expect(overlay).not.toHaveAttribute("aria-hidden");
  });
});
