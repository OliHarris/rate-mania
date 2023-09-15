interface WikiOutputInterface {
  articleImage: string;
  articleTitle: string;
  articleExtract: string;
  articleFullUrl: string;
}

const WikiOutput = ({
  articleImage,
  articleTitle,
  articleExtract,
  articleFullUrl,
}: WikiOutputInterface) => {
  return (
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
        <article dangerouslySetInnerHTML={{ __html: articleExtract }}></article>
        <hr />
        <a className="h4" href={articleFullUrl} target="blank">
          Read more on Wikipedia
        </a>
      </div>
    </section>
  );
};
export default WikiOutput;
