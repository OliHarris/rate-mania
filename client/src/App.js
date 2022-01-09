import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import "./App.scss";
import Swal from "sweetalert2/src/sweetalert2.js";

const App = (props) => {
  const [firstLoad, setFirstLoad] = useState(true);
  const [currentArticles, setCurrentArticles] = useState([]);
  const [currentFilters, setCurrentFilters] = useState([]);
  const [voteCounter, setVoteCounter] = useState(0);

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

  const [dbEntryId, setDbEntryId] = useState("");
  const [loadingState, setLoadingState] = useState(true);

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

  const getRandomArticle = useCallback(
    (articlesArray, status, keyword) => {
      // only after user input (need to remove article from stack)
      if (keyword) {
        articlesArray = articlesArray.filter((obj) => {
          console.log(obj.keyword);
          console.log(decodeURI(keyword));
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
          // will need to GET from MongoDB (getAll)
          axios
            .get(
              `https://ts1dtr9i4e.execute-api.eu-west-1.amazonaws.com/dev/articles`
            )
            .then((response) => {
              const articlesDb = response.data;
              if (articlesDb.length) {
                // reset user stats
                setDbEntryId("");
                setUserTotalVotes(0);
                setUserUnderrated(0);
                setUserUnderratedPercentage(0);
                setUserOverrated(0);
                setUserOverratedPercentage(0);

                const findArticleMatch = (value, callback) => {
                  if (value.article_id === randomArticle.pageid) {
                    setDbEntryId(value._id);
                    setUserTotalVotes(value.underrated + value.overrated);
                    setUserUnderrated(value.underrated);
                    setUserUnderratedPercentage(
                      (value.underrated /
                        (value.underrated + value.overrated)) *
                        100
                    );
                    setUserOverrated(value.overrated);
                    setUserOverratedPercentage(
                      (value.overrated / (value.underrated + value.overrated)) *
                        100
                    );
                    // execute callback when complete
                    if (callback) callback();
                  } else {
                    // execute callback when complete
                    if (callback) callback();
                  }
                };

                // process articles logic
                let itemsProcessed = 0;
                // if database already has values
                articlesDb.forEach((item, index, array) => {
                  // find matching article already in MongoDB
                  findArticleMatch(item, () => {
                    itemsProcessed++;
                    // callback
                    if (itemsProcessed === array.length) {
                      if (status === "voted") {
                        setVoteCounter(voteCounter + 1);
                        setCurrentArticles(articlesArray);
                      } else if (status === "skipped") {
                        setCurrentArticles(articlesArray);
                      }
                      setLoadingState(false);
                    }
                  });
                });
              } else {
                // if fresh database
                if (status === "voted") {
                  setVoteCounter(voteCounter + 1);
                  setCurrentArticles(articlesArray);
                } else if (status === "skipped") {
                  setCurrentArticles(articlesArray);
                }
                setLoadingState(false);
              }
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
          text: "Please click OK to refresh the page, and start again",
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

      const date = new Date();
      // extract date from one day ago
      date.setDate(date.getDate() - 1);
      // rewind one more hour (always data to pull at midnight)
      date.setHours(date.getHours() - 1);
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
            : `&clcategories=${filtersString}`;
          let combinedCategoriesArray = [];

          const filterWikiArticles = (value, callback) => {
            // get Wikipedia data based on value.article
            axios
              .get(
                `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&redirects=1` +
                  `&prop=extracts|info|pageprops|pageimages|categories` +
                  `${urlString}` +
                  `&exintro=1&inprop=url&ppprop=page_image&piprop=original&titles=${value.article}&origin=*`
              )
              .then((response) => {
                const pageData = response.data.query.pages[0];

                if (pageData.categories) {
                  if (testPopularCategories) {
                    combinedCategoriesArray = [
                      ...combinedCategoriesArray,
                      ...pageData.categories,
                    ];
                  }

                  const pushArticleData = (image) => {
                    articlesArray.push({
                      pageid: pageData.pageid,
                      title: pageData.title,
                      extract: pageData.extract,
                      fullurl: pageData.fullurl,
                      keyword: pageData.fullurl.split("/").pop(),
                      image: image,
                    });
                  };

                  // sort image
                  let dataImage;
                  if (pageData.original) {
                    dataImage = pageData.original.source;
                    pushArticleData(dataImage);
                    // execute callback when complete
                    if (callback) callback();
                  } else if (pageData.pageprops) {
                    // get Wikipedia image based on pageData.pageprops.page_image
                    axios
                      .get(
                        `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=imageinfo&iiprop=url&titles=File:${pageData.pageprops.page_image}&origin=*`
                      )
                      .then((response) => {
                        const imageData = response.data.query.pages[0];
                        if (imageData.imageinfo) {
                          dataImage = imageData.imageinfo[0].url;
                          pushArticleData(dataImage);
                          // execute callback when complete
                          if (callback) callback();
                        }
                      })
                      .catch((error) => {
                        console.log(error);
                        errorAlert();
                      });
                  } else {
                    // execute callback when complete
                    if (callback) callback();
                  }
                } else {
                  // execute callback when complete
                  if (callback) callback();
                }
              })
              .catch((error) => {
                console.log(error);
                errorAlert();
              });
          };

          // filter articles logic
          let itemsProcessed = 0;
          response.data.items[0].articles
            // return only top 100 (not 1000)
            // .slice(0, 100)
            .forEach((item, index, array) => {
              // find matching article already in MongoDB
              filterWikiArticles(item, () => {
                itemsProcessed++;
                // callback
                if (itemsProcessed === array.length) {
                  // if review popular categories output...
                  if (testPopularCategories) {
                    let categoryMap = combinedCategoriesArray.reduce((category, val) => {
                      return category.set(val.title, 1 + (category.get(val.title) || 0));
                    }, new Map());
                    const array = Array.from(categoryMap, ([name, value]) => ({
                      name,
                      value,
                    }));
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
          errorAlert();
        });
    }
  }, [getRandomArticle, firstLoad]);

  // user vote logic
  const handleVoteButton = (event, type) => {
    setLoadingState(true);

    if (!dbEntryId) {
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
        .post(
          `https://ts1dtr9i4e.execute-api.eu-west-1.amazonaws.com/dev/articles`,
          newRecord
        )
        .then((response) => {
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
        .put(
          `https://ts1dtr9i4e.execute-api.eu-west-1.amazonaws.com/dev/articles/${dbEntryId}`,
          updateRecord
        )
        .then((response) => {
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
              Welcome to<span>Underrated - Overrated</span>
            </h1>
            <hr />
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
              <span>
                &copy;{" "}
                <a
                  href="http://github.com/oliharris"
                  target="_blank"
                  rel="noreferrer"
                >
                  Oliver Harris
                </a>
                , 2022
              </span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
