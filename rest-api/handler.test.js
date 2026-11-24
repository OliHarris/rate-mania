// Run with `npm test`. Uses Node's built-in test runner, so no extra packages.
const { test, beforeEach } = require("node:test");
const assert = require("node:assert");
const path = require("path");

// Swap the real database and model for fakes before loading the handler,
// so these tests check the validation without needing MongoDB
const calls = [];
const fakeArticle = {
  create: (doc) => {
    calls.push(["create", doc]);
    return Promise.resolve(doc);
  },
  findOne: (query) => {
    calls.push(["findOne", query]);
    return Promise.resolve(null);
  },
  findOneAndUpdate: (query, update) => {
    calls.push(["findOneAndUpdate", query, update]);
    return Promise.resolve({});
  },
};
const fake = (file, exports) => {
  const id = require.resolve(path.join(__dirname, file));
  require.cache[id] = { id, filename: id, loaded: true, exports };
};
fake("db.js", () => Promise.resolve());
fake("models/Article.js", fakeArticle);
const handler = require("./handler");

// Call a handler and wait for the response it sends back
const run = (fn, { body, id } = {}) =>
  new Promise((resolve) =>
    fn(
      {
        body: typeof body === "string" ? body : JSON.stringify(body),
        pathParameters: { id },
        requestContext: { stage: "dev" },
      },
      {},
      (err, res) => resolve({ ...res, body: JSON.parse(res.body) })
    )
  );

beforeEach(() => (calls.length = 0));

test("create sets the starting counts from the vote", async () => {
  const res = await run(handler.create, {
    body: { article_id: 42, article_title: "Dune", vote: "overrated" },
  });
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(calls, [
    [
      "create",
      { article_id: 42, article_title: "Dune", underrated: 0, overrated: 1 },
    ],
  ]);
});

test("create rejects made-up counts and bad input", async () => {
  const bad = [
    { article_id: 42, article_title: "Dune", underrated: 999999 },
    { article_id: 42, article_title: "Dune", vote: "loved" },
    { article_id: "abc", article_title: "Dune", vote: "underrated" },
    { article_id: 42, article_title: "", vote: "underrated" },
    { article_id: 42, article_title: "x".repeat(256), vote: "underrated" },
    "not json",
  ];
  for (const body of bad) {
    const res = await run(handler.create, { body });
    assert.strictEqual(res.statusCode, 400);
  }
  assert.strictEqual(calls.length, 0);
});

test("update adds one vote with $inc", async () => {
  const res = await run(handler.update, {
    id: "42",
    body: { vote: "underrated" },
  });
  assert.strictEqual(res.statusCode, 200);
  assert.deepStrictEqual(calls, [
    ["findOneAndUpdate", { article_id: "42" }, { $inc: { underrated: 1 } }],
  ]);
});

test("update rejects absolute counts, title changes and bad ids", async () => {
  const bad = [
    { id: "42", body: { underrated: 999999 } },
    { id: "42", body: { article_title: "Hacked" } },
    { id: "42", body: { vote: "article_title" } },
    { id: "42", body: "not json" },
    { id: "abc", body: { vote: "underrated" } },
  ];
  for (const req of bad) {
    const res = await run(handler.update, req);
    assert.strictEqual(res.statusCode, 400);
  }
  assert.strictEqual(calls.length, 0);
});

test("getOne rejects an id that isn't a number", async () => {
  const res = await run(handler.getOne, { id: "1; drop" });
  assert.strictEqual(res.statusCode, 400);
  assert.strictEqual(calls.length, 0);
});

test("errors return a plain message, not the error details", async () => {
  const original = fakeArticle.findOne;
  const originalLog = console.error;
  fakeArticle.findOne = () => Promise.reject(new Error("secret db detail"));
  console.error = () => {}; // keep the test output clean
  const res = await run(handler.getOne, { id: "42" });
  fakeArticle.findOne = original;
  console.error = originalLog;
  assert.strictEqual(res.statusCode, 500);
  assert.deepStrictEqual(res.body, { message: "Could not fetch the article." });
});
