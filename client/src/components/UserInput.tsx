import axios from "axios";
import Swal from "sweetalert2/src/sweetalert2.js";

interface UserInputInterface {
  setLoadingState: (value: boolean) => void;
  dbEntryExists: boolean;
  articleId: number;
  articleTitle: string;
  devSwitch: () => string;
  setLastVotedArticleTitle: (value: string) => void;
  setLastVotedArticleType: (value: string) => void;
  getRandomArticle: (
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
  ) => void;
  currentArticles: {
    extract: string;
    fullurl: string;
    image: string;
    keyword: string;
    pageid: number;
    title: string;
  }[];
  articleKeyword: string;
  userUnderrated: number;
  userOverrated: number;
  loadingState: boolean;
}

const UserInput = ({
  setLoadingState,
  dbEntryExists,
  articleId,
  articleTitle,
  devSwitch,
  setLastVotedArticleTitle,
  setLastVotedArticleType,
  getRandomArticle,
  currentArticles,
  articleKeyword,
  userUnderrated,
  userOverrated,
  loadingState,
}: UserInputInterface) => {
  // user vote logic
  const handleVoteButton = (type: string) => {
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
        .then(() => {
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
        .then(() => {
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
  const handleSkipButton = () => {
    setLoadingState(true);
    getRandomArticle(currentArticles, "skipped", articleKeyword);
  };

  return (
    <section id="user-input" className="row cf">
      <div className="small-6 medium-4 large-4 xlarge-5 columns">
        <button
          className="btn btn-yellow"
          onClick={() => handleVoteButton("underrated")}
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
          onClick={() => handleVoteButton("overrated")}
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
          onClick={() => handleSkipButton()}
          disabled={loadingState || currentArticles.length === 0}
          aria-label="Skip article"
        >
          <span>Skip</span>
          <span>article</span>
        </button>
      </div>
    </section>
  );
};
export default UserInput;
