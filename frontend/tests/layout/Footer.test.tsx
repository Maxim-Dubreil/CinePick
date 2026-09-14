import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/layout/Footer";

describe("Footer", () => {
  it("renders all partner names", () => {
    render(<Footer />);
    expect(screen.getByText("LETTERBOXD")).toBeInTheDocument();
    expect(screen.getByText("TMDB")).toBeInTheDocument();
    expect(screen.getByText("AI API")).toBeInTheDocument();
    expect(screen.getByText("GOOGLE OAUTH")).toBeInTheDocument();
  });

  it("accepts variant prop without error", () => {
    const { container } = render(<Footer variant="app" />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
