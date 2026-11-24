/**
 * @jest-environment-options {"url": "https://rate-mania.web.app/"}
 */
import { render, screen } from "@testing-library/react";
import axios from "axios";
import App from "./App";
import { DEV_API, PROD_API, mockWikiApi } from "../test/fixtures/wikiApi";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("App (production host)", () => {
  beforeEach(() => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    jest.spyOn(window, "setInterval").mockImplementation(() => 0 as never);
  });

  it("uses the production API when not running on localhost", async () => {
    mockWikiApi({
      films: [{ pageid: 101, title: "Dune" }],
      db: { 101: { underrated: 1, overrated: 1 } }
    });
    render(<App />);

    await screen.findByRole("heading", { level: 2, name: "Dune" });
    const urls = mockedAxios.get.mock.calls.map(([url]) => url as string);
    expect(urls).toContain(`${PROD_API}/articles/101`);
    expect(urls.some((u) => u.startsWith(DEV_API))).toBe(false);
  });
});
