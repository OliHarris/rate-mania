import { fireEvent, render, screen } from "@testing-library/react";
import WikiOutput from "./WikiOutput";

const defaultProps = {
  loadingState: false,
  articleImage: "https://upload.wikimedia.org/dune.jpg",
  imageLoaded: false,
  setImageLoaded: jest.fn(),
  articleTitle: "Dune",
  articleExtract: "<p><b>Dune</b> is a 2021 film.</p>",
  articleFullUrl: "https://en.wikipedia.org/wiki/Dune_(2021_film)"
};

const renderWikiOutput = (props: Partial<typeof defaultProps> = {}) =>
  render(<WikiOutput {...defaultProps} {...props} />);

describe("WikiOutput", () => {
  it("renders nothing while loading", () => {
    const { container } = renderWikiOutput({ loadingState: true });

    expect(container).toBeEmptyDOMElement();
  });

  it("renders the extract HTML", () => {
    const { container } = renderWikiOutput();

    const article = container.querySelector("article");
    expect(article).toContainHTML("<p><b>Dune</b> is a 2021 film.</p>");
  });

  it("links to the full Wikipedia article in a new tab", () => {
    renderWikiOutput();

    const link = screen.getByRole("link", { name: "Read more on Wikipedia" });
    expect(link).toHaveAttribute("href", defaultProps.articleFullUrl);
    expect(link).toHaveAttribute("target", "blank");
  });

  it("shows a loader and hides the image until it has loaded", () => {
    const { container } = renderWikiOutput({ imageLoaded: false });

    // hidden: true because the image is display:none until loaded
    const img = screen.getByAltText("Dune");
    expect(img).toHaveAttribute("src", defaultProps.articleImage);
    expect(img).toHaveStyle({ display: "none" });
    expect(container.querySelector(".loader")).not.toBeNull();
  });

  it("calls setImageLoaded(true) when the image finishes loading", () => {
    const setImageLoaded = jest.fn();
    renderWikiOutput({ setImageLoaded });

    fireEvent.load(screen.getByAltText("Dune"));

    expect(setImageLoaded).toHaveBeenCalledWith(true);
  });

  it("shows the image and removes the loader once loaded", () => {
    const { container } = renderWikiOutput({ imageLoaded: true });

    expect(screen.getByRole("img", { name: "Dune" })).toHaveStyle({
      display: "inline-block"
    });
    expect(container.querySelector(".loader")).toBeNull();
  });

  it("shows a 'No image' placeholder when there is no image", () => {
    renderWikiOutput({ articleImage: "" });

    expect(screen.getByText("No image")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
