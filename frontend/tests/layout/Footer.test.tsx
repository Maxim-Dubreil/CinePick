import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";

describe("Footer", () => {
  it("renders all partner names", () => {
    render(<Footer />, { wrapper: MemoryRouter });
    expect(screen.getByText("LETTERBOXD")).toBeInTheDocument();
    expect(screen.getByText("TMDB")).toBeInTheDocument();
    expect(screen.getByText("AI API")).toBeInTheDocument();
    expect(screen.getByText("GOOGLE OAUTH")).toBeInTheDocument();
  });

  it("links to the legal page", () => {
    render(<Footer />, { wrapper: MemoryRouter });
    expect(screen.getByRole("link", { name: "MENTIONS LÉGALES" })).toHaveAttribute(
      "href",
      "/mentions-legales",
    );
  });

  it("accepts variant prop without error", () => {
    const { container } = render(<Footer variant="app" />, { wrapper: MemoryRouter });
    expect(container.firstChild).toBeInTheDocument();
  });
});
