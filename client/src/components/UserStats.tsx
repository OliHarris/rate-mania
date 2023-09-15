interface UserStatsInterface {
  loadingState: boolean;
  userUnderratedPercentage: number;
  userTotalVotes: number;
  userOverratedPercentage: number;
}

const UserStats = ({
  loadingState,
  userUnderratedPercentage,
  userTotalVotes,
  userOverratedPercentage,
}: UserStatsInterface) => {
  return (
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
  );
};
export default UserStats;
