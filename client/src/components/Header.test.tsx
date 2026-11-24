import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Swal from "sweetalert2/src/sweetalert2.js";
import Header from "./Header";
import { makeArticle } from "../test/fixtures/articles";

const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36";
const MOBILE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148";

const setUserAgent = (ua: string) =>
  jest.spyOn(window.navigator, "userAgent", "get").mockReturnValue(ua);

const defaultProps = {
  lastVotedArticleTitle: "",
  lastVotedArticleType: "",
  voteCounter: 0,
  currentArticles: [makeArticle(), makeArticle({ pageid: 2 })]
};

const renderHeader = (props: Partial<typeof defaultProps> = {}) =>
  render(<Header {...defaultProps} {...props} />);

const votedProps = {
  lastVotedArticleTitle: "Dune",
  lastVotedArticleType: "underrated"
};

describe("Header", () => {
  beforeEach(() => setUserAgent(DESKTOP_UA));

  it("renders the site title", () => {
    renderHeader();

    expect(
      screen.getByRole("heading", { level: 1, name: /Welcome to\s*Rate-Mania/ })
    ).toBeInTheDocument();
  });

  it("shows the vote counter and remaining article count", () => {
    renderHeader({ voteCounter: 3 });

    expect(
      screen.getByText(
        "You have voted on 3 out of today's remaining 2 popular films."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Article stack updated daily!")).toBeInTheDocument();
  });

  it("hides share buttons until the user has voted", () => {
    renderHeader();

    expect(screen.queryByText(/^Share that you think/)).not.toBeInTheDocument();
    expect(screen.queryByTitle("Share to Twitter")).not.toBeInTheDocument();
  });

  it("hides share buttons if only one of title/type is set", () => {
    renderHeader({ lastVotedArticleTitle: "Dune" });

    expect(screen.queryByTitle("Share to Twitter")).not.toBeInTheDocument();
  });

  it("shows share prompt and desktop share buttons after a vote", () => {
    renderHeader(votedProps);

    expect(
      screen.getByText('Share that you think "Dune" is underrated?')
    ).toBeInTheDocument();
    expect(screen.getByTitle("Share to Twitter")).toBeInTheDocument();
    expect(screen.getByTitle("Copy to clipboard")).toBeInTheDocument();
    expect(screen.queryByTitle("Share on mobile")).not.toBeInTheDocument();
  });

  it("shows the mobile share button on mobile devices", () => {
    setUserAgent(MOBILE_UA);
    renderHeader(votedProps);

    expect(screen.getByTitle("Share on mobile")).toBeInTheDocument();
  });

  it("opens a Twitter intent with the encoded share text", async () => {
    const user = userEvent.setup();
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    renderHeader(votedProps);

    await user.click(screen.getByTitle("Share to Twitter"));

    const text = encodeURIComponent('I voted "Dune" is underrated!\n👍\n');
    expect(open).toHaveBeenCalledWith(
      `https://twitter.com/intent/tweet?text=${text}&url=https://rate-mania.web.app`,
      "_blank"
    );
  });

  it("uses a thumbs-down emoji for overrated votes", async () => {
    const user = userEvent.setup();
    const open = jest.spyOn(window, "open").mockImplementation(() => null);
    renderHeader({ ...votedProps, lastVotedArticleType: "overrated" });

    await user.click(screen.getByTitle("Share to Twitter"));

    expect(open.mock.calls[0][0]).toContain(
      encodeURIComponent('I voted "Dune" is overrated!\n👎\n')
    );
  });

  it("copies share text to the clipboard and confirms with an alert", async () => {
    const user = userEvent.setup();
    const writeText = jest
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    renderHeader(votedProps);

    await user.click(screen.getByTitle("Copy to clipboard"));

    const shareText = 'I voted "Dune" is underrated!\n👍\n';
    expect(writeText).toHaveBeenCalledWith(
      `${shareText}\nhttps://rate-mania.web.app`
    );
    expect(Swal.fire).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Copied to clipboard",
        text: shareText,
        timer: 2000,
        showConfirmButton: false
      })
    );
  });

  it("uses the Web Share API for the mobile share button", async () => {
    setUserAgent(MOBILE_UA);
    const share = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: share
    });
    const user = userEvent.setup();
    renderHeader(votedProps);

    await user.click(screen.getByTitle("Share on mobile"));

    expect(share).toHaveBeenCalledWith({
      title: "Check out Rate-Mania",
      text: 'I voted "Dune" is underrated!\n👍\n',
      url: "https://rate-mania.web.app"
    });
  });
});
