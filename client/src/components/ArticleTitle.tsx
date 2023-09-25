interface ArticleTitleInterface {
  loadingState: boolean;
  articleTitle: string;
}

const ArticleTitle = ({
  loadingState,
  articleTitle,
}: ArticleTitleInterface) => {
  return (
    <section id="article-title">
      {!loadingState && <h2>{articleTitle}</h2>}
      {loadingState && <h2>Loading...</h2>}
    </section>
  );
};
export default ArticleTitle;
