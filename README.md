# Rate-Mania

**Live site: [rate-mania.web.app](https://rate-mania.web.app)**

Rate-Mania shows you films that are trending on Wikipedia today and asks one question: **underrated or overrated?** Vote, see how everyone else voted, share your take, and move on to the next one. The list of films refreshes every day.

I designed, built, tested and deployed it myself as a full-stack project. The first version was built in one week (28/12/21 – 04/01/22) to see how far I could get with a little time off. I've kept improving it since.

---

## What I built

### Front end: React 18 + TypeScript

- **React 18 and TypeScript in strict mode**, built with **Vite** and **SWC**.
- **Small components with typed props**: `Header`, `ArticleTitle`, `UserStats`, `UserInput` and `WikiOutput`, all put together by `App`.
- **Attention to user experience**:
  - Loading states for the article data and, separately, for each image, so the layout never jumps around.
  - Vote and skip buttons are disabled while a request is in flight, so nobody can vote twice by accident.
  - A clear message when you reach the end of today's films.
  - Accessible buttons with `aria-label`s, and alt text on every image.
- **Sharing**: uses the browser's **Web Share API** on mobile, with **Twitter** and **copy-to-clipboard** options everywhere. Confirmations are shown with SweetAlert2.
- **Handles flaky APIs**: if yesterday's Wikipedia stats aren't published yet (404), it falls back to the day before. If the AWS backend returns a 500 on a cold start, it retries. Network failures show a friendly error instead of a stuck screen.

### Building the daily film list from Wikipedia

There's no "trending films" API, so the app builds the list itself on each load:

1. Fetches yesterday's **top 1,000 most-viewed English Wikipedia articles** from the [Wikimedia Pageviews API](https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews).
2. Asks the [MediaWiki Action API](https://en.wikipedia.org/wiki/Special:ApiSandbox) about them in **batches of 20** (the most it handles reliably when returning extracts). Each batch returns the intro extract, page URL, image and categories.
3. Keeps only pages in the **"\<year\> English-language films"** categories, generated for the **last ten years**.
4. Finds an image for each film: the page's main image if it has one, otherwise a second `imageinfo` lookup. Films with no usable image are left out.
5. Picks a random film from what's left, removing each one once it has been voted on or skipped.

### Back end: serverless REST API on AWS + MongoDB

The `rest-api/` folder is a **Serverless Framework** project deployed to **AWS Lambda** behind **API Gateway** (Node.js 20, `eu-west-1`):

| Method | Route | Lambda | Purpose |
|---|---|---|---|
| `GET` | `/articles/{id}` | `getOne` | Get the vote counts for a film |
| `POST` | `/articles` | `create` | Create a record for a film's first vote |
| `PUT` | `/articles/{id}` | `update` | Update the vote counts |

- **MongoDB** accessed through **Mongoose**, with a small `Article` schema (`article_id`, `article_title`, `underrated`, `overrated`).
- **Reuses the database connection between calls**: the connection is cached outside the handler, and `callbackWaitsForEmptyEventLoop = false` lets a warm Lambda keep it open instead of reconnecting on every request.
- **CORS depends on the stage**: open (`*`) on `dev`, and locked to the production domain on `prod`.
- **Separate dev and prod stages**: the client picks the matching API automatically (dev on `localhost`, prod everywhere else).
- `serverless-offline` is set up so the API can be run locally.

### Hosting

- Front end on **Firebase Hosting**, with a custom domain bought through Google Domains and linked using DNS records.
- Single-page-app routing handled by sending all paths to `index.html` in `firebase.json`.

### Testing: Jest + React Testing Library

- **58 tests across every component and the entry point**, with **100% coverage** of statements, branches, functions and lines. `npm run test` prints the coverage report.
- `App` is tested **through the page, the way a user would use it**: the Wikimedia, Wikipedia and backend responses are faked, so the tests cover the whole flow without touching the network:
  - building the daily list (batching, category filter, image fallback)
  - the 404 and 500 retries, and error alerts on network failure
  - voting (first vote vs. later votes), skipping and the end-of-list message
- Component tests cover rendering and interaction: loading states, share buttons on mobile vs. desktop, button disabling, and the requests sent for each vote type.
- Tests sit next to their components (`Header.tsx` next to `Header.test.tsx`), with shared test data in `src/test/fixtures/`.

> **A note on authorship:** the application code is my own work. The Jest test suite was written by Claude (Anthropic's AI coding assistant), working from my code. I've read through it and understand how it's put together, and I maintain and extend it as the app changes. While writing the tests, Claude also found a real bug: a request that failed with no response left the app stuck on "Loading...". That's now fixed and covered by tests.

---

## Tech stack

**Front end:** React 18 · TypeScript · Vite · SWC · Sass · Axios · SweetAlert2
**Back end:** AWS Lambda · API Gateway · Serverless Framework · Node.js 20 · MongoDB · Mongoose
**Testing:** Jest · React Testing Library · user-event · jsdom
**Hosting:** Firebase Hosting · custom domain

---

## Running it locally

### Client

From the `client` folder:

```bash
npm install
```

```bash
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server (talks to the `dev` API) |
| `npm run build` | Type-checks and builds for production |
| `npm run test` | Runs the Jest suite and prints the coverage report |
| `npm run test:watch` | Re-runs tests whenever a file is saved |
| `npm run lint` | Runs ESLint |

### REST API

From the `rest-api` folder, create a `variables.env` file with your own MongoDB connection string:

```
DB=<your-connection-string>
```

Then deploy with the [Serverless Framework](https://www.serverless.com/) (requires AWS credentials):

```bash
sls deploy
```

```bash
sls deploy --stage dev
```

### Deploying the client

From the `client` folder (requires the Firebase CLI):

```bash
npm run build
```

```bash
firebase deploy
```

---

## What I'd change next

I wrote this from scratch while learning, and looking at it again I can see plenty I'd do differently. This is my roadmap, in order of priority:

### 1. Count votes on the server
Right now the client sends the **new totals** (for example `underrated: 5`), and the API saves whatever it receives. If two people vote at the same moment, one vote can be lost, and anyone could send made-up numbers. The fix is for the client to send only the vote direction and for the server to add to the count itself with MongoDB's `$inc` (with `upsert`). That also removes the need for separate create and update calls.

### 2. Split `App.tsx` into a data layer and a custom hook
`App` currently holds the whole Wikipedia process in one large `useEffect`, using nested promises and hand-kept counters. I'd move it into a `services/wikipedia.ts` module and a `useArticles()` hook, written with `async`/`await`, splitting the titles into batches and waiting for them with `Promise.all`. That makes the selection and filtering logic plain functions that can be unit-tested, and cuts `App` down to putting the components together.

### 3. Less state, one shared type
- Define a single `Article` type instead of repeating the same shape inline.
- Replace six separate article `useState`s with one `currentArticle` object.
- Calculate the vote percentages and totals while rendering instead of storing them in state.

### 4. Pass components callbacks instead of setters
`UserInput` currently takes 13 props, including state setters and API helpers. It should just take `onVote`, `onSkip` and `disabled`, and leave API calls to the hook. This is a cleaner split between components that show things and components that handle data.

### 5. Build the film list once a day on the server
Every visit currently makes 50+ Wikipedia requests to build a list that only changes once a day. A scheduled Lambda could build it once, save it to MongoDB, and serve it from one endpoint. Pages would load almost instantly, Wikipedia would get far fewer requests, and most of the error handling could leave the client.

### 6. Smaller clean-ups
- Replace the JavaScript `setInterval` "shine" effect with a CSS `@keyframes` animation.
- Check for `navigator.share` directly instead of guessing the device from the user-agent string.
- Give the 500-retry a maximum number of attempts and a short delay between them.
- Move the API URLs into Vite environment variables (`import.meta.env`) instead of checking the hostname.
- Clean Wikipedia's HTML with DOMPurify before rendering it, and add `rel="noopener noreferrer"` to links that open in a new tab.
- Import SweetAlert2 the standard way, list it as a runtime dependency, and upgrade Axios.
- Remove leftover `console.log` calls and outdated comments.
- Add tests to the REST API, and tidy up the repeated CORS and response code in its handlers.

---

## Credits and references

- [Wikimedia Pageviews API](https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews)
- [MediaWiki API Sandbox](https://en.wikipedia.org/wiki/Special:ApiSandbox)
- [MERN stack tutorial (MongoDB)](https://www.mongodb.com/languages/mern-stack-tutorial)
- [Building a serverless REST API with Node.js and MongoDB](https://hackernoon.com/building-a-serverless-rest-api-with-node-js-and-mongodb-2e0ed0638f47)
- [Deploying a Vite app to Firebase](https://medium.com/@rajdeepmallick999/vite-firebase-how-to-deploy-react-app-5e5090730147)

Design and build © Oliver Harris, 2022 / 2023 / 2026
