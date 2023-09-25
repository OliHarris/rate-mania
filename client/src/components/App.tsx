import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Swal from "sweetalert2/src/sweetalert2.js";

import Header from "./Header";
import ArticleTitle from "./ArticleTitle";
import UserStats from "./UserStats";
import UserInput from "./UserInput";
import WikiOutput from "./WikiOutput";

const App = () => {
  const [firstLoad, setFirstLoad] = useState<boolean>(true);
  const [currentArticles, setCurrentArticles] = useState<
    {
      extract: string;
      fullurl: string;
      image: string;
      keyword: string;
      pageid: number;
      title: string;
    }[]
  >([]);
  const [voteCounter, setVoteCounter] = useState<number>(0);
  const [lastVotedArticleTitle, setLastVotedArticleTitle] =
    useState<string>("");
  const [lastVotedArticleType, setLastVotedArticleType] = useState<string>("");

  const [articleId, setArticleId] = useState<number>(0);
  const [articleTitle, setArticleTitle] = useState<string>("");
  const [articleExtract, setArticleExtract] = useState<string>("");
  const [articleFullUrl, setArticleFullUrl] = useState<string>("");
  const [articleKeyword, setArticleKeyword] = useState<string>("");
  const [articleImage, setArticleImage] = useState<string>("");

  const [userUnderrated, setUserUnderrated] = useState<number>(0);
  const [userOverrated, setUserOverrated] = useState<number>(0);
  const [userTotalVotes, setUserTotalVotes] = useState<number>(0);
  const [userUnderratedPercentage, setUserUnderratedPercentage] =
    useState<number>(0);
  const [userOverratedPercentage, setUserOverratedPercentage] =
    useState<number>(0);

  const [dbEntryExists, setDbEntryExists] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<boolean>(true);

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
    }).then(() => {
      // Reload the Page
      window.location.reload();
    });
  };

  const getRandomArticle = useCallback(
    (
      articlesArray: {
        extract: string;
        fullurl: string;
        image: string;
        keyword: string;
        pageid: number;
        title: string;
      }[],
      status: string,
      keyword: string
    ) => {
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
        }).then(() => {
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
      document.querySelectorAll("#user-input .btn-yellow").forEach((item) => {
        setInterval(() => {
          item.classList.toggle("shine");
        }, 1000);
      });

      const getAllWikiData = (date: Date) => {
        const options: Intl.DateTimeFormatOptions = {
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
            const articlesArray: {
              extract: string;
              fullurl: string;
              image: string;
              keyword: string;
              pageid: number;
              title: string;
            }[] = [];
            const filtersArray = [
              "English-language television shows",
              "Television shows adapted into video games",
              "BBC Television shows",
              "Black-and-white British television shows",
              "British science fiction television shows",
              "Television shows adapted into comics",
              "Television shows adapted into films",
              "Television shows adapted into novels",
              "Television shows based on non-fiction books",
              "American novels adapted into television shows",
              "Television shows featuring audio description",
              "English-language films",
              "2020s English-language films",
              "2010s English-language films",
              "2000s English-language films",
              "1990s English-language films",
              "1980s English-language films",
              "1970s English-language films",
              "1960s English-language films",
              "1950s English-language films",
              "1940s English-language films",
              "1930s English-language films",
              "1920s English-language films",
            ];
            const filtersString = filtersArray
              .map((filter) => "Category:" + filter)
              .join("|");

            // test popular categories output?
            const testPopularCategories = false;
            const urlString = testPopularCategories
              ? "&cllimit=500"
              : `&clcategories=${encodeURIComponent(filtersString)}`;
            let combinedCategoriesArray: { title: string }[] = [];

            let titleArray: string[] = [];
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

            const filterWikiArticles = (
              value: { article: string; rank: number; views: number },
              callback1: () => void
            ) => {
              const getWikiData = (titlesString: string) => {
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
                    const populateArticlesArray = (
                      value: {
                        categories: { title: string }[];
                        original: { source: string };
                        pageprops: { page_image: string };
                        extract: string;
                        fullurl: string;
                        image: string;
                        keyword: string;
                        pageid: number;
                        title: string;
                      },
                      callback2: () => void
                    ) => {
                      if (value.categories) {
                        if (testPopularCategories) {
                          combinedCategoriesArray = [
                            ...combinedCategoriesArray,
                            ...value.categories,
                          ];
                        }

                        const pushArticleData = (
                          value: {
                            extract: string;
                            fullurl: string;
                            image: string;
                            keyword: string;
                            pageid: number;
                            title: string;
                          },
                          image: string
                        ) => {
                          articlesArray.push({
                            pageid: value.pageid,
                            title: value.title,
                            extract: value.extract,
                            fullurl: value.fullurl,
                            keyword: value.fullurl.split("/").pop()!,
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
                    response.data.query.pages.forEach(
                      (
                        item: {
                          categories: { title: string }[];
                          original: { source: string };
                          pageprops: { page_image: string };
                          extract: string;
                          fullurl: string;
                          image: string;
                          keyword: string;
                          pageid: number;
                          title: string;
                        },
                        _index: number,
                        array: string[]
                      ) => {
                        // fill articlesArray with data
                        populateArticlesArray(item, () => {
                          itemsProcessed++;
                          // callback
                          if (itemsProcessed === array.length) {
                            // execute callback1 when complete
                            if (callback1) callback1();
                          }
                        });
                      }
                    );
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
              .forEach(
                (
                  item: { article: string; rank: number; views: number },
                  _index: number,
                  array: string[]
                ) => {
                  // filter received top Wikipedia articles
                  filterWikiArticles(item, () => {
                    itemsProcessed++;
                    // callback
                    const totalItemsProcessed = itemsProcessed * apiThreshold;
                    if (totalItemsProcessed === array.length) {
                      // if review popular categories output...
                      if (testPopularCategories) {
                        const categoryMap = combinedCategoriesArray.reduce(
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
                        array.sort((a, b) => {
                          return b.value - a.value;
                        });
                        console.log(array);
                      }

                      getRandomArticle(articlesArray, null!, null!);
                      setCurrentArticles(articlesArray);
                    }
                  });
                }
              );
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
  }, [firstLoad, getRandomArticle]);

  return (
    <div className="App">
      <div className="row">
        <div className="small-12 columns">
          <Header
            lastVotedArticleTitle={lastVotedArticleTitle}
            lastVotedArticleType={lastVotedArticleType}
            voteCounter={voteCounter}
            currentArticles={currentArticles}
          />
          <ArticleTitle
            loadingState={loadingState}
            articleTitle={articleTitle}
          />
          <hr />
          <UserStats
            loadingState={loadingState}
            userUnderratedPercentage={userUnderratedPercentage}
            userTotalVotes={userTotalVotes}
            userOverratedPercentage={userOverratedPercentage}
          />
          <hr />
          <UserInput
            setLoadingState={setLoadingState}
            dbEntryExists={dbEntryExists}
            articleId={articleId}
            articleTitle={articleTitle}
            devSwitch={devSwitch}
            setLastVotedArticleTitle={setLastVotedArticleTitle}
            setLastVotedArticleType={setLastVotedArticleType}
            getRandomArticle={getRandomArticle}
            currentArticles={currentArticles}
            articleKeyword={articleKeyword}
            userUnderrated={userUnderrated}
            userOverrated={userOverrated}
            loadingState={loadingState}
          />
          <hr />
          <WikiOutput
            articleImage={articleImage}
            articleTitle={articleTitle}
            articleExtract={articleExtract}
            articleFullUrl={articleFullUrl}
          />
          <hr />
          <section id="credits">
            <p>
              All design and implementation
              <span>&copy; Oliver Harris, 2022 / 2023</span>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default App;
