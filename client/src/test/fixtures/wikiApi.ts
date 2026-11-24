import axios from "axios";

export const DEV_API = "https://k9i909fnm3.execute-api.eu-west-1.amazonaws.com/dev";
export const PROD_API = "https://vmi0yofalk.execute-api.eu-west-1.amazonaws.com/prod";

export type FilmFixture = {
  pageid: number;
  title: string;
  /** "original" = image on the page; "pageprops" = needs an imageinfo lookup;
   *  "pageprops-missing" = lookup returns nothing; "none" = no image data at all */
  imageSource?: "original" | "pageprops" | "pageprops-missing" | "none";
};

export type DbArticle = { underrated: number; overrated: number } | null;

type Options = {
  films: FilmFixture[];
  /** total number of top articles returned by Wikimedia (padded to 1000 by the app) */
  topArticleCount?: number;
  db?: Record<number, DbArticle>;
};

export const slug = (title: string) => title.replace(/ /g, "_");
export const imageUrlFor = (title: string) =>
  `https://upload.wikimedia.org/${slug(title)}.jpg`;
export const extractFor = (title: string) => `<p>${title} is a film.</p>`;

const httpError = (status: number) =>
  Object.assign(new Error(`HTTP ${status}`), { response: { status } });

/**
 * Routes mocked axios.get calls to fake Wikimedia, Wikipedia and Rate-Mania
 * API responses. Individual endpoints can be overridden per-test via the
 * returned `overrides` hooks.
 */
export const mockWikiApi = ({ films, topArticleCount = 1000, db = {} }: Options) => {
  const mockedAxios = axios as jest.Mocked<typeof axios>;
  const filmsByTitle = new Map(films.map((f) => [slug(f.title), f]));

  // Films first so they land in the first batch, padded with non-film titles.
  const topArticles = [
    ...films.map((f) => slug(f.title)),
    ...Array.from(
      { length: Math.max(0, topArticleCount - films.length) },
      (_, i) => `Not_A_Film_${i}`
    )
  ].map((article, i) => ({ article, rank: i + 1, views: 1000 - i }));

  const overrides = {
    topArticles: undefined as undefined | ((url: string) => Promise<unknown>),
    wikiBatch: undefined as undefined | ((url: string) => Promise<unknown>),
    db: undefined as undefined | ((url: string) => Promise<unknown>)
  };

  const wikiPage = (title: string) => {
    const film = filmsByTitle.get(title);
    if (!film) return { pageid: 0, title, extract: "" };
    const base = {
      pageid: film.pageid,
      title: film.title,
      extract: extractFor(film.title),
      fullurl: `https://en.wikipedia.org/wiki/${slug(film.title)}`,
      categories: [{ title: "Category:2023 English-language films" }]
    };
    switch (film.imageSource ?? "original") {
      case "original":
        return { ...base, original: { source: imageUrlFor(film.title) } };
      case "pageprops":
      case "pageprops-missing":
        return { ...base, pageprops: { page_image: `${slug(film.title)}.jpg` } };
      default:
        return base;
    }
  };

  mockedAxios.get.mockImplementation((url: string) => {
    if (url.startsWith("https://wikimedia.org/")) {
      if (overrides.topArticles) return overrides.topArticles(url);
      return Promise.resolve({ data: { items: [{ articles: topArticles }] } });
    }

    if (url.includes("prop=imageinfo")) {
      const file = decodeURIComponent(url.split("titles=File:")[1].split("&")[0]);
      const film = [...filmsByTitle.values()].find(
        (f) => `${slug(f.title)}.jpg` === file
      );
      const pages =
        film && film.imageSource === "pageprops"
          ? [{ imageinfo: [{ url: imageUrlFor(film.title) }] }]
          : [{}];
      return Promise.resolve({ data: { query: { pages } } });
    }

    if (url.startsWith("https://en.wikipedia.org/")) {
      if (overrides.wikiBatch) return overrides.wikiBatch(url);
      const titles = decodeURIComponent(url.split("&titles=")[1].split("&")[0])
        .split("|");
      return Promise.resolve({
        data: { query: { pages: titles.map(wikiPage) } }
      });
    }

    const dbMatch = url.match(/\/articles\/(\d+)$/);
    if (dbMatch) {
      if (overrides.db) return overrides.db(url);
      return Promise.resolve({ data: db[Number(dbMatch[1])] ?? null });
    }

    return Promise.reject(new Error(`Unexpected GET ${url}`));
  });

  return { mockedAxios, overrides, httpError };
};

export { httpError };
