# underrated-overrated
Foray into tapping more Wikipedia API's; this time integration with serverless AWS endpoints / MongoDB.

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

### `npm start`

Will perform a usual launch of the dev environment.

### `npm build`

Will perform a usual package of the build folder, ready for deployment.


## Available Scripts 2

In the 'rest-api' project directory you can run:

### `sls deploy`

Presuming you have Serverless framework installed, this will update the AWS Lambda functions.

## NOTE:

in the 'rest-api' folder, you will need to provide your own MongoDB string - in a variables.env file.

Format 'DB=<your-connection-string>'