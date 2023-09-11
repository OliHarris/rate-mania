# rate-mania

:heavy_check_mark: Code in pure React / TypeScript

Foray into tapping more Wikipedia API's; this time integration with serverless AWS endpoints / MongoDB.

I set out to see what I could achieve with a little time off, between 28/12/21 and 04/01/22; with aim to design, code, implement, test and deploy a personal full-stack application in one week.

This was the culmination of studying Wikipedia API output:

https://wikitech.wikimedia.org/wiki/Analytics/AQS/Pageviews

https://en.wikipedia.org/wiki/Special:ApiSandbox

Along with studying these two tutorials:

https://www.mongodb.com/languages/mern-stack-tutorial

https://hackernoon.com/building-a-serverless-rest-api-with-node-js-and-mongodb-2e0ed0638f47

## Available Scripts 1

In the 'client' project directory you can run:

### `npm install`

Will perform a usual installation of any dependencies.

### `npm run dev`

Will perform a usual launch of the dev environment.

## Available Scripts 2

In the 'rest-api' project directory you can run:

### `sls deploy`

Presuming you have Serverless framework installed, this will update the AWS Lambda functions.

## NOTE 1:

in the 'rest-api' folder, you will need to provide your own MongoDB string - in a variables.env file.

Format 'DB=<your-connection-string>'

## NOTE 2:

This work is migrated over to Firebase after purchasing a URL from Google Domains, and navigating my way through the Firebase Hosting CLI. This was a useful guide:

https://medium.com/@rajdeepmallick999/vite-firebase-how-to-deploy-react-app-5e5090730147

I then updated the custom domain details from Firebase, back to Google Domains DNS custom records; hence linking my purchased URL with the hosted site.

To deploy I manually run from the 'client' project directory:

### `firebase deploy`
