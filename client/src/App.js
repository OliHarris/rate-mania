import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import "./App.scss";
import Swal from "sweetalert2/src/sweetalert2.js";

import mobileShareImage from "./images/mobile.svg";
import twitterShareImage from "./images/twitter.svg";
import copyImage from "./images/copy.svg";

const App = (props) => {
  const [firstLoad, setFirstLoad] = useState(true);
  const [currentArticles, setCurrentArticles] = useState([]);
  const [currentFilters, setCurrentFilters] = useState([]);
  const [voteCounter, setVoteCounter] = useState(0);
  const [lastVotedArticleTitle, setLastVotedArticleTitle] = useState("");
  const [lastVotedArticleType, setLastVotedArticleType] = useState("");

  const [articleId, setArticleId] = useState(0);
  const [articleTitle, setArticleTitle] = useState("");
  const [articleExtract, setArticleExtract] = useState("");
  const [articleFullUrl, setArticleFullUrl] = useState("");
  const [articleKeyword, setArticleKeyword] = useState("");
  const [articleImage, setArticleImage] = useState("");

  const [userUnderrated, setUserUnderrated] = useState(0);
  const [userOverrated, setUserOverrated] = useState(0);
  const [userTotalVotes, setUserTotalVotes] = useState(0);
  const [userUnderratedPercentage, setUserUnderratedPercentage] = useState(0);
  const [userOverratedPercentage, setUserOverratedPercentage] = useState(0);

  const [dbEntryExists, setDbEntryExists] = useState(false);
  const [loadingState, setLoadingState] = useState(true);

  const devSwitch = () => {
    return window.location.hostname === "localhost"
      ? "https://ts1dtr9i4e.execute-api.eu-west-1.amazonaws.com/dev"
      : "https://vmi0yofalk.execute-api.eu-west-1.amazonaws.com/prod";
  };

  const errorAlert = () => {
    Swal.fire({
      icon: "error",
      title: "Something went wrong!",
      text: "Please click OK to refresh the page, and start again",
    }).then((result) => {
      // Reload the Page
      window.location.reload();
    });
  };

  const checkMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
      ? true
      : false;
  };

  const getRandomArticle = useCallback(
    (articlesArray, status, keyword) => {
      // reset article values
      setArticleId(0);
      setArticleTitle("");
      setArticleExtract("");
      setArticleFullUrl("");
      setArticleKeyword("");
      setArticleImage("");

      // only after user input (need to remove article from stack)
      if (keyword) {
        articlesArray = articlesArray.filter((obj) => {
          return obj.keyword !== keyword;
        });
      }
      const randomArticle =
        articlesArray[(articlesArray.length * Math.random()) | 0];

      // make sure not end of stack!
      if (!(randomArticle === undefined)) {
        setArticleId(randomArticle.pageid);
        setArticleTitle(randomArticle.title);
        setArticleExtract(randomArticle.extract);
        setArticleFullUrl(randomArticle.fullurl);
        setArticleKeyword(randomArticle.keyword);
        setArticleImage(randomArticle.image);

        const getAllUserData = () => {
          // get MongoDB data
          // will need to GET from MongoDB (getOne)
          axios
            .get(`${devSwitch()}/articles/${randomArticle.pageid}`)
            .then((response) => {
              const dbArticle = response.data;
              if (dbArticle) {
                // if article in DB
                setDbEntryExists(true);
                setUserTotalVotes(dbArticle.underrated + dbArticle.overrated);
                setUserUnderrated(dbArticle.underrated);
                setUserUnderratedPercentage(
                  (dbArticle.underrated /
                    (dbArticle.underrated + dbArticle.overrated)) *
                    100
                );
                setUserOverrated(dbArticle.overrated);
                setUserOverratedPercentage(
                  (dbArticle.overrated /
                    (dbArticle.underrated + dbArticle.overrated)) *
                    100
                );
              } else {
                // if no article in DB
                setDbEntryExists(false);
                setUserTotalVotes(0);
                setUserUnderrated(0);
                setUserUnderratedPercentage(0);
                setUserOverrated(0);
                setUserOverratedPercentage(0);
              }

              if (status === "voted") {
                setVoteCounter(voteCounter + 1);
                setCurrentArticles(articlesArray);
              } else if (status === "skipped") {
                setCurrentArticles(articlesArray);
              }
              setLoadingState(false);
            })
            .catch((error) => {
              console.log(error);
              // AWS special error handling - try again if 500
              if (error.response.status === 500) {
                getAllUserData();
              } else {
                errorAlert();
              }
            });
        };
        getAllUserData();
      } else {
        Swal.fire({
          icon: "success",
          title: "Congratulations! You made it to the end",
          text: "Please click OK to start again",
        }).then((result) => {
          // Reload the Page
          window.location.reload();
        });
      }
    },
    [voteCounter]
  );

  useEffect(() => {
    // switch needed to stop double-load / persisent refresh of getRandomArticle()
    if (firstLoad === true) {
      setFirstLoad(false);

      // initalise shine effect
      document
        .querySelectorAll("#user-input .btn-yellow")
        .forEach((item, index, array) => {
          setInterval(() => {
            item.classList.toggle("shine");
          }, 1000);
        });

      const getAllWikiData = (date) => {
        const options = {
          weekday: undefined,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        };
        const englishDate = date.toLocaleDateString("en-GB", options);
        const day = englishDate.split("/")[0];
        const month = englishDate.split("/")[1];
        const year = englishDate.split("/")[2];

        // get Wikipedia top 1000 articles for yesterday
        axios
          .get(
            `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/en.wikipedia/all-access/${year}/${month}/${day}`
          )
          .then((response) => {
            const articlesArray = [];
            const filtersArray = [
              "English-language television shows",
              "English-language films",
            ];
            const filtersString = filtersArray
              .map((filter) => "Category:" + filter)
              .join("|");

            // test popular categories output?
            const testPopularCategories = false;
            const urlString = testPopularCategories
              ? "&cllimit=500"
              : `&clcategories=${encodeURIComponent(filtersString)}`;
            let combinedCategoriesArray = [];

            let titleArray = [];
            // max 50, although 'extracts' start to cut out after 20
            const apiThreshold = 20;

            // error handle - response needs be 1000 articles
            const responseArray = response.data.items[0].articles;
            if (responseArray.length !== 1000) {
              const totalEmptyEntries = 1000 - responseArray.length;
              for (let i = 0; i < totalEmptyEntries; i++) {
                responseArray.push({
                  article: undefined,
                });
              }
            }

            const filterWikiArticles = (value, callback1) => {
              const getWikiData = (titlesString) => {
                // get Wikipedia data based on titlesString
                axios
                  .get(
                    `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1` +
                      `&prop=extracts|info|pageprops|pageimages|categories` +
                      `${urlString}` +
                      `&exintro=1&inprop=url&ppprop=page_image&piprop=original&titles=${encodeURIComponent(
                        titlesString
                      )}&origin=*`
                  )
                  .then((response) => {
                    const populateArticlesArray = (value, callback2) => {
                      if (value.categories) {
                        if (testPopularCategories) {
                          combinedCategoriesArray = [
                            ...combinedCategoriesArray,
                            ...value.categories,
                          ];
                        }

                        const pushArticleData = (value, image) => {
                          articlesArray.push({
                            pageid: value.pageid,
                            title: value.title,
                            extract: value.extract,
                            fullurl: value.fullurl,
                            keyword: value.fullurl.split("/").pop(),
                            image: image,
                          });
                        };

                        // sort image
                        let dataImage;
                        if (value.original) {
                          dataImage = value.original.source;
                          pushArticleData(value, dataImage);
                          // execute callback2 when complete
                          if (callback2) callback2();
                        } else if (value.pageprops) {
                          // get Wikipedia image based on pageData.pageprops.page_image
                          axios
                            .get(
                              `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&titles=File:${value.pageprops.page_image}&origin=*`
                            )
                            .then((response) => {
                              const imageData = response.data.query.pages[0];
                              if (imageData.imageinfo) {
                                dataImage = imageData.imageinfo[0].url;
                                pushArticleData(value, dataImage);
                                // execute callback2 when complete
                                if (callback2) callback2();
                              } else {
                                // execute callback2 when complete
                                if (callback2) callback2();
                              }
                            })
                            .catch((error) => {
                              console.log(error);
                              errorAlert();
                            });
                        } else {
                          // execute callback2 when complete
                          if (callback2) callback2();
                        }
                      } else {
                        // execute callback2 when complete
                        if (callback2) callback2();
                      }
                    };

                    // filter pages logic
                    let itemsProcessed = 0;
                    response.data.query.pages.forEach((item, index, array) => {
                      // fill articlesArray with data
                      populateArticlesArray(item, () => {
                        itemsProcessed++;
                        // callback
                        if (itemsProcessed === array.length) {
                          // execute callback1 when complete
                          if (callback1) callback1();
                        }
                      });
                    });
                  })
                  .catch((error) => {
                    console.log(error);
                    errorAlert();
                  });
              };

              // reset array every selection of titles based on apiThreshold
              if (titleArray.length === apiThreshold) {
                titleArray = [];
              }
              titleArray.push(value.article);
              // when titleArray ready then getWikiData
              if (titleArray.length === apiThreshold) {
                getWikiData(titleArray.join("|"));
              }
            };

            // filter articles logic
            let itemsProcessed = 0;
            responseArray
              // test - return only top 100 (not 1000)
              // .slice(0, 100)
              .forEach((item, index, array) => {
                // filter received top Wikipedia articles
                filterWikiArticles(item, () => {
                  itemsProcessed++;
                  // callback
                  const totalItemsProcessed = itemsProcessed * apiThreshold;
                  if (totalItemsProcessed === array.length) {
                    // if review popular categories output...
                    if (testPopularCategories) {
                      let categoryMap = combinedCategoriesArray.reduce(
                        (category, val) => {
                          return category.set(
                            val.title,
                            1 + (category.get(val.title) || 0)
                          );
                        },
                        new Map()
                      );
                      const array = Array.from(
                        categoryMap,
                        ([name, value]) => ({
                          name,
                          value,
                        })
                      );
                      array.sort(function (a, b) {
                        return b.value - a.value;
                      });
                      console.log(array);
                    }

                    getRandomArticle(articlesArray, null, null);
                    setCurrentArticles(articlesArray);
                  }
                });
              });
          })
          .catch((error) => {
            console.log(error);
            // Wikipedia special error handling - try again with another day rewound if 404
            if (error.response.status === 404) {
              const dateInstance = new Date();
              // extract date from two days ago
              dateInstance.setDate(dateInstance.getDate() - 2);
              getAllWikiData(dateInstance);
            } else {
              errorAlert();
            }
          });
      };
      const dateInstance = new Date();
      // extract date from one day ago
      dateInstance.setDate(dateInstance.getDate() - 1);
      getAllWikiData(dateInstance);
    }
  }, [getRandomArticle, firstLoad]);

  // user share logic
  const handleShareButton = (event, type) => {
    const shareUrl = "rate-mania.com";
    const getShareText = () => {
      let shareText = `I voted "${lastVotedArticleTitle}" is ${lastVotedArticleType}!\n`;
      if (lastVotedArticleType === "underrated") {
        shareText = `${shareText.concat("👍")}\n`;
      } else if (lastVotedArticleType === "overrated") {
        shareText = `${shareText.concat("👎")}\n`;
      }
      return shareText;
    };

    if (type === "mobile") {
      const shareData = {
        title: shareUrl,
        text: getShareText(),
        url: `https://${shareUrl}`,
      };
      navigator.share(shareData);
    } else if (type === "twitter") {
      const shareText = encodeURIComponent(getShareText());
      const twitterLink = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
      window.open(twitterLink, "_blank");
    } else if (type === "copy") {
      navigator.clipboard.writeText(`${getShareText()}\n${shareUrl}`);
      Swal.fire({
        icon: "success",
        title: "Copied to clipboard",
        text: getShareText(),
      });
    }
  };

  // user vote logic
  const handleVoteButton = (event, type) => {
    setLoadingState(true);

    if (!dbEntryExists) {
      // add a new entry to the database
      let newRecord;
      if (type === "underrated") {
        newRecord = {
          article_id: articleId,
          article_title: articleTitle,
          underrated: 1,
          overrated: 0,
        };
      } else if (type === "overrated") {
        newRecord = {
          article_id: articleId,
          article_title: articleTitle,
          underrated: 0,
          overrated: 1,
        };
      }
      // will need to POST to MongoDB (create)
      axios
        .post(`${devSwitch()}/articles`, newRecord)
        .then((response) => {
          setLastVotedArticleTitle(articleTitle);
          setLastVotedArticleType(type);
          getRandomArticle(currentArticles, "voted", articleKeyword);
        })
        .catch((error) => {
          console.log(error);
          // AWS special errorAlert with no page refresh
          Swal.fire({
            icon: "error",
            title: "Something went wrong!",
            text: "Please click OK to try again",
          });
        });
    } else {
      // update entry in the database
      let updateRecord;
      if (type === "underrated") {
        updateRecord = {
          article_id: articleId,
          article_title: articleTitle,
          underrated: userUnderrated + 1,
          overrated: userOverrated,
        };
      } else if (type === "overrated") {
        updateRecord = {
          article_id: articleId,
          article_title: articleTitle,
          underrated: userUnderrated,
          overrated: userOverrated + 1,
        };
      }
      // will need to PUT to MongoDB (update)
      axios
        .put(`${devSwitch()}/articles/${articleId}`, updateRecord)
        .then((response) => {
          setLastVotedArticleTitle(articleTitle);
          setLastVotedArticleType(type);
          getRandomArticle(currentArticles, "voted", articleKeyword);
        })
        .catch((error) => {
          console.log(error);
          // AWS special errorAlert with no page refresh
          Swal.fire({
            icon: "error",
            title: "Something went wrong!",
            text: "Please click OK to try again",
          });
        });
    }
  };

  // user skip logic
  const handleSkipButton = (event) => {
    setLoadingState(true);
    getRandomArticle(currentArticles, "skipped", articleKeyword);
  };

  return (
    <div className="App">
      <div className="row">
        <div className="small-12 columns">
          <header>
            <h1>
              Welcome to<span>Rate-Mania.com</span>
            </h1>
            <hr />
            {lastVotedArticleTitle && lastVotedArticleType && (
              <>
                <section id="share-buttons">
                  <div className="h5">
                    Share that you think "{lastVotedArticleTitle}" is{" "}
                    {lastVotedArticleType}?
                  </div>
                  <div className="show-buttons">
                    {checkMobileDevice() && (
                      <button
                        id="mobile-share"
                        onClick={(e) => handleShareButton(e, "mobile")}
                        title="Share on mobile"
                      >
                        <figure>
                          <img
                            className="svg"
                            src={mobileShareImage}
                            alt="Mobile share icon"
                          />
                        </figure>
                      </button>
                    )}
                    <button
                      id="twitter-share"
                      onClick={(e) => handleShareButton(e, "twitter")}
                      title="Share to Twitter"
                    >
                      <figure>
                        <img
                          className="svg"
                          src={twitterShareImage}
                          alt="Twitter share icon"
                        />
                      </figure>
                    </button>
                    <button
                      id="clipboard-copy"
                      onClick={(e) => handleShareButton(e, "copy")}
                      title="Copy to clipboard"
                    >
                      <figure>
                        <img
                          className="svg"
                          src={copyImage}
                          alt="Clipboard copy icon"
                        />
                      </figure>
                    </button>
                  </div>
                </section>
                <hr />
              </>
            )}
            <div className="h5">
              You have voted on {voteCounter} out of today's remaining{" "}
              {currentArticles.length} popular films and television shows.
            </div>
            <div className="h5">Article stack updated daily!</div>
            <hr />
          </header>
          <section id="article-title">
            {!loadingState && <h2>{articleTitle}</h2>}
            {loadingState && <h2>Loading...</h2>}
          </section>
          <hr />
          <section id="user-stats">
            {!loadingState && (
              <div className="row">
                <div className="small-12 large-4 columns">
                  <span className="h3">
                    {userUnderratedPercentage.toFixed(1)}% Underrated
                  </span>
                </div>
                <div className="small-12 large-4 columns">
                  <span className="h3">{userTotalVotes} votes</span>
                </div>
                <div className="small-12 large-4 columns">
                  <span className="h3">
                    {userOverratedPercentage.toFixed(1)}% Overrated
                  </span>
                </div>
              </div>
            )}
            {loadingState && (
              <div className="loader-frame">
                <div className="loader-center-horizontal">
                  <div className="loader-center-vertical">
                    <div className="loader"></div>
                  </div>
                </div>
              </div>
            )}
          </section>
          <hr />
          <section id="user-input" className="row cf">
            <div className="small-6 medium-4 large-4 xlarge-5 columns">
              <button
                className="btn btn-yellow"
                onClick={(e) => handleVoteButton(e, "underrated")}
                disabled={loadingState || currentArticles.length === 0}
                aria-label="Vote Underrated"
              >
                <span>Vote</span>
                <span>Underrated</span>
              </button>
            </div>
            <div className="small-6 medium-4 large-4 xlarge-5 columns">
              <button
                className="btn btn-yellow"
                onClick={(e) => handleVoteButton(e, "overrated")}
                disabled={loadingState || currentArticles.length === 0}
                aria-label="Vote Overrated"
              >
                <span>Vote</span>
                <span>Overrated</span>
              </button>
            </div>
            <div className="small-12 medium-4 large-4 xlarge-2 columns">
              <button
                className="btn"
                onClick={(e) => handleSkipButton(e)}
                disabled={loadingState || currentArticles.length === 0}
                aria-label="Skip article"
              >
                <span>Skip</span>
                <span>article</span>
              </button>
            </div>
          </section>
          <hr />
          <section id="wiki-output" className="row">
            <div className="small-12 large-4 columns">
              {articleImage && (
                <figure>
                  <img src={articleImage} alt={articleTitle} />
                </figure>
              )}
              {!articleImage && (
                <div>
                  <span className="h4">No image</span>
                  <hr />
                </div>
              )}
            </div>
            <div className="small-12 large-8 columns">
              <article
                dangerouslySetInnerHTML={{ __html: articleExtract }}
              ></article>
              <hr />
              <a className="h4" href={articleFullUrl} target="blank">
                Read more on Wikipedia
              </a>
            </div>
          </section>
          <hr />
          <section id="credits">
            <p>
              All design and implementation
              <span>&copy; Oliver Harris, 2022</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
