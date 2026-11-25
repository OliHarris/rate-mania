# How Rate-Mania fits together

Notes on how the front end, the REST API, AWS and MongoDB connect. Written in November 2026 from the code as it stood then, so check them against the code if things have moved on.

## The big picture

```
Browser (React app on Firebase Hosting, rate-mania.web.app)
  │
  ├─► Wikimedia / Wikipedia APIs      (builds today's film list, all in the browser)
  │
  └─► AWS API Gateway  (https://vmi0yofalk.execute-api.eu-west-1.amazonaws.com/prod)
        │
        └─► AWS Lambda functions  (create / getOne / update, code from rest-api/handler.js)
              │
              └─► MongoDB Atlas cluster  (stores the vote counts)
```

The front end does all the Wikipedia work itself. The backend's only job is storing and returning the underrated/overrated counts for each film.

## What's in `rest-api/`

| File | What it does |
|---|---|
| `serverless.yml` | The infrastructure definition. The **Serverless Framework** reads it and builds everything on AWS. |
| `handler.js` | The three Lambda functions: `create`, `getOne` and `update`. |
| `db.js` | Opens the MongoDB connection and caches it. |
| `models/Article.js` | The Mongoose schema: `article_id`, `article_title`, `underrated`, `overrated`. |
| `variables.env` | The MongoDB connection string (`DB=mongodb+srv://…`). It's gitignored, so it only exists on your machine. |
| `handler.test.js` | Small tests using Node's built-in test runner (`npm test`), with the database faked. |
| `.serverless/` | Build output from the last deploy: the zip and the CloudFormation templates. It's gitignored. |

## How it gets onto AWS

Nothing on AWS was set up by hand. The Serverless Framework does it.

1. Run `sls deploy` in `rest-api/`. It uses the AWS credentials on your machine (usually `~/.aws/credentials`).
2. Serverless zips the folder (code plus `node_modules`) and uploads it to an S3 bucket it created for itself.
3. It turns `serverless.yml` into a **CloudFormation** template (AWS's own infrastructure-as-code format), which creates:
   - **3 Lambda functions**: Node 20, 128 MB, 10-second timeout, in `eu-west-1` (Ireland)
   - **an API Gateway REST API** with `POST /articles`, `GET /articles/{id}` and `PUT /articles/{id}`, plus `OPTIONS` routes for CORS (that's what `cors: true` adds)
   - **an IAM role** that lets the Lambdas run and write logs
   - **CloudWatch log groups**, one per function, where `console.error` output goes
4. AWS gives the API a URL that includes the stage name.

### Stages

`serverless.yml` sets `stage: prod`, so:

- `sls deploy` updates the **prod** stack (`https://vmi0yofalk.execute-api.eu-west-1.amazonaws.com/prod`)
- `sls deploy --stage dev` updates a completely separate **dev** stack (`https://k9i909fnm3.execute-api.eu-west-1.amazonaws.com/dev`)

The client picks between them in `devSwitch()` in `client/src/components/App.tsx`: dev when running on `localhost`, prod everywhere else.

`serverless-offline` is installed, so the API can also run locally with `npx sls offline`.

## How it connects to MongoDB

- The database is a **MongoDB Atlas** cluster (the connection string ends in `.mongodb.net`).
- `handler.js` loads `variables.env` with `dotenv`, so `process.env.DB` holds the connection string.
- `db.js` calls `mongoose.connect(process.env.DB)` and remembers that it's connected (`isConnected`).
- Each handler sets `context.callbackWaitsForEmptyEventLoop = false`. That lets the Lambda reply without closing the database connection. While a Lambda stays "warm", later requests reuse the same connection instead of reconnecting each time.
- Mongoose stores the records in an `articles` collection, named from the `Article` model.

## What happens when someone votes

1. The app picks a film and calls `GET /articles/{pageid}` (in `App.tsx`), where the ID is the Wikipedia page ID. `getOne` returns the record, or `null` if nobody has voted on that film yet.
2. The user clicks Underrated or Overrated (in `UserInput.tsx`):
   - **No record yet:** `POST /articles` with `{ article_id, article_title, vote }`. `create` checks the input and saves the film with a count of 1 for that vote and 0 for the other.
   - **Record exists:** `PUT /articles/{id}` with `{ vote }`. `update` adds 1 with `$inc` and returns the new totals.
3. Every response includes a CORS header: `*` on dev, `https://rate-mania.web.app` on prod. Bad input gets a `400` before the database is touched, and error details go to CloudWatch rather than to the client.

## Known issues

1. **Dev and prod share one database.** There's a single `DB` value in `variables.env`, and both stages deploy with it, so votes cast while testing locally go into the live data. Giving dev its own database, or at least its own database name in the connection string, would fix that.
2. **The connection string is probably inside the deployed code.** `serverless.yml` has no `environment:` section, so the only way the Lambda can read `DB` is that `variables.env` was zipped up with the code. The Serverless Framework doesn't use `.gitignore` when it builds the zip. The string isn't public, but anyone with access to the AWS account can read it. The usual fix is `environment: DB: ${env:DB}` in `serverless.yml` (or AWS SSM Parameter Store), plus an exclude rule so the file stays out of the zip. Check with:

   ```bash
   unzip -l rest-api/.serverless/rest-api.zip | grep variables
   ```

## Deploy checklist

- **API:** `cd rest-api` then `sls deploy` (prod) or `sls deploy --stage dev`.
- **Client:** `cd client`, `npm run build`, then `firebase deploy`.
- Pushing to GitHub doesn't deploy either one.
