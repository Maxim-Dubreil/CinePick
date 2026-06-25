import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WatchlistBanner } from "@/components/home/WatchlistBanner";

describe("WatchlistBanner", () => {
  it("renders the banner text and Configurer button", () => {
    render(<WatchlistBanner onOpenModal={() => {}} />);
    expect(
      screen.getByText(/Watchlist non configurée/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Configurer/i }),
    ).toBeInTheDocument();
  });

  it("calls onOpenModal when Configurer is clicked", async () => {
    const onOpenModal = vi.fn();
    render(<WatchlistBanner onOpenModal={onOpenModal} />);
    await userEvent.click(screen.getByRole("button", { name: /Configurer/i }));
    expect(onOpenModal).toHaveBeenCalledOnce();
  });
});
