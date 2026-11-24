import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import Swal from "sweetalert2/src/sweetalert2.js";
import App from "./App";
import {
  DEV_API,
  extractFor,
  httpError,
  imageUrlFor,
  mockWikiApi
} from "../test/fixtures/wikiApi";
import { mockLocationReload } from "../test/mockLocation";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

// 15 March 2026 -> app requests "yesterday" (14 March).
const NOW = new Date("2026-03-15T12:00:00Z");

const films = [
  { pageid: 101, title: "Dune" },
  { pageid: 102, title: "Barbie" },
  { pageid: 103, title: "Oppenheimer", imageSource: "pageprops" as const }
];

const db = {
  101: { underrated: 3, overrated: 1 },
  102: null,
  103: { underrated: 0, overrated: 2 }
};

const getCalls = () => mockedAxios.get.mock.calls.map(([url]) => url as string);

const waitForArticle = (title: string) =>
  screen.findByRole("heading", { level: 2, name: title });

const counterText = (voted: number, remaining: number) =>
  `You have voted on ${voted} out of today's remaining ${remaining} popular films.`;

let location: ReturnType<typeof mockLocationReload>;
let intervalIds: number[] = [];

// Fake only Date: Testing Library's waitFor polls with real timers.
const ALL_BUT_DATE = [
  "nextTick",
  "queueMicrotask",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "setImmediate",
  "clearImmediate",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "requestIdleCallback",
  "cancelIdleCallback",
  "performance",
  "hrtime"
] as const;

beforeEach(() => {
  jest.useFakeTimers({ now: NOW, doNotFake: [...ALL_BUT_DATE] });
  // Track the app's shine-effect intervals so they can be cleared.
  const realSetInterval = window.setInterval.bind(window);
  intervalIds = [];
  jest.spyOn(window, "setInterval").mockImplementation(((
    handler: TimerHandler,
    timeout?: number
  ) => {
    const id = realSetInterval(handler, timeout);
    if (timeout === 1000) intervalIds.push(id);
    return id;
  }) as typeof window.setInterval);
  // Always pick the first remaining article so flows are deterministic.
  jest.spyOn(Math, "random").mockReturnValue(0);
  jest.spyOn(console, "log").mockImplementation(() => {});
  location = mockLocationReload();
});

afterEach(() => {
  intervalIds.forEach((id) => window.clearInterval(id));
  jest.useRealTimers();
  location.restore();
});

