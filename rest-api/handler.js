"use strict";

// top of handler.js
require("dotenv").config({ path: "./variables.env" });
const connectToDatabase = require("./db");
const Article = require("./models/Article");

// The only two vote types a request is allowed to cast
const VOTE_TYPES = ["underrated", "overrated"];

// Parse the request body, returning null instead of throwing on bad JSON
const parseBody = (event) => {
  try {
    return JSON.parse(event.body);
  } catch (err) {
    return null;
  }
};

// IDs are Wikipedia page IDs, so they must be positive whole numbers
const isValidId = (id) => /^[1-9]\d*$/.test(String(id));

// Reply with a 400 so bad input never reaches the database
const badRequest = (event, callback, message) =>
  callback(null, {
    statusCode: 400,
    headers: {
      // ternary for CORS support to work
      "Access-Control-Allow-Origin":
        event.requestContext.stage === "dev"
          ? "*"
          : "https://rate-mania.web.app",
    },
    body: JSON.stringify({ message }),
  });

module.exports.create = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // Only accept the fields the client needs, and one vote, so a request
  // can't save extra fields or start a film on made-up vote counts
  const body = parseBody(event);
  if (
    !body ||
    !isValidId(body.article_id) ||
    typeof body.article_title !== "string" ||
    body.article_title.length === 0 ||
    body.article_title.length > 255 || // Wikipedia's maximum title length
    !VOTE_TYPES.includes(body.vote)
  ) {
    return badRequest(event, callback, "Invalid article.");
  }

  connectToDatabase().then(() => {
    Article.create({
      article_id: Number(body.article_id),
      article_title: body.article_title,
      underrated: body.vote === "underrated" ? 1 : 0,
      overrated: body.vote === "overrated" ? 1 : 0,
    })
      .then((article) =>
        callback(null, {
          statusCode: 200,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://rate-mania.web.app",
          },
          body: JSON.stringify(article),
        })
      )
      .catch((err) => {
        // Log the details for CloudWatch, but don't send them to the client
        console.error(err);
        callback(null, {
          statusCode: 500,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://rate-mania.web.app",
          },
          body: JSON.stringify({
            message: "Could not create the article.",
          }),
        });
      });
  });
};

module.exports.getOne = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  if (!isValidId(event.pathParameters.id)) {
    return badRequest(event, callback, "Invalid article id.");
  }

  connectToDatabase().then(() => {
    Article.findOne({ article_id: event.pathParameters.id })
      .then((article) =>
        callback(null, {
          statusCode: 200,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://rate-mania.web.app",
          },
          body: JSON.stringify(article),
        })
      )
      .catch((err) => {
        // Log the details for CloudWatch, but don't send them to the client
        console.error(err);
        callback(null, {
          statusCode: 500,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://rate-mania.web.app",
          },
          body: JSON.stringify({
            message: "Could not fetch the article.",
          }),
        });
      });
  });
};

module.exports.update = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  // A request can only cast one vote: the server adds 1 to the count itself
  // with $inc, so clients can't set totals or change the title
  const body = parseBody(event);
  if (!isValidId(event.pathParameters.id)) {
    return badRequest(event, callback, "Invalid article id.");
  }
  if (!body || !VOTE_TYPES.includes(body.vote)) {
    return badRequest(event, callback, "Invalid vote.");
  }

  connectToDatabase().then(() => {
    Article.findOneAndUpdate(
      { article_id: event.pathParameters.id },
      { $inc: { [body.vote]: 1 } },
      {
        new: true,
      }
    )
      .then((article) =>
        callback(null, {
          statusCode: 200,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://rate-mania.web.app",
          },
          body: JSON.stringify(article),
        })
      )
      .catch((err) => {
        // Log the details for CloudWatch, but don't send them to the client
        console.error(err);
        callback(null, {
          statusCode: 500,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://rate-mania.web.app",
          },
          body: JSON.stringify({
            message: "Could not update the article.",
          }),
        });
      });
  });
};
