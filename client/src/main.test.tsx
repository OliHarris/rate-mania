jest.mock("./components/App.tsx", () => ({
  __esModule: true,
  default: () => <div>Mock App</div>
}));

import { act, screen } from "@testing-library/react";

describe("main entry point", () => {
  it("mounts <App /> into #root", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    await act(async () => {
      await import("./main");
    });

    expect(screen.getByText("Mock App")).toBeInTheDocument();
    expect(document.getElementById("root")).toContainElement(
      screen.getByText("Mock App")
    );
  });
});