describe("App", () => {
  describe("initial load", () => {
    it("shows a loading state with disabled controls before data arrives", () => {
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      render(<App />);

      expect(
        screen.getByRole("heading", { level: 2, name: "Loading..." })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Vote Underrated" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Vote Overrated" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Skip article" })).toBeDisabled();
      expect(screen.getByText(counterText(0, 0))).toBeInTheDocument();
    });

    it("requests yesterday's top Wikipedia articles", async () => {
      mockWikiApi({ films, db });
      render(<App />);
      await waitForArticle("Dune");

      expect(getCalls()[0]).toBe(
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/2026/03/14"
      );
    });

    it("filters Wikipedia batches to English-language films from the last ten years", async () => {
      mockWikiApi({ films, db });
      render(<App />);
      await waitForArticle("Dune");

      const batchCalls = getCalls().filter((u) => u.includes("prop=extracts"));
      // 1000 top articles in batches of 20
      expect(batchCalls).toHaveLength(50);
      const categories = decodeURIComponent(
        batchCalls[0].split("&clcategories=")[1].split("&")[0]
      ).split("|");
      expect(categories).toHaveLength(11);
      expect(categories[0]).toBe("Category:2016 English-language films");
      expect(categories[10]).toBe("Category:2026 English-language films");
    });

    it("pads short Wikimedia responses to 1000 entries so batching completes", async () => {
      mockWikiApi({ films, db, topArticleCount: 990 });
      render(<App />);

      await waitForArticle("Dune");
      expect(
        getCalls().filter((u) => u.includes("prop=extracts"))
      ).toHaveLength(50);
    });

    it("displays the selected article with its stats, image and extract", async () => {
      mockWikiApi({ films, db });
      render(<App />);

      await waitForArticle("Dune");
      expect(screen.getByText("75.0% Underrated")).toBeInTheDocument();
      expect(screen.getByText("4 votes")).toBeInTheDocument();
      expect(screen.getByText("25.0% Overrated")).toBeInTheDocument();
      expect(screen.getByAltText("Dune")).toHaveAttribute(
        "src",
        imageUrlFor("Dune")
      );
      expect(document.querySelector("article")).toContainHTML(extractFor("Dune"));
      expect(screen.getByRole("link", { name: "Read more on Wikipedia" })).toHaveAttribute(
        "href",
        "https://en.wikipedia.org/wiki/Dune"
      );
      expect(screen.getByText(counterText(0, 3))).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Vote Underrated" })).toBeEnabled();
    });

    it("fetches DB stats from the dev API when running on localhost", async () => {
      mockWikiApi({ films, db });
      render(<App />);
      await waitForArticle("Dune");

      expect(getCalls()).toContain(`${DEV_API}/articles/101`);
    });

    it("resolves page_image via imageinfo and skips films without any image", async () => {
      mockWikiApi({
        films: [
          ...films,
          { pageid: 104, title: "No Image Film", imageSource: "none" },
          { pageid: 105, title: "Broken Image Film", imageSource: "pageprops-missing" }
        ],
        db
      });
      render(<App />);

      await waitForArticle("Dune");
      // Only Dune, Barbie and Oppenheimer qualify.
      expect(screen.getByText(counterText(0, 3))).toBeInTheDocument();
      expect(getCalls()).toContain(
        "https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&titles=File:Oppenheimer.jpg&origin=*"
      );
    });

    it("shows zeroed stats when the article has no DB entry", async () => {
      mockWikiApi({ films: [{ pageid: 102, title: "Barbie" }], db });
      render(<App />);

      await waitForArticle("Barbie");
      expect(screen.getByText("0 votes")).toBeInTheDocument();
      expect(screen.getByText("0.0% Underrated")).toBeInTheDocument();
      expect(screen.getByText("0.0% Overrated")).toBeInTheDocument();
    });

    it("toggles the shine effect on the vote buttons every second", () => {
      jest.restoreAllMocks();
      jest.useFakeTimers({ now: NOW });
      mockedAxios.get.mockReturnValue(new Promise(() => {}));
      render(<App />);
      const [underrated, overrated] = document.querySelectorAll(
        "#user-input .btn-yellow"
      );

      expect(underrated).not.toHaveClass("shine");
      act(() => jest.advanceTimersByTime(1000));
      expect(underrated).toHaveClass("shine");
      expect(overrated).toHaveClass("shine");
      act(() => jest.advanceTimersByTime(1000));
      expect(underrated).not.toHaveClass("shine");
      jest.clearAllTimers();
    });
  });

  describe("error handling", () => {
    it("retries with the day before if Wikimedia returns 404", async () => {
      const api = mockWikiApi({ films, db });
      api.overrides.topArticles = () => {
        api.overrides.topArticles = undefined;
        return Promise.reject(httpError(404));
      };
      render(<App />);

      await waitForArticle("Dune");
      const topCalls = getCalls().filter((u) => u.startsWith("https://wikimedia.org/"));
      expect(topCalls).toHaveLength(2);
      expect(topCalls[1]).toMatch(/\/2026\/03\/13$/);
    });

    it("shows an error alert and reloads if Wikimedia fails otherwise", async () => {
      const api = mockWikiApi({ films, db });
      api.overrides.topArticles = () => Promise.reject(httpError(503));
      render(<App />);

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith({
          icon: "error",
          title: "Something went wrong!",
          text: "Please click OK to refresh the page, and start again"
        })
      );
      await waitFor(() => expect(location.reload).toHaveBeenCalled());
    });

    it("shows an error alert if a Wikipedia batch request fails", async () => {
      const api = mockWikiApi({ films, db });
      api.overrides.wikiBatch = () => Promise.reject(httpError(500));
      render(<App />);

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({ icon: "error" })
        )
      );
      expect(
        screen.getByRole("heading", { level: 2, name: "Loading..." })
      ).toBeInTheDocument();
    });

    it("shows an error alert if an imageinfo lookup fails", async () => {
      mockWikiApi({ films, db });
      const routed = mockedAxios.get.getMockImplementation()!;
      mockedAxios.get.mockImplementation((url: string, ...rest) =>
        url.includes("prop=imageinfo")
          ? Promise.reject(httpError(500))
          : routed(url, ...rest)
      );
      render(<App />);

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({ icon: "error" })
        )
      );
    });

    it("retries the DB lookup when the API returns 500", async () => {
      const api = mockWikiApi({ films, db });
      let failures = 2;
      api.overrides.db = () => {
        if (failures-- > 0) return Promise.reject(httpError(500));
        return Promise.resolve({ data: db[101] });
      };
      render(<App />);

      await waitForArticle("Dune");
      expect(screen.getByText("4 votes")).toBeInTheDocument();
      expect(getCalls().filter((u) => u.endsWith("/articles/101"))).toHaveLength(3);
      expect(Swal.fire).not.toHaveBeenCalled();
    });

    it("shows an error alert and reloads if the DB lookup fails with a non-500", async () => {
      const api = mockWikiApi({ films, db });
      api.overrides.db = () => Promise.reject(httpError(403));
      render(<App />);

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({ icon: "error", title: "Something went wrong!" })
        )
      );
      await waitFor(() => expect(location.reload).toHaveBeenCalled());
    });
  });

  describe("user interaction", () => {
    it("records a vote for a new DB entry and moves to the next article", async () => {
      mockWikiApi({ films: [films[1], films[0]], db });
      mockedAxios.post.mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      render(<App />);
      await waitForArticle("Barbie");

      await user.click(screen.getByRole("button", { name: "Vote Underrated" }));

      expect(mockedAxios.post).toHaveBeenCalledWith(`${DEV_API}/articles`, {
        article_id: 102,
        article_title: "Barbie",
        underrated: 1,
        overrated: 0
      });
      await waitForArticle("Dune");
      expect(screen.getByText(counterText(1, 1))).toBeInTheDocument();
      expect(
        screen.getByText('Share that you think "Barbie" is underrated?')
      ).toBeInTheDocument();
    });

    it("updates an existing DB entry when voting", async () => {
      mockWikiApi({ films, db });
      mockedAxios.put.mockResolvedValue({ data: {} });
      const user = userEvent.setup();
      render(<App />);
      await waitForArticle("Dune");

      await user.click(screen.getByRole("button", { name: "Vote Overrated" }));

      expect(mockedAxios.put).toHaveBeenCalledWith(`${DEV_API}/articles/101`, {
        article_id: 101,
        article_title: "Dune",
        underrated: 3,
        overrated: 2
      });
      await waitForArticle("Barbie");
      expect(screen.getByText(counterText(1, 2))).toBeInTheDocument();
      expect(
        screen.getByText('Share that you think "Dune" is overrated?')
      ).toBeInTheDocument();
    });

    it("skips an article without voting", async () => {
      mockWikiApi({ films, db });
      const user = userEvent.setup();
      render(<App />);
      await waitForArticle("Dune");

      await user.click(screen.getByRole("button", { name: "Skip article" }));

      await waitForArticle("Barbie");
      expect(screen.getByText(counterText(0, 2))).toBeInTheDocument();
      expect(mockedAxios.post).not.toHaveBeenCalled();
      expect(mockedAxios.put).not.toHaveBeenCalled();
      expect(screen.queryByText(/^Share that you think/)).not.toBeInTheDocument();
    });

    it("congratulates the user and reloads at the end of the stack", async () => {
      mockWikiApi({ films: [films[0]], db });
      const user = userEvent.setup();
      render(<App />);
      await waitForArticle("Dune");

      await user.click(screen.getByRole("button", { name: "Skip article" }));

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith({
          icon: "success",
          title: "Congratulations! You made it to the end",
          text: "Please click OK to start again"
        })
      );
      await waitFor(() => expect(location.reload).toHaveBeenCalled());
    });

    it("congratulates immediately if no films qualify today", async () => {
      mockWikiApi({ films: [], db });
      render(<App />);

      await waitFor(() =>
        expect(Swal.fire).toHaveBeenCalledWith(
          expect.objectContaining({ icon: "success" })
        )
      );
    });
  });

  it("renders the credits footer", () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {}));
    render(<App />);

    expect(screen.getByText(/All design and implementation/)).toBeInTheDocument();
  });
});
