"use strict";

// top of handler.js
require("dotenv").config({ path: "./variables.env" });
const connectToDatabase = require("./db");
const Article = require("./models/Article");

module.exports.create = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  connectToDatabase().then(() => {
    Article.create(JSON.parse(event.body))
      .then((article) =>
        callback(null, {
          statusCode: 200,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://oliharris.github.io",
          },
          body: JSON.stringify(article),
        })
      )
      .catch((err) =>
        callback(null, {
          statusCode: err.statusCode || 500,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://oliharris.github.io",
          },
          body: JSON.stringify({
            message: "Could not create the article.",
            error: err,
          }),
        })
      );
  });
};

module.exports.getAll = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  connectToDatabase().then(() => {
    Article.find()
      .then((articles) =>
        callback(null, {
          statusCode: 200,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://oliharris.github.io",
          },
          body: JSON.stringify(articles),
        })
      )
      .catch((err) =>
        callback(null, {
          statusCode: err.statusCode || 500,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://oliharris.github.io",
          },
          body: JSON.stringify({
            message: "Could not fetch the articles.",
            error: err,
          }),
        })
      );
  });
};

module.exports.update = (event, context, callback) => {
  context.callbackWaitsForEmptyEventLoop = false;

  connectToDatabase().then(() => {
    Article.findByIdAndUpdate(event.pathParameters.id, JSON.parse(event.body), {
      new: true,
    })
      .then((article) =>
        callback(null, {
          statusCode: 200,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://oliharris.github.io",
          },
          body: JSON.stringify(article),
        })
      )
      .catch((err) =>
        callback(null, {
          statusCode: err.statusCode || 500,
          headers: {
            // ternary for CORS support to work
            "Access-Control-Allow-Origin":
              event.requestContext.stage === "dev"
                ? "*"
                : "https://oliharris.github.io",
          },
          body: JSON.stringify({
            message: "Could not fetch the articles.",
            error: err,
          }),
        })
      );
  });
};
