import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Swal from "sweetalert2/src/sweetalert2.js";
import UserInput from "./UserInput";
import { makeArticle } from "../test/fixtures/articles";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

const API = "https://api.test/dev";
const articles = [
  makeArticle({ pageid: 42, title: "Dune", keyword: "Dune" }),
  makeArticle({ pageid: 7, title: "Barbie", keyword: "Barbie" })
];

const makeProps = () => ({
  setLoadingState: jest.fn(),
  dbEntryExists: false,
  articleId: 42,
  articleTitle: "Dune",
  devSwitch: () => API,
  setLastVotedArticleTitle: jest.fn(),
  setLastVotedArticleType: jest.fn(),
  getRandomArticle: jest.fn(),
  currentArticles: articles,
  articleKeyword: "Dune",
  userUnderrated: 4,
  userOverrated: 6,
  loadingState: false
});

type Props = ReturnType<typeof makeProps>;

const renderUserInput = (overrides: Partial<Props> = {}) => {
  const props = { ...makeProps(), ...overrides };
  render(<UserInput {...props} />);
  return props;
};

const buttons = () => ({
  underrated: screen.getByRole("button", { name: "Vote Underrated" }),
  overrated: screen.getByRole("button", { name: "Vote Overrated" }),
  skip: screen.getByRole("button", { name: "Skip article" })
});

describe("UserInput", () => {
  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("renders enabled vote and skip buttons", () => {
    renderUserInput();
    const { underrated, overrated, skip } = buttons();

    expect(underrated).toBeEnabled();
    expect(overrated).toBeEnabled();
    expect(skip).toBeEnabled();
  });

  it("disables all buttons while loading", () => {
    renderUserInput({ loadingState: true });
    const { underrated, overrated, skip } = buttons();

    expect(underrated).toBeDisabled();
    expect(overrated).toBeDisabled();
    expect(skip).toBeDisabled();
  });

  it("disables all buttons when there are no articles left", () => {
    renderUserInput({ currentArticles: [] });
    const { underrated, overrated, skip } = buttons();

    expect(underrated).toBeDisabled();
    expect(overrated).toBeDisabled();
    expect(skip).toBeDisabled();
  });

  describe("voting on a new article (no DB entry)", () => {
    it.each([
      ["underrated", "Vote Underrated", { underrated: 1, overrated: 0 }],
      ["overrated", "Vote Overrated", { underrated: 0, overrated: 1 }]
    ])(
      "POSTs a new %s record and loads the next article",
      async (type, label, counts) => {
        mockedAxios.post.mockResolvedValue({ data: {} });
        const user = userEvent.setup();
        const props = renderUserInput();

        await user.click(screen.getByRole("button", { name: label }));

        expect(props.setLoadingState).toHaveBeenCalledWith(true);
        expect(mockedAxios.post).toHaveBeenCalledWith(`${API}/articles`, {
          article_id: 42,
          article_title: "Dune",
          ...counts
        });
        await waitFor(() =>
          expect(props.getRandomArticle).toHaveBeenCalledWith(
            articles,
            "voted",
            "Dune"
          )
        );
        expect(props.setLastVotedArticleTitle).toHaveBeenCalledWith("Dune");
        expect(props.setLastVotedArticleType).toHaveBeenCalledWith(type);
        expect(mockedAxios.put).not.toHaveBeenCalled();
      }
    );

    it("shows a retry alert if the POST fails", async () => {
      mockedAxios.post.mockRejectedValue(new Error("network"));
      const user = userEvent.setup();
      const props = renderUserInput();

      await user.click(buttons().underrated);

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith({
          icon: "error",
          title: "Something went wrong!",
          text: "Please click OK to try again"
        })
      );
      expect(props.getRandomArticle).not.toHaveBeenCalled();
      expect(props.setLastVotedArticleTitle).not.toHaveBeenCalled();
    });
  });

  describe("voting on an existing article (DB entry exists)", () => {
    it.each([
      ["underrated", "Vote Underrated", { underrated: 5, overrated: 6 }],
      ["overrated", "Vote Overrated", { underrated: 4, overrated: 7 }]
    ])(
      "PUTs an incremented %s count and loads the next article",
      async (type, label, counts) => {
        mockedAxios.put.mockResolvedValue({ data: {} });
        const user = userEvent.setup();
        const props = renderUserInput({ dbEntryExists: true });

        await user.click(screen.getByRole("button", { name: label }));

        expect(mockedAxios.put).toHaveBeenCalledWith(`${API}/articles/42`, {
          article_id: 42,
          article_title: "Dune",
          ...counts
        });
        await waitFor(() =>
          expect(props.getRandomArticle).toHaveBeenCalledWith(
            articles,
            "voted",
            "Dune"
          )
        );
        expect(props.setLastVotedArticleType).toHaveBeenCalledWith(type);
        expect(mockedAxios.post).not.toHaveBeenCalled();
      }
    );

    it("shows a retry alert if the PUT fails", async () => {
      mockedAxios.put.mockRejectedValue(new Error("network"));
      const user = userEvent.setup();
      const props = renderUserInput({ dbEntryExists: true });

      await user.click(buttons().overrated);

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({ icon: "error" })
        )
      );
      expect(props.getRandomArticle).not.toHaveBeenCalled();
    });
  });

  it("skips to the next article without touching the API", async () => {
    const user = userEvent.setup();
    const props = renderUserInput();

    await user.click(buttons().skip);

    expect(props.setLoadingState).toHaveBeenCalledWith(true);
    expect(props.getRandomArticle).toHaveBeenCalledWith(
      articles,
      "skipped",
      "Dune"
    );
    expect(mockedAxios.post).not.toHaveBeenCalled();
    expect(mockedAxios.put).not.toHaveBeenCalled();
  });
});
