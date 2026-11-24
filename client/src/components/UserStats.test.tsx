import { render, screen } from "@testing-library/react";
import UserStats from "./UserStats";

describe("UserStats", () => {
  it("shows a loader and hides stats while loading", () => {
    const { container } = render(
      <UserStats
        loadingState={true}
        userUnderratedPercentage={50}
        userTotalVotes={10}
        userOverratedPercentage={50}
      />
    );

    expect(container.querySelector(".loader")).not.toBeNull();
    expect(screen.queryByText(/votes/)).not.toBeInTheDocument();
  });

  it("shows percentages to one decimal place and the vote total", () => {
    const { container } = render(
      <UserStats
        loadingState={false}
        userUnderratedPercentage={66.6666}
        userTotalVotes={3}
        userOverratedPercentage={33.3333}
      />
    );

    expect(screen.getByText("66.7% Underrated")).toBeInTheDocument();
    expect(screen.getByText("3 votes")).toBeInTheDocument();
    expect(screen.getByText("33.3% Overrated")).toBeInTheDocument();
    expect(container.querySelector(".loader")).toBeNull();
  });

  it("shows zeroed stats for an article with no votes", () => {
    render(
      <UserStats
        loadingState={false}
        userUnderratedPercentage={0}
        userTotalVotes={0}
        userOverratedPercentage={0}
      />
    );

    expect(screen.getByText("0.0% Underrated")).toBeInTheDocument();
    expect(screen.getByText("0 votes")).toBeInTheDocument();
    expect(screen.getByText("0.0% Overrated")).toBeInTheDocument();
  });
});
