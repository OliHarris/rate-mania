export type Article = {
  extract: string;
  fullurl: string;
  image: string;
  keyword: string;
  pageid: number;
  title: string;
};

export const makeArticle = (overrides: Partial<Article> = {}): Article => ({
  pageid: 1,
  title: "Test Film",
  extract: "<p>A test film.</p>",
  fullurl: "https://en.wikipedia.org/wiki/Test_Film",
  keyword: "Test_Film",
  image: "https://upload.wikimedia.org/test.jpg",
  ...overrides
});
