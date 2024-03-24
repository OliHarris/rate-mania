import Swal from "sweetalert2/src/sweetalert2.js";

import mobileShareImage from "../assets/images/mobile.svg";
import twitterShareImage from "../assets/images/twitter.svg";
import copyImage from "../assets/images/copy.svg";

interface HeaderInterface {
  lastVotedArticleTitle: string;
  lastVotedArticleType: string;
  voteCounter: number;
  currentArticles: {
    extract: string;
    fullurl: string;
    image: string;
    keyword: string;
    pageid: number;
    title: string;
  }[];
}

const Header = ({
  lastVotedArticleTitle,
  lastVotedArticleType,
  voteCounter,
  currentArticles,
}: HeaderInterface) => {
  const checkMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    )
      ? true
      : false;
  };

  // user share logic
  const handleShareButton = (type: string) => {
    const shareUrl = "https://rate-mania.web.app";
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
        title: "Check out Rate-Mania",
        text: getShareText(),
        url: shareUrl,
      };
      navigator.share(shareData);
    } else if (type === "twitter") {
      const shareText = encodeURIComponent(getShareText());
      const twitterLink = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
      window.open(twitterLink, "_blank");
    } else if (type === "copy") {
      navigator.clipboard.writeText(`${getShareText()}\n${shareUrl}`);
      Swal.fire({
        title: "Copied to clipboard",
        text: getShareText(),
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
      });
    }
  };

  return (
    <header>
      <h1>
        Welcome to<span>Rate-Mania</span>
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
                  onClick={() => handleShareButton("mobile")}
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
                onClick={() => handleShareButton("twitter")}
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
                onClick={() => handleShareButton("copy")}
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
  );
};
export default Header;
