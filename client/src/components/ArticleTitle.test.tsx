import { render, screen } from "@testing-library/react";
import ArticleTitle from "./ArticleTitle";

describe("ArticleTitle", () => {
  it("shows a loading message while loading", () => {
    render(<ArticleTitle loadingState={true} articleTitle="Dune" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Loading..." })
    ).toBeInTheDocument();
    expect(screen.queryByText("Dune")).not.toBeInTheDocument();
  });

  it("shows the article title once loaded", () => {
    render(<ArticleTitle loadingState={false} articleTitle="Dune" />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Dune" })
    ).toBeInTheDocument();
    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });

  it("renders inside the #article-title section", () => {
    const { container } = render(
      <ArticleTitle loadingState={false} articleTitle="Dune" />
    );

    expect(container.querySelector("section#article-title")).not.toBeNull();
  });
});
